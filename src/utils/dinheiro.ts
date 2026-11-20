/** 1234 -> "R$ 12,34" */
export function formatarCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = (abs % 100).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${reais},${cents}`;
}

/**
 * Converte o texto digitado em centavos. Aceita "12", "12,5", "12,50",
 * "1.234,56" e "R$ 12,34". Retorna null se não for um valor válido.
 */
export function parseValorParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(parseFloat(limpo) * 100);
}
