import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ConfiguracoesPage } from './configuracoes.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ConfiguracoesPage }])],
  declarations: [ConfiguracoesPage],
})
export class ConfiguracoesPageModule {}
