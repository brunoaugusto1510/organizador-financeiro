# Status individual de parcelas (pagar / adiantar) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir marcar cada parcela de um parcelamento como `pendente`, `paga` ou `adiantada` (escolha manual, fora de ordem) direto na aba Parcelamentos, já que não há integração com Open Finance.

**Architecture:** O estado por parcela vive num array `parcelasStatus` na transação (fonte única). `parcelasPagas` vira derivado (contagem de não-pendentes), recalculado no controller — porque `editarTransacao` usa `findOneAndUpdate`, que **não** dispara `pre('save')`. Helpers puros de derivação no backend (`utils/parcelas.js`, testados com `node:test`) e espelho no frontend (`js/parcelas.js`). A aba ganha lista expansível por card.

**Tech Stack:** Node/Express, Mongoose, `node:test` (backend), JS vanilla no frontend (scripts globais via `<script>`), Playwright+Edge para verificação visual.

---

## File Structure

- `backend/src/utils/parcelas.js` — **Modify**: constantes de status, `statusDeParcelas`, `contarQuitadas`, reescrita de `proximaParcelaEmAberto`.
- `backend/test/parcelas.test.js` — **Modify**: testes dos novos helpers e da reescrita.
- `backend/src/models/Transaction.js` — **Modify**: campo `parcelasStatus`.
- `backend/test/transaction-model.test.js` — **Modify**: teste do campo.
- `backend/src/controllers/transactionController.js` — **Modify**: `montarDadosTransacao` deriva `parcelasPagas` de `parcelasStatus`.
- `frontend/js/parcelas.js` — **Modify**: espelho dos helpers de status; reescrita de `pProximaEmAberto`/`pConcluido`.
- `frontend/js/api.js` — **Modify**: normaliza/serializa `parcelasStatus`.
- `frontend/js/app.js` — **Modify**: lista expansível + badges, `toggleParcelas`, `marcarParcela`, ajuste de `pagarConta`.
- `frontend/css/components.css` — **Modify**: estilos da lista e badges.

Observação sobre testes: o backend tem runner (`node:test`) → tasks de backend são TDD. O frontend **não** tem runner; suas mudanças são verificadas por harness Playwright (Task 10), seguindo o padrão de verificação visual do projeto.

---

## Task 1: Helpers de status (backend, puro)

**Files:**
- Modify: `backend/src/utils/parcelas.js`
- Test: `backend/test/parcelas.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao fim de `backend/test/parcelas.test.js`. Inclua os imports novos na linha de import existente (`statusDeParcelas`, `contarQuitadas`, e as constantes).

No topo, troque o bloco de import por:

```js
import {
  addMeses,
  mesesEntre,
  parcelaDoMes,
  proximaParcelaEmAberto,
  vencimentoParcela,
  statusDeParcelas,
  contarQuitadas,
  STATUS_PENDENTE,
  STATUS_PAGA,
} from '../src/utils/parcelas.js';
```

E acrescente os testes:

```js
test('statusDeParcelas deriva do contador quando array ausente', () => {
  const tx = { parcelas: 4, parcelasPagas: 2 };
  assert.deepEqual(statusDeParcelas(tx), ['paga', 'paga', 'pendente', 'pendente']);
});

test('statusDeParcelas usa o array quando presente e completa o que falta', () => {
  const tx = { parcelas: 3, parcelasStatus: ['adiantada'] };
  assert.deepEqual(statusDeParcelas(tx), ['adiantada', 'pendente', 'pendente']);
});

test('statusDeParcelas trunca array maior que parcelas', () => {
  const tx = { parcelas: 2, parcelasStatus: ['paga', 'paga', 'paga'] };
  assert.deepEqual(statusDeParcelas(tx), ['paga', 'paga']);
});

test('contarQuitadas conta status diferentes de pendente', () => {
  assert.equal(contarQuitadas(['paga', 'pendente', 'adiantada', 'pendente']), 2);
});

test('proximaParcelaEmAberto acha a primeira pendente fora de ordem', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 4, parcelasStatus: ['paga', 'pendente', 'adiantada', 'pendente'] };
  const prox = proximaParcelaEmAberto(tx);
  assert.equal(prox.indice, 2);
  assert.equal(prox.vencimento.getMonth(), 6);
  assert.equal(prox.valor, 100);
});

