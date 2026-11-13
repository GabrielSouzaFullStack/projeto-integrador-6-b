import { Component } from '@angular/core';
import { inicial } from '../../core/utils/formatadores';

/** Wireframe 10 – Integrantes da equipe. */
@Component({
  selector: 'app-integrantes',
  templateUrl: 'integrantes.page.html',
  standalone: false,
})
export class IntegrantesPage {
  readonly integrantes = [
    'Ayla Djan Andos Abreu',
    'Gabriel Souza',
    'Júlia Brambatti Pereira',
    'Luis Carlos Gomes Lopes Filho',
    'Maicon Casagrande Pinto',
  ];

  readonly inicial = inicial;
}
