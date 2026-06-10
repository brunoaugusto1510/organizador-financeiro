# Dropdown custom do sistema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a aparência dos 5 `<select>` nativos por um dropdown custom temático (lista escura, chevron, hover, teclado), via enhancement progressivo que preserva o contrato `value`/`change`.

**Architecture:** Um enhancer `melhorarSelect(select)` em `frontend/js/dropdown.js` mantém o `<select>` nativo (escondido, fonte da verdade) e desenha por cima um botão + popover `role="listbox"`. Selecionar opção seta `select.value` e dispara `change`, então todos os consumidores existentes (filtros, paginação, submit do form) seguem inalterados. O enhancer re-sincroniza a UI no evento `change` do select, inclusive em sets programáticos.

**Tech Stack:** JavaScript vanilla (sem bundler/test runner), CSS. Verificação por `node --check` + manual (sem DOM no `node:test`).

---

## Estrutura de arquivos

- **Criar** `frontend/js/dropdown.js` — `melhorarSelect(select)`, `inicializarDropdowns()`, e os helpers de abrir/fechar/teclado. Carregado antes de `app.js`.
- **Modificar** `frontend/css/components.css` — classes `.select-custom*`.
- **Modificar** `frontend/index.html` — `<script src="js/dropdown.js">` antes de `app.js`.
- **Modificar** `frontend/js/app.js` — chamar `inicializarDropdowns()` no `DOMContentLoaded`; enhance dos selects de categoria em `loadCategorias`; enhance do select de paginação em `renderizarPaginacao`; disparar `change` ao final de `abrirModal`.

Contexto (verdades do código atual):
- Selects: `filtro-periodo`, `filtro-tipo`, `filtro-ordenacao`, `filtro-categoria` (estáticos no HTML), `transacao-categoria` (modal, populado em `loadCategorias`), e o `<select>` "Por página" recriado a cada `renderizarPaginacao`.
- `abrirModal` seta `transacao-categoria.value` programaticamente (edição, ~linha 387) e dá `form.reset()` (nova, ~linha 393) — sem `change`.
- Ordem dos scripts em `index.html` (~259-264): chart.js CDN, `ui.js`, `api.js`, `parcelas.js`, `charts.js`, `app.js`.
- Sem runner de teste no front → `node --check` + verificação manual.

---

## Task 1: Componente `dropdown.js`

**Files:**
- Create: `frontend/js/dropdown.js`

- [ ] **Step 1: Criar o arquivo do componente**

