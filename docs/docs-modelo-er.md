## Documentação técnica – Modelagem do banco de dados

Este documento tem como finalidade centralizar o esclarecimento de dúvidas técnicas relacionadas à modelagem do banco de dados do sistema de estacionamento, abrangendo a definição das entidades, seus respectivos atributos, os relacionamentos entre elas e suas cardinalidades.

Além disso, apresenta as restrições de integridade e a correspondência entre a estrutura do banco de dados e os requisitos funcionais do sistema, visando garantir a consistência e a organização das informações armazenadas.

### Descrição das tabelas

#### Tabela CLIENTE

Armazena os dados dos clientes do estacionamento.

| Coluna     | Tipo de dado | Restrições                     |
| ---------- | ------------ | ------------------------------ |
| id_cliente | INTEGER      | Chave primária, autoincremento |
| nome       | TEXT         | Não nulo                       |
| cpf        | TEXT         | Não nulo, único                |
| telefone   | TEXT         | Opcional                       |
| email      | TEXT         | Opcional                       |

#### Tabela VEICULO

Armazena os veículos vinculados aos clientes.

| Coluna     | Tipo de dado | Restrições                               |
| ---------- | ------------ | ---------------------------------------- |
| id_veiculo | INTEGER      | Chave primária, autoincremento           |
| placa      | TEXT         | Não nulo, único                          |
| modelo     | TEXT         | Não nulo                                 |
| cor        | TEXT         | Opcional                                 |
| id_cliente | INTEGER      | Não nulo, chave estrangeira para CLIENTE |

#### Tabela TARIFA

Armazena os valores utilizados no cálculo da cobrança.

| Coluna       | Tipo de dado | Restrições                      |
| ------------ | ------------ | ------------------------------- |
| id_tarifa    | INTEGER      | Chave primária, autoincremento  |
| descricao    | TEXT         | Não nulo                        |
| valor_hora   | REAL         | Não nulo, maior ou igual a zero |
| valor_diaria | REAL         | Opcional, maior ou igual a zero |

#### Tabela ESTADIA

Registra a entrada, a saída e o valor cobrado por cada permanência.

| Coluna            | Tipo de dado | Restrições                                  |
| ----------------- | ------------ | ------------------------------------------- |
| id_estadia        | INTEGER      | Chave primária, autoincremento              |
| id_veiculo        | INTEGER      | Não nulo, chave estrangeira para VEICULO    |
| id_tarifa         | INTEGER      | Não nulo, chave estrangeira para TARIFA     |
| data_hora_entrada | TEXT         | Não nulo (formato ISO 8601)                 |
| data_hora_saida   | TEXT         | Opcional; deve ser maior ou igual à entrada |
| tempo_permanencia | INTEGER      | Opcional (em minutos)                       |
| valor_total       | REAL         | Opcional                                    |

### Relacionamentos

A estrutura do banco de dados estabelece três relacionamentos principais entre as entidades, conforme apresentado a seguir.

| Relacionamento               | Cardinalidade | Chave estrangeira                       |
| ---------------------------- | ------------- | --------------------------------------- |
| CLIENTE possui VEICULO       | 1:N           | VEICULO.id_cliente → CLIENTE.id_cliente |
| VEICULO realiza ESTADIA      | 1:N           | ESTADIA.id_veiculo → VEICULO.id_veiculo |
| TARIFA é aplicada em ESTADIA | 1:N           | ESTADIA.id_tarifa → TARIFA.id_tarifa    |

- **CLIENTE e VEICULO:** um cliente pode possuir um ou vários veículos, enquanto cada veículo está obrigatoriamente vinculado a um único cliente.
- **VEICULO e ESTADIA:** um veículo pode possuir diversos registros de estadia ao longo do tempo, enquanto cada estadia está associada a um único veículo.
- **TARIFA e ESTADIA:** uma tarifa pode ser utilizada em diversas estadias, enquanto cada estadia utiliza uma única tarifa para o cálculo da cobrança.

### Restrições de integridade

Para garantir a consistência e a confiabilidade das informações armazenadas, o banco de dados estabelece as seguintes restrições:

| Tipo                    | Aplicação                                                                |
| ----------------------- | ------------------------------------------------------------------------ |
| Chave primária          | id_cliente, id_veiculo, id_tarifa, id_estadia                            |
| Chave estrangeira       | VEICULO.id_cliente, ESTADIA.id_veiculo, ESTADIA.id_tarifa                |
| Unicidade               | CLIENTE.cpf, VEICULO.placa                                               |
| Não nulo                | Colunas obrigatórias indicadas nas tabelas                               |
| Verificação (CHECK)     | valor_hora >= 0; valor_diaria >= 0; data_hora_saida >= data_hora_entrada |
| Integridade referencial | ON DELETE RESTRICT e ON UPDATE CASCADE em todas as chaves estrangeiras   |

Essas restrições têm como objetivo evitar inconsistências, impedir duplicidade de informações que devem ser únicas e garantir que os relacionamentos entre as tabelas sejam mantidos corretamente.

### Correspondência com os requisitos funcionais

A modelagem proposta contempla os requisitos funcionais definidos para o sistema, conforme a correspondência apresentada abaixo.

| Requisito | Atendido por                                                                       |
| --------- | ---------------------------------------------------------------------------------- |
| RU01      | Tabela CLIENTE                                                                     |
| RU02      | Relacionamento CLIENTE 1:N VEICULO                                                 |
| RU03      | ESTADIA.data_hora_entrada                                                          |
| RU04      | ESTADIA.data_hora_saida                                                            |
| RU05      | Tabela TARIFA e ESTADIA.valor_total                                                |
| RU06      | Consulta a CLIENTE com junção em VEICULO                                           |
| RU07      | ESTADIA.tempo_permanencia e ESTADIA.valor_total                                    |
| RU08      | VEICULO.id_cliente                                                                 |
| RU09      | Registros de entrada e saída inseridos manualmente, sem equipamentos automatizados |
