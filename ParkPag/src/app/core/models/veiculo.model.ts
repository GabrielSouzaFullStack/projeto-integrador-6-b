export interface Veiculo {
  id_veiculo?: number;
  placa: string;
  marca: string;
  modelo: string;
  cor?: string | null;
  id_cliente: number;
}

/** Veículo com os dados do proprietário e a situação no pátio. */
export interface VeiculoDetalhado extends Veiculo {
  nome_cliente: string;
  telefone_cliente: string | null;
  no_patio: number;
}
