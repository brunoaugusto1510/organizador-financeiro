# Aba Categorias estilo Nubank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a aba Categorias para o layout dos prints (estilo Nubank): header com total gasto + donut + navegação de mês, e lista de grupos em acordeão com subcategorias, badges, barras e cores por grupo, sobre um novo modelo de dados grupos→subcategorias.

**Architecture:** Backend ganha uma taxonomia de 45 subcategorias (cada `Category` com campo `group`) num módulo de dados puro, consumido pelo `seed.js` (reseed limpo). Frontend mapeia subcategoria→grupo a partir da API e aplica estilo (cor/ícone/label do grupo) via constante `GRUPOS`; a página agrega transações do mês por grupo e renderiza header + acordeão.

**Tech Stack:** Node.js (ESM, `node:test`), Mongoose, JavaScript vanilla no front (sem bundler/test runner), Chart.js via CDN.

---

## Estrutura de arquivos

- **Criar** `backend/src/data/categories.js` — taxonomia pura (array das 45 subcategorias). Importada pelo seed e pelos testes.
- **Criar** `backend/test/categories.test.js` — invariantes da taxonomia + presença do campo `group` no schema.
- **Modificar** `backend/src/models/Category.js` — adicionar campo `group`.
- **Modificar** `backend/src/seed.js` — importar a taxonomia do módulo novo.
- **Modificar** `frontend/js/app.js` — `GRUPOS`, `MAPA_GRUPO_CATEGORIA`, agregação por grupo, navegação de mês, toggle, `renderizarPaginaCategorias` reescrito; remover código morto (`renderizarBarraCategorias`, `agregarPorCategoria`, `CORES_CATEGORIAS`).
- **Modificar** `frontend/index.html` — reestruturar a `section#categorias`.
- **Modificar** `frontend/css/pages.css` — estilos da página de categorias.

Notas de contexto (verdades do código atual):
- `t.data` é string `'YYYY-MM-DD'` → chave do mês = `String(t.data).slice(0,7)`.
- `t.tipo` ∈ `'saida' | 'entrada' | 'pendente'`; `t.valor` é magnitude positiva; `t.categoria` é o slug da subcategoria.
- Funções globais já existem e são chamadas via `onclick` inline (script não-módulo): `excluirTransacao`, `formatarBRL`, `criarEstadoVazio`, `criarDonut(canvasId, labels, valores, cores)`, `labelCategoria(slug)`, `emojiCategoria(slug)`.
- `CategoriasAPI.listar()` retorna os documentos mongoose inteiros (logo `group` chega ao front sem mudança de controller/rota).
- Frontend não tem runner de testes — tarefas de front usam implementação + verificação manual com resultado visual esperado. Tarefas de backend usam TDD com `node --test`.

---

## Task 1: Módulo de taxonomia (backend, TDD)

**Files:**
- Create: `backend/src/data/categories.js`
- Test: `backend/test/categories.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `backend/test/categories.test.js`:

```js
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
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (a partir de `backend/`): `npm test`
Expected: FAIL com erro de import (`Cannot find module '../src/data/categories.js'`).

- [ ] **Step 3: Implementar o módulo de dados**

Create `backend/src/data/categories.js`:

```js
// Taxonomia canônica de categorias (estilo Nubank).
// Cada item é uma SUBcategoria; `group` é o slug do grupo-pai.
// Fonte de verdade do seed e dos testes. Estilo (cor/ícone do grupo) vive no front.
export const CATEGORIAS_PADRAO = [
  // Alimentação
  { slug: 'supermercado',  name: 'Supermercado',  type: 'expense', icon: '🛒', group: 'alimentacao' },
  { slug: 'restaurantes',  name: 'Restaurantes',  type: 'expense', icon: '🍴', group: 'alimentacao' },
  { slug: 'delivery',      name: 'Delivery',      type: 'expense', icon: '🛵', group: 'alimentacao' },
  { slug: 'padaria',       name: 'Padaria',       type: 'expense', icon: '🥖', group: 'alimentacao' },
  { slug: 'cafeteria',     name: 'Cafeteria',     type: 'expense', icon: '☕', group: 'alimentacao' },
  // Transporte
  { slug: 'combustivel',        name: 'Combustível',         type: 'expense', icon: '⛽', group: 'transporte' },
  { slug: 'app_transporte',     name: 'App de transporte',   type: 'expense', icon: '🚕', group: 'transporte' },
  { slug: 'transporte_publico', name: 'Transporte público',  type: 'expense', icon: '🚌', group: 'transporte' },
  { slug: 'estacionamento',     name: 'Estacionamento',      type: 'expense', icon: '🅿️', group: 'transporte' },
  { slug: 'manutencao_veiculo', name: 'Manutenção',          type: 'expense', icon: '🔧', group: 'transporte' },
  // Moradia
  { slug: 'aluguel',     name: 'Aluguel',      type: 'expense', icon: '🏠', group: 'moradia' },
  { slug: 'condominio',  name: 'Condomínio',   type: 'expense', icon: '🏢', group: 'moradia' },
  { slug: 'energia',     name: 'Energia',      type: 'expense', icon: '💡', group: 'moradia' },
  { slug: 'agua',        name: 'Água',         type: 'expense', icon: '🚰', group: 'moradia' },
  { slug: 'internet_tv', name: 'Internet/TV',  type: 'expense', icon: '📶', group: 'moradia' },
  { slug: 'gas',         name: 'Gás',          type: 'expense', icon: '🔥', group: 'moradia' },
  // Saúde e bem-estar
  { slug: 'farmacia',         name: 'Farmácia',                    type: 'expense', icon: '💊', group: 'saude' },
  { slug: 'consultas_exames', name: 'Consultas e exames',          type: 'expense', icon: '🩺', group: 'saude' },
  { slug: 'plano_saude',      name: 'Plano de saúde',              type: 'expense', icon: '🏥', group: 'saude' },
  { slug: 'academia_lazer',   name: 'Academia e centros de lazer', type: 'expense', icon: '🏋️', group: 'saude' },
  // Compras
  { slug: 'compras',        name: 'Compras',           type: 'expense', icon: '🛍️', group: 'compras' },
  { slug: 'eletronicos',    name: 'Eletrônicos',       type: 'expense', icon: '📱', group: 'compras' },
  { slug: 'vestuario',      name: 'Vestuário',         type: 'expense', icon: '👕', group: 'compras' },
  { slug: 'livraria',       name: 'Livraria',          type: 'expense', icon: '📚', group: 'compras' },
  { slug: 'casa_decoracao', name: 'Casa e decoração',  type: 'expense', icon: '🛋️', group: 'compras' },
  // Lazer
  { slug: 'streaming',     name: 'Streaming',        type: 'expense', icon: '📺', group: 'lazer' },
  { slug: 'cinema_teatro', name: 'Cinema e teatro',  type: 'expense', icon: '🎬', group: 'lazer' },
  { slug: 'viagens',       name: 'Viagens',          type: 'expense', icon: '✈️', group: 'lazer' },
  { slug: 'jogos',         name: 'Jogos',            type: 'expense', icon: '🎮', group: 'lazer' },
  { slug: 'bares_baladas', name: 'Bares e baladas',  type: 'expense', icon: '🍻', group: 'lazer' },
  // Educação
  { slug: 'cursos',              name: 'Cursos',            type: 'expense', icon: '🎓', group: 'educacao' },
  { slug: 'mensalidade_escolar', name: 'Mensalidade',       type: 'expense', icon: '🏫', group: 'educacao' },
  { slug: 'material_escolar',    name: 'Material escolar',  type: 'expense', icon: '✏️', group: 'educacao' },
  // Finanças
  { slug: 'transferencias',            name: 'Transferências',              type: 'expense', icon: '💸', group: 'financas' },
  { slug: 'emprestimos_financiamento', name: 'Empréstimos e financiamento', type: 'expense', icon: '🏦', group: 'financas' },
  { slug: 'tarifas_bancarias',         name: 'Tarifas bancárias',           type: 'expense', icon: '🧾', group: 'financas' },
  { slug: 'impostos',                  name: 'Impostos',                    type: 'expense', icon: '🧮', group: 'financas' },
  // Serviços
  { slug: 'servicos',      name: 'Serviços',      type: 'expense', icon: '🧰', group: 'servicos' },
  { slug: 'assinaturas',   name: 'Assinaturas',   type: 'expense', icon: '🔁', group: 'servicos' },
  { slug: 'profissionais', name: 'Profissionais', type: 'expense', icon: '👔', group: 'servicos' },
  // Outros
  { slug: 'outros', name: 'Outros', type: 'expense', icon: '📦', group: 'outros' },
  // Renda
  { slug: 'salario',              name: 'Salário',              type: 'income', icon: '💰', group: 'renda' },
  { slug: 'renda_extra',          name: 'Renda extra',          type: 'income', icon: '💵', group: 'renda' },
  { slug: 'renda_nao_recorrente', name: 'Renda não-recorrente', type: 'income', icon: '🎁', group: 'renda' },
  { slug: 'rendimentos',          name: 'Rendimentos',          type: 'income', icon: '📈', group: 'renda' },
];
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run (a partir de `backend/`): `npm test`
Expected: PASS — todos os testes de `categories.test.js` verdes (e os de `parcelas.test.js` continuam passando).

- [ ] **Step 5: Commit**

```bash
git add backend/src/data/categories.js backend/test/categories.test.js
git commit -m "feat(backend): taxonomia de categorias estilo Nubank"
```

---

## Task 2: Campo `group` no model Category (backend, TDD)

**Files:**
- Modify: `backend/src/models/Category.js`
- Test: `backend/test/categories.test.js` (adiciona um teste)

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `backend/test/categories.test.js`:

```js
import Category from '../src/models/Category.js';

