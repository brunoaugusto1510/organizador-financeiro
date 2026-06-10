# Aba Transações estilo Nubank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a aba Transações para o layout dos prints (estilo Nubank): barra de filtros, 4 KPIs, tabela com pill de categoria e menu de ações, paginação client-side, e transações ocultáveis.

**Architecture:** Backend ganha campo booleano `oculto` (persistido via rota PUT existente). Frontend reescreve o pipeline de filtros (`aplicarFiltros`) para período/tipo/categoria/busca/ocultos → KPIs → ordenação → paginação, e renderiza uma tabela com avatar/pill por grupo (reaproveitando `GRUPOS`/`MAPA_GRUPO_CATEGORIA` da aba Categorias) e um menu de ações por linha.

**Tech Stack:** Node.js (ESM, `node:test`), Mongoose, JavaScript vanilla no front (sem bundler/test runner).

---

## Estrutura de arquivos

- **Modificar** `backend/src/models/Transaction.js` — campo `oculto`.
- **Modificar** `backend/src/controllers/transactionController.js` — `montarDadosTransacao` inclui `oculto`.
- **Criar** `backend/test/transaction-model.test.js` — teste de schema.
- **Modificar** `frontend/js/api.js` — `oculto` em normalize + payload.
- **Modificar** `frontend/js/app.js` — estado, `aplicarFiltros`, KPIs, tabela, menu de ações, ocultar, paginação, listeners.
- **Modificar** `frontend/index.html` — section `#transacoes`.
- **Modificar** `frontend/css/pages.css` — estilos da aba.

Verdades do código atual (contexto):
- `t.data` = `'YYYY-MM-DD'`; `t.tipo` ∈ `'saida'|'entrada'|'pendente'`; `t.valor` positivo; `t.categoria` = slug da subcategoria.
- Globais já existentes: `formatarBRL`, `formatarData` (ui.js), `criarEstadoVazio`, `mostrarToast`, `abrirModal`, `editarTransacao(id)`, `excluirTransacao(id)`, `labelCategoria(slug)`, `emojiCategoria(slug)`, `txt(id, valor)`, `chaveMes(date)`, `GRUPOS`, `MAPA_GRUPO_CATEGORIA`.
- Funções globais chamadas via `onclick` inline (script não-módulo).
- `TransacoesAPI.atualizar(id, dados)` faz `PUT /:id` com payload completo.
- Frontend não tem runner de teste — tasks de front verificam com `node --check`; backend usa TDD com `node --test`.

---

## Task 1: Campo `oculto` (backend, TDD)

**Files:**
- Modify: `backend/src/models/Transaction.js`
- Modify: `backend/src/controllers/transactionController.js`
- Test: `backend/test/transaction-model.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `backend/test/transaction-model.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Transaction from '../src/models/Transaction.js';

