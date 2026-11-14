import { Injectable, inject } from '@angular/core';
import {
  EstadiaDetalhada,
  FormaPagamento,
  ResumoMovimentacoes,
} from '../models/estadia.model';
import { Tarifa } from '../models/tarifa.model';
import { SQLiteService } from '../services/sqlite.service';
import { ResultadoCobranca, calcularCobranca } from '../utils/calculo-tarifa';
import { agoraIsoLocal, extrairHora, formatarData } from '../utils/formatadores';

const SELECT_DETALHADA = `
  SELECT e.*,
         v.placa, v.marca, v.modelo, v.id_cliente,
         c.nome AS nome_cliente,
         t.descricao AS descricao_tarifa, t.valor_hora, t.valor_diaria
    FROM ESTADIA e
    JOIN VEICULO v ON v.id_veiculo = e.id_veiculo
    JOIN CLIENTE c ON c.id_cliente = v.id_cliente
    JOIN TARIFA t ON t.id_tarifa = e.id_tarifa`;

@Injectable({ providedIn: 'root' })
export class EstadiaRepository {
  private readonly db = inject(SQLiteService);

  async obter(idEstadia: number): Promise<EstadiaDetalhada | null> {
    const linhas = await this.db.consultar<EstadiaDetalhada>(
      `${SELECT_DETALHADA} WHERE e.id_estadia = ?`,
      [idEstadia],
    );
    return linhas[0] ?? null;
  }

  /** Histórico completo, mais recentes primeiro. */
  listar(): Promise<EstadiaDetalhada[]> {
    return this.db.consultar<EstadiaDetalhada>(
      `${SELECT_DETALHADA} ORDER BY e.data_hora_entrada DESC`,
    );
  }

  listarPorCliente(idCliente: number): Promise<EstadiaDetalhada[]> {
    return this.db.consultar<EstadiaDetalhada>(
      `${SELECT_DETALHADA} WHERE v.id_cliente = ? ORDER BY e.data_hora_entrada DESC`,
      [idCliente],
    );
  }

  /** Estadias em aberto: veículos que estão no pátio. */
  listarAbertas(): Promise<EstadiaDetalhada[]> {
    return this.db.consultar<EstadiaDetalhada>(
      `${SELECT_DETALHADA} WHERE e.data_hora_saida IS NULL ORDER BY v.placa`,
    );
  }

  async resumo(): Promise<ResumoMovimentacoes> {
    const linhas = await this.db.consultar<ResumoMovimentacoes>(
      `SELECT
         COALESCE(SUM(CASE WHEN status_pagamento = 'PAGO' THEN valor_total END), 0) AS recebido,
         COALESCE(SUM(CASE WHEN status_pagamento = 'PENDENTE' AND data_hora_saida IS NOT NULL
                           THEN valor_total END), 0) AS a_receber,
         COUNT(CASE WHEN data_hora_saida IS NULL THEN 1 END) AS no_patio
       FROM ESTADIA`,
    );
    return linhas[0] ?? { recebido: 0, a_receber: 0, no_patio: 0 };
  }

  /**
   * Garante que o período [entrada, saída] não se sobreponha a outra estadia
   * do mesmo veículo. Saída nula = estadia em aberto (até agora).
   * Períodos que apenas se encostam (saída de uma = entrada da outra) são aceitos.
   */
  private async garantirSemSobreposicao(
    idVeiculo: number,
    entrada: string,
    saida: string | null,
    ignorarIdEstadia: number | null = null,
  ): Promise<void> {
    const conflitos = await this.db.consultar<Pick<EstadiaDetalhada, 'data_hora_entrada' | 'data_hora_saida'>>(
      `SELECT data_hora_entrada, data_hora_saida
         FROM ESTADIA
        WHERE id_veiculo = ?
          AND id_estadia <> ?
          AND (? IS NULL OR data_hora_entrada < ?)
          AND (data_hora_saida IS NULL OR data_hora_saida > ?)
        ORDER BY data_hora_entrada
        LIMIT 1`,
      [idVeiculo, ignorarIdEstadia ?? -1, saida, saida, entrada],
    );
    const conflito = conflitos[0];
    if (!conflito) return;

    const inicio = `${formatarData(conflito.data_hora_entrada)} ${extrairHora(conflito.data_hora_entrada)}`;
    const fim = conflito.data_hora_saida
      ? `${formatarData(conflito.data_hora_saida)} ${extrairHora(conflito.data_hora_saida)}`
      : 'agora (no pátio)';
    throw new Error(
      `Este veículo já tem uma estadia de ${inicio} até ${fim}. Ajuste as datas para não sobrepor os períodos.`,
    );
  }

