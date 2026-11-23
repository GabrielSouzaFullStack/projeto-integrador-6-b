import { Pipe, PipeTransform } from '@angular/core';
import {
  formatarCpf,
  formatarData,
  formatarDataCurta,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  formatarPlaca,
  formatarTelefone,
} from '../../core/utils/formatadores';

@Pipe({ name: 'moeda', standalone: false })
export class MoedaPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatarMoeda(valor);
  }
}

@Pipe({ name: 'duracao', standalone: false })
export class DuracaoPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    return formatarDuracao(minutos);
  }
}

@Pipe({ name: 'placa', standalone: false })
export class PlacaPipe implements PipeTransform {
  transform(placa: string | null | undefined): string {
    return formatarPlaca(placa);
  }
}

@Pipe({ name: 'telefone', standalone: false })
export class TelefonePipe implements PipeTransform {
  transform(telefone: string | null | undefined): string {
    return formatarTelefone(telefone);
  }
}

@Pipe({ name: 'cpf', standalone: false })
export class CpfPipe implements PipeTransform {
  transform(cpf: string | null | undefined): string {
    return formatarCpf(cpf);
  }
}

/** Formata um ISO local: 'data' (27/10/2026), 'curta' (27/10) ou 'hora' (08:30). */
@Pipe({ name: 'dataBr', standalone: false })
export class DataBrPipe implements PipeTransform {
  transform(iso: string | null | undefined, formato: 'data' | 'curta' | 'hora' = 'data'): string {
    if (formato === 'hora') return formatarHora(iso);
    if (formato === 'curta') return formatarDataCurta(iso);
    return formatarData(iso);
  }
}