test('schema Transaction tem campo oculto Boolean com default false', () => {
  const path = Transaction.schema.path('oculto');
  assert.ok(path, 'campo oculto ausente no schema');
  assert.equal(path.instance, 'Boolean');
  assert.equal(path.defaultValue, false);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run (de `backend/`): `npm test`
Expected: FAIL — "campo oculto ausente no schema".

- [ ] **Step 3: Adicionar o campo ao model**

Em `backend/src/models/Transaction.js`, adicionar o campo logo após o bloco `parcelasPagas` (antes do bloco `user`):
```js
    oculto: {
      type: Boolean,
      default: false,
    },
```

- [ ] **Step 4: Incluir `oculto` no controller**

Em `backend/src/controllers/transactionController.js`, na função `montarDadosTransacao` (linhas ~18-31), incluir `oculto` no destructuring e no retorno:
```js
function montarDadosTransacao(body) {
  const { title, type, amount, category, date, description, parcelas, parcelasPagas, oculto } = body;

  return {
    title,
    type,
    amount,
    category,
    date,
    description,
    parcelas,
    parcelasPagas,
    oculto,
  };
}
```
(O loop em `editarTransacao` que apaga chaves `undefined` garante que um PUT sem `oculto` não sobrescreve o valor existente.)

- [ ] **Step 5: Rodar e confirmar que passa**

Run (de `backend/`): `npm test`
Expected: PASS — todos os testes verdes (novo + categories + parcelas).

- [ ] **Step 6: Commit**
```bash
git add backend/src/models/Transaction.js backend/src/controllers/transactionController.js backend/test/transaction-model.test.js
git commit -m "feat(backend): campo oculto na transacao"
```

---

## Task 2: `oculto` na API do front (frontend)

**Files:** Modify `frontend/js/api.js`

- [ ] **Step 1: Normalizar `oculto` na resposta**

Em `frontend/js/api.js`, função `normalizarTransacaoApi`, adicionar a linha dentro do objeto retornado (após `parcelasPagas: ...`):
```js
    parcelasPagas: transacao.parcelasPagas ?? 0,
    oculto: transacao.oculto ?? false,
  };
```

- [ ] **Step 2: Enviar `oculto` no payload**

Na função `montarPayloadTransacao`, adicionar ao objeto retornado (após a linha de `parcelas`):
```js
    parcelas: dados.parcelas ?? 1,
    oculto: dados.oculto ?? false,
    ...(dados.parcelasPagas !== undefined ? { parcelasPagas: dados.parcelasPagas } : {}),
```

- [ ] **Step 3: Verificar sintaxe**

Run (raiz): `node --check frontend/js/api.js`
Expected: exit 0, sem saída.

- [ ] **Step 4: Commit**
```bash
git add frontend/js/api.js
git commit -m "feat(frontend): oculto no normalize e payload da api"
```

---

## Task 3: Estado, pipeline de filtros e KPIs (frontend)

**Files:** Modify `frontend/js/app.js`

- [ ] **Step 1: Trocar o estado de filtros**

Substituir a linha (atual ~40):
```js
let estadoFiltros = { tipo: 'todos', busca: '', dataInicio: '', dataFim: '' };
```
por:
```js
let estadoFiltros = {
  periodo: 'este-mes',      // 'este-mes' | 'mes-passado' | 'todos'
  tipo: 'todos',            // 'todos' | 'entrada' | 'saida' | 'pendente'
  ordenacao: 'data-desc',   // 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc'
  categoria: 'todas',       // 'todas' | <slug>
  busca: '',
  mostrarOcultos: false,
  pagina: 1,
  porPagina: 10,
};
```

- [ ] **Step 2: Reescrever `aplicarFiltros` e adicionar helpers/KPIs**

Substituir TODA a função `aplicarFiltros` atual (linhas ~604-635, da assinatura `function aplicarFiltros() {` até seu `}`) por este bloco:
```js
function chavePeriodo(periodo) {
  const hoje = new Date();
  if (periodo === 'este-mes') return chaveMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  if (periodo === 'mes-passado') return chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  return null; // 'todos'
}

function filtrarTransacoes() {
  let r = [...todasTransacoes];
  if (!estadoFiltros.mostrarOcultos) r = r.filter((t) => !t.oculto);
  const chave = chavePeriodo(estadoFiltros.periodo);
  if (chave) r = r.filter((t) => String(t.data).slice(0, 7) === chave);
  if (estadoFiltros.tipo !== 'todos') r = r.filter((t) => t.tipo === estadoFiltros.tipo);
  if (estadoFiltros.categoria !== 'todas') r = r.filter((t) => t.categoria === estadoFiltros.categoria);
  if (estadoFiltros.busca) {
    const q = estadoFiltros.busca;
    r = r.filter((t) =>
      (t.descricao || '').toLowerCase().includes(q) ||
      labelCategoria(t.categoria).toLowerCase().includes(q));
  }
  return r;
}

function ordenarTransacoes(lista) {
  const arr = [...lista];
  switch (estadoFiltros.ordenacao) {
    case 'data-asc':  return arr.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    case 'valor-desc': return arr.sort((a, b) => b.valor - a.valor);
    case 'valor-asc':  return arr.sort((a, b) => a.valor - b.valor);
    case 'data-desc':
    default:           return arr.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }
}

function atualizarKpisTransacoes(filtradas) {
  const despesas = filtradas.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
  const receitas = filtradas.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
  txt('kpi-tx-total', String(filtradas.length));
  txt('kpi-tx-despesas', formatarBRL(despesas));
  txt('kpi-tx-receitas', formatarBRL(receitas));
  txt('kpi-tx-saldo', formatarBRL(receitas - despesas));
}

function aplicarFiltros() {
  const filtradas = filtrarTransacoes();
  atualizarKpisTransacoes(filtradas);
  const ordenadas = ordenarTransacoes(filtradas);
  const total = ordenadas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / estadoFiltros.porPagina));
  if (estadoFiltros.pagina > totalPaginas) estadoFiltros.pagina = totalPaginas;
  const ini = (estadoFiltros.pagina - 1) * estadoFiltros.porPagina;
  const paginaAtual = ordenadas.slice(ini, ini + estadoFiltros.porPagina);
  renderizarTabelaTransacoes(paginaAtual);
  renderizarPaginacao(total, ini);
}
```
(`renderizarTabelaTransacoes` e `renderizarPaginacao` são reescritas/criadas nas Tasks 4 e 5; como são `function` declarations hoisted e só chamadas em runtime após o arquivo carregar, a ordem não quebra `node --check`.)

- [ ] **Step 3: Verificar sintaxe**

Run (raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 4: Commit**
```bash
git add frontend/js/app.js
git commit -m "feat(frontend): pipeline de filtros e KPIs das transacoes"
```

---

## Task 4: Tabela, avatar/pill e menu de ações (frontend)

**Files:** Modify `frontend/js/app.js`

- [ ] **Step 1: Reescrever `renderizarTabelaTransacoes` e adicionar helpers**

Substituir TODA a função `renderizarTabelaTransacoes` atual (linhas ~637-664, da assinatura até o `}`) por:
```js
function avatarCategoria(slug) {
  const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
  const cor = GRUPOS[grupo]?.cor ?? '#b8a08a';
  return `<span class="tx-avatar" style="background:${cor}">${emojiCategoria(slug)}</span>`;
}

function pillCategoria(slug) {
  const grupo = MAPA_GRUPO_CATEGORIA[slug] || 'outros';
  const cor = GRUPOS[grupo]?.cor ?? '#b8a08a';
  return `<span class="badge-categoria" style="color:${cor};border-color:${cor}">${emojiCategoria(slug)} ${labelCategoria(slug)}</span>`;
}

function renderizarTabelaTransacoes(lista) {
  const tbody = document.getElementById('container-transacoes-lista');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5">${criarEstadoVazio('Nenhuma transação encontrada.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map((t) => {
    const sinal = t.tipo === 'entrada' ? '+' : '';
    return `
    <tr data-id="${t.id}">
      <td class="tx-col-desc">${avatarCategoria(t.categoria)}<span class="tx-desc">${t.descricao}</span></td>
      <td>${pillCategoria(t.categoria)}</td>
      <td class="tx-col-data">${formatarData(t.data)}</td>
      <td class="tx-col-valor valor--${t.tipo}">${sinal}${formatarBRL(t.valor)}</td>
      <td class="tx-col-acoes">
        <button class="tx-acoes-btn" onclick="abrirMenuAcoes(event, '${t.id}')" aria-label="Ações">⋮</button>
      </td>
    </tr>`;
  }).join('');
}
```

- [ ] **Step 2: Adicionar o menu de ações e o toggle de ocultar**

Adicionar logo após `renderizarTabelaTransacoes` (mesma seção):
```js
let _menuAcoesAberto = null;

function fecharMenuAcoes() {
  if (_menuAcoesAberto) { _menuAcoesAberto.remove(); _menuAcoesAberto = null; }
  document.removeEventListener('click', _onDocClickMenu, true);
}

function _onDocClickMenu(e) {
  if (_menuAcoesAberto && !_menuAcoesAberto.contains(e.target)) fecharMenuAcoes();
}

function abrirMenuAcoes(event, id) {
  event.stopPropagation();
  fecharMenuAcoes();
  const t = todasTransacoes.find((x) => String(x.id) === String(id));
  if (!t) return;
  const menu = document.createElement('div');
  menu.className = 'tx-acoes-menu';
  menu.innerHTML = `
    <button onclick="editarTransacao('${id}');fecharMenuAcoes()">✏️ Editar</button>
    <button onclick="alternarOcultaTransacao('${id}')">${t.oculto ? '👁️ Mostrar' : '🙈 Ocultar'}</button>
    <button class="tx-acoes-menu__excluir" onclick="excluirTransacao('${id}');fecharMenuAcoes()">🗑️ Excluir</button>`;
  document.body.appendChild(menu);
  const r = event.currentTarget.getBoundingClientRect();
  menu.style.top = `${window.scrollY + r.bottom + 4}px`;
  menu.style.left = `${window.scrollX + r.right - menu.offsetWidth}px`;
  _menuAcoesAberto = menu;
  setTimeout(() => document.addEventListener('click', _onDocClickMenu, true), 0);
}

async function alternarOcultaTransacao(id) {
  fecharMenuAcoes();
  const t = todasTransacoes.find((x) => String(x.id) === String(id));
  if (!t) return;
  try {
    const atualizada = await TransacoesAPI.atualizar(id, { ...t, oculto: !t.oculto });
    const idx = todasTransacoes.findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) todasTransacoes[idx] = atualizada;
    aplicarFiltros();
    mostrarToast(atualizada.oculto ? 'Transação ocultada.' : 'Transação visível novamente.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao ocultar transação:', erro.message);
    mostrarToast('Não foi possível atualizar a transação.', 'erro');
  }
}
```

- [ ] **Step 3: Verificar sintaxe**

Run (raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 4: Commit**
```bash
git add frontend/js/app.js
git commit -m "feat(frontend): tabela de transacoes com pill e menu de acoes"
```

---

## Task 5: Paginação (frontend)

**Files:** Modify `frontend/js/app.js`

- [ ] **Step 1: Adicionar `renderizarPaginacao` e handlers**

Adicionar após `alternarOcultaTransacao` (mesma seção):
```js
function renderizarPaginacao(total, ini) {
  const cont = document.getElementById('paginacao-transacoes');
  if (!cont) return;
  if (!total) { cont.innerHTML = ''; return; }
  const pp = estadoFiltros.porPagina;
  const totalPaginas = Math.max(1, Math.ceil(total / pp));
  const pag = estadoFiltros.pagina;
  const de = ini + 1;
  const ate = Math.min(ini + pp, total);
  cont.innerHTML = `
    <label class="tx-paginacao__pp">Por página
      <select class="tx-select" onchange="mudarPorPagina(this.value)">
        ${[10, 25, 50].map((n) => `<option value="${n}" ${n === pp ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </label>
    <div class="tx-paginacao__nav">
      <span>Mostrando ${de} a ${ate} de ${total}</span>
      <button class="tx-pag-btn" onclick="mudarPagina(${pag - 1})" ${pag <= 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
      <span class="tx-pag-atual">${pag}</span>
      <button class="tx-pag-btn" onclick="mudarPagina(${pag + 1})" ${pag >= totalPaginas ? 'disabled' : ''} aria-label="Próxima página">›</button>
    </div>`;
}

function mudarPagina(n) {
  estadoFiltros.pagina = Math.max(1, Number(n));
  aplicarFiltros();
}

function mudarPorPagina(n) {
  estadoFiltros.porPagina = Number(n);
  estadoFiltros.pagina = 1;
  aplicarFiltros();
}
```

- [ ] **Step 2: Verificar sintaxe**

Run (raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 3: Commit**
```bash
git add frontend/js/app.js
git commit -m "feat(frontend): paginacao client-side das transacoes"
```

---

## Task 6: Listeners da seção + opções de categoria (frontend)

**Files:** Modify `frontend/js/app.js`

- [ ] **Step 1: Reescrever `inicializarSecaoTransacoes`**

Substituir TODA a função `inicializarSecaoTransacoes` atual (linhas ~540-587, da assinatura até o `}` que fecha o handler de `btn-limpar-filtros`) por:
```js
function inicializarSecaoTransacoes() {
  document.getElementById('btn-nova-transacao-lista')?.addEventListener('click', () => abrirModal());

  const ligaSelect = (id, prop) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      estadoFiltros[prop] = e.target.value;
      estadoFiltros.pagina = 1;
      aplicarFiltros();
    });
  };
  ligaSelect('filtro-periodo', 'periodo');
  ligaSelect('filtro-tipo', 'tipo');
  ligaSelect('filtro-ordenacao', 'ordenacao');
  ligaSelect('filtro-categoria', 'categoria');

  document.getElementById('filtro-mostrar-ocultos')?.addEventListener('change', (e) => {
    estadoFiltros.mostrarOcultos = e.target.checked;
    estadoFiltros.pagina = 1;
    aplicarFiltros();
  });

  let debounce;
  document.getElementById('filtro-busca')?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      estadoFiltros.busca = e.target.value.trim().toLowerCase();
      estadoFiltros.pagina = 1;
      aplicarFiltros();
    }, 300);
  });
}
```

- [ ] **Step 2: Popular o select de categorias do filtro**

Em `loadCategorias`, logo após o bloco que popula `transacao-categoria` (procurar `const select = document.getElementById('transacao-categoria');` e seu `if (select) ...`), adicionar:
```js
  const filtroCat = document.getElementById('filtro-categoria');
  if (filtroCat) {
    filtroCat.innerHTML = '<option value="todas">Todas as categorias</option>' +
      CATEGORIAS.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  }
