import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadiaDetalhada } from '../../core/models/estadia.model';
import { Tarifa } from '../../core/models/tarifa.model';
import { VeiculoDetalhado } from '../../core/models/veiculo.model';
import { EstadiaRepository } from '../../core/repositories/estadia.repository';
import { TarifaRepository } from '../../core/repositories/tarifa.repository';
import { VeiculoRepository } from '../../core/repositories/veiculo.repository';
import { FeedbackService } from '../../core/services/feedback.service';
import { ResultadoCobranca, calcularCobranca } from '../../core/utils/calculo-tarifa';
import {
  agoraIsoLocal,
  combinarDataHora,
  extrairData,
  extrairHora,
} from '../../core/utils/formatadores';

type Modo = 'entrada' | 'saida';
type CampoData = 'dataEntrada' | 'horaEntrada' | 'dataSaida' | 'horaSaida';

/**
 * Wireframe 07 – Registro de entrada e saída (RU03, RU04, RU05, RU09).
 *
 * - /movimentacao/entrada: abre uma estadia; opcionalmente já informa a
 *   saída (lançamento retroativo).
 * - /movimentacao/saida: fecha uma estadia aberta e calcula o valor.
 */
@Component({
  selector: 'app-movimentacao',
  templateUrl: 'movimentacao.page.html',
  standalone: false,
})
export class MovimentacaoPage {
  private readonly veiculosRepo = inject(VeiculoRepository);
  private readonly tarifasRepo = inject(TarifaRepository);
  private readonly estadiasRepo = inject(EstadiaRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly modo = signal<Modo>('entrada');
  readonly carregando = signal(true);
  readonly salvando = signal(false);

  // Dados de apoio
  readonly veiculos = signal<VeiculoDetalhado[]>([]);
  readonly abertas = signal<EstadiaDetalhada[]>([]);
  readonly tarifas = signal<Tarifa[]>([]);

  // Formulário
  readonly idVeiculo = signal<number | null>(null);
  readonly idEstadia = signal<number | null>(null);
  readonly idTarifa = signal<number | null>(null);
  readonly informarSaida = signal(false);
  readonly datas = signal<Record<CampoData, string>>({
    dataEntrada: '',
    horaEntrada: '',
    dataSaida: '',
    horaSaida: '',
  });

  readonly estadiaSelecionada = computed(
    () => this.abertas().find((e) => e.id_estadia === this.idEstadia()) ?? null,
  );

  readonly tarifaAtual = computed<Pick<Tarifa, 'valor_hora' | 'valor_diaria'> | null>(() => {
    if (this.modo() === 'saida') return this.estadiaSelecionada();
    return this.tarifas().find((t) => t.id_tarifa === this.idTarifa()) ?? null;
  });

  readonly entradaIso = computed(() => {
    if (this.modo() === 'saida') return this.estadiaSelecionada()?.data_hora_entrada ?? null;
    const d = this.datas();
    return d.dataEntrada && d.horaEntrada ? combinarDataHora(d.dataEntrada, d.horaEntrada) : null;
  });

  readonly temSaida = computed(() => this.modo() === 'saida' || this.informarSaida());

  readonly saidaIso = computed(() => {
    if (!this.temSaida()) return null;
    const d = this.datas();
    return d.dataSaida && d.horaSaida ? combinarDataHora(d.dataSaida, d.horaSaida) : null;
  });

  /** Mensagem de validação das datas (null quando está tudo certo). */
  readonly erroDatas = computed<string | null>(() => {
    const entrada = this.entradaIso();
    const saida = this.saidaIso();
    const agora = agoraIsoLocal();
    if (entrada && this.modo() === 'entrada' && entrada > agora) {
      return 'A entrada não pode estar no futuro.';
    }
    if (saida && saida > agora) return 'A saída não pode estar no futuro.';
    if (entrada && saida && saida < entrada) return 'A saída deve ser igual ou posterior à entrada.';
    return null;
  });

  /** Tempo e valor calculados em tempo real (cartão escuro do wireframe). */
  readonly cobranca = computed<ResultadoCobranca | null>(() => {
    const entrada = this.entradaIso();
    const saida = this.saidaIso();
    const tarifa = this.tarifaAtual();
    if (!entrada || !saida || !tarifa || this.erroDatas()) return null;
    try {
      return calcularCobranca(entrada, saida, tarifa);
    } catch {
      return null;
    }
  });

  readonly titulo = computed(() => {
    if (this.modo() === 'saida') return 'Registrar saída';
    return this.informarSaida() ? 'Registrar entrada e saída' : 'Registrar entrada';
  });

  ionViewWillEnter(): void {
    const modo = this.rota.snapshot.paramMap.get('modo') === 'saida' ? 'saida' : 'entrada';
    this.modo.set(modo);

    const agora = agoraIsoLocal();
    this.datas.set({
      dataEntrada: extrairData(agora),
      horaEntrada: extrairHora(agora),
      dataSaida: extrairData(agora),
      horaSaida: extrairHora(agora),
    });
    void this.carregar();
  }

  alterarData(campo: CampoData, evento: Event): void {
    const alvo = evento.target as unknown as { value: string | number | null | undefined };
    this.datas.update((d) => ({ ...d, [campo]: String(alvo.value ?? '') }));
  }

  async registrar(): Promise<void> {
    if (this.erroDatas()) {
      await this.feedback.aviso(this.erroDatas()!);
      return;
    }

    this.salvando.set(true);
    try {
      if (this.modo() === 'saida') {
        await this.registrarSaida();
      } else if (this.informarSaida()) {
        await this.registrarCompleta();
      } else {
        await this.registrarEntrada();
      }
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  private async registrarEntrada(): Promise<void> {
    const idVeiculo = this.idVeiculo();
    const idTarifa = this.idTarifa();
    const entrada = this.entradaIso();
    if (!idVeiculo || !idTarifa || !entrada) {
      await this.feedback.aviso('Selecione o veículo e informe a data e o horário de entrada.');
      return;
    }
    await this.estadiasRepo.registrarEntrada(idVeiculo, idTarifa, entrada);
    await this.feedback.sucesso('Entrada registrada.');
    await this.router.navigate(['/historico'], { replaceUrl: true });
  }

  private async registrarCompleta(): Promise<void> {
    const idVeiculo = this.idVeiculo();
    const tarifa = this.tarifas().find((t) => t.id_tarifa === this.idTarifa());
    const entrada = this.entradaIso();
    const saida = this.saidaIso();
    if (!idVeiculo || !tarifa || !entrada || !saida) {
      await this.feedback.aviso('Selecione o veículo e informe as datas e horários de entrada e saída.');
      return;
    }
    const id = await this.estadiasRepo.registrarCompleta(idVeiculo, tarifa, entrada, saida);
    await this.feedback.sucesso('Entrada e saída registradas.');
    await this.router.navigate(['/pagamento', id], { replaceUrl: true });
  }

  private async registrarSaida(): Promise<void> {
    const idEstadia = this.idEstadia();
    const saida = this.saidaIso();
    if (!idEstadia || !saida) {
      await this.feedback.aviso('Selecione o veículo e informe a data e o horário de saída.');
      return;
    }
    await this.estadiasRepo.registrarSaida(idEstadia, saida);
    await this.feedback.sucesso('Saída registrada.');
    await this.router.navigate(['/pagamento', idEstadia], { replaceUrl: true });
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      if (this.modo() === 'saida') {
        const abertas = await this.estadiasRepo.listarAbertas();
        this.abertas.set(abertas);
        const solicitada = Number(this.rota.snapshot.queryParamMap.get('estadia'));
        const preSelecionada = abertas.find((e) => e.id_estadia === solicitada) ?? abertas[0];
        this.idEstadia.set(preSelecionada?.id_estadia ?? null);
      } else {
        const [veiculos, tarifas] = await Promise.all([
          this.veiculosRepo.listarForaDoPatio(),
          this.tarifasRepo.listar(),
        ]);
        this.veiculos.set(veiculos);
        this.tarifas.set(tarifas);
        this.idTarifa.set(tarifas[0]?.id_tarifa ?? null);
        if (!veiculos.some((v) => v.id_veiculo === this.idVeiculo())) {
          this.idVeiculo.set(null);
        }
      }
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.carregando.set(false);
    }
  }
}
