import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'inicio',
    loadChildren: () => import('./pages/inicio/inicio.module').then((m) => m.InicioPageModule),
  },
  {
    path: 'menu',
    loadChildren: () => import('./pages/menu/menu.module').then((m) => m.MenuPageModule),
  },
  {
    path: 'clientes',
    loadChildren: () => import('./pages/clientes/clientes.module').then((m) => m.ClientesPageModule),
  },
  {
    path: 'clientes/novo',
    loadChildren: () =>
      import('./pages/cliente-form/cliente-form.module').then((m) => m.ClienteFormPageModule),
  },
  {
    path: 'clientes/:id/editar',
    loadChildren: () =>
      import('./pages/cliente-form/cliente-form.module').then((m) => m.ClienteFormPageModule),
  },
  {
    path: 'clientes/:id',
    loadChildren: () =>
      import('./pages/cliente-detalhes/cliente-detalhes.module').then((m) => m.ClienteDetalhesPageModule),
  },
  {
    path: 'veiculos',
    loadChildren: () => import('./pages/veiculos/veiculos.module').then((m) => m.VeiculosPageModule),
  },
  {
    // :modo = entrada | saida
    path: 'movimentacao/:modo',
    loadChildren: () =>
      import('./pages/movimentacao/movimentacao.module').then((m) => m.MovimentacaoPageModule),
  },
  {
    path: 'pagamento/:id',
    loadChildren: () => import('./pages/pagamento/pagamento.module').then((m) => m.PagamentoPageModule),
  },
  {
    path: 'historico',
    loadChildren: () => import('./pages/historico/historico.module').then((m) => m.HistoricoPageModule),
  },
  {
    path: 'configuracoes',
    loadChildren: () =>
      import('./pages/configuracoes/configuracoes.module').then((m) => m.ConfiguracoesPageModule),
  },
  {
    path: 'integrantes',
    loadChildren: () =>
      import('./pages/integrantes/integrantes.module').then((m) => m.IntegrantesPageModule),
  },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