```

- [ ] **Step 3: Verificar sintaxe**

Run (raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 4: Commit**
```bash
git add frontend/js/app.js
git commit -m "feat(frontend): listeners e filtro de categoria das transacoes"
```

---

## Task 7: Reestruturar o HTML da section (frontend)

**Files:** Modify `frontend/index.html`

- [ ] **Step 1: Substituir a section `#transacoes`**

Trocar o bloco atual (linhas ~141-160):
```html
      <!-- 2. TRANSAÇÕES -->
      <section class="pagina" id="transacoes">
        <h1 class="pagina-titulo">Transações</h1>
        <div class="filtros" role="group" aria-label="Filtros">
          <div class="filtros__tipos">
            <button class="filtro-btn ativo" id="filtro-todos" data-filtro-tipo="todos" type="button">Todas</button>
            <button class="filtro-btn" data-filtro-tipo="entrada" type="button">Entradas</button>
            <button class="filtro-btn" data-filtro-tipo="saida" type="button">Saídas</button>
            <button class="filtro-btn" data-filtro-tipo="pendente" type="button">Pendentes</button>
          </div>
          <div class="filtros__campos">
            <input type="search" id="filtro-busca" placeholder="Buscar..." aria-label="Buscar transações" />
            <input type="date" id="filtro-data-inicio" aria-label="Data início" />
            <input type="date" id="filtro-data-fim" aria-label="Data fim" />
            <button class="btn btn--secundario" id="btn-limpar-filtros" type="button">Limpar</button>
          </div>
        </div>
        <p class="resultado-contagem" id="resultado-contagem" aria-live="polite"></p>
        <div id="container-transacoes-lista"></div>
      </section>
```
por:
```html
      <!-- 2. TRANSAÇÕES -->
      <section class="pagina" id="transacoes">
        <h1 class="pagina-titulo">Transações</h1>

        <div class="tx-filtros" role="group" aria-label="Filtros">
          <select class="tx-select" id="filtro-periodo" aria-label="Período">
            <option value="este-mes">Este mês</option>
            <option value="mes-passado">Mês passado</option>
            <option value="todos">Todos</option>
          </select>
          <select class="tx-select" id="filtro-tipo" aria-label="Tipo de transação">
            <option value="todos">Todas Transações</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
            <option value="pendente">Pendentes</option>
          </select>
          <select class="tx-select" id="filtro-ordenacao" aria-label="Ordenação">
            <option value="data-desc">Data (mais recentes)</option>
            <option value="data-asc">Data (mais antigas)</option>
            <option value="valor-desc">Maior valor</option>
            <option value="valor-asc">Menor valor</option>
          </select>
          <select class="tx-select" id="filtro-categoria" aria-label="Categorias">
            <option value="todas">Todas as categorias</option>
          </select>
          <label class="tx-toggle">
            <input type="checkbox" id="filtro-mostrar-ocultos" />
            <span>Mostrar ocultos</span>
          </label>
        </div>

        <div class="tx-kpis">
          <div class="kpi"><span class="kpi__rotulo">Total</span><span class="kpi__valor" id="kpi-tx-total">0</span></div>
          <div class="kpi"><span class="kpi__rotulo">Despesas</span><span class="kpi__valor valor--saida" id="kpi-tx-despesas">—</span></div>
          <div class="kpi"><span class="kpi__rotulo">Receitas</span><span class="kpi__valor valor--entrada" id="kpi-tx-receitas">—</span></div>
          <div class="kpi"><span class="kpi__rotulo">Saldo</span><span class="kpi__valor" id="kpi-tx-saldo">—</span></div>
        </div>

        <div class="tx-barra-acoes">
          <input type="search" id="filtro-busca" class="tx-busca" placeholder="Buscar transações..." aria-label="Buscar transações" />
          <button class="btn btn--primario" id="btn-nova-transacao-lista" type="button">＋ Nova Transação</button>
        </div>

        <table class="tabela-transacoes">
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Categoria</th>
              <th scope="col">Data</th>
              <th scope="col">Valor</th>
              <th scope="col" aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody id="container-transacoes-lista"></tbody>
        </table>

        <div class="tx-paginacao" id="paginacao-transacoes"></div>
      </section>
```

