import type { Categoria, CategoriaId } from '@/types/lancamento';

export const CATEGORIAS: readonly Categoria[] = [
  { id: 'alimentacao', nome: 'Alimentação', icone: 'fast-food', cor: '#F97316' },
  { id: 'transporte', nome: 'Transporte', icone: 'bus', cor: '#3B82F6' },
  { id: 'moradia', nome: 'Moradia', icone: 'home', cor: '#8B5CF6' },
  { id: 'saude', nome: 'Saúde', icone: 'medkit', cor: '#EF4444' },
  { id: 'educacao', nome: 'Educação', icone: 'school', cor: '#0EA5E9' },
  { id: 'lazer', nome: 'Lazer', icone: 'game-controller', cor: '#EC4899' },
  { id: 'salario', nome: 'Salário', icone: 'cash', cor: '#22C55E' },
  { id: 'outros', nome: 'Outros', icone: 'ellipsis-horizontal', cor: '#6B7280' },
];

export function getCategoria(id: CategoriaId): Categoria {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}
