import { Component, inject, signal } from '@angular/core';
import { ClienteResumo, ResumoClientes } from '../../core/models/cliente.model';
import { ClienteRepository } from '../../core/repositories/cliente.repository';
import { FeedbackService } from '../../core/services/feedback.service';

/** Wireframe 03 – Lista de clientes (RU06). */
@Component({
  selector: 'app-clientes',
  templateUrl: 'clientes.page.html',
  standalone: false,
})
export class ClientesPage {
  private readonly clientesRepo = inject(ClienteRepository);
  private readonly feedback = inject(FeedbackService);

  readonly busca = signal('');
  readonly clientes = signal<ClienteResumo[]>([]);
  readonly resumo = signal<ResumoClientes>({ total_clientes: 0, total_veiculos: 0, novos_no_mes: 0 });
  readonly carregando = signal(true);

  /** Recarrega sempre que a tela aparece (ex.: ao voltar do cadastro). */
  ionViewWillEnter(): void {
    void this.carregar();
  }

  async buscar(termo: string | null | undefined): Promise<void> {
    this.busca.set(termo ?? '');
    try {
      this.clientes.set(await this.clientesRepo.listar(this.busca()));
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  private async carregar(): Promise<void> {
    try {
      const [clientes, resumo] = await Promise.all([
        this.clientesRepo.listar(this.busca()),
        this.clientesRepo.resumo(),
      ]);
      this.clientes.set(clientes);
      this.resumo.set(resumo);
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.carregando.set(false);
    }
  }
}
