import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { VeiculosPage } from './veiculos.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: VeiculosPage }])],
  declarations: [VeiculosPage],
})
export class VeiculosPageModule {}
