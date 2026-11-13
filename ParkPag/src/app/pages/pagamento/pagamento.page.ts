import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';
import { EstadiaDetalhada, FormaPagamento, StatusPagamento } from '../../core/models/estadia.model';
import { EstadiaRepository } from '../../core/repositories/estadia.repository';
import { FeedbackService } from '../../core/services/feedback.service';

/** Wireframe 08 – Pagamento (RU05, RU07). */
@Component({
  selector: 'app-pagamento',
  templateUrl: 'pagamento.page.html',
  standalone: false,
})
export class PagamentoPage {
  private readonly estadiasRepo = inject(EstadiaRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly rota = inject(ActivatedRoute);
  private readonly nav = inject(NavController);

  readonly estadia = signal<EstadiaDetalhada | null>(null);
  readonly forma = signal<FormaPagamento>('PIX');
  readonly situacao = signal<StatusPagamento>('PENDENTE');
  readonly salvando = signal(false);

  readonly pago = computed(() => this.estadia()?.status_pagamento === 'PAGO');

  /** Horas cobradas (fração arredondada para cima). */
  readonly horasCobradas = computed(() => Math.ceil((this.estadia()?.tempo_permanencia ?? 0) / 60));

  /** True quando o valor é exatamente horas × valor_hora (sem teto de diária). */
  readonly calculoPorHora = computed(() => {
    const e = this.estadia();
    if (!e) return false;
    return Math.abs(this.horasCobradas() * e.valor_hora - (e.valor_total ?? 0)) < 0.005;
  });

  readonly podeConfirmar = computed(
    () => !this.pago() && !!this.estadia()?.data_hora_saida && this.situacao() === 'PAGO' && !this.salvando(),
  );

  ionViewWillEnter(): void {
    void this.carregar();
  }

  async confirmar(): Promise<void> {
    const e = this.estadia();
    if (!e || !this.podeConfirmar()) return;

    this.salvando.set(true);
    try {
      await this.estadiasRepo.confirmarPagamento(e.id_estadia!, this.forma());
      await this.feedback.sucesso('Pagamento confirmado.');
      await this.carregar();
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  registrarSaida(): void {
    this.nav.navigateForward(['/movimentacao/saida'], {
      queryParams: { estadia: this.estadia()?.id_estadia },
    });
  }

  private async carregar(): Promise<void> {
    try {
      const estadia = await this.estadiasRepo.obter(Number(this.rota.snapshot.paramMap.get('id')));
      if (!estadia) {
        await this.feedback.aviso('Estadia não encontrada.');
        this.nav.navigateRoot('/historico');
        return;
      }
      this.estadia.set(estadia);
      this.forma.set(estadia.forma_pagamento ?? 'PIX');
      this.situacao.set(estadia.status_pagamento ?? 'PENDENTE');
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }
}
