import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PagamentoPage } from './pagamento.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: PagamentoPage }])],
  declarations: [PagamentoPage],
})
export class PagamentoPageModule {}
