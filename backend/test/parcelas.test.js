import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMeses,
  mesesEntre,
  parcelaDoMes,
  proximaParcelaEmAberto,
  vencimentoParcela,
} from '../src/utils/parcelas.js';

test('addMeses soma meses preservando o dia', () => {
  const r = addMeses(new Date(2026, 0, 15), 2);
  assert.equal(r.getFullYear(), 2026);
  assert.equal(r.getMonth(), 2);
  assert.equal(r.getDate(), 15);
});

test('mesesEntre conta diferenca inteira de meses', () => {
  assert.equal(mesesEntre(new Date(2026, 5, 10), new Date(2026, 5, 1)), 0);
  assert.equal(mesesEntre(new Date(2026, 5, 10), new Date(2026, 6, 1)), 1);
  assert.equal(mesesEntre(new Date(2026, 11, 1), new Date(2027, 0, 1)), 1);
});

test('vencimentoParcela retorna data e valor da i-esima parcela', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 12 };
  const p3 = vencimentoParcela(tx, 3);
  assert.equal(p3.vencimento.getMonth(), 7);
  assert.equal(p3.valor, 100);
});

test('parcelaDoMes acha a parcela que vence no mes (0-based) ou null', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 3 };
  assert.equal(parcelaDoMes(tx, 2026, 5), 1);
  assert.equal(parcelaDoMes(tx, 2026, 6), 2);
  assert.equal(parcelaDoMes(tx, 2026, 7), 3);
  assert.equal(parcelaDoMes(tx, 2026, 8), null);
  assert.equal(parcelaDoMes(tx, 2026, 4), null);
});

test('parcelaDoMes trata parcelas ausente como 1', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100 };
  assert.equal(parcelaDoMes(tx, 2026, 5), 1);
  assert.equal(parcelaDoMes(tx, 2026, 6), null);
});

test('proximaParcelaEmAberto avanca com parcelasPagas', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 12, parcelasPagas: 2 };
  const prox = proximaParcelaEmAberto(tx);
  assert.equal(prox.indice, 3);
  assert.equal(prox.vencimento.getMonth(), 7);
  assert.equal(prox.valor, 100);
});

test('proximaParcelaEmAberto retorna null quando plano concluido', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 3, parcelasPagas: 3 };
  assert.equal(proximaParcelaEmAberto(tx), null);
});
