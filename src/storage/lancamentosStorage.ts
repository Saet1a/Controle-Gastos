import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ErroValidacaoLancamento,
  type Lancamento,
  type ResultadoCarregamento,
} from '@/types/lancamento';
import { ordenarPorDataDesc } from '@/utils/resumo';
import { validarLancamento, validarLancamentoDesconhecido } from '@/utils/validacao';

export const STORAGE_KEY = '@bolso/lancamentos';
export const STORAGE_BACKUP_KEY = '@bolso/lancamentos:backup';

async function salvarBackupBruto(conteudo: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_BACKUP_KEY, conteudo);
  } catch {
    // Falha ao gravar backup não deve bloquear a recuperação do app.
  }
}

export async function carregarLancamentos(): Promise<ResultadoCarregamento> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      status: 'erro_leitura',
      lancamentos: [],
      erro: 'Não foi possível ler os dados salvos no aparelho.',
    };
  }

  if (typeof raw !== 'string' || raw.trim() === '') {
    return { status: 'vazio', lancamentos: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await salvarBackupBruto(raw);
    return { status: 'invalido', lancamentos: [] };
  }

  if (!Array.isArray(parsed)) {
    await salvarBackupBruto(raw);
    return { status: 'invalido', lancamentos: [] };
  }

  const validos: Lancamento[] = [];
  const idsVistos = new Set<string>();
  let descartados = 0;

  for (const item of parsed) {
    const validado = validarLancamentoDesconhecido(item);
    if (!validado || idsVistos.has(validado.id)) {
      descartados += 1;
      continue;
    }
    idsVistos.add(validado.id);
    validos.push(validado);
  }

  const lancamentos = ordenarPorDataDesc(validos);

  if (descartados > 0) {
    await salvarBackupBruto(raw);
    return { status: 'parcial', lancamentos, descartados };
  }

  return { status: 'ok', lancamentos };
}

export async function salvarLancamentos(lancamentos: readonly Lancamento[]): Promise<void> {
  const validados: Lancamento[] = [];
  const idsVistos = new Set<string>();

  for (const item of lancamentos) {
    const validado = validarLancamento(item);
    if (idsVistos.has(validado.id)) {
      throw new ErroValidacaoLancamento('id', 'ID de lançamento duplicado.');
    }
    idsVistos.add(validado.id);
    validados.push(validado);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validados));
}
