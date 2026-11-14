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

type Modo = 'entrada' | 'saida' | 'editar';
type CampoData = 'dataEntrada' | 'horaEntrada' | 'dataSaida' | 'horaSaida';

/**
 * Wireframe 07 – Registro de entrada e saída (RU03, RU04, RU05, RU09).
 *
 * - /movimentacao/entrada: abre uma estadia; opcionalmente já informa a
 *   saída (lançamento retroativo).
 * - /movimentacao/saida: fecha uma estadia aberta e calcula o valor.
 * - /movimentacao/editar?estadia=ID: corrige tarifa, entrada e saída de uma
 *   estadia ainda não paga (recalcula o valor) ou a exclui.
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
  /** Estadia carregada no modo "editar". */
  readonly emEdicao = signal<EstadiaDetalhada | null>(null);

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

  readonly temSaida = computed(() => {
    if (this.modo() === 'editar') return !!this.emEdicao()?.data_hora_saida;
    return this.modo() === 'saida' || this.informarSaida();
  });

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
    if (entrada && this.modo() !== 'saida' && entrada > agora) {
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

  /** Há um veículo/estadia disponível para mostrar os campos de data. */
  readonly podeInformarDatas = computed(() => {
    if (this.modo() === 'saida') return this.abertas().length > 0;
    if (this.modo() === 'editar') return !!this.emEdicao();
    return this.veiculos().length > 0;
  });

  /** O botão principal só é habilitado com um veículo/estadia selecionado. */
  readonly selecaoValida = computed(() => {
    if (this.modo() === 'saida') return !!this.idEstadia();
    if (this.modo() === 'editar') return !!this.emEdicao() && !!this.idTarifa();
    return !!this.idVeiculo();
  });

  readonly titulo = computed(() => {
    if (this.modo() === 'saida') return 'Registrar saída';
    if (this.modo() === 'editar') return 'Editar estadia';
    return this.informarSaida() ? 'Registrar entrada e saída' : 'Registrar entrada';
  });

  ionViewWillEnter(): void {
    const param = this.rota.snapshot.paramMap.get('modo');
    const modo: Modo = param === 'saida' || param === 'editar' ? param : 'entrada';
    this.modo.set(modo);
    this.emEdicao.set(null);

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
      } else if (this.modo() === 'editar') {
        await this.salvarEdicao();
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

  private async salvarEdicao(): Promise<void> {
    const estadia = this.emEdicao();
    const tarifa = this.tarifas().find((t) => t.id_tarifa === this.idTarifa());
    const entrada = this.entradaIso();
    const saida = this.saidaIso();
    if (!estadia || !tarifa || !entrada || (this.temSaida() && !saida)) {
      await this.feedback.aviso('Informe a tarifa e as datas e horários da estadia.');
      return;
    }
    await this.estadiasRepo.atualizar(estadia.id_estadia!, tarifa, entrada, saida);
    await this.feedback.sucesso('Estadia atualizada.');
    await this.voltarDaEdicao(estadia);
  }

  /** Exclui a estadia em edição (lançamento feito por engano). */
  async excluir(): Promise<void> {
    const estadia = this.emEdicao();
    if (!estadia) return;
    const confirmado = await this.feedback.confirmar(
      'Excluir estadia',
      'Deseja excluir esta estadia? Esta ação não pode ser desfeita.',
      'Excluir',
    );
    if (!confirmado) return;
    try {
      await this.estadiasRepo.excluir(estadia.id_estadia!);
      await this.feedback.sucesso('Estadia excluída.');
      await this.router.navigate(['/historico'], { replaceUrl: true });
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  /** Estadia fechada volta para o pagamento; aberta, para o histórico. */
  private async voltarDaEdicao(estadia: EstadiaDetalhada): Promise<void> {
    if (estadia.data_hora_saida) {
      await this.router.navigate(['/pagamento', estadia.id_estadia], { replaceUrl: true });
    } else {
      await this.router.navigate(['/historico'], { replaceUrl: true });
    }
  }

  private async carregarEdicao(): Promise<void> {
    const id = Number(this.rota.snapshot.queryParamMap.get('estadia'));
    const [estadia, tarifas] = await Promise.all([
      id ? this.estadiasRepo.obter(id) : Promise.resolve(null),
      this.tarifasRepo.listar(),
    ]);
    if (!estadia) {
      await this.feedback.aviso('Estadia não encontrada.');
      await this.router.navigate(['/historico'], { replaceUrl: true });
      return;
    }
    if (estadia.status_pagamento === 'PAGO') {
      await this.feedback.aviso('Estadias com pagamento confirmado não podem ser alteradas.');
      await this.voltarDaEdicao(estadia);
      return;
    }
    this.emEdicao.set(estadia);
    this.tarifas.set(tarifas);
    this.idTarifa.set(estadia.id_tarifa);
    const saida = estadia.data_hora_saida ?? agoraIsoLocal();
    this.datas.set({
      dataEntrada: extrairData(estadia.data_hora_entrada),
      horaEntrada: extrairHora(estadia.data_hora_entrada),
      dataSaida: extrairData(saida),
      horaSaida: extrairHora(saida),
    });
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      if (this.modo() === 'editar') {
        await this.carregarEdicao();
      } else if (this.modo() === 'saida') {
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
