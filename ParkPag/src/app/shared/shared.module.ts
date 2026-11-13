import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { CabecalhoComponent } from './components/cabecalho/cabecalho.component';
import {
  CpfPipe,
  DataBrPipe,
  DuracaoPipe,
  MoedaPipe,
  PlacaPipe,
  TelefonePipe,
} from './pipes/formatadores.pipes';

const DECLARACOES = [
  CabecalhoComponent,
  MoedaPipe,
  DuracaoPipe,
  PlacaPipe,
  TelefonePipe,
  CpfPipe,
  DataBrPipe,
];

/** Reúne o que todas as páginas usam: Ionic, formulários, cabeçalho e pipes. */
@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: DECLARACOES,
  exports: [CommonModule, FormsModule, IonicModule, ...DECLARACOES],
})
export class SharedModule {}