  /** RU03: abre uma estadia (veículo entra no pátio). */
  async registrarEntrada(idVeiculo: number, idTarifa: number, dataHoraEntrada: string): Promise<number> {
    await this.garantirSemSobreposicao(idVeiculo, dataHoraEntrada, null);
    const resultado = await this.db.executar(
      'INSERT INTO ESTADIA (id_veiculo, id_tarifa, data_hora_entrada) VALUES (?, ?, ?)',
      [idVeiculo, idTarifa, dataHoraEntrada],
    );
    return resultado.ultimoId;
  }

  /** RU04 e RU05: fecha uma estadia aberta e grava tempo e valor calculados. */
  async registrarSaida(idEstadia: number, dataHoraSaida: string): Promise<ResultadoCobranca> {
    const estadia = await this.obter(idEstadia);
    if (!estadia) {
      throw new Error('Estadia não encontrada.');
    }
    if (estadia.data_hora_saida) {
      throw new Error('A saída deste veículo já foi registrada.');
    }

    const cobranca = calcularCobranca(estadia.data_hora_entrada, dataHoraSaida, estadia);
    await this.garantirSemSobreposicao(estadia.id_veiculo, estadia.data_hora_entrada, dataHoraSaida, idEstadia);
    await this.db.executar(
      `UPDATE ESTADIA
          SET data_hora_saida = ?, tempo_permanencia = ?, valor_total = ?
        WHERE id_estadia = ?`,
      [dataHoraSaida, cobranca.minutos, cobranca.valor, idEstadia],
    );
    return cobranca;
  }

  /** Lançamento retroativo: entrada e saída informadas de uma só vez. */
  async registrarCompleta(
    idVeiculo: number,
    tarifa: Tarifa,
    dataHoraEntrada: string,
    dataHoraSaida: string,
  ): Promise<number> {
    const cobranca = calcularCobranca(dataHoraEntrada, dataHoraSaida, tarifa);
    await this.garantirSemSobreposicao(idVeiculo, dataHoraEntrada, dataHoraSaida);
    const resultado = await this.db.executar(
      `INSERT INTO ESTADIA
         (id_veiculo, id_tarifa, data_hora_entrada, data_hora_saida, tempo_permanencia, valor_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idVeiculo, tarifa.id_tarifa!, dataHoraEntrada, dataHoraSaida, cobranca.minutos, cobranca.valor],
    );
    return resultado.ultimoId;
  }

  /**
   * Corrige tarifa, entrada e (se a estadia já foi fechada) saída, recalculando
   * tempo e valor. Estadias pagas não podem ser alteradas.
   */
  async atualizar(
    idEstadia: number,
    tarifa: Tarifa,
    dataHoraEntrada: string,
    dataHoraSaida: string | null,
  ): Promise<void> {
    const estadia = await this.obter(idEstadia);
    if (!estadia) {
      throw new Error('Estadia não encontrada.');
    }
    if (estadia.status_pagamento === 'PAGO') {
      throw new Error('Estadias com pagamento confirmado não podem ser alteradas.');
    }
    if (estadia.data_hora_saida && !dataHoraSaida) {
      throw new Error('Informe a data e o horário de saída.');
    }

    const cobranca = dataHoraSaida ? calcularCobranca(dataHoraEntrada, dataHoraSaida, tarifa) : null;
    await this.garantirSemSobreposicao(estadia.id_veiculo, dataHoraEntrada, dataHoraSaida, idEstadia);
    await this.db.executar(
      `UPDATE ESTADIA
          SET id_tarifa = ?, data_hora_entrada = ?, data_hora_saida = ?,
              tempo_permanencia = ?, valor_total = ?
        WHERE id_estadia = ?`,
      [
        tarifa.id_tarifa!,
        dataHoraEntrada,
        dataHoraSaida,
        cobranca?.minutos ?? null,
        cobranca?.valor ?? null,
        idEstadia,
      ],
    );
  }

  /** Exclui uma estadia lançada por engano. Estadias pagas não podem ser excluídas. */
  async excluir(idEstadia: number): Promise<void> {
    const resultado = await this.db.executar(
      `DELETE FROM ESTADIA WHERE id_estadia = ? AND status_pagamento <> 'PAGO'`,
      [idEstadia],
    );
    if (resultado.alteracoes === 0) {
      throw new Error('Estadias com pagamento confirmado não podem ser excluídas.');
    }
  }

  async confirmarPagamento(idEstadia: number, forma: FormaPagamento): Promise<void> {
    const resultado = await this.db.executar(
      `UPDATE ESTADIA
          SET forma_pagamento = ?, status_pagamento = 'PAGO', data_hora_pagamento = ?
        WHERE id_estadia = ? AND data_hora_saida IS NOT NULL`,
      [forma, agoraIsoLocal(), idEstadia],
    );
    if (resultado.alteracoes === 0) {
      throw new Error('Registre a saída do veículo antes de confirmar o pagamento.');
    }
  }
}