- [ ] **Step 2: Verificar**

Grep em `frontend/index.html`: `data-filtro-tipo` → 0; `filtro-data-inicio` → 0; `resultado-contagem` → 0; `container-transacoes-lista` → 1 (agora `<tbody>`); `kpi-tx-total`/`kpi-tx-saldo`/`paginacao-transacoes`/`filtro-periodo` presentes.

- [ ] **Step 3: Commit**
```bash
git add frontend/index.html
git commit -m "feat(frontend): reestrutura HTML da aba Transacoes"
```

---

## Task 8: Estilos da aba (frontend)

**Files:** Modify `frontend/css/pages.css`

- [ ] **Step 1: Confirmar base existente**

Grep em `frontend/css/` por `.valor--entrada` e `.valor--saida`. Se existirem, não redefinir cor de valor (já usadas pelas linhas). Grep por `.kpi` e `.badge-categoria` — já existem (reaproveitadas). Prosseguir.

- [ ] **Step 2: Anexar os estilos**

Adicionar ao FINAL de `frontend/css/pages.css`:
```css
/* ===== Aba Transações (estilo Nubank) ===== */
.tx-filtros {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  margin-bottom: 20px;
}
.tx-select {
  background: rgba(255,255,255,0.04);
  color: #e4e4e7;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 8px 12px; font-size: 0.9rem; cursor: pointer;
}
.tx-toggle { display: inline-flex; align-items: center; gap: 8px; color: #a1a1aa; font-size: 0.9rem; cursor: pointer; }
.tx-toggle input { cursor: pointer; }

.tx-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 720px) { .tx-kpis { grid-template-columns: repeat(2, 1fr); } }
.tx-kpis .kpi {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 6px;
}
.tx-kpis .kpi__valor { font-size: 1.5rem; font-weight: 700; }

.tx-barra-acoes { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.tx-busca {
  flex: 1; max-width: 420px;
  background: rgba(255,255,255,0.04); color: #e4e4e7;
  border: 1px solid rgba(255,255,255,0.10); border-radius: 12px;
  padding: 10px 14px; font-size: 0.9rem;
}
.btn--primario {
  background: rgba(255,255,255,0.04); color: #e4e4e7;
  border: 1px solid rgba(255,255,255,0.14); border-radius: 12px;
  padding: 10px 18px; font-weight: 600; cursor: pointer;
}
.btn--primario:hover { background: rgba(255,255,255,0.10); }

.tabela-transacoes { width: 100%; border-collapse: collapse; }
.tabela-transacoes thead th {
  text-align: left; color: #71717a; font-size: 0.72rem; letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 600;
  padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tabela-transacoes thead th:last-child { width: 44px; }
.tabela-transacoes td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
.tx-col-desc { display: flex; align-items: center; gap: 12px; }
.tx-desc { font-weight: 500; }
.tx-avatar {
  width: 34px; height: 34px; border-radius: 10px; flex: 0 0 34px;
  display: inline-flex; align-items: center; justify-content: center; font-size: 1rem;
}
.tx-col-data { color: #a1a1aa; white-space: nowrap; }
.tx-col-valor { font-weight: 700; white-space: nowrap; text-align: right; }
.tx-col-acoes { text-align: right; width: 44px; }

.tx-acoes-btn {
  background: none; border: none; color: #a1a1aa; cursor: pointer;
  font-size: 1.2rem; line-height: 1; padding: 4px 8px; border-radius: 8px;
}
.tx-acoes-btn:hover { background: rgba(255,255,255,0.08); color: #e4e4e7; }

.tx-acoes-menu {
  position: absolute; z-index: 50; min-width: 160px;
  background: #18181b; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 12px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
}
.tx-acoes-menu button {
  background: none; border: none; color: #e4e4e7; text-align: left;
  padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
}
.tx-acoes-menu button:hover { background: rgba(255,255,255,0.08); }
.tx-acoes-menu__excluir { color: #fb7185; }

.tx-paginacao {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-top: 16px; color: #a1a1aa; font-size: 0.85rem; flex-wrap: wrap;
}
.tx-paginacao__pp { display: inline-flex; align-items: center; gap: 8px; }
.tx-paginacao__nav { display: inline-flex; align-items: center; gap: 12px; }
.tx-pag-btn {
  background: rgba(255,255,255,0.06); border: none; color: #e4e4e7;
  width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
}
.tx-pag-btn:disabled { opacity: 0.35; cursor: default; }
.tx-pag-atual {
  min-width: 30px; height: 30px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--cor-primaria, #10b981); color: #04130d; font-weight: 700;
}
```

