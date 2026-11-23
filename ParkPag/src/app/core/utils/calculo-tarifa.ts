import { Tarifa } from '../models/tarifa.model';

const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;

export interface ResultadoCobranca {
  /** Tempo de permanência em minutos (gravado em ESTADIA.tempo_permanencia). */
  minutos: number;
  /** Horas cobradas: fração de hora arredondada para cima. */
  horasCobradas: number;
  /** Valor a ser cobrado (gravado em ESTADIA.valor_total). */
  valor: number;
}

/**
 * Calcula a cobrança de uma estadia.
 *
 * - Fração de hora é arredondada para cima (2h10 = 3 horas).
 * - Valor = horas cobradas × valor_hora.
 * - Se a tarifa tiver valor_diaria, cada bloco de 24 horas custa no máximo
 *   esse valor (inclusive o último bloco, se incompleto).
 *
 * As datas devem estar no formato ISO 8601 local (YYYY-MM-DDTHH:mm:ss).
 */
export function calcularCobranca(
  dataHoraEntrada: string,
  dataHoraSaida: string,
  tarifa: Pick<Tarifa, 'valor_hora' | 'valor_diaria'>,
): ResultadoCobranca {
  const entrada = new Date(dataHoraEntrada).getTime();
  const saida = new Date(dataHoraSaida).getTime();

  if (Number.isNaN(entrada) || Number.isNaN(saida)) {
    throw new Error('Data de entrada ou saída inválida.');
  }
  if (saida < entrada) {
    throw new Error('A saída deve ser igual ou posterior à entrada.');
  }

  const minutos = Math.floor((saida - entrada) / 60000);
  const horasCobradas = Math.ceil(minutos / MINUTOS_POR_HORA);
  const valorHora = tarifa.valor_hora;
  const valorDiaria = tarifa.valor_diaria;

  let valor: number;
  if (valorDiaria === null || valorDiaria === undefined) {
    valor = horasCobradas * valorHora;
  } else {
    const diasCompletos = Math.floor(minutos / MINUTOS_POR_DIA);
    const minutosRestantes = minutos % MINUTOS_POR_DIA;
    const horasRestantes = Math.ceil(minutosRestantes / MINUTOS_POR_HORA);
    const custoDia = Math.min(24 * valorHora, valorDiaria);
    valor = diasCompletos * custoDia + Math.min(horasRestantes * valorHora, valorDiaria);
  }

  return { minutos, horasCobradas, valor: arredondarCentavos(valor) };
}

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}
