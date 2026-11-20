import { isCategoriaId } from '@/constants/categorias';
import {
  ErroValidacaoLancamento,
  type DataISO,
  type Lancamento,
  type MesISO,
  type NovoLancamento,
  type TipoLancamento,
} from '@/types/lancamento';

export const MAX_DESCRICAO_LENGTH = 120;

const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MES_ISO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isTipoLancamento(valor: unknown): valor is TipoLancamento {
  return valor === 'despesa' || valor === 'receita';
}

export function isValorCentavosValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

export function isDataISOValida(valor: unknown): valor is DataISO {
  if (typeof valor !== 'string' || !DATA_ISO_REGEX.test(valor)) return false;

  const [ano, mes, dia] = valor.split('-').map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;

  const data = new Date(0);
  data.setFullYear(ano, mes - 1, dia);
  return (
    data.getFullYear() === ano && data.getMonth() + 1 === mes && data.getDate() === dia
  );
}

export function isMesISOValido(valor: unknown): valor is MesISO {
  return typeof valor === 'string' && MES_ISO_REGEX.test(valor);
}

export function normalizarNovoLancamento(dados: NovoLancamento): NovoLancamento {
  if (typeof dados.descricao !== 'string') {
    throw new ErroValidacaoLancamento('descricao', 'Descrição inválida.');
  }

  const descricao = dados.descricao.trim();
  if (descricao.length > MAX_DESCRICAO_LENGTH) {
    throw new ErroValidacaoLancamento(
      'descricao',
      `A descrição deve ter no máximo ${MAX_DESCRICAO_LENGTH} caracteres.`,
    );
  }

  if (!isValorCentavosValido(dados.valorCentavos)) {
    throw new ErroValidacaoLancamento(
      'valorCentavos',
      'O valor deve ser maior que zero (em centavos inteiros).',
    );
  }

  if (!isTipoLancamento(dados.tipo)) {
    throw new ErroValidacaoLancamento('tipo', 'Tipo de lançamento inválido.');
  }

  if (!isDataISOValida(dados.data)) {
    throw new ErroValidacaoLancamento('data', 'Data inválida. Use o formato AAAA-MM-DD.');
  }

  if (!isCategoriaId(dados.categoriaId)) {
    throw new ErroValidacaoLancamento('categoriaId', 'Categoria inválida.');
  }

  return {
    descricao,
    valorCentavos: dados.valorCentavos,
    tipo: dados.tipo,
    data: dados.data,
    categoriaId: dados.categoriaId,
  };
}

export function validarLancamento(lancamento: Lancamento): Lancamento {
  if (typeof lancamento.id !== 'string' || lancamento.id.trim() === '') {
    throw new ErroValidacaoLancamento('id', 'ID do lançamento inválido.');
  }

  const normalizado = normalizarNovoLancamento(lancamento);
  return {
    id: lancamento.id.trim(),
    ...normalizado,
  };
}

export function validarLancamentoDesconhecido(valor: unknown): Lancamento | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return null;
  }

  const registro = valor as Record<string, unknown>;
  if (typeof registro.id !== 'string') return null;

  const id = registro.id.trim();
  if (id === '') return null;

  if (typeof registro.descricao !== 'string') return null;
  const descricao = registro.descricao.trim();
  if (descricao.length > MAX_DESCRICAO_LENGTH) return null;

  if (!isValorCentavosValido(registro.valorCentavos)) return null;
  if (!isTipoLancamento(registro.tipo)) return null;
  if (!isDataISOValida(registro.data)) return null;
  if (!isCategoriaId(registro.categoriaId)) return null;

  return {
    id,
    descricao,
    valorCentavos: registro.valorCentavos,
    tipo: registro.tipo,
    data: registro.data,
    categoriaId: registro.categoriaId,
  };
}

export function isLancamentoValido(valor: unknown): valor is Lancamento {
  return validarLancamentoDesconhecido(valor) !== null;
}
