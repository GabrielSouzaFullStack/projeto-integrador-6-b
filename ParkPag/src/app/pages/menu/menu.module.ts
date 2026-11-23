import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { MenuPage } from './menu.page';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: MenuPage }])],
  declarations: [MenuPage],
})
export class MenuPageModule {}
