/**
 * Funções puras de derivação do cronograma de parcelas.
 * Um parcelamento é UMA transação com `parcelas` (total) e `parcelasPagas`.
 * Nada de DOM/Express/Mongoose aqui — só lógica testável.
 */

export const STATUS_PENDENTE = 'pendente';
export const STATUS_PAGA = 'paga';
export const STATUS_ADIANTADA = 'adiantada';

export function addMeses(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function mesesEntre(de, ate) {
  return (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());
}

export function vencimentoParcela(tx, i) {
  return { indice: i, vencimento: addMeses(tx.date, i - 1), valor: tx.amount };
}

export function parcelaDoMes(tx, ano, mes) {
  const total = tx.parcelas || 1;
  const k = mesesEntre(new Date(tx.date), new Date(ano, mes, 1));
  if (k >= 0 && k < total) return k + 1;
  return null;
}

export function statusDeParcelas(tx) {
  const total = tx.parcelas || 1;
  let arr = Array.isArray(tx.parcelasStatus) ? tx.parcelasStatus.slice(0, total) : [];
  if (arr.length === 0) {
    const pagas = tx.parcelasPagas || 0;
    return Array.from({ length: total }, (_, i) => (i < pagas ? STATUS_PAGA : STATUS_PENDENTE));
  }
  while (arr.length < total) arr.push(STATUS_PENDENTE);
  return arr;
}

export function contarQuitadas(status) {
  return status.filter((s) => s !== STATUS_PENDENTE).length;
}

export function proximaParcelaEmAberto(tx) {
  const status = statusDeParcelas(tx);
  const i = status.findIndex((s) => s === STATUS_PENDENTE);
  if (i === -1) return null;
  return { indice: i + 1, vencimento: addMeses(tx.date, i), valor: tx.amount };
}
