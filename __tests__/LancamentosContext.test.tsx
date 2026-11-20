import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { LancamentosProvider, useLancamentos } from '@/context/LancamentosContext';
import { STORAGE_BACKUP_KEY, STORAGE_KEY } from '@/storage/lancamentosStorage';
import { ErroValidacaoLancamento, type Lancamento, type NovoLancamento } from '@/types/lancamento';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory do jest.mock precisa de require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const wrapper = ({ children }: { children: ReactNode }) => (
  <LancamentosProvider>{children}</LancamentosProvider>
);

const novo: NovoLancamento = {
  descricao: 'Bandejão',
  valorCentavos: 650,
  tipo: 'despesa',
  data: '2026-11-19',
  categoriaId: 'alimentacao',
};

async function salvos(): Promise<Lancamento[]> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('LancamentosContext', () => {
  it('inicia vazio quando não há dados e não grava no AsyncStorage ao abrir', async () => {
    const { result } = await renderHook(() => useLancamentos(), { wrapper });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.statusCarregamento).toBe('vazio');
    expect(result.current.lancamentos).toEqual([]);
    expect(result.current.erro).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('carrega dados salvos ordenados ao abrir sem sobrescrever o AsyncStorage', async () => {
    const antigo: Lancamento = { ...novo, id: 'a', data: '2026-11-10' };
    const recente: Lancamento = { ...novo, id: 'b', data: '2026-11-20' };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([antigo, recente]));
    jest.clearAllMocks();

    const { result } = await renderHook(() => useLancamentos(), { wrapper });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.statusCarregamento).toBe('ok');
    expect(result.current.lancamentos).toEqual([recente, antigo]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('adiciona, edita e exclui, mantendo ordenação e persistindo a cada alteração', async () => {
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let criado!: Lancamento;
    await act(async () => {
      criado = await result.current.adicionar({ ...novo, descricao: '  Bandejão  ' });
    });
    expect(criado.descricao).toBe('Bandejão');
    expect(result.current.statusCarregamento).toBe('ok');
    expect(await salvos()).toEqual([criado]);

    let segundo!: Lancamento;
    await act(async () => {
      segundo = await result.current.adicionar({
        ...novo,
        descricao: 'Café',
        data: '2026-11-20',
      });
    });
    expect(result.current.lancamentos.map((l) => l.id)).toEqual([segundo.id, criado.id]);
    expect((await salvos()).map((l) => l.id)).toEqual([segundo.id, criado.id]);

    await act(async () => {
      await result.current.editar(criado.id, { ...novo, valorCentavos: 800, data: '2026-11-21' });
    });
    expect(result.current.lancamentos.map((l) => l.id)).toEqual([criado.id, segundo.id]);
    expect((await salvos())[0].valorCentavos).toBe(800);

    await act(async () => {
      await result.current.excluir(criado.id);
    });
    expect(result.current.lancamentos).toEqual([segundo]);
    expect(await salvos()).toEqual([segundo]);
  });

  it('rejeita dados inválidos sem alterar estado nem chamar AsyncStorage.setItem', async () => {
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await expect(
        result.current.adicionar({ ...novo, valorCentavos: 0 }),
      ).rejects.toBeInstanceOf(ErroValidacaoLancamento);
    });
    await act(async () => {
      await expect(
        result.current.editar('inexistente', novo),
      ).rejects.toBeInstanceOf(ErroValidacaoLancamento);
    });

    await act(async () => {
      await result.current.excluir('inexistente');
    });

    expect(result.current.lancamentos).toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('preserva backup quando JSON está inválido ao abrir e permite novos lançamentos depois', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{corrompido');

    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.statusCarregamento).toBe('invalido');
    expect(result.current.erro).toBeTruthy();
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe('{corrompido');
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('{corrompido');

    await act(async () => {
      await result.current.adicionar(novo);
    });
    expect(result.current.statusCarregamento).toBe('ok');
    expect(result.current.erro).toBeNull();
    expect(await salvos()).toHaveLength(1);
    expect(await AsyncStorage.getItem(STORAGE_BACKUP_KEY)).toBe('{corrompido');
  });

  it('bloqueia mutações em erro_leitura até recarregar com sucesso', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('I/O failure'));

    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.statusCarregamento).toBe('erro_leitura');
    expect(result.current.erro).toBeTruthy();

    await act(async () => {
      await expect(result.current.adicionar(novo)).rejects.toThrow();
    });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...novo, id: 'ok-1' }]));

    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.statusCarregamento).toBe('ok');
    expect(result.current.erro).toBeNull();
    expect(result.current.lancamentos.map((l) => l.id)).toEqual(['ok-1']);
  });

  it('faz rollback da memória quando AsyncStorage.setItem falha e recupera na próxima escrita', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...novo, id: 'inicial' }]));
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('quota exceeded'));

    await act(async () => {
      await expect(result.current.adicionar({ ...novo, descricao: 'Falhou' })).rejects.toThrow(
        'quota exceeded',
      );
    });

    expect(result.current.lancamentos.map((l) => l.id)).toEqual(['inicial']);
    expect(result.current.erro).toBeTruthy();

    await act(async () => {
      await result.current.adicionar({ ...novo, descricao: 'Deu certo' });
    });

    expect(result.current.lancamentos).toHaveLength(2);
    expect(result.current.erro).toBeNull();
    expect(await salvos()).toHaveLength(2);
  });

  it('serializa escritas concorrentes sem perder dados', async () => {
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await Promise.all([
        result.current.adicionar({ ...novo, descricao: 'Primeiro' }),
        result.current.adicionar({ ...novo, descricao: 'Segundo' }),
      ]);
    });

    expect(result.current.lancamentos).toHaveLength(2);
    expect(await salvos()).toHaveLength(2);
  });
});
