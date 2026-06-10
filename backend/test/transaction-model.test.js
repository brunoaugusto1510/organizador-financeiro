import test from 'node:test';
import assert from 'node:assert/strict';
import Transaction from '../src/models/Transaction.js';

test('schema Transaction tem campo oculto Boolean com default false', () => {
  const path = Transaction.schema.path('oculto');
  assert.ok(path, 'campo oculto ausente no schema');
  assert.equal(path.instance, 'Boolean');
  assert.equal(path.defaultValue, false);
});

test('schema Transaction tem parcelasStatus array de enum', () => {
  const path = Transaction.schema.path('parcelasStatus');
  assert.ok(path, 'campo parcelasStatus ausente no schema');
  assert.equal(path.instance, 'Array');
  assert.deepEqual(path.embeddedSchemaType.enumValues, ['pendente', 'paga', 'adiantada']);
});

// Regressão: o validator cross-field de parcelasPagas (value <= this.parcelas)
// não rodava sob findOneAndUpdate (this = query, this.parcelas undefined → <= 1)
// e estourava 400 ao marcar a 2ª+ parcela. parcelasPagas é derivado no
// controller, então não deve ter validator "user defined".
test('parcelasPagas não tem validator cross-field (quebra em findOneAndUpdate)', () => {
  const path = Transaction.schema.path('parcelasPagas');
  const userDefined = path.validators.filter((v) => v.type === 'user defined');
  assert.equal(userDefined.length, 0, 'parcelasPagas não deve ter validator user-defined');
});
