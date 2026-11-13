import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { traduzirErro } from '../utils/erros';

/** Mensagens ao usuário: toasts de sucesso/erro e confirmações. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly toast = inject(ToastController);
  private readonly alerta = inject(AlertController);

  async sucesso(mensagem: string): Promise<void> {
    await this.mostrar(mensagem, 'success');
  }

  async erro(erro: unknown): Promise<void> {
    console.error(erro);
    await this.mostrar(traduzirErro(erro), 'danger');
  }

  async aviso(mensagem: string): Promise<void> {
    await this.mostrar(mensagem, 'warning');
  }

  /** Pede confirmação; resolve true se o usuário confirmar. */
  async confirmar(titulo: string, mensagem: string, textoConfirmar = 'Confirmar'): Promise<boolean> {
    const alerta = await this.alerta.create({
      header: titulo,
      message: mensagem,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: textoConfirmar, role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    return role === 'confirm';
  }

  private async mostrar(mensagem: string, cor: string): Promise<void> {
    const toast = await this.toast.create({
      message: mensagem,
      color: cor,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }
}
