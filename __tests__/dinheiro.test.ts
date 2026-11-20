import { formatarCentavos, parseValorParaCentavos } from '@/utils/dinheiro';

describe('formatarCentavos', () => {
  it('formata em reais', () => {
    expect(formatarCentavos(0)).toBe('R$ 0,00');
    expect(formatarCentavos(5)).toBe('R$ 0,05');
    expect(formatarCentavos(1234)).toBe('R$ 12,34');
    expect(formatarCentavos(123456789)).toBe('R$ 1.234.567,89');
  });

  it('formata negativos', () => {
    expect(formatarCentavos(-1050)).toBe('-R$ 10,50');
  });
});

describe('parseValorParaCentavos', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['R$ 9,99', 999],
    ['0,10', 10],
  ])('"%s" -> %i', (entrada, esperado) => {
    expect(parseValorParaCentavos(entrada)).toBe(esperado);
  });

  it.each(['', 'abc', '12,345', '-5', '1,2,3'])('rejeita "%s"', (entrada) => {
    expect(parseValorParaCentavos(entrada)).toBeNull();
  });
});
