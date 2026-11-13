export interface Tarifa {
  id_tarifa?: number;
  descricao: string;
  valor_hora: number;
  valor_diaria?: number | null;
}
