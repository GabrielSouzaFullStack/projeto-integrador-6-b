import { Injectable, inject } from '@angular/core';
import { Cliente, ClienteResumo, ResumoClientes } from '../models/cliente.model';
import { SQLiteService } from '../services/sqlite.service';
import { agoraIsoLocal, somenteDigitos } from '../utils/formatadores';

@Injectable({ providedIn: 'root' })
export class ClienteRepository {
  private readonly db = inject(SQLiteService);

  /** Lista clientes com a quantidade de veículos, filtrando por nome, telefone ou CPF. */
  listar(busca = ''): Promise<ClienteResumo[]> {
    const termo = busca.trim();
    const digitos = somenteDigitos(termo);
    // Sem dígitos na busca, o filtro por telefone/CPF recebe NULL e nunca casa.
    const termoDigitos = digitos ? `%${digitos}%` : null;

    return this.db.consultar<ClienteResumo>(
      `SELECT c.*, COUNT(v.id_veiculo) AS total_veiculos
         FROM CLIENTE c
         LEFT JOIN VEICULO v ON v.id_cliente = c.id_cliente
        WHERE ? = ''
           OR c.nome LIKE ?
           OR c.telefone LIKE ?
           OR c.cpf LIKE ?
        GROUP BY c.id_cliente
        ORDER BY c.nome COLLATE NOCASE`,
      [termo, `%${termo}%`, termoDigitos, termoDigitos],
    );
  }

  async obter(idCliente: number): Promise<Cliente | null> {
    const linhas = await this.db.consultar<Cliente>(
      'SELECT * FROM CLIENTE WHERE id_cliente = ?',
      [idCliente],
    );
    return linhas[0] ?? null;
  }

  async resumo(): Promise<ResumoClientes> {
    const inicioDoMes = `${agoraIsoLocal().slice(0, 7)}-01`;
    const linhas = await this.db.consultar<ResumoClientes>(
      `SELECT
         (SELECT COUNT(*) FROM CLIENTE) AS total_clientes,
         (SELECT COUNT(*) FROM VEICULO) AS total_veiculos,
         (SELECT COUNT(*) FROM CLIENTE WHERE data_cadastro >= ?) AS novos_no_mes`,
      [inicioDoMes],
    );
    return linhas[0] ?? { total_clientes: 0, total_veiculos: 0, novos_no_mes: 0 };
  }

  async inserir(cliente: Cliente): Promise<number> {
    const resultado = await this.db.executar(
      `INSERT INTO CLIENTE
         (nome, cpf, telefone, email, data_nascimento, cep, logradouro, numero,
          complemento, bairro, cidade, uf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      this.parametros(cliente),
    );
    return resultado.ultimoId;
  }

  async atualizar(cliente: Cliente): Promise<void> {
    await this.db.executar(
      `UPDATE CLIENTE SET
         nome = ?, cpf = ?, telefone = ?, email = ?, data_nascimento = ?, cep = ?,
         logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?
       WHERE id_cliente = ?`,
      [...this.parametros(cliente), cliente.id_cliente!],
    );
  }

  /** Falha (FOREIGN KEY) se o cliente tiver veículos vinculados. */
  async excluir(idCliente: number): Promise<void> {
    await this.db.executar('DELETE FROM CLIENTE WHERE id_cliente = ?', [idCliente]);
  }

  private parametros(c: Cliente): (string | null)[] {
    const vazioParaNulo = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
    return [
      c.nome.trim(),
      somenteDigitos(c.cpf),
      vazioParaNulo(somenteDigitos(c.telefone)),
      vazioParaNulo(c.email),
      vazioParaNulo(c.data_nascimento),
      vazioParaNulo(somenteDigitos(c.cep)),
      vazioParaNulo(c.logradouro),
      vazioParaNulo(c.numero),
      vazioParaNulo(c.complemento),
      vazioParaNulo(c.bairro),
      vazioParaNulo(c.cidade),
      vazioParaNulo(c.uf?.toUpperCase()),
    ];
  }
}
