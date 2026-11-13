import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ClientesPage } from './clientes.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ClientesPage }])],
  declarations: [ClientesPage],
})
export class ClientesPageModule {}