- [ ] **Step 3: Verificar balanço de chaves**

Conferir visualmente que cada regra abre `{` e fecha `}` no bloco anexado (chaves balanceadas).

- [ ] **Step 4: Commit**
```bash
git add frontend/css/pages.css
git commit -m "style(frontend): estilos da aba Transacoes estilo Nubank"
```

---

## Task 9: Verificação final integrada

**Files:** nenhum (validação)

- [ ] **Step 1: Backend verde**

Run (de `backend/`): `npm test`
Expected: PASS — `transaction-model.test.js` + `categories.test.js` + `parcelas.test.js`.

- [ ] **Step 2: Sintaxe do front**

Run (raiz): `node --check frontend/js/app.js && node --check frontend/js/api.js`
Expected: exit 0, sem saída.

- [ ] **Step 3: Smoke manual**

Garantir Mongo + app no ar. Abrir a aba Transações e exercitar: trocar Período/Tipo/Ordenação/Categoria, buscar texto, alternar "Mostrar ocultos", abrir o menu ⋮ e Ocultar/Mostrar/Editar/Excluir, paginar (10/25/50 e setas). Conferir KPIs (Total/Despesas/Receitas/Saldo) e layout contra os prints.
Expected: filtros e KPIs coerentes; ocultar remove da lista (e reaparece com o toggle); paginação correta; visual batendo com os prints.

