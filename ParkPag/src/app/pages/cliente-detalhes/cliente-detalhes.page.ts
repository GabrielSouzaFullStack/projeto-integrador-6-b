import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';
import { Cliente } from '../../core/models/cliente.model';
import { EstadiaDetalhada } from '../../core/models/estadia.model';
import { VeiculoDetalhado } from '../../core/models/veiculo.model';
import { ClienteRepository } from '../../core/repositories/cliente.repository';
import { EstadiaRepository } from '../../core/repositories/estadia.repository';
import { VeiculoRepository } from '../../core/repositories/veiculo.repository';
import { FeedbackService } from '../../core/services/feedback.service';
import { formatarPlaca } from '../../core/utils/formatadores';

/** Wireframe 05 – Detalhes do cliente (RU06, RU07, RU08). */
@Component({
  selector: 'app-cliente-detalhes',
  templateUrl: 'cliente-detalhes.page.html',
  standalone: false,
})
export class ClienteDetalhesPage {
  private readonly clientesRepo = inject(ClienteRepository);
  private readonly veiculosRepo = inject(VeiculoRepository);
  private readonly estadiasRepo = inject(EstadiaRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly rota = inject(ActivatedRoute);
  private readonly nav = inject(NavController);

  readonly cliente = signal<Cliente | null>(null);
  readonly veiculos = signal<VeiculoDetalhado[]>([]);
  readonly estadias = signal<EstadiaDetalhada[]>([]);

  readonly estadiasAbertas = computed(() => this.estadias().filter((e) => !e.data_hora_saida));
  readonly placasAbertas = computed(() =>
    this.estadiasAbertas().map((e) => formatarPlaca(e.placa)).join(', '),
  );
  readonly tempoTotal = computed(() =>
    this.estadias().reduce((total, e) => total + (e.tempo_permanencia ?? 0), 0),
  );
  readonly totalPago = computed(() =>
    this.estadias()
      .filter((e) => e.status_pagamento === 'PAGO')
      .reduce((total, e) => total + (e.valor_total ?? 0), 0),
  );

  private get idCliente(): number {
    return Number(this.rota.snapshot.paramMap.get('id'));
  }

  ionViewWillEnter(): void {
    void this.carregar();
  }

  abrirEstadia(estadia: EstadiaDetalhada): void {
    if (estadia.data_hora_saida) {
      this.nav.navigateForward(['/pagamento', estadia.id_estadia]);
    } else {
      this.nav.navigateForward(['/movimentacao/saida'], { queryParams: { estadia: estadia.id_estadia } });
    }
  }

  async excluir(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente) return;

    if (this.veiculos().length > 0) {
      await this.feedback.aviso('Exclua os veículos deste cliente antes de excluí-lo.');
      return;
    }
    const confirmado = await this.feedback.confirmar(
      'Excluir cliente',
      `Deseja excluir ${cliente.nome}? Esta ação não pode ser desfeita.`,
      'Excluir',
    );
    if (!confirmado) return;

    try {
      await this.clientesRepo.excluir(this.idCliente);
      await this.feedback.sucesso('Cliente excluído.');
      this.nav.navigateBack('/clientes');
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  private async carregar(): Promise<void> {
    try {
      const [cliente, veiculos, estadias] = await Promise.all([
        this.clientesRepo.obter(this.idCliente),
        this.veiculosRepo.listarPorCliente(this.idCliente),
        this.estadiasRepo.listarPorCliente(this.idCliente),
      ]);
      if (!cliente) {
        await this.feedback.aviso('Cliente não encontrado.');
        this.nav.navigateRoot('/clientes');
        return;
      }
      this.cliente.set(cliente);
      this.veiculos.set(veiculos);
      this.estadias.set(estadias);
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }
}
