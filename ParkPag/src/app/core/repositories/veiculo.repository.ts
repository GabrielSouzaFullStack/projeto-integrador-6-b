import { Injectable, inject } from '@angular/core';
import { Veiculo, VeiculoDetalhado } from '../models/veiculo.model';
import { SQLiteService } from '../services/sqlite.service';
import { normalizarPlaca } from '../utils/formatadores';

const SELECT_DETALHADO = `
  SELECT v.*,
         c.nome AS nome_cliente,
         c.telefone AS telefone_cliente,
         EXISTS (
           SELECT 1 FROM ESTADIA e
            WHERE e.id_veiculo = v.id_veiculo AND e.data_hora_saida IS NULL
         ) AS no_patio
    FROM VEICULO v
    JOIN CLIENTE c ON c.id_cliente = v.id_cliente`;

@Injectable({ providedIn: 'root' })
export class VeiculoRepository {
  private readonly db = inject(SQLiteService);

  /** Lista veículos com o proprietário, filtrando por placa ou nome do cliente. */
  listar(busca = ''): Promise<VeiculoDetalhado[]> {
    const termo = busca.trim();
    const placa = normalizarPlaca(termo);

    return this.db.consultar<VeiculoDetalhado>(
      `${SELECT_DETALHADO}
        WHERE ? = ''
           OR v.placa LIKE ?
           OR c.nome LIKE ?
        ORDER BY c.nome COLLATE NOCASE, v.placa`,
      [termo, placa ? `%${placa}%` : null, `%${termo}%`],
    );
  }

  listarPorCliente(idCliente: number): Promise<VeiculoDetalhado[]> {
    return this.db.consultar<VeiculoDetalhado>(
      `${SELECT_DETALHADO} WHERE v.id_cliente = ? ORDER BY v.placa`,
      [idCliente],
    );
  }

  /** Veículos que podem registrar entrada (não estão no pátio). */
  listarForaDoPatio(): Promise<VeiculoDetalhado[]> {
    return this.db.consultar<VeiculoDetalhado>(
      `SELECT * FROM (${SELECT_DETALHADO}) WHERE no_patio = 0 ORDER BY placa`,
    );
  }

  async inserir(veiculo: Veiculo): Promise<number> {
    const resultado = await this.db.executar(
      'INSERT INTO VEICULO (placa, marca, modelo, cor, id_cliente) VALUES (?, ?, ?, ?, ?)',
      [
        normalizarPlaca(veiculo.placa),
        veiculo.marca.trim(),
        veiculo.modelo.trim(),
        veiculo.cor?.trim() || null,
        veiculo.id_cliente,
      ],
    );
    return resultado.ultimoId;
  }

  /** Falha (FOREIGN KEY) se o veículo tiver estadias registradas. */
  async excluir(idVeiculo: number): Promise<void> {
    await this.db.executar('DELETE FROM VEICULO WHERE id_veiculo = ?', [idVeiculo]);
  }
}
