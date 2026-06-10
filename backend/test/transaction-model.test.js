import test from 'node:test';
import assert from 'node:assert/strict';
import Transaction from '../src/models/Transaction.js';

test('schema Transaction tem campo oculto Boolean com default false', () => {
  const path = Transaction.schema.path('oculto');
  assert.ok(path, 'campo oculto ausente no schema');
  assert.equal(path.instance, 'Boolean');
  assert.equal(path.defaultValue, false);
});
