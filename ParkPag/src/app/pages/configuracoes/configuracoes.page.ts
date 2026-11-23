import { Component, inject, signal } from '@angular/core';
import { Tarifa } from '../../core/models/tarifa.model';
import { TarifaRepository } from '../../core/repositories/tarifa.repository';
import { FeedbackService } from '../../core/services/feedback.service';

interface FormTarifa {
  descricao: string;
  valorHora: string;
  valorDiaria: string;
}

type Campo = keyof FormTarifa;

/** Converte "5,50" ou "5.50" em número; vazio vira null. */
function paraNumero(valor: string): number | null {
  const texto = valor.trim().replace(',', '.');
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : NaN;
}

/** Configurações – cadastro das tarifas usadas no cálculo (RU05). */
@Component({
  selector: 'app-configuracoes',
  templateUrl: 'configuracoes.page.html',
  standalone: false,
})
export class ConfiguracoesPage {
  private readonly tarifasRepo = inject(TarifaRepository);
  private readonly feedback = inject(FeedbackService);

  readonly tarifas = signal<Tarifa[]>([]);
  readonly form = signal<FormTarifa>({ descricao: '', valorHora: '', valorDiaria: '' });
  readonly erros = signal<Partial<Record<Campo, string>>>({});
  readonly emEdicao = signal<number | null>(null);
  readonly salvando = signal(false);

  ionViewWillEnter(): void {
    void this.carregar();
  }

  alterar(campo: Campo, evento: Event): void {
    const alvo = evento.target as unknown as { value: string | number | null | undefined };
    this.form.update((f) => ({ ...f, [campo]: String(alvo.value ?? '') }));
  }

  editar(tarifa: Tarifa): void {
    this.emEdicao.set(tarifa.id_tarifa!);
    this.erros.set({});
    this.form.set({
      descricao: tarifa.descricao,
      valorHora: String(tarifa.valor_hora),
      valorDiaria: tarifa.valor_diaria === null || tarifa.valor_diaria === undefined ? '' : String(tarifa.valor_diaria),
    });
  }

  cancelarEdicao(): void {
    this.emEdicao.set(null);
    this.erros.set({});
    this.form.set({ descricao: '', valorHora: '', valorDiaria: '' });
  }

  async salvar(): Promise<void> {
    const f = this.form();
    const valorHora = paraNumero(f.valorHora);
    const valorDiaria = paraNumero(f.valorDiaria);

    const erros: Partial<Record<Campo, string>> = {};
    if (!f.descricao.trim()) erros.descricao = 'Informe a descrição.';
    if (valorHora === null || Number.isNaN(valorHora) || valorHora < 0) {
      erros.valorHora = 'Informe um valor por hora válido.';
    }
    if (valorDiaria !== null && (Number.isNaN(valorDiaria) || valorDiaria < 0)) {
      erros.valorDiaria = 'Valor da diária inválido.';
    }
    this.erros.set(erros);
    if (Object.keys(erros).length > 0) return;

    const tarifa: Tarifa = {
      id_tarifa: this.emEdicao() ?? undefined,
      descricao: f.descricao,
      valor_hora: valorHora!,
      valor_diaria: valorDiaria,
    };

    this.salvando.set(true);
    try {
      if (tarifa.id_tarifa) {
        await this.tarifasRepo.atualizar(tarifa);
        await this.feedback.sucesso('Tarifa atualizada. Vale para as próximas saídas registradas.');
      } else {
        await this.tarifasRepo.inserir(tarifa);
        await this.feedback.sucesso('Tarifa cadastrada.');
      }
      this.cancelarEdicao();
      await this.carregar();
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  async excluir(tarifa: Tarifa): Promise<void> {
    if (this.tarifas().length === 1) {
      await this.feedback.aviso('É necessário manter ao menos uma tarifa cadastrada.');
      return;
    }
    const confirmado = await this.feedback.confirmar(
      'Excluir tarifa',
      `Deseja excluir a tarifa "${tarifa.descricao}"?`,
      'Excluir',
    );
    if (!confirmado) return;
    try {
      await this.tarifasRepo.excluir(tarifa.id_tarifa!);
      await this.feedback.sucesso('Tarifa excluída.');
      if (this.emEdicao() === tarifa.id_tarifa) this.cancelarEdicao();
      await this.carregar();
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  private async carregar(): Promise<void> {
    try {
      this.tarifas.set(await this.tarifasRepo.listar());
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }
}
