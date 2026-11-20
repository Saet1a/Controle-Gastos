import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  STORAGE_BACKUP_KEY,
  STORAGE_KEY,
  carregarLancamentos,
  salvarLancamentos,
} from '@/storage/lancamentosStorage';
import { ErroValidacaoLancamento, type Lancamento } from '@/types/lancamento';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory do jest.mock precisa de require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const item1: Lancamento = {
  id: 'id-1',
  descricao: 'Bandejão',
  valorCentavos: 650,
  tipo: 'despesa',
  data: '2026-11-18',
  categoriaId: 'alimentacao',
};

const item2: Lancamento = {
  id: 'id-2',
  descricao: 'Bolsa estágio',
  valorCentavos: 150000,
  tipo: 'receita',
  data: '2026-11-19',
  categoriaId: 'salario',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('carregarLancamentos', () => {
  it('retorna status vazio sem gravar nada quando não há dados', async () => {
    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({ status: 'vazio', lancamentos: [] });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('carrega dados válidos ordenados do mais recente pro mais antigo sem reescrever storage', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([item1, item2]));
    jest.clearAllMocks();

    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({ status: 'ok', lancamentos: [item2, item1] });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('preserva válidos, descarta inválidos e salva backup bruto no status parcial', async () => {
    const bruto = JSON.stringify([
      { ...item1, descricao: '  Bandejão  ', extra: true },
      {
        id: 'ruim',
        valorCentavos: -50,
        tipo: 'despesa',
        data: '2026-11-19',
        categoriaId: 'outros',
        descricao: 'x',
      },
      item2,
    ]);
    await AsyncStorage.setItem(STORAGE_KEY, bruto);

    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({
      status: 'parcial',
      lancamentos: [item2, item1],
      descartados: 1,
    });
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe(bruto);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(bruto);
  });

  it('descarta IDs duplicados preservando a primeira ocorrência', async () => {
    const duplicado: Lancamento = { ...item1, valorCentavos: 999 };
    const bruto = JSON.stringify([item1, duplicado]);
    await AsyncStorage.setItem(STORAGE_KEY, bruto);

    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({
      status: 'parcial',
      lancamentos: [item1],
      descartados: 1,
    });
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe(bruto);
  });

  it('salva backup e não sobrescreve chave principal quando JSON está corrompido', async () => {
    const corrompido = '{nao-e-json';
    await AsyncStorage.setItem(STORAGE_KEY, corrompido);

    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({ status: 'invalido', lancamentos: [] });
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe(corrompido);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(corrompido);
  });

  it('salva backup e retorna invalido quando a raiz JSON não é array', async () => {
    const objeto = JSON.stringify({ id: '1' });
    await AsyncStorage.setItem(STORAGE_KEY, objeto);

    const resultado = await carregarLancamentos();

    expect(resultado).toEqual({ status: 'invalido', lancamentos: [] });
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe(objeto);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(objeto);
  });

  it('retorna erro_leitura quando AsyncStorage.getItem falha', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk error'));

    const resultado = await carregarLancamentos();

    expect(resultado.status).toBe('erro_leitura');
    expect(resultado.lancamentos).toEqual([]);
  });
});

describe('salvarLancamentos', () => {
  it('persiste lista validada na chave @bolso/lancamentos', async () => {
    await salvarLancamentos([{ ...item1, descricao: '  Bandejão  ' }]);

    const salvo = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]');
    expect(salvo).toEqual([item1]);
  });

  it('rejeita item inválido ou ID duplicado antes de gravar', async () => {
    await expect(salvarLancamentos([{ ...item1, valorCentavos: 0 }])).rejects.toThrow(
      ErroValidacaoLancamento,
    );
    await expect(salvarLancamentos([item1, { ...item2, id: item1.id }])).rejects.toThrow(
      ErroValidacaoLancamento,
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
