export type TipoLancamento = 'despesa' | 'receita';

export type CategoriaId =
  | 'alimentacao'
  | 'transporte'
  | 'moradia'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'salario'
  | 'outros';

export interface Categoria {
  id: CategoriaId;
  nome: string;
  /** Nome do ícone em @expo/vector-icons (Ionicons). */
  icone: string;
  cor: string;
}

export interface Lancamento {
  id: string;
  descricao: string;
  /** Valor sempre positivo, em centavos. O sinal vem de `tipo`. */
  valorCentavos: number;
  tipo: TipoLancamento;
  /** Formato YYYY-MM-DD. */
  data: string;
  categoriaId: CategoriaId;
}

export type NovoLancamento = Omit<Lancamento, 'id'>;
