export type FormaPagamento = 'PIX' | 'CARTAO';
export type StatusPagamento = 'PENDENTE' | 'PAGO';

export interface Estadia {
  id_estadia?: number;
  id_veiculo: number;
  id_tarifa: number;
  data_hora_entrada: string;
  data_hora_saida?: string | null;
  tempo_permanencia?: number | null;
  valor_total?: number | null;
  forma_pagamento?: FormaPagamento | null;
  status_pagamento?: StatusPagamento;
  data_hora_pagamento?: string | null;
}

/** Estadia com veículo, cliente e tarifa (histórico, pagamento e detalhes). */
export interface EstadiaDetalhada extends Estadia {
  placa: string;
  marca: string;
  modelo: string;
  id_cliente: number;
  nome_cliente: string;
  descricao_tarifa: string;
  valor_hora: number;
  valor_diaria: number | null;
}

/** Totais do card "Resumo do período" (wireframe 09). */
export interface ResumoMovimentacoes {
  recebido: number;
  a_receber: number;
  no_patio: number;
}
