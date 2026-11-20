import { CATEGORIA_ORDEM } from '@/constants/categorias';
import type {
  CategoriaId,
  FiltroLancamentos,
  GastoCategoria,
  Lancamento,
  MesISO,
  ResumoMes,
} from '@/types/lancamento';
import { chaveMes } from '@/utils/datas';

export type { FiltroLancamentos, GastoCategoria, ResumoMes };

export function filtrarLancamentos(
  lancamentos: readonly Lancamento[],
  filtro: FiltroLancamentos,
): Lancamento[] {
  return lancamentos.filter(
    (l) =>
      (!filtro.mes || chaveMes(l.data) === filtro.mes) &&
      (!filtro.categoriaId || l.categoriaId === filtro.categoriaId),
  );
}

/** Mais recente primeiro (data desc, desempate determinístico por id desc). */
export function ordenarPorDataDesc(lancamentos: readonly Lancamento[]): Lancamento[] {
  return [...lancamentos].sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));
}

export function resumoDoMes(lancamentos: readonly Lancamento[], mes: MesISO): ResumoMes {
  let receitasCentavos = 0;
  let despesasCentavos = 0;

  for (const l of lancamentos) {
    if (chaveMes(l.data) !== mes) continue;
    if (l.tipo === 'receita') receitasCentavos += l.valorCentavos;
    else despesasCentavos += l.valorCentavos;
  }

  return {
    receitasCentavos,
    despesasCentavos,
    saldoCentavos: receitasCentavos - despesasCentavos,
  };
}

/** Despesas do mês agrupadas por categoria, maior gasto primeiro. */
export function gastosPorCategoria(
  lancamentos: readonly Lancamento[],
  mes: MesISO,
): GastoCategoria[] {
  const totais = new Map<CategoriaId, number>();
  let total = 0;

  for (const l of lancamentos) {
    if (chaveMes(l.data) !== mes || l.tipo !== 'despesa') continue;
    totais.set(l.categoriaId, (totais.get(l.categoriaId) ?? 0) + l.valorCentavos);
    total += l.valorCentavos;
  }

  return [...totais.entries()]
    .map(([categoriaId, totalCentavos]) => ({
      categoriaId,
      totalCentavos,
      percentual: total === 0 ? 0 : Math.round((totalCentavos / total) * 1000) / 10,
    }))
    .sort(
      (a, b) =>
        b.totalCentavos - a.totalCentavos ||
        CATEGORIA_ORDEM[a.categoriaId] - CATEGORIA_ORDEM[b.categoriaId],
    );
}
