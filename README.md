# ParkPag

## Problema que o projeto resolve

Empresas de estacionamento privativo precisam de uma forma confiável e prática de registrar os veículos de seus clientes e calcular o valor final a ser pago. Nem sempre elas possuem capital suficiente para investir em um totem que faça a leitura automática dos horários. É nesse nicho que a ParkPag entra.

O aplicativo ParkPag permite que o negócio cadastre seus clientes e vincule um ou mais veículos a cada um deles. Com base nos horários de entrada e saída informados manualmente pelo usuário da empresa, o valor final a ser pago é calculado automaticamente.

## Público-alvo

Empresas de estacionamento privativo que não possuem capital suficiente para investir em totens automatizados com leitura dos horários de entrada e saída e sistema de cancelas.

## Modelo Entidade-Relacionamento (ER) do Banco de Dados Local

### Introdução

O banco de dados local do aplicativo ParkPag foi modelado em SQLite e é composto por quatro tabelas: CLIENTE, VEICULO, TARIFA e ESTADIA. O modelo atende aos requisitos funcionais RF01 a RF09 e às exigências mínimas da atividade, conforme o quadro a seguir.

| Exigência | Atendimento |
|---|---|
| Mínimo de 4 tabelas | 4 tabelas |
| Mínimo de 3 colunas por tabela | CLIENTE (5), VEICULO (5), TARIFA (4) e ESTADIA (7) |
| Relação entre ao menos 2 tabelas | 3 relacionamentos do tipo 1:N |

### Descrição das tabelas

#### Tabela CLIENTE

Armazena os dados dos clientes do estacionamento.

| Coluna | Tipo de dado | Restrições |
|---|---|---|
| id_cliente | INTEGER | Chave primária, autoincremento |
| nome | TEXT | Não nulo |
| cpf | TEXT | Não nulo, único |
| telefone | TEXT | Opcional |
| email | TEXT | Opcional |

#### Tabela VEICULO 

Armazena os veículos vinculados aos clientes.

| Coluna | Tipo de dado | Restrições |
|---|---|---|
| id_veiculo | INTEGER | Chave primária, autoincremento |
| placa | TEXT | Não nulo, único |
| modelo | TEXT | Não nulo |
| cor | TEXT | Opcional |
| id_cliente | INTEGER | Não nulo, chave estrangeira para CLIENTE |

#### Tabela TARIFA

Armazena os valores utilizados no cálculo da cobrança.

| Coluna | Tipo de dado | Restrições |
|---|---|---|
| id_tarifa | INTEGER | Chave primária, autoincremento |
| descricao | TEXT | Não nulo |
| valor_hora | REAL | Não nulo, maior ou igual a zero |
| valor_diaria | REAL | Opcional, maior ou igual a zero |

#### Tabela ESTADIA

Registra a entrada, a saída e o valor cobrado por cada permanência.
| Coluna | Tipo de dado | Restrições |
|---|---|---|
| id_estadia | INTEGER | Chave primária, autoincremento |
| id_veiculo | INTEGER | Não nulo, chave estrangeira para VEICULO |
| id_tarifa | INTEGER | Não nulo, chave estrangeira para TARIFA |
| data_hora_entrada | TEXT | Não nulo (formato ISO 8601) |
| data_hora_saida | TEXT | Opcional; deve ser maior ou igual à entrada |
| tempo_permanencia | INTEGER | Opcional (em minutos) |
| valor_total | REAL | Opcional |

###  Relacionamentos
| Relacionamento | Cardinalidade | Chave estrangeira |
|---|---|---|
| CLIENTE possui VEICULO | 1:N | VEICULO.id_cliente → CLIENTE.id_cliente |
| VEICULO realiza ESTADIA | 1:N | ESTADIA.id_veiculo → VEICULO.id_veiculo |
| TARIFA é aplicada em ESTADIA | 1:N | ESTADIA.id_tarifa → TARIFA.id_tarifa |
 
Um cliente pode possuir um ou mais veículos, e cada veículo pertence a um único cliente. Um veículo pode ter várias estadias, e cada estadia refere-se a um único veículo. Uma tarifa pode ser aplicada a várias estadias, e cada estadia utiliza uma única tarifa.

### Restrições de integridade
| Tipo | Aplicação |
|---|---|
| Chave primária | id_cliente, id_veiculo, id_tarifa, id_estadia |
| Chave estrangeira | VEICULO.id_cliente, ESTADIA.id_veiculo, ESTADIA.id_tarifa |
| Unicidade | CLIENTE.cpf, VEICULO.placa |
| Não nulo | Colunas obrigatórias indicadas nas tabelas |
| Verificação (CHECK) | valor_hora >= 0; valor_diaria >= 0; data_hora_saida >= data_hora_entrada |
| Integridade referencial | ON DELETE RESTRICT e ON UPDATE CASCADE em todas as chaves estrangeiras |

### Correspondência com os requisitos funcionais
| Requisito | Atendido por |
|---|---|
| RF01 | Tabela CLIENTE |
| RF02 | Relacionamento CLIENTE 1:N VEICULO |
| RF03 | ESTADIA.data_hora_entrada |
| RF04 | ESTADIA.data_hora_saida |
| RF05 | Tabela TARIFA e ESTADIA.valor_total |
| RF06 | Consulta a CLIENTE com junção em VEICULO |
| RF07 | ESTADIA.tempo_permanencia e ESTADIA.valor_total |
| RF08 | VEICULO.id_cliente |
| RF09 | Registros de entrada e saída inseridos manualmente, sem equipamentos automatizados |

### Imagem do Diagrama ER

![Diagrama ER](./images/diagrama-er.png)

---

## Tecnologias, bibliotecas e linguagens de programação a ser utilizada

- Ionic - Link de referência: https://ionicframework.com/docs/
- Angular - Link de referência: https://angular.dev/
- TypeScript - Link de referência: https://www.typescriptlang.org/
- Capacitor - Link de referência: https://capacitorjs.com/
- SQLite - Link de referência: https://www.sqlite.org/

## Banco de dados local a ser utilizado e como será implementado

Será utilizado o banco de dados `SQLite` tendo em vista que o aplicativo proposto deverá operar sem conectividade com a internet, e é amplamente utilizada em aplicações móveis por ser leve, não exigir servidor e funcionar localmente no dispositivo.

O método de implementação será em um arquivo físico conhecido como `Disk-based` onde os dados serão salvos em um único arquivo no disco do dispositivo, como database.sqlite ou dados.db. Esta técnica permite manter uma persistência dos dados após a finalização da execução da aplicação e até mesmo a reinicialização do dispositivo.