Create `frontend/js/dropdown.js`:
```js
/* dropdown.js — enhancement progressivo de <select> em dropdown custom temático.
   Mantém o <select> nativo como fonte da verdade; sincroniza a UI no evento change. */

let _dropdownAberto = null;

function _onDocClickDropdown(e) {
  if (_dropdownAberto && !_dropdownAberto.contains(e.target)) _fecharDropdown();
}

function _abrirDropdown(wrapper, lista, controle) {
  _fecharDropdown();
  wrapper.classList.add('select-custom--aberto');
  lista.hidden = false;
  controle.setAttribute('aria-expanded', 'true');
  _dropdownAberto = wrapper;
  setTimeout(() => document.addEventListener('click', _onDocClickDropdown, true), 0);
}

function _fecharDropdown() {
  if (!_dropdownAberto) return;
  const lista = _dropdownAberto.querySelector('.select-custom__lista');
  const controle = _dropdownAberto.querySelector('.select-custom__controle');
  _dropdownAberto.classList.remove('select-custom--aberto');
  if (lista) lista.hidden = true;
  if (controle) controle.setAttribute('aria-expanded', 'false');
  _dropdownAberto = null;
  document.removeEventListener('click', _onDocClickDropdown, true);
}

function _moverSelecao(select, delta) {
  const n = select.options.length;
  if (!n) return;
  const i = Math.max(0, Math.min(n - 1, select.selectedIndex + delta));
  if (i !== select.selectedIndex) {
    select.selectedIndex = i;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function _onControleKeydown(e, wrapper, select, controle, lista) {
  const aberto = wrapper.classList.contains('select-custom--aberto');
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (aberto) _moverSelecao(select, 1); else _abrirDropdown(wrapper, lista, controle);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (aberto) _moverSelecao(select, -1);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (aberto) { _fecharDropdown(); controle.focus(); }
      else _abrirDropdown(wrapper, lista, controle);
      break;
    case 'Escape':
      if (aberto) { _fecharDropdown(); controle.focus(); }
      break;
    default:
      break;
  }
}

function _refreshDropdown(select, controle, lista) {
  const sel = select.options[select.selectedIndex];
  controle.innerHTML = '';
  const rotulo = document.createElement('span');
  rotulo.className = 'select-custom__rotulo';
  rotulo.textContent = sel ? sel.text : '';
  const chev = document.createElement('span');
  chev.className = 'select-custom__chevron';
  chev.setAttribute('aria-hidden', 'true');
  chev.textContent = '▾';
  controle.appendChild(rotulo);
  controle.appendChild(chev);

  lista.innerHTML = '';
  Array.from(select.options).forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'select-custom__opcao' + (opt.selected ? ' select-custom__opcao--selecionada' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
    li.textContent = opt.text;
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      if (select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      _fecharDropdown();
      controle.focus();
    });
    lista.appendChild(li);
  });
}

/** Enhancer idempotente: cria a UI custom na 1ª vez e re-sincroniza nas seguintes. */
function melhorarSelect(select) {
  if (!select) return;
  let wrapper;
  let controle;
  let lista;

  if (!select.dataset.enhanced) {
    wrapper = document.createElement('div');
    wrapper.className = 'select-custom';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('select-custom__nativo');

    controle = document.createElement('button');
    controle.type = 'button';
    controle.className = 'tx-select select-custom__controle';
    controle.setAttribute('aria-haspopup', 'listbox');
    controle.setAttribute('aria-expanded', 'false');

    lista = document.createElement('ul');
    lista.className = 'select-custom__lista';
    lista.setAttribute('role', 'listbox');
    lista.hidden = true;

    wrapper.appendChild(controle);
    wrapper.appendChild(lista);

    controle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wrapper.classList.contains('select-custom--aberto')) _fecharDropdown();
      else _abrirDropdown(wrapper, lista, controle);
    });
    controle.addEventListener('keydown', (e) => _onControleKeydown(e, wrapper, select, controle, lista));
    select.addEventListener('change', () => _refreshDropdown(select, controle, lista));

    select.dataset.enhanced = '1';
  } else {
    wrapper = select.closest('.select-custom');
    controle = wrapper.querySelector('.select-custom__controle');
    lista = wrapper.querySelector('.select-custom__lista');
  }

  _refreshDropdown(select, controle, lista);
}

/** Aplica o enhancer aos selects de filtro estáticos das Transações. */
function inicializarDropdowns() {
  ['filtro-periodo', 'filtro-tipo', 'filtro-ordenacao'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) melhorarSelect(el);
  });
}
```

- [ ] **Step 2: Verificar sintaxe**

Run (raiz): `node --check frontend/js/dropdown.js`
Expected: exit 0, sem saída.

- [ ] **Step 3: Commit**
```bash
git add frontend/js/dropdown.js
git commit -m "feat(frontend): componente de dropdown custom"
```

---

## Task 2: Estilos do dropdown

**Files:**
- Modify: `frontend/css/components.css`

- [ ] **Step 1: Confirmar base existente**

Grep em `frontend/css/` por `.tx-select` (existe em `pages.css` — o controle herda esse visual) e `.tx-acoes-menu` (referência de popover). Não redefinir `.tx-select`.

- [ ] **Step 2: Anexar os estilos ao final de `frontend/css/components.css`**
```css
/* ===== Dropdown custom (enhancement de <select>) ===== */
.select-custom { position: relative; display: inline-block; }
.select-custom__nativo {
  position: absolute; width: 1px; height: 1px;
  opacity: 0; pointer-events: none; margin: 0;
}
.select-custom__controle {
  display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; text-align: left;
}
.select-custom__rotulo { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.select-custom__chevron {
  font-size: 0.7rem; line-height: 1; transition: transform 0.15s ease; flex: 0 0 auto;
}
.select-custom--aberto .select-custom__chevron { transform: rotate(180deg); }

.select-custom__lista {
  position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%;
  max-height: 280px; overflow-y: auto; margin: 0; padding: 6px; list-style: none;
  background: #18181b; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.select-custom__opcao {
  padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
  color: #e4e4e7; white-space: nowrap;
}
.select-custom__opcao:hover { background: rgba(255,255,255,0.08); }
.select-custom__opcao--selecionada { background: rgba(255,255,255,0.06); font-weight: 600; }
```

- [ ] **Step 3: Verificar balanço de chaves**

Conferir que o bloco anexado tem `{`/`}` balanceados.

- [ ] **Step 4: Commit**
```bash
git add frontend/css/components.css
git commit -m "style(frontend): estilos do dropdown custom"
```

---

## Task 3: Carregar o script e integrar no app

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Incluir o script antes de `app.js`**

Em `frontend/index.html`, a linha:
```html
  <script src="js/charts.js"></script>
  <script src="js/app.js"></script>
```
vira:
```html
  <script src="js/charts.js"></script>
  <script src="js/dropdown.js"></script>
  <script src="js/app.js"></script>
```

