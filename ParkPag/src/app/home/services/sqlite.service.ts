import { Injectable } from "@angular/core";
import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection
} from '@capacitor-community/sqlite';

@Injectable({
    providedIn: 'root'
})

export class SQLiteService {
    // Cria variáveis de conexão com o SQLite
    private sqlite = new SQLiteConnection(CapacitorSQLite);
    private db!: SQLiteDBConnection;

    // Promisse async que inicializa o database
    async iniciarDatabase(): Promise<void> {

        if (this.db) {
            return;
        }

        this.db = await this.sqlite.createConnection(
            'parkpag',
            false,
            'no-encryption',
            1,
            false
        );

        // Abre conexão com o DB
        await this.db.open();

        // O SQLite não aplica chaves estrangeiras por padrão.
        await this.db.execute('PRAGMA foreign_keys = ON;');
    
        // Tabela CLIENTE
        await this.db.execute(`
			CREATE TABLE IF NOT EXISTS CLIENTE (
				id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
				nome TEXT NOT NULL,
				cpf TEXT NOT NULL UNIQUE,
				telefone TEXT,
				email TEXT
			);
        `);
    
        // Tabela VEICULO
        await this.db.execute(`
			CREATE TABLE IF NOT EXISTS VEICULO (
				id_veiculo INTEGER PRIMARY KEY AUTOINCREMENT,
				placa TEXT NOT NULL UNIQUE,
				modelo TEXT NOT NULL,
				cor TEXT,
				id_cliente INTEGER NOT NULL,
				FOREIGN KEY (id_cliente) REFERENCES CLIENTE (id_cliente)
				ON UPDATE CASCADE
				ON DELETE RESTRICT
			);
        `);
    
        // Tabela TARIFA
        await this.db.execute(`
			CREATE TABLE IF NOT EXISTS TARIFA (
				id_tarifa INTEGER PRIMARY KEY AUTOINCREMENT,
				descricao TEXT NOT NULL,
				valor_hora REAL NOT NULL CHECK (valor_hora >= 0),
				valor_diaria REAL CHECK (valor_diaria >= 0)
			);
        `);
    
        // Tabela ESTADIA
        await this.db.execute(`
			CREATE TABLE IF NOT EXISTS ESTADIA (
				id_estadia INTEGER PRIMARY KEY AUTOINCREMENT,
				id_veiculo INTEGER NOT NULL,
				id_tarifa INTEGER NOT NULL,
				data_hora_entrada TEXT NOT NULL,
				data_hora_saida TEXT,
				tempo_permanencia INTEGER CHECK (
				tempo_permanencia IS NULL OR tempo_permanencia >= 0
				),
				valor_total REAL CHECK (
				valor_total IS NULL OR valor_total >= 0
				),
		
				FOREIGN KEY (id_veiculo) REFERENCES VEICULO (id_veiculo)
				ON UPDATE CASCADE
				ON DELETE RESTRICT,
		
				FOREIGN KEY (id_tarifa) REFERENCES TARIFA (id_tarifa)
				ON UPDATE CASCADE
				ON DELETE RESTRICT,
		
				CHECK (
				data_hora_saida IS NULL OR
				data_hora_saida >= data_hora_entrada
				)
			);
        `);
    
        // Índices
        await this.db.execute(`
			CREATE INDEX IF NOT EXISTS idx_veiculo_cliente
			ON VEICULO (id_cliente);
        `);
    
        await this.db.execute(`
            CREATE INDEX IF NOT EXISTS idx_estadia_veiculo
            ON ESTADIA (id_veiculo);
        `);
    
        await this.db.execute(`
            CREATE INDEX IF NOT EXISTS idx_estadia_saida
            ON ESTADIA (data_hora_saida);
        `);
    
        // Impede duas estadias abertas para o mesmo veículo
        await this.db.execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_estadia_aberta
            ON ESTADIA (id_veiculo)
            WHERE data_hora_saida IS NULL;
        `);
    }
}