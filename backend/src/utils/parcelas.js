/**
 * Funções puras de derivação do cronograma de parcelas.
 * Um parcelamento é UMA transação com `parcelas` (total) e `parcelasPagas`.
 * Nada de DOM/Express/Mongoose aqui — só lógica testável.
 */

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

export function proximaParcelaEmAberto(tx) {
  const total = tx.parcelas || 1;
  const pagas = tx.parcelasPagas || 0;
  if (pagas >= total) return null;
  return { indice: pagas + 1, vencimento: addMeses(tx.date, pagas), valor: tx.amount };
}