- [ ] **Step 4: Commit final (se houver ajustes)**
```bash
git add -A
git commit -m "chore: ajustes finais da aba Transacoes"
```

---

## Self-Review (resultado)

- **Cobertura da spec:** campo `oculto` backend (Task 1) + api (Task 2); estado/filtros/KPIs (Task 3); tabela/avatar/pill/menu/ocultar (Task 4); paginação (Task 5); listeners + filtro de categoria (Task 6); HTML (Task 7); CSS (Task 8); verificação (Task 9). Edge cases (vazio, página fora do total resetada, órfã→`outros`, falha ao ocultar) cobertos no código das Tasks 3/4.
- **Placeholders:** nenhum — todo passo tem código/comando reais.
- **Consistência de nomes:** `estadoFiltros` (campos periodo/tipo/ordenacao/categoria/busca/mostrarOcultos/pagina/porPagina), `aplicarFiltros`, `filtrarTransacoes`, `ordenarTransacoes`, `atualizarKpisTransacoes`, `renderizarTabelaTransacoes`, `renderizarPaginacao`, `abrirMenuAcoes`/`fecharMenuAcoes`/`alternarOcultaTransacao`, `mudarPagina`/`mudarPorPagina`, ids `kpi-tx-*`, `filtro-*`, `container-transacoes-lista`, `paginacao-transacoes`, classes `tx-*` — usados de forma idêntica entre JS, HTML e CSS.
