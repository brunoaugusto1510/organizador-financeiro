/**
 * Derivação pura do cronograma de parcelas no cliente.
 * Opera na transação normalizada de UI: { data, valor, parcelas, parcelasPagas, tipo }.
 */
function pAddMeses(dataStr, n) {
  const d = new Date(`${dataStr}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d;
}

function pMesesEntre(de, ate) {
  return (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());
}

function pParcelaDoMes(t, ano, mes) {
  const total = t.parcelas || 1;
  const k = pMesesEntre(new Date(`${t.data}T00:00:00`), new Date(ano, mes, 1));
  return (k >= 0 && k < total) ? k + 1 : null;
}

function pProximaEmAberto(t) {
  const total = t.parcelas || 1;
  const pagas = t.parcelasPagas || 0;
  if (pagas >= total) return null;
  return { indice: pagas + 1, vencimento: pAddMeses(t.data, pagas), valor: t.valor };
}

function pEhParcelado(t) {
  return (t.parcelas || 1) > 1;
}

function pConcluido(t) {
  return (t.parcelasPagas || 0) >= (t.parcelas || 1);
}
