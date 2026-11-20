import type { DataISO, MesISO } from '@/types/lancamento';
import { isDataISOValida } from '@/utils/validacao';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DATA_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const pad = (n: number) => n.toString().padStart(2, '0');

/** Date -> "YYYY-MM-DD" no fuso local. */
export function paraDataISO(d: Date): DataISO {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` as DataISO;
}

export function hojeISO(agora: Date = new Date()): DataISO {
  return paraDataISO(agora);
}

export function ontemISO(agora: Date = new Date()): DataISO {
  const d = new Date(agora);
  d.setDate(d.getDate() - 1);
  return paraDataISO(d);
}

/** "2026-11-19" -> "2026-11" */
export function chaveMes(dataISO: DataISO): MesISO {
  return dataISO.slice(0, 7) as MesISO;
}

/** "2026-11" -> "nov/2026" */
export function rotuloMes(chave: MesISO): string {
  const [ano, mes] = chave.split('-').map(Number);
  return `${MESES[mes - 1]}/${ano}`;
}

/** Soma `delta` meses a uma chave "YYYY-MM". */
export function deslocarMes(chave: MesISO, delta: number): MesISO {
  const [ano, mes] = chave.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` as MesISO;
}

/** "YYYY-MM-DD" -> "DD/MM/AAAA". Retorna "" se a data ISO for inválida. */
export function formatarDataBR(dataISO: DataISO): string {
  if (!isDataISOValida(dataISO)) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** "DD/MM/AAAA" -> "YYYY-MM-DD". Retorna null se formato ou data de calendário forem inválidos. */
export function parseDataBRParaISO(texto: string): DataISO | null {
  const match = DATA_BR_REGEX.exec(texto.trim());
  if (!match) return null;

  const [, dia, mes, ano] = match;
  const iso = `${ano}-${mes}-${dia}`;
  return isDataISOValida(iso) ? iso : null;
}

/** Formata entrada numérica progressivamente para "DD/MM/AAAA". */
export function formatarEntradaDataBR(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}
