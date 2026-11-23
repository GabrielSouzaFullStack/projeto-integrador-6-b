import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular/lazy';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SQLiteService } from './core/services/sqlite.service';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Cria/abre o banco na abertura do app. Se falhar, o app abre mesmo assim
    // e as telas tentam inicializar de novo ao consultar (exibindo o erro).
    provideAppInitializer(() =>
      inject(SQLiteService)
        .iniciarDatabase()
        .catch((erro) => console.error('Falha ao iniciar o banco de dados', erro)),
    ),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
