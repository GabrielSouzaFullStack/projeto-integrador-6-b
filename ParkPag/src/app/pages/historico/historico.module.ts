import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HistoricoPage } from './historico.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: HistoricoPage }])],
  declarations: [HistoricoPage],
})
export class HistoricoPageModule {}
