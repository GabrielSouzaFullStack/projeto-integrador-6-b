import { Component, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/lazy';
import { EstadiaDetalhada, ResumoMovimentacoes } from '../../core/models/estadia.model';
import { EstadiaRepository } from '../../core/repositories/estadia.repository';
import { FeedbackService } from '../../core/services/feedback.service';

/** Wireframe 09 – Histórico de movimentações (RU07). */
@Component({
  selector: 'app-historico',
  templateUrl: 'historico.page.html',
  standalone: false,
})
export class HistoricoPage {
  private readonly estadiasRepo = inject(EstadiaRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly nav = inject(NavController);

  readonly estadias = signal<EstadiaDetalhada[]>([]);
  readonly resumo = signal<ResumoMovimentacoes>({ recebido: 0, a_receber: 0, no_patio: 0 });
  readonly carregando = signal(true);

  ionViewWillEnter(): void {
    void this.carregar();
  }

  /** Estadia fechada abre o pagamento; estadia aberta abre o registro de saída. */
  abrir(estadia: EstadiaDetalhada): void {
    if (estadia.data_hora_saida) {
      this.nav.navigateForward(['/pagamento', estadia.id_estadia]);
    } else {
      this.nav.navigateForward(['/movimentacao/saida'], { queryParams: { estadia: estadia.id_estadia } });
    }
  }

  private async carregar(): Promise<void> {
    try {
      const [estadias, resumo] = await Promise.all([
        this.estadiasRepo.listar(),
        this.estadiasRepo.resumo(),
      ]);
      this.estadias.set(estadias);
      this.resumo.set(resumo);
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.carregando.set(false);
    }
  }
}
