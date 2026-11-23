import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { IntegrantesPage } from './integrantes.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: IntegrantesPage }])],
  declarations: [IntegrantesPage],
})
export class IntegrantesPageModule {}
