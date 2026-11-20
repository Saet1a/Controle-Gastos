import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lancamento } from '@/types/lancamento';

export const STORAGE_KEY = '@bolso/lancamentos';

export async function carregarLancamentos(): Promise<Lancamento[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  try {
    const dados = JSON.parse(json);
    return Array.isArray(dados) ? (dados as Lancamento[]) : [];
  } catch {
    return [];
  }
}

export async function salvarLancamentos(lancamentos: readonly Lancamento[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
}
