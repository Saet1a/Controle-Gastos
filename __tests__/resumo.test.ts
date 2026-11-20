import type { Lancamento } from '@/types/lancamento';
import {
  filtrarLancamentos,
  gastosPorCategoria,
  ordenarPorDataDesc,
  resumoDoMes,
} from '@/utils/resumo';

const L = (p: Partial<Lancamento> & Pick<Lancamento, 'id'>): Lancamento => ({
  descricao: '',
  valorCentavos: 100,
  tipo: 'despesa',
  data: '2026-11-01',
  categoriaId: 'outros',
  ...p,
});

const dados: Lancamento[] = [
  L({ id: '1', tipo: 'receita', valorCentavos: 150000, data: '2026-11-05', categoriaId: 'salario' }),
  L({ id: '2', valorCentavos: 3000, data: '2026-11-10', categoriaId: 'alimentacao' }),
  L({ id: '3', valorCentavos: 1000, data: '2026-11-12', categoriaId: 'transporte' }),
  L({ id: '4', valorCentavos: 1000, data: '2026-11-20', categoriaId: 'alimentacao' }),
  L({ id: '5', valorCentavos: 9999, data: '2026-10-31', categoriaId: 'lazer' }),
];

describe('resumoDoMes', () => {
  it('calcula receitas, despesas e saldo só do mês pedido', () => {
    expect(resumoDoMes(dados, '2026-11')).toEqual({
      receitasCentavos: 150000,
      despesasCentavos: 5000,
      saldoCentavos: 145000,
    });
  });

  it('permite saldo negativo quando despesas superam receitas', () => {
    expect(resumoDoMes(dados, '2026-10')).toEqual({
      receitasCentavos: 0,
      despesasCentavos: 9999,
      saldoCentavos: -9999,
    });
  });

  it('mês vazio zera tudo', () => {
    expect(resumoDoMes(dados, '2025-01')).toEqual({
      receitasCentavos: 0,
      despesasCentavos: 0,
      saldoCentavos: 0,
    });
  });
});

describe('gastosPorCategoria', () => {
  it('agrupa despesas, calcula % e ordena do maior pro menor', () => {
    expect(gastosPorCategoria(dados, '2026-11')).toEqual([
      { categoriaId: 'alimentacao', totalCentavos: 4000, percentual: 80 },
      { categoriaId: 'transporte', totalCentavos: 1000, percentual: 20 },
    ]);
  });

  it('arredonda percentual em 1 casa decimal e desempata pela ordem das categorias', () => {
    const empate: Lancamento[] = [
      L({ id: 'a', valorCentavos: 1000, data: '2026-11-01', categoriaId: 'lazer' }),
      L({ id: 'b', valorCentavos: 1000, data: '2026-11-02', categoriaId: 'alimentacao' }),
      L({ id: 'c', valorCentavos: 1000, data: '2026-11-03', categoriaId: 'transporte' }),
    ];

    expect(gastosPorCategoria(empate, '2026-11')).toEqual([
      { categoriaId: 'alimentacao', totalCentavos: 1000, percentual: 33.3 },
      { categoriaId: 'transporte', totalCentavos: 1000, percentual: 33.3 },
      { categoriaId: 'lazer', totalCentavos: 1000, percentual: 33.3 },
    ]);
  });

  it('ignora receitas', () => {
    expect(gastosPorCategoria(dados, '2026-11').some((g) => g.categoriaId === 'salario')).toBe(
      false,
    );
  });
});

describe('filtrarLancamentos', () => {
  it('filtra por mês e categoria', () => {
    const r = filtrarLancamentos(dados, { mes: '2026-11', categoriaId: 'alimentacao' });
    expect(r.map((l) => l.id)).toEqual(['2', '4']);
  });

  it('sem filtro retorna tudo', () => {
    expect(filtrarLancamentos(dados, {})).toHaveLength(dados.length);
  });
});

describe('ordenarPorDataDesc', () => {
  it('mais recente primeiro e desempata por id desc no mesmo dia sem mutar original', () => {
    const mesmoDia: Lancamento[] = [
      L({ id: 'a-01', data: '2026-11-19' }),
      L({ id: 'a-02', data: '2026-11-19' }),
      L({ id: 'a-03', data: '2026-11-20' }),
    ];

    expect(ordenarPorDataDesc(dados).map((l) => l.id)).toEqual(['4', '3', '2', '1', '5']);
    expect(ordenarPorDataDesc(mesmoDia).map((l) => l.id)).toEqual(['a-03', 'a-02', 'a-01']);
    expect(dados[0].id).toBe('1');
  });
});
