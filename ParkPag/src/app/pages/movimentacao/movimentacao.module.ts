import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { MovimentacaoPage } from './movimentacao.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: MovimentacaoPage }])],
  declarations: [MovimentacaoPage],
})
export class MovimentacaoPageModule {}
