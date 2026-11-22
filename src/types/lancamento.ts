import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

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

export type IconeCategoria = ComponentProps<typeof Ionicons>['name'];

export type CorHex = `#${string}`;

/** Data no formato YYYY-MM-DD. */
export type DataISO = `${number}-${number}-${number}`;

/** Chave de mês no formato YYYY-MM. */
export type MesISO = `${number}-${number}`;

export interface Categoria {
  readonly id: CategoriaId;
  readonly nome: string;
  readonly icone: IconeCategoria;
  readonly cor: CorHex;
  readonly corEscuro: CorHex;
}

export interface Lancamento {
  readonly id: string;
  readonly descricao: string;
  /** Valor sempre positivo, em centavos inteiros. O sinal vem de `tipo`. */
  readonly valorCentavos: number;
  readonly tipo: TipoLancamento;
  readonly data: DataISO;
  readonly categoriaId: CategoriaId;
}

export type NovoLancamento = Omit<Lancamento, 'id'>;

export type CampoLancamento = keyof Lancamento;

export interface FiltroLancamentos {
  readonly mes?: MesISO;
  readonly categoriaId?: CategoriaId | null;
}

export interface ResumoMes {
  readonly receitasCentavos: number;
  readonly despesasCentavos: number;
  readonly saldoCentavos: number;
}

export interface GastoCategoria {
  readonly categoriaId: CategoriaId;
  readonly totalCentavos: number;
  /** Percentual de 0 a 100 (1 casa decimal) sobre as despesas do mês. */
  readonly percentual: number;
}

export type StatusCarregamento =
  | 'carregando'
  | 'vazio'
  | 'ok'
  | 'parcial'
  | 'invalido'
  | 'erro_leitura';

export type ResultadoCarregamento =
  | { readonly status: 'vazio'; readonly lancamentos: Lancamento[] }
  | { readonly status: 'ok'; readonly lancamentos: Lancamento[] }
  | { readonly status: 'parcial'; readonly lancamentos: Lancamento[]; readonly descartados: number }
  | { readonly status: 'invalido'; readonly lancamentos: Lancamento[] }
  | { readonly status: 'erro_leitura'; readonly lancamentos: Lancamento[]; readonly erro: string };

export interface LancamentosContextValue {
  readonly lancamentos: readonly Lancamento[];
  readonly carregando: boolean;
  readonly statusCarregamento: StatusCarregamento;
  readonly registrosDescartados: number;
  readonly erro: string | null;
  adicionar: (novo: NovoLancamento) => Promise<Lancamento>;
  editar: (id: string, dados: NovoLancamento) => Promise<Lancamento>;
  excluir: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
  limparErro: () => void;
}

export class ErroValidacaoLancamento extends Error {
  readonly campo: CampoLancamento;

  constructor(campo: CampoLancamento, mensagem: string) {
    super(mensagem);
    this.name = 'ErroValidacaoLancamento';
    this.campo = campo;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
