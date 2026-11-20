import { CATEGORIA_IDS, CATEGORIAS, getCategoria, isCategoriaId } from '@/constants/categorias';
import { ErroValidacaoLancamento, type NovoLancamento } from '@/types/lancamento';
import {
  MAX_DESCRICAO_LENGTH,
  isDataISOValida,
  isLancamentoValido,
  isMesISOValido,
  isTipoLancamento,
  isValorCentavosValido,
  normalizarNovoLancamento,
  validarLancamento,
  validarLancamentoDesconhecido,
} from '@/utils/validacao';

const baseValido: NovoLancamento = {
  descricao: 'Bandejão',
  valorCentavos: 650,
  tipo: 'despesa',
  data: '2026-11-19',
  categoriaId: 'alimentacao',
};

describe('categorias fixas', () => {
  it('mantém exatamente as 8 categorias da spec sem IDs duplicados', () => {
    expect(CATEGORIAS).toHaveLength(8);
    expect(new Set(CATEGORIA_IDS).size).toBe(8);
    expect(getCategoria('alimentacao').nome).toBe('Alimentação');
  });

  it('valida categoriaId apenas dentro da lista fixa', () => {
    for (const id of CATEGORIA_IDS) {
      expect(isCategoriaId(id)).toBe(true);
    }
    expect(isCategoriaId('viagem')).toBe(false);
    expect(isCategoriaId('')).toBe(false);
    expect(isCategoriaId(123)).toBe(false);
  });
});

describe('validadores primitivos', () => {
  it('valida valorCentavos apenas como inteiro seguro maior que zero', () => {
    expect(isValorCentavosValido(1)).toBe(true);
    expect(isValorCentavosValido(150000)).toBe(true);

    expect(isValorCentavosValido(0)).toBe(false);
    expect(isValorCentavosValido(-100)).toBe(false);
    expect(isValorCentavosValido(12.5)).toBe(false);
    expect(isValorCentavosValido(NaN)).toBe(false);
    expect(isValorCentavosValido(Infinity)).toBe(false);
    expect(isValorCentavosValido('650')).toBe(false);
  });

  it('valida data YYYY-MM-DD como data real de calendário', () => {
    expect(isDataISOValida('2026-11-19')).toBe(true);
    expect(isDataISOValida('2024-02-29')).toBe(true);

    expect(isDataISOValida('2026-02-29')).toBe(false);
    expect(isDataISOValida('2026-02-30')).toBe(false);
    expect(isDataISOValida('2026-04-31')).toBe(false);
    expect(isDataISOValida('2026-13-01')).toBe(false);
    expect(isDataISOValida('2026-00-10')).toBe(false);
    expect(isDataISOValida('19/11/2026')).toBe(false);
    expect(isDataISOValida('2026-1-5')).toBe(false);
    expect(isDataISOValida(null)).toBe(false);
  });

  it('valida mês YYYY-MM e tipo', () => {
    expect(isMesISOValido('2026-01')).toBe(true);
    expect(isMesISOValido('2026-12')).toBe(true);
    expect(isMesISOValido('2026-00')).toBe(false);
    expect(isMesISOValido('2026-13')).toBe(false);
    expect(isMesISOValido('2026-1')).toBe(false);

    expect(isTipoLancamento('despesa')).toBe(true);
    expect(isTipoLancamento('receita')).toBe(true);
    expect(isTipoLancamento('transferencia')).toBe(false);
  });
});

describe('normalizarNovoLancamento e validarLancamento', () => {
  it('faz trim da descrição e aceita descrição vazia', () => {
    expect(normalizarNovoLancamento({ ...baseValido, descricao: '  Café  ' }).descricao).toBe(
      'Café',
    );
    expect(normalizarNovoLancamento({ ...baseValido, descricao: '   ' }).descricao).toBe('');
  });

  it('aceita descrição no limite máximo e rejeita acima do limite', () => {
    const limite = 'a'.repeat(MAX_DESCRICAO_LENGTH);
    expect(normalizarNovoLancamento({ ...baseValido, descricao: limite }).descricao).toBe(limite);

    expect(() =>
      normalizarNovoLancamento({ ...baseValido, descricao: 'a'.repeat(MAX_DESCRICAO_LENGTH + 1) }),
    ).toThrow(ErroValidacaoLancamento);
  });

  it('informa o campo exato no ErroValidacaoLancamento', () => {
    const capturarCampo = (fn: () => unknown) => {
      try {
        fn();
        return null;
      } catch (err) {
        expect(err).toBeInstanceOf(ErroValidacaoLancamento);
        return (err as ErroValidacaoLancamento).campo;
      }
    };

    expect(
      capturarCampo(() => normalizarNovoLancamento({ ...baseValido, valorCentavos: 0 })),
    ).toBe('valorCentavos');
    expect(
      capturarCampo(() =>
        normalizarNovoLancamento({ ...baseValido, data: '2026-02-30' as NovoLancamento['data'] }),
      ),
    ).toBe('data');
    expect(
      capturarCampo(() =>
        normalizarNovoLancamento({
          ...baseValido,
          categoriaId: 'inexistente' as NovoLancamento['categoriaId'],
        }),
      ),
    ).toBe('categoriaId');
    expect(
      capturarCampo(() =>
        normalizarNovoLancamento({
          ...baseValido,
          tipo: 'outro' as NovoLancamento['tipo'],
        }),
      ),
    ).toBe('tipo');
    expect(capturarCampo(() => validarLancamento({ ...baseValido, id: '   ' }))).toBe('id');
  });
});

describe('validarLancamentoDesconhecido', () => {
  it('remove propriedades extras desconhecidas e normaliza campos', () => {
    const bruto = {
      id: '  abc  ',
      descricao: '  Almoço ',
      valorCentavos: 1200,
      tipo: 'despesa',
      data: '2026-11-19',
      categoriaId: 'alimentacao',
      campoExtra: 'ignorado',
    };

    expect(validarLancamentoDesconhecido(bruto)).toEqual({
      id: 'abc',
      descricao: 'Almoço',
      valorCentavos: 1200,
      tipo: 'despesa',
      data: '2026-11-19',
      categoriaId: 'alimentacao',
    });
    expect(isLancamentoValido(bruto)).toBe(true);
  });

  it('rejeita objetos inválidos ou malformados', () => {
    expect(validarLancamentoDesconhecido(null)).toBeNull();
    expect(validarLancamentoDesconhecido([])).toBeNull();
    expect(validarLancamentoDesconhecido('texto')).toBeNull();
    expect(validarLancamentoDesconhecido({ ...baseValido, id: '' })).toBeNull();
    expect(validarLancamentoDesconhecido({ ...baseValido, id: '1', valorCentavos: 10.5 })).toBeNull();
    expect(validarLancamentoDesconhecido({ ...baseValido, id: '1', data: '2026-02-30' })).toBeNull();
    expect(
      validarLancamentoDesconhecido({ ...baseValido, id: '1', categoriaId: 'desconhecida' }),
    ).toBeNull();
  });
});
