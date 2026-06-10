import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIAS_PADRAO } from '../src/data/categories.js';

const GRUPOS_VALIDOS = new Set([
  'alimentacao', 'transporte', 'moradia', 'saude', 'compras',
  'lazer', 'educacao', 'financas', 'servicos', 'outros', 'renda',
]);

test('taxonomia tem 45 subcategorias', () => {
  assert.equal(CATEGORIAS_PADRAO.length, 45);
});

test('todo slug é único', () => {
  const slugs = CATEGORIAS_PADRAO.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('todo item tem os campos obrigatórios e tipo válido', () => {
  for (const c of CATEGORIAS_PADRAO) {
    assert.ok(c.slug, `slug ausente em ${JSON.stringify(c)}`);
    assert.ok(c.name, `name ausente em ${c.slug}`);
    assert.ok(c.icon, `icon ausente em ${c.slug}`);
    assert.ok(['income', 'expense'].includes(c.type), `type inválido em ${c.slug}`);
    assert.ok(GRUPOS_VALIDOS.has(c.group), `group inválido em ${c.slug}: ${c.group}`);
  }
});

test('grupo renda é income; demais grupos são expense', () => {
  for (const c of CATEGORIAS_PADRAO) {
    if (c.group === 'renda') assert.equal(c.type, 'income', `${c.slug} deveria ser income`);
    else assert.equal(c.type, 'expense', `${c.slug} deveria ser expense`);
  }
});
