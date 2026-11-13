import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ClienteDetalhesPage } from './cliente-detalhes.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ClienteDetalhesPage }])],
  declarations: [ClienteDetalhesPage],
})
export class ClienteDetalhesPageModule {}
