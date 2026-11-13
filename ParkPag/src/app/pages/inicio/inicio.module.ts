import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { InicioPage } from './inicio.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: InicioPage }])],
  declarations: [InicioPage],
})
export class InicioPageModule {}
