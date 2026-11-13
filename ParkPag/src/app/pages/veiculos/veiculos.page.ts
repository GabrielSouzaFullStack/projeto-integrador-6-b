import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, NavController } from '@ionic/angular/lazy';
import { ClienteResumo } from '../../core/models/cliente.model';
import { VeiculoDetalhado } from '../../core/models/veiculo.model';
import { ClienteRepository } from '../../core/repositories/cliente.repository';
import { VeiculoRepository } from '../../core/repositories/veiculo.repository';
import { FeedbackService } from '../../core/services/feedback.service';
import { formatarPlaca, validarPlaca } from '../../core/utils/formatadores';

interface FormVeiculo {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  idCliente: number | null;
}

type CampoTexto = 'placa' | 'marca' | 'modelo' | 'cor';

/** Wireframe 06 – Gerenciamento de veículos (RU02, RU08). */
@Component({
  selector: 'app-veiculos',
  templateUrl: 'veiculos.page.html',
  standalone: false,
})
export class VeiculosPage {
  private readonly veiculosRepo = inject(VeiculoRepository);
  private readonly clientesRepo = inject(ClienteRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly acoes = inject(ActionSheetController);
  private readonly nav = inject(NavController);
  private readonly rota = inject(ActivatedRoute);

  readonly clientes = signal<ClienteResumo[]>([]);
  readonly veiculos = signal<VeiculoDetalhado[]>([]);
  readonly busca = signal('');
  readonly form = signal<FormVeiculo>(this.formVazio());
  readonly erros = signal<Partial<Record<keyof FormVeiculo, string>>>({});
  readonly salvando = signal(false);
  readonly carregando = signal(true);

  ionViewWillEnter(): void {
    const idCliente = Number(this.rota.snapshot.queryParamMap.get('cliente'));
    if (idCliente) {
      this.form.update((f) => ({ ...f, idCliente }));
    }
    void this.carregar();
  }

  alterar(campo: CampoTexto, evento: Event): void {
    const alvo = evento.target as unknown as { value: string | number | null | undefined };
    let valor = String(alvo.value ?? '');
    if (campo === 'placa') {
      valor = formatarPlaca(valor);
      alvo.value = valor;
    }
    this.form.update((f) => ({ ...f, [campo]: valor }));
  }

  selecionarCliente(id: number | null | undefined): void {
    this.form.update((f) => ({ ...f, idCliente: id ?? null }));
  }

  async buscar(termo: string | null | undefined): Promise<void> {
    this.busca.set(termo ?? '');
    try {
      this.veiculos.set(await this.veiculosRepo.listar(this.busca()));
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  async salvar(): Promise<void> {
    const f = this.form();
    const erros: Partial<Record<keyof FormVeiculo, string>> = {};
    if (!validarPlaca(f.placa)) erros.placa = 'Placa inválida (ex.: ABC-1D23 ou ABC-1234).';
    if (!f.marca.trim()) erros.marca = 'Informe a marca.';
    if (!f.modelo.trim()) erros.modelo = 'Informe o modelo.';
    if (!f.idCliente) erros.idCliente = 'Selecione o cliente.';
    this.erros.set(erros);
    if (Object.keys(erros).length > 0) return;

    this.salvando.set(true);
    try {
      await this.veiculosRepo.inserir({
        placa: f.placa,
        marca: f.marca,
        modelo: f.modelo,
        cor: f.cor,
        id_cliente: f.idCliente!,
      });
      // Limpa o formulário antes do aviso, para não apagar o que o usuário
      // começar a digitar enquanto o toast aparece. Mantém o cliente
      // selecionado para facilitar cadastrar vários veículos.
      this.form.set({ ...this.formVazio(), idCliente: f.idCliente });
      this.erros.set({});
      this.veiculos.set(await this.veiculosRepo.listar(this.busca()));
      void this.feedback.sucesso('Veículo cadastrado.');
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  async opcoes(veiculo: VeiculoDetalhado): Promise<void> {
    const folha = await this.acoes.create({
      header: `${formatarPlaca(veiculo.placa)} · ${veiculo.marca} ${veiculo.modelo}`,
      buttons: [
        {
          text: 'Ver cliente',
          icon: 'person-outline',
          handler: () => {
            this.nav.navigateForward(['/clientes', veiculo.id_cliente]);
          },
        },
        {
          text: 'Excluir veículo',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            void this.excluir(veiculo);
          },
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await folha.present();
  }

  private async excluir(veiculo: VeiculoDetalhado): Promise<void> {
    const confirmado = await this.feedback.confirmar(
      'Excluir veículo',
      `Deseja excluir o veículo ${formatarPlaca(veiculo.placa)}?`,
      'Excluir',
    );
    if (!confirmado) return;
    try {
      await this.veiculosRepo.excluir(veiculo.id_veiculo!);
      await this.feedback.sucesso('Veículo excluído.');
      this.veiculos.set(await this.veiculosRepo.listar(this.busca()));
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  private async carregar(): Promise<void> {
    try {
      const [clientes, veiculos] = await Promise.all([
        this.clientesRepo.listar(),
        this.veiculosRepo.listar(this.busca()),
      ]);
      this.clientes.set(clientes);
      this.veiculos.set(veiculos);
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.carregando.set(false);
    }
  }

  private formVazio(): FormVeiculo {
    return { placa: '', marca: '', modelo: '', cor: '', idCliente: null };
  }
}
