/**
 * Derivação pura do cronograma de parcelas no cliente.
 * Opera na transação normalizada de UI: { data, valor, parcelas, parcelasPagas, parcelasStatus, tipo }.
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

function pStatusDeParcelas(t) {
  const total = t.parcelas || 1;
  let arr = Array.isArray(t.parcelasStatus) ? t.parcelasStatus.slice(0, total) : [];
  if (arr.length === 0) {
    const pagas = t.parcelasPagas || 0;
    arr = Array.from({ length: total }, (_, i) => (i < pagas ? 'paga' : 'pendente'));
  }
  while (arr.length < total) arr.push('pendente');
  return arr;
}

function pContarQuitadas(status) {
  return status.filter((s) => s !== 'pendente').length;
}

function pProximaEmAberto(t) {
  const status = pStatusDeParcelas(t);
  const i = status.findIndex((s) => s === 'pendente');
  if (i === -1) return null;
  return { indice: i + 1, vencimento: pAddMeses(t.data, i), valor: t.valor };
}

function pEhParcelado(t) {
  return (t.parcelas || 1) > 1;
}

function pConcluido(t) {
  return pContarQuitadas(pStatusDeParcelas(t)) >= (t.parcelas || 1);
}
