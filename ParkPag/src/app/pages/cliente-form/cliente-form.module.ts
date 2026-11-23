import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ClienteFormPage } from './cliente-form.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ClienteFormPage }])],
  declarations: [ClienteFormPage],
})
export class ClienteFormPageModule {}
