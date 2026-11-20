import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { LancamentosProvider, useLancamentos } from '@/context/LancamentosContext';
import { STORAGE_KEY } from '@/storage/lancamentosStorage';
import type { Lancamento, NovoLancamento } from '@/types/lancamento';

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
});

describe('LancamentosContext', () => {
  it('carrega o que já estava salvo ao abrir', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...novo, id: 'a' }]));
    const { result } = await renderHook(() => useLancamentos(), { wrapper });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.lancamentos).toEqual([{ ...novo, id: 'a' }]);
  });

  it('adiciona, edita e exclui, persistindo a cada alteração', async () => {
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let id = '';
    await act(() => {
      id = result.current.adicionar(novo).id;
    });
    await waitFor(async () => expect(await salvos()).toEqual([{ ...novo, id }]));

    await act(() => result.current.editar(id, { ...novo, valorCentavos: 800 }));
    await waitFor(async () => expect((await salvos())[0].valorCentavos).toBe(800));

    await act(() => result.current.excluir(id));
    await waitFor(async () => expect(await salvos()).toEqual([]));
    expect(result.current.lancamentos).toEqual([]);
  });

  it('não sobrescreve os dados salvos com lista vazia antes de carregar', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...novo, id: 'a' }]));
    const { result } = await renderHook(() => useLancamentos(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(await salvos()).toHaveLength(1);
  });
});
