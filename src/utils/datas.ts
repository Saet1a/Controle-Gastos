const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (n: number) => n.toString().padStart(2, '0');

/** Date -> "YYYY-MM-DD" no fuso local. */
export function paraDataISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hojeISO(agora: Date = new Date()): string {
  return paraDataISO(agora);
}

export function ontemISO(agora: Date = new Date()): string {
  const d = new Date(agora);
  d.setDate(d.getDate() - 1);
  return paraDataISO(d);
}

/** "2026-11-19" -> "2026-11" */
export function chaveMes(dataISO: string): string {
  return dataISO.slice(0, 7);
}

/** "2026-11" -> "nov/2026" */
export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split('-').map(Number);
  return `${MESES[mes - 1]}/${ano}`;
}

/** Soma `delta` meses a uma chave "YYYY-MM". */
export function deslocarMes(chave: string, delta: number): string {
  const [ano, mes] = chave.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
