import { Injectable, inject } from '@angular/core';
import { Tarifa } from '../models/tarifa.model';
import { SQLiteService } from '../services/sqlite.service';

@Injectable({ providedIn: 'root' })
export class TarifaRepository {
  private readonly db = inject(SQLiteService);

  listar(): Promise<Tarifa[]> {
    return this.db.consultar<Tarifa>('SELECT * FROM TARIFA ORDER BY id_tarifa');
  }

  async inserir(tarifa: Tarifa): Promise<number> {
    const resultado = await this.db.executar(
      'INSERT INTO TARIFA (descricao, valor_hora, valor_diaria) VALUES (?, ?, ?)',
      [tarifa.descricao.trim(), tarifa.valor_hora, tarifa.valor_diaria ?? null],
    );
    return resultado.ultimoId;
  }

  async atualizar(tarifa: Tarifa): Promise<void> {
    await this.db.executar(
      'UPDATE TARIFA SET descricao = ?, valor_hora = ?, valor_diaria = ? WHERE id_tarifa = ?',
      [tarifa.descricao.trim(), tarifa.valor_hora, tarifa.valor_diaria ?? null, tarifa.id_tarifa!],
    );
  }

  /** Falha (FOREIGN KEY) se a tarifa já tiver sido usada em alguma estadia. */
  async excluir(idTarifa: number): Promise<void> {
    await this.db.executar('DELETE FROM TARIFA WHERE id_tarifa = ?', [idTarifa]);
  }
}
