import type { CategoriaId, Lancamento } from '@/types/lancamento';
import { chaveMes } from '@/utils/datas';

export interface ResumoMes {
  receitasCentavos: number;
  despesasCentavos: number;
  saldoCentavos: number;
}

export interface GastoCategoria {
  categoriaId: CategoriaId;
  totalCentavos: number;
  /** 0–100 em relação ao total de despesas do mês. */
  percentual: number;
}

export function filtrarLancamentos(
  lancamentos: readonly Lancamento[],
  filtro: { mes?: string; categoriaId?: CategoriaId | null },
): Lancamento[] {
  return lancamentos.filter(
    (l) =>
      (!filtro.mes || chaveMes(l.data) === filtro.mes) &&
      (!filtro.categoriaId || l.categoriaId === filtro.categoriaId),
  );
}

/** Mais recente primeiro (data desc). */
export function ordenarPorDataDesc(lancamentos: readonly Lancamento[]): Lancamento[] {
  return [...lancamentos].sort((a, b) => b.data.localeCompare(a.data));
}

export function resumoDoMes(lancamentos: readonly Lancamento[], mes: string): ResumoMes {
  let receitasCentavos = 0;
  let despesasCentavos = 0;
  for (const l of filtrarLancamentos(lancamentos, { mes })) {
    if (l.tipo === 'receita') receitasCentavos += l.valorCentavos;
    else despesasCentavos += l.valorCentavos;
  }
  return { receitasCentavos, despesasCentavos, saldoCentavos: receitasCentavos - despesasCentavos };
}

/** Despesas do mês agrupadas por categoria, maior gasto primeiro. */
export function gastosPorCategoria(
  lancamentos: readonly Lancamento[],
  mes: string,
): GastoCategoria[] {
  const totais = new Map<CategoriaId, number>();
  let total = 0;
  for (const l of filtrarLancamentos(lancamentos, { mes })) {
    if (l.tipo !== 'despesa') continue;
    totais.set(l.categoriaId, (totais.get(l.categoriaId) ?? 0) + l.valorCentavos);
    total += l.valorCentavos;
  }
  return [...totais.entries()]
    .map(([categoriaId, totalCentavos]) => ({
      categoriaId,
      totalCentavos,
      percentual: total === 0 ? 0 : (totalCentavos / total) * 100,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);
}