test('STATUS_PENDENTE e STATUS_PAGA expostos', () => {
  assert.equal(STATUS_PENDENTE, 'pendente');
  assert.equal(STATUS_PAGA, 'paga');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; npm test`
Expected: FAIL — `statusDeParcelas`/`contarQuitadas`/`STATUS_PENDENTE` indefinidos (e o novo teste de `proximaParcelaEmAberto` falha).

- [ ] **Step 3: Implementar**

Em `backend/src/utils/parcelas.js`, adicione as constantes no topo (após o comentário de cabeçalho) e os helpers; **substitua** `proximaParcelaEmAberto` pela versão baseada em status:

```js
export const STATUS_PENDENTE = 'pendente';
export const STATUS_PAGA = 'paga';
export const STATUS_ADIANTADA = 'adiantada';

export function statusDeParcelas(tx) {
  const total = tx.parcelas || 1;
  let arr = Array.isArray(tx.parcelasStatus) ? tx.parcelasStatus.slice(0, total) : [];
  if (arr.length === 0) {
    const pagas = tx.parcelasPagas || 0;
    return Array.from({ length: total }, (_, i) => (i < pagas ? STATUS_PAGA : STATUS_PENDENTE));
  }
  while (arr.length < total) arr.push(STATUS_PENDENTE);
  return arr;
}

export function contarQuitadas(status) {
  return status.filter((s) => s !== STATUS_PENDENTE).length;
}
```

E substitua a função existente:

```js
export function proximaParcelaEmAberto(tx) {
  const status = statusDeParcelas(tx);
  const i = status.findIndex((s) => s === STATUS_PENDENTE);
  if (i === -1) return null;
  return { indice: i + 1, vencimento: addMeses(tx.date, i), valor: tx.amount };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend; npm test`
Expected: PASS — incluindo os testes antigos de `proximaParcelaEmAberto` (contador → migração lazy dá o mesmo resultado).

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/parcelas.js backend/test/parcelas.test.js
git commit -m "feat(backend): helpers de status de parcelas (statusDeParcelas, contarQuitadas)"
```

---

## Task 2: Campo `parcelasStatus` no model

**Files:**
- Modify: `backend/src/models/Transaction.js`
- Test: `backend/test/transaction-model.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente em `backend/test/transaction-model.test.js`:

```js
test('schema Transaction tem parcelasStatus array de enum', () => {
  const path = Transaction.schema.path('parcelasStatus');
  assert.ok(path, 'campo parcelasStatus ausente no schema');
  assert.equal(path.instance, 'Array');
  assert.deepEqual(path.caster.enumValues, ['pendente', 'paga', 'adiantada']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; npm test`
Expected: FAIL — `campo parcelasStatus ausente no schema`.

- [ ] **Step 3: Implementar**

Em `backend/src/models/Transaction.js`, adicione o campo logo após o bloco `parcelasPagas` (antes de `oculto`):

```js
    parcelasStatus: {
      type: [String],
      enum: {
        values: ['pendente', 'paga', 'adiantada'],
        message: 'Status de parcela inválido.',
      },
      default: [],
    },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend; npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/Transaction.js backend/test/transaction-model.test.js
git commit -m "feat(backend): campo parcelasStatus no model Transaction"
```

---

## Task 3: Controller deriva `parcelasPagas` de `parcelasStatus`

**Files:**
- Modify: `backend/src/controllers/transactionController.js`

(Sem teste novo de controller — exige DB. A derivação reusa `contarQuitadas`, já coberto na Task 1. Verificação end-to-end na Task 10.)

- [ ] **Step 1: Importar o helper**

No topo de `backend/src/controllers/transactionController.js`, troque o import de utils:

De:
```js
import { parcelaDoMes, addMeses } from '../utils/parcelas.js';
```
Para:
```js
import { parcelaDoMes, addMeses, contarQuitadas } from '../utils/parcelas.js';
```

- [ ] **Step 2: Derivar `parcelasPagas` em `montarDadosTransacao`**

Substitua a função `montarDadosTransacao` (linhas ~18-32) por:

```js
function montarDadosTransacao(body) {
  const { title, type, amount, category, date, description, parcelas, parcelasPagas, parcelasStatus, oculto } = body;

  const dados = {
    title,
    type,
    amount,
    category,
    date,
    description,
    parcelas,
    parcelasPagas,
    parcelasStatus,
    oculto,
  };

  if (Array.isArray(parcelasStatus)) {
    dados.parcelasPagas = contarQuitadas(parcelasStatus);
  }

  return dados;
}
```

- [ ] **Step 3: Rodar testes (garantir que nada quebrou)**

Run: `cd backend; npm test`
Expected: PASS (testes existentes seguem verdes; `parcelaDoMes`/`addMeses` intactos).

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/transactionController.js
git commit -m "feat(backend): deriva parcelasPagas de parcelasStatus no controller"
```

---

## Task 4: Espelho dos helpers no frontend

**Files:**
- Modify: `frontend/js/parcelas.js`

(Sem runner frontend; verificado na Task 10.)

- [ ] **Step 1: Adicionar helpers de status e reescrever derivações**

Em `frontend/js/parcelas.js`, **substitua** `pProximaEmAberto` e `pConcluido` e adicione os novos helpers. O arquivo final fica:

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/parcelas.js
git commit -m "feat(frontend): espelho de status de parcelas em parcelas.js"
```

---

## Task 5: `api.js` normaliza/serializa `parcelasStatus`

**Files:**
- Modify: `frontend/js/api.js`

- [ ] **Step 1: Expor `parcelasStatus` na normalização**

Em `normalizarTransacaoApi`, adicione a linha após `parcelasPagas`:

```js
    parcelasPagas: transacao.parcelasPagas ?? 0,
    parcelasStatus: Array.isArray(transacao.parcelasStatus) ? transacao.parcelasStatus : [],
```

- [ ] **Step 2: Enviar `parcelasStatus` no payload**

Em `montarPayloadTransacao`, adicione após a linha de `parcelasPagas`:

```js
    ...(dados.parcelasPagas !== undefined ? { parcelasPagas: dados.parcelasPagas } : {}),
    ...(Array.isArray(dados.parcelasStatus) ? { parcelasStatus: dados.parcelasStatus } : {}),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/js/api.js
git commit -m "feat(frontend): trafega parcelasStatus no api.js"
```

---

## Task 6: Lista expansível de parcelas na aba

**Files:**
- Modify: `frontend/js/app.js` (`renderizarPaginaParcelamentos` ~916-947)

- [ ] **Step 1: Adicionar estado de expansão (módulo)**

Logo antes de `function renderizarPaginaParcelamentos()` (linha ~916), adicione:

```js
const parcelasExpandidas = new Set();

function toggleParcelas(id) {
  if (parcelasExpandidas.has(id)) parcelasExpandidas.delete(id);
  else parcelasExpandidas.add(id);
  renderizarPaginaParcelamentos();
}

const _LABEL_STATUS = { pendente: 'Pendente', paga: 'Paga', adiantada: 'Adiantada' };

function _linhaParcela(t, idx, st) {
  const num = idx + 1;
  const venc = formatarData(pAddMeses(t.data, idx).toISOString().split('T')[0]);
  const acoes = st === 'pendente'
    ? `<button class="parcela-btn parcela-btn--pagar" onclick="marcarParcela('${t.id}',${idx},'paga')">Pagar</button>
       <button class="parcela-btn parcela-btn--adiantar" onclick="marcarParcela('${t.id}',${idx},'adiantada')">Adiantar</button>`
    : `<button class="parcela-btn parcela-btn--desfazer" onclick="marcarParcela('${t.id}',${idx},'pendente')">Desfazer</button>`;
  return `
    <li class="parcela-item">
      <span class="parcela-item__info">Parcela ${num}/${t.parcelas} • vence ${venc}</span>
      <span class="parcela-badge parcela-badge--${st}">${_LABEL_STATUS[st]}</span>
      <span class="parcela-item__acoes">${acoes}</span>
    </li>`;
}
```

- [ ] **Step 2: Renderizar o toggle + lista no card**

Dentro de `renderizarPaginaParcelamentos`, no `.map(t => { ... })`, adicione antes do `return`:

```js
    const aberto = parcelasExpandidas.has(t.id);
    const statusArr = pStatusDeParcelas(t);
    const listaParcelas = aberto
      ? `<ul class="parcelas-lista">${statusArr.map((st, idx) => _linhaParcela(t, idx, st)).join('')}</ul>`
      : '';
```

E, no template do card, insira **antes** do botão Excluir (linha ~944):

```js
        <button class="btn-parcelas-toggle" onclick="toggleParcelas('${t.id}')">Ver parcelas ${aberto ? '▴' : '▾'}</button>
        ${listaParcelas}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): lista expansivel de parcelas no card"
```

---

## Task 7: Estilos da lista e badges

**Files:**
- Modify: `frontend/css/components.css` (seção Parcelamentos, ~572-577)

- [ ] **Step 1: Adicionar CSS**

Após a linha `.parcelamento-excluir { ... }` (seção Parcelamentos), adicione:

```css
.btn-parcelas-toggle { margin-top: var(--espaco-md); background: none; border: none; color: var(--cor-primaria); cursor: pointer; font-size: 0.85rem; padding: 0; }
.parcelas-lista { list-style: none; margin: var(--espaco-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--espaco-xs); }
.parcela-item { display: flex; align-items: center; justify-content: space-between; gap: var(--espaco-sm); padding: var(--espaco-sm) 0; border-top: 1px solid var(--cor-borda); flex-wrap: wrap; }
.parcela-item__info { color: var(--cor-texto-secundario); font-size: 0.85rem; }
.parcela-item__acoes { display: flex; gap: var(--espaco-xs); }
.parcela-badge { font-size: 0.72rem; padding: 2px 8px; border-radius: var(--raio-pill); white-space: nowrap; }
.parcela-badge--pendente { background: var(--cor-borda); color: var(--cor-texto-secundario); }
.parcela-badge--paga { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.parcela-badge--adiantada { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.parcela-btn { font-size: 0.78rem; padding: var(--espaco-xs) var(--espaco-sm); border-radius: var(--raio-sm); border: 1px solid var(--cor-borda); background: var(--cor-fundo-input); color: var(--cor-texto-secundario); cursor: pointer; }
.parcela-btn:hover { color: var(--cor-texto-principal); }
.parcela-btn--pagar:hover { border-color: #22c55e; color: #22c55e; }
.parcela-btn--adiantar:hover { border-color: #3b82f6; color: #3b82f6; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/css/components.css
git commit -m "style(frontend): estilos da lista de parcelas e badges"
```

---

## Task 8: Ação `marcarParcela`

**Files:**
- Modify: `frontend/js/app.js` (perto de `excluirTransacao`, ~955-978)

- [ ] **Step 1: Implementar `marcarParcela`**

Logo após a função `excluirTransacao` (linha ~978), adicione:

```js
/** Marca uma parcela específica como paga/adiantada/pendente. */
async function marcarParcela(id, indice, status) {
  const transacao = todasTransacoes.find((t) => String(t.id) === String(id));
  if (!transacao) return;

  const novo = pStatusDeParcelas(transacao).slice();
  novo[indice] = status;

  mostrarSpinner(true);
  try {
    await TransacoesAPI.atualizar(id, { ...transacao, parcelasStatus: novo });
    await carregarTodasTransacoes();
    renderizarPaginaParcelamentos();
    carregarDashboard();
    mostrarToast('Parcela atualizada.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao marcar parcela:', erro.message);
    mostrarToast('Não foi possível atualizar a parcela.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): marcarParcela (pagar/adiantar/desfazer)"
```

---

## Task 9: `pagarConta` marca a próxima pendente

**Files:**
- Modify: `frontend/js/app.js` (`pagarConta` ~1066-1093)

- [ ] **Step 1: Trocar o incremento de contador por status array**

Em `pagarConta`, substitua o bloco do `payload` parcelado. De:

```js
  const payload = ehParcela
    ? { ...transacao, parcelasPagas: (transacao.parcelasPagas || 0) + 1 }
    : { ...transacao, tipo: 'saida', data: new Date().toISOString().split('T')[0] };
```

Para:

```js
  let payload;
  if (ehParcela) {
    const status = pStatusDeParcelas(transacao).slice();
    const i = status.findIndex((s) => s === 'pendente');
    if (i === -1) {
      mostrarSpinner(false);
      mostrarToast('Plano já está quitado.', 'info');
      return;
    }
    status[i] = 'paga';
    payload = { ...transacao, parcelasStatus: status };
  } else {
    payload = { ...transacao, tipo: 'saida', data: new Date().toISOString().split('T')[0] };
  }
```

Nota: `mostrarSpinner(true)` já roda antes desse bloco — por isso o `mostrarSpinner(false)` no early-return.

- [ ] **Step 2: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): pagar conta marca proxima parcela pendente como paga"
```

---

## Task 10: Verificação (backend + harness visual)

**Files:**
- Create (temporário): `frontend/_verify_parcelas.html`, `frontend/_verify_parcelas.py`

- [ ] **Step 1: Backend — testes verdes**

Run: `cd backend; npm test`
Expected: PASS em todos (parcelas + model).

- [ ] **Step 2: Harness HTML que carrega CSS + lógica real**

Crie `frontend/_verify_parcelas.html` carregando os CSS reais (`variables`, `layout`, `components`, `pages`) e os JS reais `js/parcelas.js`. Cole **verbatim** a versão final de `renderizarPaginaParcelamentos`, `_linhaParcela`, `toggleParcelas`, `marcarParcela` (substituindo a chamada de API por uma mutação local no array + re-render) e o `_LABEL_STATUS`. Dados seed: 1 plano `{ id:'A', descricao:'Notebook', tipo:'saida', valor:100, parcelas:12, parcelasStatus:[] }` em `todasTransacoes`. Stubs: `formatarBRL`, `formatarData`, `criarEstadoVazio` (iguais aos do harness do fix anterior).

`marcarParcela` no harness:
```js
window.marcarParcela = (id, idx, status) => {
  const t = todasTransacoes.find(x => x.id === id);
  const novo = pStatusDeParcelas(t).slice();
  novo[idx] = status;
  t.parcelasStatus = novo;
  t.parcelasPagas = pContarQuitadas(novo);
  renderizarPaginaParcelamentos();
};
```

- [ ] **Step 3: Driver Playwright (Edge)**

Crie `frontend/_verify_parcelas.py`:

```python
import pathlib
from playwright.sync_api import sync_playwright

url = pathlib.Path(__file__).parent.joinpath("_verify_parcelas.html").as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    pg = b.new_page(viewport={"width": 520, "height": 1000})
    pg.goto(url)
    pg.click("text=Ver parcelas")
    n = len(pg.query_selector_all(".parcela-item"))
    print("LINHAS =", n, "(esperado 12)")
    # Pagar P1
    pg.click(".parcela-item:nth-child(1) .parcela-btn--pagar")
    pg.click("text=Ver parcelas")  # re-expande apos re-render
    b1 = pg.inner_text(".parcela-item:nth-child(1) .parcela-badge")
    # Adiantar P5
    pg.click(".parcela-item:nth-child(5) .parcela-btn--adiantar")
    pg.click("text=Ver parcelas")
    b5 = pg.inner_text(".parcela-item:nth-child(5) .parcela-badge")
    prog = pg.inner_text(".parcelamento-meta >> nth=1")
    print("P1 =", b1, "| P5 =", b5)
    print("PROGRESSO =", prog)
    pg.screenshot(path=str(pathlib.Path(__file__).parent / "_verify_parcelas.png"))
    b.close()
```

- [ ] **Step 4: Rodar e conferir**

Run: `cd frontend; $env:PYTHONUTF8=1; python _verify_parcelas.py`
Expected: `LINHAS = 12`, `P1 = Paga`, `P5 = Adiantada`, progresso `2/12 pagas`. Abrir `_verify_parcelas.png` e confirmar badges (verde/azul) e botões.

Nota: o harness verifica render/lista/badges/migração e a derivação de `pProximaEmAberto`. O fluxo end-to-end com Mongo+login é opcional (smoke manual): criar plano 12x, marcar parcelas, conferir Contas a Pagar mostrando a próxima pendente.

- [ ] **Step 5: Limpar temporários e commitar a feature**

```bash
cd frontend; Remove-Item _verify_parcelas.html, _verify_parcelas.py, _verify_parcelas.png -Force
cd ..; git status --short
```
Não deve haver temporários no `git status`. Nada a commitar aqui (já comitado por task).

---

## Self-Review

- **Cobertura do spec:** modelo (Task 2) ✓; derivação/`proximaParcelaEmAberto` reescrita (Task 1, 4) ✓; `paga` vs `adiantada` manual (Task 6, 8) ✓; fora de ordem (Task 1 teste + Task 8) ✓; migração lazy (Task 1, 4) ✓; UI expansível + badges + desfazer (Task 6, 7) ✓; fluxo de marcação/API (Task 5, 8) ✓; Contas a Pagar ajustada (Task 9) ✓; dashboard inalterado (não tocado — confirmado na Task 3 step 3) ✓; erros via enum do model (Task 2) ✓; verificação (Task 10) ✓.
- **Placeholders:** nenhum — todo passo traz código/comando completo.
- **Consistência de tipos:** `parcelasStatus` (array de `'pendente'|'paga'|'adiantada'`), `parcelasPagas` derivado, helpers `statusDeParcelas`/`contarQuitadas` (back) e `pStatusDeParcelas`/`pContarQuitadas` (front) com nomes consistentes entre tasks. `marcarParcela(id, indice, status)` e `toggleParcelas(id)` idênticos em todas as referências.
