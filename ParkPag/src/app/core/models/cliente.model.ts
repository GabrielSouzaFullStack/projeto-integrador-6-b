export interface Cliente {
  id_cliente?: number;
  nome: string;
  cpf: string;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
  data_cadastro?: string;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

/** Cliente com a quantidade de veículos vinculados (lista de clientes). */
export interface ClienteResumo extends Cliente {
  total_veiculos: number;
}

/** Totais exibidos no card "Resumo da Lista" (wireframe 03). */
export interface ResumoClientes {
  total_clientes: number;
  total_veiculos: number;
  novos_no_mes: number;
}