- [ ] **Step 2: Chamar `inicializarDropdowns()` no boot**

Em `frontend/js/app.js`, dentro do `DOMContentLoaded`, a sequência:
```js
  inicializarSecaoTransacoes();
  inicializarLogout();
```
vira:
```js
  inicializarSecaoTransacoes();
  inicializarDropdowns();
  inicializarLogout();
```

- [ ] **Step 3: Enhance dos selects de categoria em `loadCategorias`**

Em `loadCategorias`, logo após o bloco que popula `filtro-categoria` (que termina em `}` após o `filtroCat.innerHTML = ...`), e antes do `}` que fecha a função, adicionar:
```js
  if (select) melhorarSelect(select);
  if (filtroCat) melhorarSelect(filtroCat);
```
(`select` = `transacao-categoria`; `filtroCat` = `filtro-categoria`; ambas variáveis já existem no escopo da função.)

- [ ] **Step 4: Enhance do select de paginação**

Em `renderizarPaginacao`, imediatamente após a atribuição `cont.innerHTML = ...` (no fim do template), adicionar:
```js
  const ppSelect = cont.querySelector('select');
  if (ppSelect) melhorarSelect(ppSelect);
```

- [ ] **Step 5: Notificar o enhancer nos sets programáticos do modal**

Em `abrirModal`, após o bloco `if (transacao) { ... } else { ... }` fechar (a linha com `}` antes de `atualizarFeedbackParcelas();`), adicionar o dispatch:
```js
  }

  document.getElementById('transacao-categoria')?.dispatchEvent(new Event('change', { bubbles: true }));

  atualizarFeedbackParcelas();
```
(Cobre tanto edição — `value` setado na ~linha 387 — quanto nova transação — `form.reset()`. Inócuo: `transacao-categoria` não tem listener de filtro.)

- [ ] **Step 6: Verificar sintaxe**

Run (raiz): `node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 7: Commit**
```bash
git add frontend/index.html frontend/js/app.js
git commit -m "feat(frontend): integra o dropdown custom nos selects do sistema"
```

---

## Task 4: Verificação final

**Files:** nenhum (validação)

- [ ] **Step 1: Sintaxe**

Run (raiz): `node --check frontend/js/dropdown.js && node --check frontend/js/app.js`
Expected: exit 0, sem saída.

- [ ] **Step 2: Smoke manual (app no ar)**

Abrir o app e exercitar:
- **Transações** → cada um dos 4 filtros: abrir (lista escura + chevron girando), hover, selecionar → a lista filtra e o rótulo do controle atualiza; opção selecionada destacada.
- **Paginação** → "Por página": trocar 10/25/50 atualiza a tabela; após paginar (re-render), o dropdown continua custom.
- **Nova Transação** → o select de categoria abre custom, com "Selecione..." no rótulo; escolher categoria e salvar funciona (submit lê `.value`).
- **Editar Transação** → ao abrir, o controle de categoria mostra a categoria correta (set programático refletido).
- **Teclado** no controle: ↓ abre / navega, ↑ navega, Enter/Espaço abre-fecha, Esc fecha; clicar fora fecha.
Expected: todos os dropdowns escuros e funcionais; filtros/paginação/cadastro/edição intactos; visual condizente com o tema.

- [ ] **Step 3: Commit final (se houver ajustes)**
```bash
git add -A
git commit -m "chore: ajustes finais do dropdown custom"
```

---

## Self-Review (resultado)

- **Cobertura da spec:** componente `melhorarSelect` + `inicializarDropdowns` (Task 1); CSS `.select-custom*` (Task 2); script tag + integração nos 5 selects + dispatch nos sets programáticos (Task 3); verificação a11y/teclado/manual (Task 4). Fallback nativo preservado (select escondido, não removido).
- **Placeholders:** nenhum — todo passo tem código/comando reais.
- **Consistência de nomes:** `melhorarSelect`, `inicializarDropdowns`, `_abrirDropdown`/`_fecharDropdown`/`_refreshDropdown`/`_moverSelecao`/`_onControleKeydown`/`_onDocClickDropdown`, classes `.select-custom`/`__nativo`/`__controle`/`__rotulo`/`__chevron`/`__lista`/`__opcao`/`--aberto`/`__opcao--selecionada` — idênticos entre JS, CSS e integração. O controle reusa `.tx-select` para o visual base.
- **Edge cases:** idempotência via `dataset.enhanced`; re-sync em `change` (cobre set programático); paginação recria o select a cada render (sempre novo elemento); placeholder `value=""` mostra o texto da option.
