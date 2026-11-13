import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const NOME_DATABASE = 'parkpag';

/** Valores aceitos como parâmetro nas consultas SQL. */
export type ParametroSql = string | number | null;

export interface ResultadoExecucao {
  /** Quantidade de linhas afetadas. */
  alteracoes: number;
  /** Id gerado pelo último INSERT. */
  ultimoId: number;
}

@Injectable({
  providedIn: 'root',
})
export class SQLiteService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;
  private inicializacao?: Promise<void>;
  private readonly plataformaWeb = Capacitor.getPlatform() === 'web';

  /** Inicializa o banco uma única vez, mesmo com chamadas concorrentes. */
  iniciarDatabase(): Promise<void> {
    if (!this.inicializacao) {
      this.inicializacao = this.abrirECriarTabelas().catch((erro) => {
        this.inicializacao = undefined;
        throw erro;
      });
    }
    return this.inicializacao;
  }

  /** Executa um SELECT parametrizado e retorna as linhas. */
  async consultar<T>(sql: string, parametros: ParametroSql[] = []): Promise<T[]> {
    const db = await this.conexao();
    const resultado = await db.query(sql, parametros);
    return (resultado.values ?? []) as T[];
  }

  /** Executa um INSERT, UPDATE ou DELETE parametrizado. */
  async executar(sql: string, parametros: ParametroSql[] = []): Promise<ResultadoExecucao> {
    const db = await this.conexao();
    const resultado = await db.run(sql, parametros);
    await this.persistirNaWeb();
    return {
      alteracoes: resultado.changes?.changes ?? 0,
      ultimoId: resultado.changes?.lastId ?? 0,
    };
  }

  private async conexao(): Promise<SQLiteDBConnection> {
    await this.iniciarDatabase();
    return this.db!;
  }

  private async abrirECriarTabelas(): Promise<void> {
    if (this.plataformaWeb) {
      await this.prepararWeb();
    }

    const consistencia = await this.sqlite.checkConnectionsConsistency();
    const existe = await this.sqlite.isConnection(NOME_DATABASE, false);

    this.db =
      consistencia.result && existe.result
        ? await this.sqlite.retrieveConnection(NOME_DATABASE, false)
        : await this.sqlite.createConnection(NOME_DATABASE, false, 'no-encryption', 1, false);

    await this.db.open();

    // O SQLite não aplica chaves estrangeiras por padrão. O PRAGMA não tem
    // efeito dentro de uma transação, por isso é executado sem transação.
    await this.db.execute('PRAGMA foreign_keys = ON;', false);

    await this.removerSchemaAntigo();
    await this.criarTabelas();
    await this.persistirNaWeb();
  }

  /**
   * No navegador o SQLite roda via WebAssembly (jeep-sqlite) e os dados
   * ficam no IndexedDB.
   */
  private async prepararWeb(): Promise<void> {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);

    if (!document.querySelector('jeep-sqlite')) {
      document.body.appendChild(document.createElement('jeep-sqlite'));
    }
    await customElements.whenDefined('jeep-sqlite');
    await this.sqlite.initWebStore();
  }

  private async persistirNaWeb(): Promise<void> {
    if (this.plataformaWeb) {
      await this.sqlite.saveToStore(NOME_DATABASE);
    }
  }

  /**
   * A primeira versão do schema não tinha as colunas exigidas pelos
   * wireframes (ex.: VEICULO.marca). Como nenhuma tela gravava dados nela,
   * as tabelas antigas são descartadas e recriadas no formato atual.
   */
  private async removerSchemaAntigo(): Promise<void> {
    const colunas = await this.db!.query('PRAGMA table_info(VEICULO);');
    const tabelaExiste = (colunas.values ?? []).length > 0;
    const temMarca = (colunas.values ?? []).some((c: { name: string }) => c.name === 'marca');

    if (tabelaExiste && !temMarca) {
      await this.db!.execute(`
        DROP TABLE IF EXISTS ESTADIA;
        DROP TABLE IF EXISTS VEICULO;
        DROP TABLE IF EXISTS TARIFA;
        DROP TABLE IF EXISTS CLIENTE;
      `);
    }
  }

  private async criarTabelas(): Promise<void> {
    await this.db!.execute(`
      CREATE TABLE IF NOT EXISTS CLIENTE (
        id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        telefone TEXT,
        email TEXT,
        data_nascimento TEXT,
        data_cadastro TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
        cep TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        uf TEXT CHECK (uf IS NULL OR length(uf) = 2)
      );

      CREATE TABLE IF NOT EXISTS VEICULO (
        id_veiculo INTEGER PRIMARY KEY AUTOINCREMENT,
        placa TEXT NOT NULL UNIQUE,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        cor TEXT,
        id_cliente INTEGER NOT NULL,
        FOREIGN KEY (id_cliente) REFERENCES CLIENTE (id_cliente)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS TARIFA (
        id_tarifa INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        valor_hora REAL NOT NULL CHECK (valor_hora >= 0),
        valor_diaria REAL CHECK (valor_diaria IS NULL OR valor_diaria >= 0)
      );

      CREATE TABLE IF NOT EXISTS ESTADIA (
        id_estadia INTEGER PRIMARY KEY AUTOINCREMENT,
        id_veiculo INTEGER NOT NULL,
        id_tarifa INTEGER NOT NULL,
        data_hora_entrada TEXT NOT NULL,
        data_hora_saida TEXT,
        tempo_permanencia INTEGER CHECK (tempo_permanencia IS NULL OR tempo_permanencia >= 0),
        valor_total REAL CHECK (valor_total IS NULL OR valor_total >= 0),
        forma_pagamento TEXT CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('PIX', 'CARTAO')),
        status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_pagamento IN ('PENDENTE', 'PAGO')),
        data_hora_pagamento TEXT,
        FOREIGN KEY (id_veiculo) REFERENCES VEICULO (id_veiculo)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        FOREIGN KEY (id_tarifa) REFERENCES TARIFA (id_tarifa)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CHECK (data_hora_saida IS NULL OR data_hora_saida >= data_hora_entrada)
      );

      CREATE INDEX IF NOT EXISTS idx_veiculo_cliente ON VEICULO (id_cliente);
      CREATE INDEX IF NOT EXISTS idx_estadia_veiculo ON ESTADIA (id_veiculo);
      CREATE INDEX IF NOT EXISTS idx_estadia_saida ON ESTADIA (data_hora_saida);

      -- Impede duas estadias abertas para o mesmo veículo
      CREATE UNIQUE INDEX IF NOT EXISTS idx_estadia_aberta
        ON ESTADIA (id_veiculo)
        WHERE data_hora_saida IS NULL;

      -- Tarifa padrão para o aplicativo funcionar desde o primeiro uso
      INSERT INTO TARIFA (descricao, valor_hora)
        SELECT 'Padrão', 5.0
        WHERE NOT EXISTS (SELECT 1 FROM TARIFA);
    `);
  }
}
