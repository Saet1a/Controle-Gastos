import type { Categoria, CategoriaId } from '@/types/lancamento';

export const CATEGORIAS: readonly Categoria[] = Object.freeze([
  Object.freeze({ id: 'alimentacao', nome: 'Alimentação', icone: 'fast-food', cor: '#F97316' }),
  Object.freeze({ id: 'transporte', nome: 'Transporte', icone: 'bus', cor: '#3B82F6' }),
  Object.freeze({ id: 'moradia', nome: 'Moradia', icone: 'home', cor: '#8B5CF6' }),
  Object.freeze({ id: 'saude', nome: 'Saúde', icone: 'medkit', cor: '#EF4444' }),
  Object.freeze({ id: 'educacao', nome: 'Educação', icone: 'school', cor: '#0EA5E9' }),
  Object.freeze({ id: 'lazer', nome: 'Lazer', icone: 'game-controller', cor: '#EC4899' }),
  Object.freeze({ id: 'salario', nome: 'Salário', icone: 'cash', cor: '#22C55E' }),
  Object.freeze({ id: 'outros', nome: 'Outros', icone: 'ellipsis-horizontal', cor: '#6B7280' }),
]);

export const CATEGORIA_IDS: readonly CategoriaId[] = Object.freeze(
  CATEGORIAS.map((categoria) => categoria.id),
);

const CATEGORIA_IDS_SET = new Set<string>(CATEGORIA_IDS);

export const CATEGORIAS_POR_ID: Readonly<Record<CategoriaId, Categoria>> = Object.freeze(
  CATEGORIAS.reduce(
    (mapa, categoria) => {
      mapa[categoria.id] = categoria;
      return mapa;
    },
    {} as Record<CategoriaId, Categoria>,
  ),
);

export const CATEGORIA_ORDEM: Readonly<Record<CategoriaId, number>> = Object.freeze(
  CATEGORIAS.reduce(
    (mapa, categoria, indice) => {
      mapa[categoria.id] = indice;
      return mapa;
    },
    {} as Record<CategoriaId, number>,
  ),
);

export function isCategoriaId(valor: unknown): valor is CategoriaId {
  return typeof valor === 'string' && CATEGORIA_IDS_SET.has(valor);
}

export function getCategoria(id: CategoriaId): Categoria {
  return CATEGORIAS_POR_ID[id] ?? CATEGORIAS_POR_ID.outros;
}
