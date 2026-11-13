import { Injectable, inject } from '@angular/core';
import {
  EstadiaDetalhada,
  FormaPagamento,
  ResumoMovimentacoes,
} from '../models/estadia.model';
import { Tarifa } from '../models/tarifa.model';
import { SQLiteService } from '../services/sqlite.service';
import { ResultadoCobranca, calcularCobranca } from '../utils/calculo-tarifa';
import { agoraIsoLocal } from '../utils/formatadores';

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

  /** RU03: abre uma estadia (veículo entra no pátio). */
  async registrarEntrada(idVeiculo: number, idTarifa: number, dataHoraEntrada: string): Promise<number> {
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
    const resultado = await this.db.executar(
      `INSERT INTO ESTADIA
         (id_veiculo, id_tarifa, data_hora_entrada, data_hora_saida, tempo_permanencia, valor_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idVeiculo, tarifa.id_tarifa!, dataHoraEntrada, dataHoraSaida, cobranca.minutos, cobranca.valor],
    );
    return resultado.ultimoId;
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
