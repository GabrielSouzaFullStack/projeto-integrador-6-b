import { Component, input } from '@angular/core';

/**
 * Cabeçalho azul-marinho com botão de voltar, usado em todas as telas
 * internas. Botões extras podem ser projetados com `<ion-buttons slot="end">`.
 */
@Component({
  selector: 'app-cabecalho',
  standalone: false,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary" class="pp-toolbar">
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="voltarPara()" text="" icon="chevron-back"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ titulo() }}</ion-title>
        <ng-content></ng-content>
      </ion-toolbar>
    </ion-header>
  `,
})
export class CabecalhoComponent {
  readonly titulo = input.required<string>();
  /** Rota usada pelo botão voltar quando não há histórico de navegação. */
  readonly voltarPara = input('/menu');
}
