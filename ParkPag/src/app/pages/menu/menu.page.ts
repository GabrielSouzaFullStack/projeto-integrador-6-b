import { Component } from '@angular/core';

interface ItemMenu {
  titulo: string;
  descricao: string;
  icone: string;
  rota: string;
  estilo: '' | 'pp-icone-azul' | 'pp-icone-amarelo';
}

/**
 * Wireframe 02 – Menu principal.
 * "Relatórios" e "Relatórios diários" estão no backlog do planejamento
 * e entrarão no menu quando forem implementados.
 */
@Component({
  selector: 'app-menu',
  templateUrl: 'menu.page.html',
  standalone: false,
})
export class MenuPage {
  readonly itens: ItemMenu[] = [
    { titulo: 'Clientes', descricao: 'Cadastro e consulta', icone: 'person-outline', rota: '/clientes', estilo: '' },
    { titulo: 'Veículos', descricao: 'Placas e proprietários', icone: 'car-outline', rota: '/veiculos', estilo: 'pp-icone-azul' },
    { titulo: 'Registrar entrada', descricao: 'Data e horário', icone: 'log-in-outline', rota: '/movimentacao/entrada', estilo: 'pp-icone-amarelo' },
    { titulo: 'Registrar saída', descricao: 'Cálculo do valor', icone: 'log-out-outline', rota: '/movimentacao/saida', estilo: 'pp-icone-amarelo' },
    { titulo: 'Histórico', descricao: 'Entradas, saídas e valores', icone: 'time-outline', rota: '/historico', estilo: 'pp-icone-azul' },
    { titulo: 'Configurações', descricao: 'Tarifas de cobrança', icone: 'settings-outline', rota: '/configuracoes', estilo: '' },
    { titulo: 'Integrantes', descricao: 'Equipe do projeto', icone: 'people-outline', rota: '/integrantes', estilo: '' },
  ];
}
