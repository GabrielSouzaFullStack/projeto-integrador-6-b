import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular/lazy';
import { Cliente } from '../../core/models/cliente.model';
import { ClienteRepository } from '../../core/repositories/cliente.repository';
import { FeedbackService } from '../../core/services/feedback.service';
import {
  agoraIsoLocal,
  dataBrParaIso,
  extrairData,
  formatarCep,
  formatarCpf,
  formatarData,
  formatarDataDigitada,
  formatarTelefone,
  validarCpf,
  validarEmail,
  validarTelefone,
} from '../../core/utils/formatadores';

interface FormCliente {
  nome: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

type Campo = keyof FormCliente;

const FORM_VAZIO: FormCliente = {
  nome: '',
  telefone: '',
  cpf: '',
  nascimento: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

const MASCARAS: Partial<Record<Campo, (valor: string) => string>> = {
  telefone: formatarTelefone,
  cpf: formatarCpf,
  nascimento: formatarDataDigitada,
  cep: formatarCep,
};

/** Wireframe 04 – Cadastro e edição de clientes (RU01). */
@Component({
  selector: 'app-cliente-form',
  templateUrl: 'cliente-form.page.html',
  standalone: false,
})
export class ClienteFormPage implements OnInit {
  private readonly clientesRepo = inject(ClienteRepository);
  private readonly feedback = inject(FeedbackService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);

  readonly ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  readonly form = signal<FormCliente>({ ...FORM_VAZIO });
  readonly erros = signal<Partial<Record<Campo, string>>>({});
  readonly salvando = signal(false);
  readonly idCliente = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    const id = Number(this.rota.snapshot.paramMap.get('id'));
    if (!id) return;

    this.idCliente.set(id);
    try {
      const cliente = await this.clientesRepo.obter(id);
      if (!cliente) {
        await this.feedback.aviso('Cliente não encontrado.');
        this.nav.navigateRoot('/clientes');
        return;
      }
      this.form.set({
        nome: cliente.nome,
        telefone: formatarTelefone(cliente.telefone),
        cpf: formatarCpf(cliente.cpf),
        nascimento: formatarData(cliente.data_nascimento),
        email: cliente.email ?? '',
        cep: formatarCep(cliente.cep),
        logradouro: cliente.logradouro ?? '',
        numero: cliente.numero ?? '',
        complemento: cliente.complemento ?? '',
        bairro: cliente.bairro ?? '',
        cidade: cliente.cidade ?? '',
        uf: cliente.uf ?? '',
      });
    } catch (erro) {
      await this.feedback.erro(erro);
    }
  }

  /** Atualiza um campo aplicando a máscara correspondente (se houver). */
  alterar(campo: Campo, evento: Event): void {
    const alvo = evento.target as unknown as { value: string | number | null | undefined };
    const bruto = String(alvo.value ?? '');
    const mascara = MASCARAS[campo];
    const valor = mascara ? mascara(bruto) : bruto;
    if (mascara) {
      alvo.value = valor;
    }
    this.form.update((f) => ({ ...f, [campo]: valor }));
    if (this.erros()[campo]) {
      this.erros.update((e) => ({ ...e, [campo]: undefined }));
    }
  }

  selecionarUf(uf: string | null | undefined): void {
    this.form.update((f) => ({ ...f, uf: uf ?? '' }));
  }

  async salvar(): Promise<void> {
    const f = this.form();
    const erros = this.validar(f);
    this.erros.set(erros);
    if (Object.keys(erros).length > 0) {
      await this.feedback.aviso('Verifique os campos destacados.');
      return;
    }

    const cliente: Cliente = {
      id_cliente: this.idCliente() ?? undefined,
      nome: f.nome,
      cpf: f.cpf,
      telefone: f.telefone,
      email: f.email,
      data_nascimento: f.nascimento ? dataBrParaIso(f.nascimento) : null,
      cep: f.cep,
      logradouro: f.logradouro,
      numero: f.numero,
      complemento: f.complemento,
      bairro: f.bairro,
      cidade: f.cidade,
      uf: f.uf,
    };

    this.salvando.set(true);
    try {
      if (this.idCliente()) {
        await this.clientesRepo.atualizar(cliente);
        await this.feedback.sucesso('Cliente atualizado.');
        this.nav.back();
      } else {
        const id = await this.clientesRepo.inserir(cliente);
        await this.feedback.sucesso('Cliente cadastrado.');
        await this.router.navigate(['/clientes', id], { replaceUrl: true });
      }
    } catch (erro) {
      await this.feedback.erro(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  private validar(f: FormCliente): Partial<Record<Campo, string>> {
    const erros: Partial<Record<Campo, string>> = {};
    if (!f.nome.trim()) erros.nome = 'Informe o nome.';
    if (!validarCpf(f.cpf)) erros.cpf = 'CPF inválido.';
    if (f.telefone && !validarTelefone(f.telefone)) erros.telefone = 'Telefone inválido.';
    if (f.email && !validarEmail(f.email)) erros.email = 'E-mail inválido.';
    if (f.nascimento) {
      const iso = dataBrParaIso(f.nascimento);
      if (!iso || iso > extrairData(agoraIsoLocal())) {
        erros.nascimento = 'Data inválida.';
      }
    }
    if (f.cep && f.cep.replace(/\D/g, '').length !== 8) erros.cep = 'CEP inválido.';
    return erros;
  }
}
