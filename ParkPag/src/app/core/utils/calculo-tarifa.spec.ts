import { calcularCobranca } from './calculo-tarifa';

describe('calcularCobranca', () => {
  const porHora = { valor_hora: 5, valor_diaria: null };

  it('cobra horas exatas (wireframe 07: 3h00 × R$ 5,00 = R$ 15,00)', () => {
    const r = calcularCobranca('2026-10-27T08:30:00', '2026-10-27T11:30:00', porHora);
    expect(r).toEqual({ minutos: 180, horasCobradas: 3, valor: 15 });
  });

  it('arredonda a fração de hora para cima', () => {
    const r = calcularCobranca('2026-10-27T08:00:00', '2026-10-27T10:10:00', porHora);
    expect(r.minutos).toBe(130);
    expect(r.horasCobradas).toBe(3);
    expect(r.valor).toBe(15);
  });

  it('cobra zero quando entrada e saída são iguais', () => {
    const r = calcularCobranca('2026-10-27T08:00:00', '2026-10-27T08:00:00', porHora);
    expect(r).toEqual({ minutos: 0, horasCobradas: 0, valor: 0 });
  });

  it('calcula estadias que viram o dia', () => {
    const r = calcularCobranca('2026-10-27T22:00:00', '2026-10-28T01:30:00', porHora);
    expect(r.minutos).toBe(210);
    expect(r.valor).toBe(20);
  });

  it('limita cada bloco de 24 horas ao valor da diária', () => {
    const tarifa = { valor_hora: 5, valor_diaria: 40 };
    // 26h: 1 diária (40) + 2h (10)
    const r = calcularCobranca('2026-10-27T08:00:00', '2026-10-28T10:00:00', tarifa);
    expect(r.valor).toBe(50);
  });

  it('aplica a diária também no último bloco incompleto', () => {
    const tarifa = { valor_hora: 5, valor_diaria: 40 };
    // 20h = 100 por hora, limitado a 40
    const r = calcularCobranca('2026-10-27T08:00:00', '2026-10-28T04:00:00', tarifa);
    expect(r.valor).toBe(40);
  });

  it('arredonda o valor para centavos', () => {
    const r = calcularCobranca('2026-10-27T08:00:00', '2026-10-27T09:00:00', { valor_hora: 3.333 });
    expect(r.valor).toBe(3.33);
  });

  it('rejeita saída anterior à entrada', () => {
    expect(() => calcularCobranca('2026-10-27T10:00:00', '2026-10-27T09:00:00', porHora)).toThrow();
  });

  it('rejeita datas inválidas', () => {
    expect(() => calcularCobranca('data-invalida', '2026-10-27T09:00:00', porHora)).toThrow();
  });
});