test('schema Category tem o campo group do tipo String', () => {
  const path = Category.schema.path('group');
  assert.ok(path, 'campo group ausente no schema');
  assert.equal(path.instance, 'String');
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (a partir de `backend/`): `npm test`
Expected: FAIL — `campo group ausente no schema` (a asserção `assert.ok(path)` falha).

- [ ] **Step 3: Adicionar o campo ao model**

Em `backend/src/models/Category.js`, adicionar o campo `group` logo após o bloco `icon` (antes do fechamento do primeiro objeto do schema):

```js
    icon: {
      type: String,
      trim: true,
      default: '',
    },
    group: {
      type: String,
      trim: true,
      default: '',
    },
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run (a partir de `backend/`): `npm test`
Expected: PASS — incluindo o novo teste de schema.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/Category.js backend/test/categories.test.js
git commit -m "feat(backend): campo group no model Category"
```

---

## Task 3: Seed usa a taxonomia nova (backend)

**Files:**
- Modify: `backend/src/seed.js`

- [ ] **Step 1: Trocar a lista hardcoded pelo import**

Em `backend/src/seed.js`, adicionar o import junto aos demais (após `import Category from './models/Category.js';`):

```js
import { CATEGORIAS_PADRAO } from './data/categories.js';
```

E remover o bloco `const defaultCategories = [ ... ];` (as 12 categorias antigas), substituindo por:

```js
// Categorias padrão para popular o banco. Fonte: src/data/categories.js
const defaultCategories = CATEGORIAS_PADRAO;
```

O restante do arquivo (upsert por slug, purga de não-canônicos via `slugsCanonicos`, logs) permanece inalterado.

- [ ] **Step 2: Verificar que o backend ainda carrega o módulo sem erro**

Run (a partir de `backend/`): `node -e "import('./src/seed.js').catch(e => { if (String(e).includes('categories.js')) { console.error('IMPORT QUEBRADO'); process.exit(1); } console.log('import ok (falha esperada é de conexão DB)'); })"`
Expected: imprime `import ok ...` ou erro de conexão com Mongo — **não** pode ser erro de módulo `categories.js`. (O seed tenta conectar ao Mongo; sem `.env`/DB ele falha na conexão, e isso é aceitável aqui.)

- [ ] **Step 3: Reseed real (se houver Mongo local + `.env`)**

Run (a partir de `backend/`): `npm run seed`
Expected: logs `Inserida: ...` para as 45 subcategorias e, se havia categorias antigas, `Removidas N categoria(s) fora do conjunto canônico.` Termina com `Seed concluído.`

> Se não houver Mongo disponível no ambiente de execução, pular o Step 3 e registrar que o reseed deve ser rodado manualmente antes de validar o front.

- [ ] **Step 4: Commit**

```bash
git add backend/src/seed.js
git commit -m "feat(backend): seed usa taxonomia de grupos"
```

---

## Task 4: Config GRUPOS e mapa subcategoria→grupo (frontend)

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Declarar a constante GRUPOS e a variável de mapa**

Em `frontend/js/app.js`, junto às declarações do topo (após `let MAPA_EMOJI_CATEGORIA = {};`, ~linha 22), adicionar:

```js
let MAPA_GRUPO_CATEGORIA = {};

// Estilo dos grupos (única fonte de cor/ícone/ordem do grupo no front).
const GRUPOS = {
  alimentacao: { label: 'Alimentação',       icon: '🍽️', cor: '#a78bfa', ordem: 1 },
  transporte:  { label: 'Transporte',        icon: '🚗', cor: '#60a5fa', ordem: 2 },
  moradia:     { label: 'Moradia',           icon: '🏠', cor: '#fb923c', ordem: 3 },
  saude:       { label: 'Saúde e bem-estar', icon: '💊', cor: '#fb7185', ordem: 4 },
  compras:     { label: 'Compras',           icon: '🛍️', cor: '#f472b6', ordem: 5 },
  lazer:       { label: 'Lazer',             icon: '🎮', cor: '#fbbf24', ordem: 6 },
  educacao:    { label: 'Educação',          icon: '📚', cor: '#2dd4bf', ordem: 7 },
  financas:    { label: 'Finanças',          icon: '💰', cor: '#34d399', ordem: 8 },
  servicos:    { label: 'Serviços',          icon: '🧰', cor: '#94a3b8', ordem: 9 },
  outros:      { label: 'Outros',            icon: '📦', cor: '#b8a08a', ordem: 10 },
  renda:       { label: 'Renda',             icon: '💵', cor: '#10b981', ordem: 11 },
};
```

- [ ] **Step 2: Preencher o mapa em loadCategorias**

Em `loadCategorias` (~linha 180), o bloco que monta os mapas hoje é:

```js
  MAPA_LABEL_CATEGORIA = {};
  MAPA_EMOJI_CATEGORIA = {};
  CATEGORIAS.forEach((c) => {
    MAPA_LABEL_CATEGORIA[c.slug] = c.name;
    MAPA_EMOJI_CATEGORIA[c.slug] = c.icon || '📦';
  });
```

Substituir por:

```js
  MAPA_LABEL_CATEGORIA = {};
  MAPA_EMOJI_CATEGORIA = {};
  MAPA_GRUPO_CATEGORIA = {};
  CATEGORIAS.forEach((c) => {
    MAPA_LABEL_CATEGORIA[c.slug] = c.name;
    MAPA_EMOJI_CATEGORIA[c.slug] = c.icon || '📦';
    MAPA_GRUPO_CATEGORIA[c.slug] = c.group || 'outros';
  });
```

- [ ] **Step 3: Verificação manual**

Abrir o app no navegador, logar e abrir o console. Rodar:

```js
console.log(Object.keys(MAPA_GRUPO_CATEGORIA).length, MAPA_GRUPO_CATEGORIA['supermercado']);
```

Expected: número > 0 e `'alimentacao'` (após o reseed da Task 3). Sem erros no console.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): config GRUPOS e mapa subcategoria-grupo"
```

---

## Task 5: Agregação por grupo + estado de mês/colapso (frontend)

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Adicionar estado e helpers de mês**

Na seção `// TELA CATEGORIAS` de `frontend/js/app.js`, logo antes de `function renderizarPaginaCategorias()` (~linha 650), adicionar:

```js
let mesCategorias = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const GRUPOS_COLAPSADOS = new Set();

function chaveMes(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(date) {
  const txt = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function transacoesDoMes() {
  const chave = chaveMes(mesCategorias);
  return todasTransacoes.filter((t) => String(t.data).slice(0, 7) === chave);
}

/** Agrega transações por grupo → [{ group, total, subs:[{categoria,total}] }] desc. */
function agregarPorGrupo(transacoes) {
  const grupos = {};
  for (const t of transacoes) {
    const slug = t.categoria || 'outros';
    const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
    if (!grupos[grupo]) grupos[grupo] = { group: grupo, total: 0, subs: {} };
    grupos[grupo].total += t.valor;
    grupos[grupo].subs[slug] = (grupos[grupo].subs[slug] || 0) + t.valor;
  }
  return Object.values(grupos)
    .map((g) => ({
      group: g.group,
      total: g.total,
      subs: Object.entries(g.subs)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

function mudarMesCategorias(delta) {
  mesCategorias = new Date(mesCategorias.getFullYear(), mesCategorias.getMonth() + delta, 1);
  renderizarPaginaCategorias();
}

function toggleGrupoCategoria(slug) {
  if (GRUPOS_COLAPSADOS.has(slug)) GRUPOS_COLAPSADOS.delete(slug);
  else GRUPOS_COLAPSADOS.add(slug);
  renderizarPaginaCategorias();
}
```

- [ ] **Step 2: Verificação manual da agregação**

Abrir o console do app e rodar:

```js
console.log(agregarPorGrupo(transacoesDoMes()));
```

Expected: array de objetos `{group, total, subs:[...]}` ordenado por `total` desc, com os grupos das transações do mês corrente. Sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): agregacao por grupo e estado de mes"
```

---

## Task 6: Reescrever renderizarPaginaCategorias e remover código morto (frontend)

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Substituir o corpo de renderizarPaginaCategorias**

Trocar a função atual (linhas ~650-659):

```js
function renderizarPaginaCategorias() {
  const fonte = todasTransacoes;
  renderizarBarraCategorias('barra-categorias-pagina', fonte);
  const dados = agregarPorCategoria(fonte);
  const cores = dados.map((_, i) => CORES_CATEGORIAS[i % CORES_CATEGORIAS.length]);
  criarDonut('grafico-donut-categorias', dados.map(d => labelCategoria(d.categoria)), dados.map(d => d.total), cores);
  const lista = document.getElementById('lista-categorias');
  if (lista) lista.innerHTML = dados.map(d => `
    <div class="investimento-row"><span>${labelCategoria(d.categoria)}</span><strong>${formatarBRL(d.total)}</strong></div>`).join('') || criarEstadoVazio('Sem gastos no período.');
}
```

por:

```js
function renderizarPaginaCategorias() {
  const doMes = transacoesDoMes();
  const saidas = doMes.filter((t) => t.tipo === 'saida');
  const totalGasto = saidas.reduce((acc, t) => acc + t.valor, 0);

  // Header: total + donut-mini + navegador de mês
  const header = document.getElementById('categorias-header');
  if (header) {
    header.innerHTML = `
      <div class="cat-header__total">
        <strong>${formatarBRL(totalGasto)}</strong>
        <span>gasto em ${rotuloMes(mesCategorias)}</span>
      </div>
      <div class="cat-header__donut">
        <canvas id="grafico-donut-categorias" height="120" role="img" aria-label="Gráfico de gastos por categoria"></canvas>
      </div>
      <div class="cat-mes-nav">
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(-1)" aria-label="Mês anterior">‹</button>
        <span class="cat-mes-nav__label">${rotuloMes(mesCategorias)}</span>
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(1)" aria-label="Próximo mês">›</button>
      </div>`;
  }

  // Donut: grupos de despesa do mês
  const gruposSaida = agregarPorGrupo(saidas);
  criarDonut(
    'grafico-donut-categorias',
    gruposSaida.map((g) => GRUPOS[g.group]?.label ?? g.group),
    gruposSaida.map((g) => g.total),
    gruposSaida.map((g) => GRUPOS[g.group]?.cor ?? '#52525b'),
  );

  // Lista: grupos com atividade (saída + entrada), em acordeão
  const realizadas = doMes.filter((t) => t.tipo === 'saida' || t.tipo === 'entrada');
  const grupos = agregarPorGrupo(realizadas);
  const lista = document.getElementById('categorias-lista');
  if (!lista) return;
  if (!grupos.length) {
    lista.innerHTML = criarEstadoVazio('Sem transações neste mês.');
    return;
  }

  const maxGrupo = Math.max(...grupos.map((g) => g.total));
  lista.innerHTML = grupos.map((g) => {
    const meta = GRUPOS[g.group] ?? { label: g.group, icon: '📦', cor: '#b8a08a' };
    const colapsado = GRUPOS_COLAPSADOS.has(g.group);
    const pctGrupo = maxGrupo ? (g.total / maxGrupo * 100).toFixed(1) : 0;

    const subsHtml = g.subs.map((s) => {
      const pctSub = g.total ? (s.total / g.total * 100).toFixed(1) : 0;
      return `
        <div class="cat-sub">
          <span class="cat-sub__icone">${emojiCategoria(s.categoria)}</span>
          <span class="cat-sub__nome">${labelCategoria(s.categoria)}</span>
          <span class="cat-sub__valor">${formatarBRL(s.total)}</span>
          <div class="barra-progresso barra-progresso--fina">
            <div class="barra-progresso__preench" style="width:${pctSub}%;background:${meta.cor}"></div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="cat-grupo ${colapsado ? 'cat-grupo--colapsado' : ''}">
        <button class="cat-grupo__cabecalho" onclick="toggleGrupoCategoria('${g.group}')" aria-expanded="${!colapsado}">
          <span class="cat-grupo__chevron">${colapsado ? '⌄' : '⌃'}</span>
          <span class="cat-grupo__icone" style="background:${meta.cor}">${meta.icon}</span>
          <span class="cat-grupo__badge" style="background:${meta.cor}">${g.subs.length}</span>
          <span class="cat-grupo__nome">${meta.label}</span>
          <span class="cat-grupo__valor">${formatarBRL(g.total)}</span>
          <div class="barra-progresso">
            <div class="barra-progresso__preench" style="width:${pctGrupo}%;background:${meta.cor}"></div>
          </div>
        </button>
        <div class="cat-grupo__subs">${subsHtml}</div>
      </div>`;
  }).join('');
}
```

- [ ] **Step 2: Remover o código morto**

Apagar de `frontend/js/app.js` as três definições que só serviam à página antiga (atualmente ~linhas 873-896):
- `function agregarPorCategoria(transacoes) { ... }`
- `const CORES_CATEGORIAS = [...];`
- `function renderizarBarraCategorias(containerId, transacoes) { ... }`

(Confirmado por busca: nenhuma delas é referenciada fora da função antiga que acabou de ser substituída.)

- [ ] **Step 3: Verificação rápida de sintaxe**

Run (a partir da raiz do repo): `node --check frontend/js/app.js`
Expected: sem saída (exit 0) — arquivo sintaticamente válido.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): pagina de categorias em acordeao com grupos"
```

---

## Task 7: Reestruturar a section do HTML (frontend)

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Substituir a section#categorias**

Trocar o bloco atual (linhas ~162-170):

```html
      <!-- 3. CATEGORIAS -->
      <section class="pagina" id="categorias">
        <h1 class="pagina-titulo">Gastos por categoria</h1>
        <div id="barra-categorias-pagina"></div>
        <div class="grid-graficos">
          <section class="secao secao--grafico"><canvas id="grafico-donut-categorias" height="240" role="img" aria-label="Gráfico de gastos por categoria"></canvas></section>
          <section class="secao"><div id="lista-categorias"></div></section>
        </div>
      </section>
```

por:

```html
      <!-- 3. CATEGORIAS -->
      <section class="pagina" id="categorias">
        <h1 class="pagina-titulo">Gastos por categoria</h1>
        <div class="secao cat-header" id="categorias-header"></div>
        <section class="secao">
          <p class="cat-lista-rotulo">CATEGORIAS</p>
          <div id="categorias-lista"></div>
        </section>
      </section>
```

> O `<canvas id="grafico-donut-categorias">` agora é criado dinamicamente dentro de `#categorias-header` pelo JS (Task 6, Step 1), então não fica mais no HTML estático.

- [ ] **Step 2: Verificação manual**

Recarregar o app, ir na aba Categorias. Expected: aparece o header (total + donut + `‹ Mês Ano ›`), o rótulo "CATEGORIAS" e a lista de grupos. Sem erros no console e sem canvas duplicado.

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(frontend): reestrutura HTML da aba Categorias"
```

---

## Task 8: Estilos da página de categorias (frontend)

**Files:**
- Modify: `frontend/css/pages.css`

- [ ] **Step 1: Adicionar os estilos**

Acrescentar ao final de `frontend/css/pages.css`:

```css
/* ===== Aba Categorias (estilo Nubank) ===== */
.cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.cat-header__total { display: flex; flex-direction: column; gap: 4px; }
.cat-header__total strong { font-size: 2rem; font-weight: 700; }
.cat-header__total span { color: #a1a1aa; font-size: 0.9rem; }
.cat-header__donut { width: 130px; height: 130px; }

.cat-mes-nav { display: flex; align-items: center; gap: 16px; }
.cat-mes-nav__btn {
  background: rgba(255,255,255,0.06);
  border: none; color: #e4e4e7;
  width: 36px; height: 36px; border-radius: 50%;
  font-size: 1.2rem; cursor: pointer;
}
.cat-mes-nav__btn:hover { background: rgba(255,255,255,0.12); }
.cat-mes-nav__label { font-weight: 600; min-width: 140px; text-align: center; }

.cat-lista-rotulo {
  color: #71717a; font-size: 0.75rem; letter-spacing: 0.08em;
  margin: 0 0 12px;
}

.cat-grupo { border-bottom: 1px solid rgba(255,255,255,0.05); }
.cat-grupo:last-child { border-bottom: none; }
.cat-grupo__cabecalho {
  display: grid;
  grid-template-columns: 20px 36px 28px 1fr auto;
  grid-template-areas: "chevron icone badge nome valor" "chevron icone badge barra barra";
  align-items: center;
  gap: 6px 12px;
  width: 100%;
  background: none; border: none; color: inherit;
  padding: 14px 4px; cursor: pointer; text-align: left;
}
.cat-grupo__chevron { grid-area: chevron; color: #71717a; }
.cat-grupo__icone {
  grid-area: icone;
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.cat-grupo__badge {
  grid-area: badge;
  min-width: 22px; height: 22px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; color: #0a0a0a;
  padding: 0 6px;
}
.cat-grupo__nome { grid-area: nome; font-weight: 600; }
.cat-grupo__valor { grid-area: valor; font-weight: 700; white-space: nowrap; }
.cat-grupo__cabecalho .barra-progresso { grid-area: barra; margin-top: 4px; }

.cat-grupo__subs { padding: 0 4px 12px 68px; }
.cat-grupo--colapsado .cat-grupo__subs { display: none; }

.cat-sub {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  grid-template-areas: "icone nome valor" "barra barra barra";
  align-items: center;
  gap: 4px 10px;
  padding: 8px 0;
}
.cat-sub__icone { grid-area: icone; }
.cat-sub__nome { grid-area: nome; color: #d4d4d8; }
.cat-sub__valor { grid-area: valor; color: #d4d4d8; white-space: nowrap; }
.cat-sub .barra-progresso { grid-area: barra; }
.barra-progresso--fina { height: 4px; }
```

> Reutiliza `.barra-progresso` / `.barra-progresso__preench` já existentes (usados em parcelamentos). A variante `--fina` só reduz a altura.

- [ ] **Step 2: Verificação manual contra os prints**

Recarregar o app, abrir a aba Categorias. Comparar com os prints:
- header com total grande à esquerda, donut no meio, `‹ Mês Ano ›` à direita;
- rótulo "CATEGORIAS";
- cada grupo: chevron, ícone quadrado colorido, badge de contagem, nome, valor à direita, barra colorida;
- subcategorias indentadas com ícone, nome, valor e barra fina;
- clicar no cabeçalho de um grupo colapsa/expande;
- setas de mês navegam e atualizam total, donut e lista.

Expected: layout condizente com os prints; sem quebras visuais; navegação de mês funciona.

- [ ] **Step 3: Commit**

```bash
git add frontend/css/pages.css
git commit -m "style(frontend): estilos da aba Categorias estilo Nubank"
```

---

## Task 9: Verificação final integrada

**Files:** nenhum (só validação)

- [ ] **Step 1: Suíte de backend verde**

Run (a partir de `backend/`): `npm test`
Expected: PASS — `categories.test.js` e `parcelas.test.js` todos verdes.

- [ ] **Step 2: Lint de sintaxe do front**

Run (a partir da raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 3: Reseed + smoke manual**

Garantir Mongo no ar, então (a partir de `backend/`): `npm run seed` (45 categorias). Subir o app, criar 2-3 transações em subcategorias de grupos diferentes (ex.: Supermercado, Livraria, Salário) e abrir a aba Categorias.
Expected: grupos corretos, valores corretos, donut e total coerentes, navegação de mês e colapso funcionando — batendo com os prints.

- [ ] **Step 4: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais da aba Categorias"
```

---

## Self-Review (resultado)

- **Cobertura da spec:** taxonomia (Task 1), campo `group` no model (Task 2), reseed limpo (Task 3), config de estilo + mapa (Task 4), filtro/navegação de mês + agregação (Task 5), header+donut+acordeão (Task 6), HTML (Task 7), CSS (Task 8), verificação (Task 9). Edge cases da spec (órfã→`outros`, mês vazio, grupo só-renda fora do total/donut) cobertos no código da Task 5/6.
- **Placeholders:** nenhum — todo passo tem código/comando reais.
- **Consistência de tipos/nomes:** `CATEGORIAS_PADRAO`, `GRUPOS`, `MAPA_GRUPO_CATEGORIA`, `agregarPorGrupo`, `transacoesDoMes`, `chaveMes`, `rotuloMes`, `mudarMesCategorias`, `toggleGrupoCategoria`, classes `cat-*` e `barra-progresso--fina` usadas de forma idêntica entre JS, HTML e CSS.
