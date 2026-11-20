import type { DataISO } from '@/types/lancamento';
import {
  formatarDataBR,
  formatarEntradaDataBR,
  hojeISO,
  ontemISO,
  parseDataBRParaISO,
} from '@/utils/datas';

describe('formatarDataBR', () => {
  it('converte YYYY-MM-DD válida para DD/MM/AAAA', () => {
    expect(formatarDataBR('2026-11-20')).toBe('20/11/2026');
    expect(formatarDataBR('2024-02-29')).toBe('29/02/2024');
    expect(formatarDataBR('2026-01-05')).toBe('05/01/2026');
  });

  it('retorna string vazia quando a data ISO é inválida', () => {
    expect(formatarDataBR('2026-02-31' as DataISO)).toBe('');
    expect(formatarDataBR('2026-13-01' as DataISO)).toBe('');
    expect(formatarDataBR('20/11/2026' as DataISO)).toBe('');
  });
});

describe('parseDataBRParaISO', () => {
  it.each([
    ['20/11/2026', '2026-11-20'],
    ['01/01/2026', '2026-01-01'],
    [' 15/03/2026 ', '2026-03-15'],
    ['29/02/2024', '2024-02-29'],
  ])('converte "%s" para "%s"', (entrada, esperado) => {
    expect(parseDataBRParaISO(entrada)).toBe(esperado);
  });

  it.each([
    '31/02/2026',
    '29/02/2026',
    '31/04/2026',
    '30/02/2024',
    '00/11/2026',
    '15/13/2026',
    '15/00/2026',
  ])('rejeita data inexistente "%s"', (entrada) => {
    expect(parseDataBRParaISO(entrada)).toBeNull();
  });

  it.each(['', 'abc', '2026-11-20', '1/2/2026', '20/11/26', '20-11-2026'])(
    'rejeita formato inválido "%s"',
    (entrada) => {
      expect(parseDataBRParaISO(entrada)).toBeNull();
    },
  );

  it('mantém ida e volta (round-trip) consistente', () => {
    const iso = parseDataBRParaISO('19/11/2026');
    expect(iso).toBe('2026-11-19');
    expect(formatarDataBR(iso!)).toBe('19/11/2026');
  });
});

describe('formatarEntradaDataBR', () => {
  it('formata dígitos progressivamente para DD/MM/AAAA', () => {
    expect(formatarEntradaDataBR('')).toBe('');
    expect(formatarEntradaDataBR('1')).toBe('1');
    expect(formatarEntradaDataBR('15')).toBe('15');
    expect(formatarEntradaDataBR('150')).toBe('15/0');
    expect(formatarEntradaDataBR('1503')).toBe('15/03');
    expect(formatarEntradaDataBR('15032026')).toBe('15/03/2026');
  });

  it('aceita texto com barras, ignora caracteres não numéricos e limita a 8 dígitos', () => {
    expect(formatarEntradaDataBR('31/02/2026')).toBe('31/02/2026');
    expect(formatarEntradaDataBR('15a03b202699')).toBe('15/03/2026');
  });
});

describe('hojeISO e ontemISO', () => {
  it('calculam datas locais incluindo virada de mês e ano', () => {
    const primeiroDiaAno = new Date(2026, 0, 1, 14, 30);
    expect(hojeISO(primeiroDiaAno)).toBe('2026-01-01');
    expect(ontemISO(primeiroDiaAno)).toBe('2025-12-31');

    const primeiroDiaMarco = new Date(2026, 2, 1, 9, 0);
    expect(hojeISO(primeiroDiaMarco)).toBe('2026-03-01');
    expect(ontemISO(primeiroDiaMarco)).toBe('2026-02-28');
  });
});
