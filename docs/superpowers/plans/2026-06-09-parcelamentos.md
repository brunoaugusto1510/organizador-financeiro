# Lógica de Parcelamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir transações parceladas (documento único + cronograma derivado), distribuir seu impacto mês a mês no dashboard, integrar com Contas a Pagar e popular a aba Parcelamentos.

**Architecture:** Um parcelamento é UMA `Transaction` com `parcelas`/`parcelasPagas`; o cronograma de parcelas é derivado por funções puras (backend `utils/parcelas.js` com testes `node:test`, espelhadas no frontend `js/parcelas.js`). Dashboard, Contas a Pagar e a aba Parcelamentos consomem essas funções. Impacto é por vencimento agendado (regime de competência); a próxima parcela em aberto de planos `expense` entra em Contas a Pagar.

**Tech Stack:** Node.js ESM, Express 4, Mongoose 9, `node:test`/`node:assert`, frontend vanilla JS + Chart.js.

**Verificação:** Helper puro = TDD com `node --test`. Backend integrado + frontend = smoke test de API ao vivo (PowerShell `Invoke-RestMethod`) e checagem visual. Pré-requisito: `backend/.env` com MONGO_URI/JWT_SECRET, Mongo acessível. Token JWT em PowerShell:

```powershell
$base = "http://localhost:3000/api"
$reg  = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (@{ name="P"; email="p_$(Get-Random)@ex.com"; password="123456" } | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($reg.token)" }
```

---

## Task 1: Helper de derivação (backend) — TDD

**Files:**
- Create: `backend/src/utils/parcelas.js`
- Create: `backend/test/parcelas.test.js`
- Modify: `backend/package.json` (adiciona script `test`)

- [ ] **Step 1: Adicionar o script de teste**

Em `backend/package.json`, no bloco `"scripts"`, adicionar a linha `test`:

```json
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node src/seed.js",
    "test": "node --test"
  },
```

- [ ] **Step 2: Escrever os testes (falhando)**

Criar `backend/test/parcelas.test.js`:

```javascript
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
  const r = addMeses(new Date(2026, 0, 15), 2); // 15/jan -> 15/mar
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
  const p3 = vencimentoParcela(tx, 3); // 3a parcela -> ago/2026
  assert.equal(p3.vencimento.getMonth(), 7);
  assert.equal(p3.valor, 100);
});

test('parcelaDoMes acha a parcela que vence no mes (0-based) ou null', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 3 };
  assert.equal(parcelaDoMes(tx, 2026, 5), 1); // jun -> parcela 1
  assert.equal(parcelaDoMes(tx, 2026, 6), 2); // jul -> parcela 2
  assert.equal(parcelaDoMes(tx, 2026, 7), 3); // ago -> parcela 3
  assert.equal(parcelaDoMes(tx, 2026, 8), null); // set -> nenhuma (so 3 parcelas)
  assert.equal(parcelaDoMes(tx, 2026, 4), null); // mai -> antes da 1a
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
  assert.equal(prox.vencimento.getMonth(), 7); // 10/ago
  assert.equal(prox.valor, 100);
});

test('proximaParcelaEmAberto retorna null quando plano concluido', () => {
  const tx = { date: new Date(2026, 5, 10), amount: 100, parcelas: 3, parcelasPagas: 3 };
  assert.equal(proximaParcelaEmAberto(tx), null);
});
```

- [ ] **Step 3: Rodar os testes — devem FALHAR**

Run (em `backend/`): `npm test`
Expected: falha com erro de import (módulo `../src/utils/parcelas.js` não existe).

- [ ] **Step 4: Implementar o helper**

Criar `backend/src/utils/parcelas.js`:

```javascript
/**
 * Funções puras de derivação do cronograma de parcelas.
 * Um parcelamento é UMA transação com `parcelas` (total) e `parcelasPagas`.
 * Nada de DOM/Express/Mongoose aqui — só lógica testável.
 */

export function addMeses(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function mesesEntre(de, ate) {
  return (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());
}

export function vencimentoParcela(tx, i) {
  return { indice: i, vencimento: addMeses(tx.date, i - 1), valor: tx.amount };
}

export function parcelaDoMes(tx, ano, mes) {
  const total = tx.parcelas || 1;
  const k = mesesEntre(new Date(tx.date), new Date(ano, mes, 1));
  if (k >= 0 && k < total) return k + 1;
  return null;
}

export function proximaParcelaEmAberto(tx) {
  const total = tx.parcelas || 1;
  const pagas = tx.parcelasPagas || 0;
  if (pagas >= total) return null;
  return { indice: pagas + 1, vencimento: addMeses(tx.date, pagas), valor: tx.amount };
}
```

- [ ] **Step 5: Rodar os testes — devem PASSAR**

Run: `npm test`
Expected: todos os testes passam (7 testes, 0 falhas).

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/parcelas.js backend/test/parcelas.test.js backend/package.json
git commit -m "feat(backend): helper de derivacao de parcelas com testes"
```

---

## Task 2: Campos de parcela no model Transaction

**Files:**
- Modify: `backend/src/models/Transaction.js`

- [ ] **Step 1: Adicionar `parcelas` e `parcelasPagas` ao schema**

Em `backend/src/models/Transaction.js`, dentro do objeto de definição do schema (após o campo `description` e antes de `user`), adicionar:

```javascript
    parcelas: {
      type: Number,
      default: 1,
      min: [1, 'O número de parcelas deve ser no mínimo 1.'],
    },
    parcelasPagas: {
      type: Number,
      default: 0,
      min: [0, 'Parcelas pagas não pode ser negativo.'],
      validate: {
        validator: function (value) {
          return value <= (this.parcelas ?? 1);
        },
        message: 'Parcelas pagas não pode exceder o total de parcelas.',
      },
    },
```

Observação: a validação `value <= this.parcelas` funciona em `create` e em
`findOneAndUpdate` porque o controller usa `runValidators: true`. Em update parcial
de `parcelasPagas` sem reenviar `parcelas`, `this.parcelas` pode ser `undefined` no
contexto do update; por isso o fallback `?? 1`. (O frontend sempre envia um
`parcelasPagas` ≤ total que ele já conhece.)

- [ ] **Step 2: Verificar sintaxe**

Run: `node --check backend/src/models/Transaction.js`
Expected: sem erros.

- [ ] **Step 3: Verificação ao vivo (criar transação parcelada)**

Subir server (`npm run dev`), obter `$H`, então:

```powershell
$tx = Invoke-RestMethod -Method Post -Uri "$base/transactions" -Headers $H -ContentType "application/json" -Body (@{ title="Notebook"; type="expense"; amount=100; category="outros"; date="2026-06-10"; parcelas=12 } | ConvertTo-Json)
$tx | Select-Object _id, amount, parcelas, parcelasPagas
```

Expected: `parcelas=12`, `parcelasPagas=0`, `amount=100`. Parar o server.

- [ ] **Step 4: Commit**

```bash
git add backend/src/models/Transaction.js
git commit -m "feat(backend): campos parcelas e parcelasPagas em Transaction"
```

---

## Task 3: Dashboard agregado considera parcelados

**Files:**
- Modify: `backend/src/controllers/transactionController.js`

- [ ] **Step 1: Importar o helper e separar parcelados na agregação**

No topo de `backend/src/controllers/transactionController.js`, adicionar o import (após os imports existentes):

```javascript
import { parcelaDoMes } from '../utils/parcelas.js';
```

- [ ] **Step 2: Restringir as queries atuais a não-parcelados e somar parcelados em JS**

Em `resumirDashboard`, faça três mudanças cirúrgicas:

(a) Adicionar `parcelas: { $lte: 1 }` aos `$match` das agregações existentes
(resumo do mês, gasto do mês anterior, categorias) e ao filtro dos `find` das
séries diárias, para que parcelados não sejam contados duas vezes. Exemplo no
`$match` do resumo:

```javascript
      { $match: { user: userId, parcelas: { $lte: 1 }, date: { $gte: atual.inicio, $lt: atual.fim } } },
```

Aplicar o mesmo `parcelas: { $lte: 1 }` em: o `$match` de `gastoAnteriorAgg`, os dois
`Transaction.find` de `txAtual`/`txAnterior`, e o `$match` de `categoriasAgg`.

(b) Logo antes do `return res.status(200).json(...)`, buscar os parcelados e
acumular seus impactos por vencimento:

```javascript
    // Parcelados: cada parcela impacta o mês em que vence (regime de competência).
    const parcelados = await Transaction.find({ user: userId, parcelas: { $gt: 1 } }, 'type amount category date parcelas');

    for (const p of parcelados) {
      const noMesAtual = parcelaDoMes(p, ano, mes);
      const noMesAnterior = parcelaDoMes(p, anterior.inicio.getFullYear(), anterior.inicio.getMonth());

      if (noMesAtual) {
        if (p.type === 'income') { entradas += p.amount; }
        else if (p.type === 'expense') {
          saidas += p.amount;
          // soma na série diária do mês atual, no dia do vencimento
          const dia = Math.min(new Date(p.date).getDate(), diasAtual);
          for (let i = dia - 1; i < serieAtualFull.length; i++) serieAtualFull[i] += p.amount;
          // soma na categoria
          const cat = p.category || 'outros';
          const alvo = categorias.find((c) => c.categoria === cat);
          if (alvo) alvo.total += p.amount; else categorias.push({ categoria: cat, total: p.amount });
        }
      }
      if (noMesAnterior && p.type === 'expense') {
        const diaAnt = Math.min(new Date(p.date).getDate(), diasAnterior);
        for (let i = diaAnt - 1; i < serieAnterior.length; i++) serieAnterior[i] += p.amount;
      }
    }

    // Recalcula derivados afetados pelos parcelados
    categorias.sort((a, b) => b.total - a.total);
    const gastoAtualFinal = saidas;
    const gastoAnteriorFinal = gastoAnterior + parcelados
      .filter((p) => p.type === 'expense' && parcelaDoMes(p, anterior.inicio.getFullYear(), anterior.inicio.getMonth()))
      .reduce((s, p) => s + p.amount, 0);
    const difPctFinal = gastoAnteriorFinal > 0 ? ((gastoAtualFinal - gastoAnteriorFinal) / gastoAnteriorFinal) * 100 : 0;
    const serieAtual = serieAtualFull.map((v, i) => (i + 1 <= diaCorrente ? v : null));
```

Notas para o implementador:
- `serieAtualFull` já existe (array cumulativo do mês atual antes do mascaramento).
  **Importante:** os parcelados são somados em `serieAtualFull` *antes* de gerar o
  `serieAtual` mascarado — por isso a linha `const serieAtual = ...` acima
  **substitui** a definição original de `serieAtual`. Garanta que a definição
  original (`const serieAtual = serieAtualFull.map(...)`) seja removida e que esta
  reordenada venha depois do loop de parcelados.
- `entradas`, `saidas`, `gastoAnterior` precisam estar declarados com `let` (não
  `const`) para receberem os incrementos. Ajuste as declarações dessas variáveis
  para `let`.

(c) Atualizar o payload de retorno para usar os valores finais:

```javascript
    return res.status(200).json({
      resumo: { saldo: entradas - saidas, entradas, saidas, pendentes },
      comparativo: {
        gastoAtual: gastoAtualFinal,
        gastoAnterior: gastoAnteriorFinal,
        difPct: Number(difPctFinal.toFixed(2)),
      },
      serieDiaria: { atual: serieAtual, anterior: serieAnterior, diaCorrente },
      categorias,
    });
```

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check backend/src/controllers/transactionController.js`
Expected: sem erros.

- [ ] **Step 4: Verificação ao vivo**

Subir server, `$H`, criar uma despesa parcelada no mês corrente e conferir o dashboard:

```powershell
$mes = (Get-Date).ToString("yyyy-MM-01")
Invoke-RestMethod -Method Post -Uri "$base/transactions" -Headers $H -ContentType "application/json" -Body (@{ title="Geladeira"; type="expense"; amount=100; category="moradia"; date=$mes; parcelas=10 } | ConvertTo-Json) | Out-Null
$dash = Invoke-RestMethod -Uri "$base/transactions/dashboard" -Headers $H
Write-Output "saidas=$($dash.resumo.saidas) (esperado inclui 100) | categorias moradia=$(( $dash.categorias | Where-Object categoria -eq 'moradia').total)"
```

Expected: `saidas` inclui os 100 da parcela do mês; `categorias` tem `moradia` com 100 (ou +100). Parar o server.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/transactionController.js
git commit -m "feat(backend): dashboard distribui impacto de parcelas por vencimento"
```

---

## Task 4: api.js — payload e normalização de parcelas

**Files:**
- Modify: `frontend/js/api.js`

- [ ] **Step 1: Expor parcelas na normalização vinda da API**

Em `normalizarTransacaoApi`, adicionar dois campos ao objeto retornado (após `observacao`):

```javascript
    parcelas: transacao.parcelas ?? 1,
    parcelasPagas: transacao.parcelasPagas ?? 0,
```

- [ ] **Step 2: Incluir parcelas no payload enviado**

Em `montarPayloadTransacao`, adicionar ao objeto retornado:

```javascript
    parcelas: dados.parcelas ?? 1,
    ...(dados.parcelasPagas !== undefined ? { parcelasPagas: dados.parcelasPagas } : {}),
```

(O `amount` continua sendo `dados.valor`; o frontend já envia o valor de UMA
parcela em `dados.valor` — ver Task 6.)

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check frontend/js/api.js`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/api.js
git commit -m "feat(frontend): api.js trafega parcelas e parcelasPagas"
```

---

## Task 5: Helper de derivação no frontend

**Files:**
- Create: `frontend/js/parcelas.js`
- Modify: `frontend/index.html` (incluir o script antes de app.js)

- [ ] **Step 1: Criar o helper (espelha o backend, opera na forma de UI)**

Criar `frontend/js/parcelas.js`. Opera sobre a transação normalizada de UI
(`{ data: 'YYYY-MM-DD', valor, parcelas, parcelasPagas, tipo }`):

```javascript
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
```

- [ ] **Step 2: Incluir o script no index.html antes de app.js**

Em `frontend/index.html`, na sequência de `<script>` no final do body, inserir
`parcelas.js` **antes** de `app.js` e depois de `api.js`. A ordem final deve ser:

```html
    <script src="js/ui.js"></script>
    <script src="js/api.js"></script>
    <script src="js/parcelas.js"></script>
    <script src="js/charts.js"></script>
    <script src="js/app.js"></script>
```

(Ajuste apenas inserindo a linha do `parcelas.js`; mantenha as demais na ordem que já existem.)

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check frontend/js/parcelas.js`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/parcelas.js frontend/index.html
git commit -m "feat(frontend): helper de derivacao de parcelas"
```

---

## Task 6: Formulário — parcelas para income+expense, valor total ÷ N

**Files:**
- Modify: `frontend/js/app.js`
- Modify: `frontend/index.html`

- [ ] **Step 1: Mostrar o grupo Parcelas para income e expense (não pending)**

Em `app.js`, função `selecionarTipo(tipo)`, trocar a regra atual
(`grupoParcelas.hidden = tipo !== 'saida';`) por:

```javascript
  const grupoParcelas = document.getElementById('grupo-parcelas');
  if (grupoParcelas) grupoParcelas.hidden = (tipo === 'pendente');
```

- [ ] **Step 2: Adicionar feedback dinâmico no form (Nx de R$ y)**

Em `frontend/index.html`, dentro do `<div class="form-grupo" id="grupo-parcelas" ...>`,
após o `<input ... id="transacao-parcelas" ...>`, adicionar um elemento de feedback:

```html
<small id="parcelas-feedback" class="form-ajuda"></small>
```

Em `app.js`, em `inicializarFormTransacao`, adicionar listeners que recalculam o
feedback quando valor ou parcelas mudam:

```javascript
  const atualizarFeedbackParcelas = () => {
    const total = parseFloat(document.getElementById('transacao-valor').value) || 0;
    const n = parseInt(document.getElementById('transacao-parcelas')?.value ?? '1', 10) || 1;
    const fb = document.getElementById('parcelas-feedback');
    if (!fb) return;
    fb.textContent = (n > 1 && total > 0) ? `${n}x de ${formatarBRL(total / n)}` : '';
  };
  document.getElementById('transacao-valor')?.addEventListener('input', atualizarFeedbackParcelas);
  document.getElementById('transacao-parcelas')?.addEventListener('input', atualizarFeedbackParcelas);
```

- [ ] **Step 3: No submit, enviar valor de UMA parcela + total de parcelas**

Em `app.js`, em `salvarTransacao`, o `payload` atual lê `valor` e `parcelas`.
Ajustar para que, quando `parcelas > 1`, o `valor` enviado seja o valor da parcela
(`total / parcelas`). Substituir a montagem do `payload` por:

```javascript
  const totalDigitado = parseFloat(document.getElementById('transacao-valor').value);
  const nParcelas = parseInt(document.getElementById('transacao-parcelas')?.value ?? '1', 10) || 1;
  const tipoSel = document.getElementById('transacao-tipo').value;
  const valorParcela = (tipoSel !== 'pendente' && nParcelas > 1) ? (totalDigitado / nParcelas) : totalDigitado;

  const payload = {
    tipo:       tipoSel,
    descricao:  document.getElementById('transacao-descricao').value.trim(),
    valor:      valorParcela,
    data:       document.getElementById('transacao-data').value,
    categoria:  document.getElementById('transacao-categoria').value,
    parcelas:   (tipoSel !== 'pendente') ? nParcelas : 1,
    observacao: document.getElementById('transacao-observacao').value.trim(),
  };
```

- [ ] **Step 4: Ao editar um plano, exibir o valor TOTAL no campo Valor**

Em `app.js`, função `abrirModal(transacao)`, no ramo de edição, ajustar o
preenchimento do campo valor e parcelas para mostrar o total:

```javascript
    const totalParcelas = transacao.parcelas ?? 1;
    document.getElementById('transacao-valor').value = (transacao.valor ?? 0) * totalParcelas;
    const inpParc = document.getElementById('transacao-parcelas');
    if (inpParc) inpParc.value = totalParcelas;
```

(Localize a linha existente que faz `document.getElementById('transacao-valor').value = transacao.valor ?? '';`
e substitua por esse bloco; mantenha o restante do preenchimento de campos.)

- [ ] **Step 5: Verificar sintaxe**

Run: `node --check frontend/js/app.js`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/js/app.js frontend/index.html
git commit -m "feat(frontend): form de parcelas (income+expense, total dividido por N)"
```

---

## Task 7: Contas a Pagar inclui próxima parcela em aberto + pagar parcela

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Incluir a próxima parcela em aberto dos planos expense em Contas a Pagar**

Em `app.js`, `renderizarContasPagar`. Hoje ele monta `pendentes` a partir de
`todasTransacoes.filter(t => t.tipo === 'pendente')`. Substituir a montagem da
lista por uma que combina pendentes avulsos + próxima parcela de planos `saida`:

```javascript
  // Pendentes avulsos (tipo pendente, não parcelado)
  const avulsos = todasTransacoes
    .filter(t => t.tipo === 'pendente' && !pEhParcelado(t))
    .map(t => ({ id: t.id, descricao: t.descricao, categoria: t.categoria, data: t.data, valor: t.valor, parcela: null }));

  // Próxima parcela em aberto de cada plano de SAÍDA
  const parcelasAbertas = todasTransacoes
    .filter(t => t.tipo === 'saida' && pEhParcelado(t) && !pConcluido(t))
    .map(t => {
      const prox = pProximaEmAberto(t);
      return {
        id: t.id,
        descricao: t.descricao,
        categoria: t.categoria,
        data: prox.vencimento.toISOString().split('T')[0],
        valor: prox.valor,
        parcela: { indice: prox.indice, total: t.parcelas },
      };
    });

  const pendentes = [...avulsos, ...parcelasAbertas];
```

Em seguida, o restante de `renderizarContasPagar` usa `pendentes`. Ajustar a
ordenação e o cálculo do total para usar esse array (já fazem: `pendentes.sort(...)`,
`pendentes.reduce(...)`). Na geração das linhas, mostrar o rótulo da parcela quando
houver: na coluna descrição, anexar `${linha.parcela ? ` • Parcela ${linha.parcela.indice}/${linha.parcela.total}` : ''}`.
E o botão "pagar" deve chamar `pagarConta('${linha.id}')` como já faz.

(Atenção: a lista agora contém objetos derivados; certifique-se de que
`renderizarContasPagar` referencie `linha.descricao`, `linha.categoria`,
`linha.data`, `linha.valor` e `linha.id` — não mais o objeto transação cru.)

- [ ] **Step 2: `pagarConta` avança a parcela em vez de virar saída avulsa**

Em `app.js`, `pagarConta(id)`. Hoje ele faz `tipo:'saida'` + data de hoje.
Substituir o corpo por uma lógica que distingue parcelado de pendente avulso:

```javascript
async function pagarConta(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const ehParcela = pEhParcelado(transacao);
  const msg = ehParcela
    ? `Marcar a próxima parcela de "${transacao.descricao}" como paga?`
    : `Deseja marcar "${transacao.descricao}" como pago?`;
  if (!window.confirm(msg)) return;

  mostrarSpinner(true);

  const payload = ehParcela
    ? { ...transacao, parcelasPagas: (transacao.parcelasPagas || 0) + 1 }
    : { ...transacao, tipo: 'saida', data: new Date().toISOString().split('T')[0] };

  try {
    await TransacoesAPI.atualizar(id, payload);
    await carregarTodasTransacoes();
    carregarDashboard();
    mostrarToast(ehParcela ? 'Parcela paga!' : 'Conta marcada como paga!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao pagar:', erro.message);
    mostrarToast('Não foi possível registrar o pagamento.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

Nota: para parcelados, `TransacoesAPI.atualizar` envia `montarPayloadTransacao`,
que agora inclui `parcelasPagas` (Task 4) e `parcelas`. O `amount` reenviado é
`transacao.valor` (valor da parcela) — inalterado.

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check frontend/js/app.js`
Expected: sem erros.

- [ ] **Step 4: Verificação ao vivo (visual)**

Subir server, abrir o app, criar uma saída parcelada (total 1200, 12x). Em
Contas a Pagar deve surgir "Parcela 1/12 • vence ..." valor R$ 100,00. Clicar pagar
→ vira "Parcela 2/12" e `parcelasPagas` no backend = 1. Parar o server.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): proxima parcela em Contas a Pagar e pagamento de parcela"
```

---

## Task 8: Aba Parcelamentos

**Files:**
- Modify: `frontend/js/app.js`
- Modify: `frontend/index.html`

- [ ] **Step 1: Trocar o placeholder da seção por um container**

Em `frontend/index.html`, a seção `#parcelamentos` hoje tem um `<div class="estado-vazio">...`.
Substituir o conteúdo interno por um container que o JS preenche (mantendo título):

```html
      <section class="pagina" id="parcelamentos">
        <h1 class="pagina-titulo">Parcelamentos</h1>
        <div id="lista-parcelamentos"></div>
      </section>
```

- [ ] **Step 2: Renderizar a aba a partir de todasTransacoes**

Em `app.js`, adicionar a função (perto de `renderizarPaginaCategorias`):

```javascript
function renderizarPaginaParcelamentos() {
  const container = document.getElementById('lista-parcelamentos');
  if (!container) return;

  const planos = todasTransacoes.filter(pEhParcelado);
  if (!planos.length) {
    container.innerHTML = criarEstadoVazio('Nenhum parcelamento ativo. Crie uma transação com mais de 1 parcela.');
    return;
  }

  container.innerHTML = planos.map(t => {
    const total = t.parcelas;
    const pagas = t.parcelasPagas || 0;
    const valorTotal = t.valor * total;
    const restante = (total - pagas) * t.valor;
    const prox = pProximaEmAberto(t);
    const proxTxt = prox ? formatarData(prox.vencimento.toISOString().split('T')[0]) : 'Concluído';
    const pct = Math.round((pagas / total) * 100);
    const badge = t.tipo === 'entrada' ? 'Entrada' : 'Saída';
    return `
      <div class="card-saldo-total" data-id="${t.id}">
        <div class="parcelamento-cabecalho">
          <strong>${t.descricao}</strong>
          <span class="badge-categoria">${badge}</span>
        </div>
        <p class="parcelamento-meta">${total}x de ${formatarBRL(t.valor)} • total ${formatarBRL(valorTotal)}</p>
        <div class="barra-progresso"><div class="barra-progresso__preench" style="width:${pct}%"></div></div>
        <p class="parcelamento-meta">${pagas}/${total} pagas • restante ${formatarBRL(restante)} • próximo: ${proxTxt}</p>
        <button class="btn-acao btn-acao--excluir" onclick="excluirTransacao('${t.id}')" aria-label="Excluir plano">🗑️ Excluir</button>
      </div>`;
  }).join('');
}
```

- [ ] **Step 3: Disparar o render ao navegar para a aba**

Em `app.js`, na função de navegação `ativarSecao`, no `switch (alvo)` que já trata
`categorias`, adicionar o case:

```javascript
      case 'parcelamentos': renderizarPaginaParcelamentos(); break;
```

- [ ] **Step 4: Estilos mínimos da aba**

Em `frontend/css/components.css`, adicionar ao final:

```css
/* --- Parcelamentos --- */
.parcelamento-cabecalho { display: flex; align-items: center; justify-content: space-between; gap: var(--espaco-sm); }
.parcelamento-meta { color: var(--cor-texto-secundario); font-size: 0.85rem; margin-top: var(--espaco-sm); }
.barra-progresso { height: 8px; border-radius: var(--raio-pill); background: var(--cor-borda); overflow: hidden; margin-top: var(--espaco-sm); }
.barra-progresso__preench { height: 100%; background: var(--cor-primaria); }
```

- [ ] **Step 5: Verificar sintaxe**

Run: `node --check frontend/js/app.js`
Expected: sem erros.

- [ ] **Step 6: Verificação ao vivo (visual)**

Subir server, abrir o app. Criar uma saída parcelada (12x) e uma entrada parcelada
(ex.: total 600, 6x). Na aba Parcelamentos: dois cards com progresso, restante,
total e próximo vencimento; badge Entrada/Saída correto. A entrada parcelada **não**
aparece em Contas a Pagar. Parar o server.

- [ ] **Step 7: Commit**

```bash
git add frontend/js/app.js frontend/index.html frontend/css/components.css
git commit -m "feat(frontend): aba Parcelamentos com progresso e proximo vencimento"
```

---

## Task 9: Verificação final integrada

**Files:** nenhum (verificação)

- [ ] **Step 1: Rodar os testes do helper**

Run (em `backend/`): `npm test`
Expected: 7 testes passam.

- [ ] **Step 2: Fluxo completo (server + app no navegador)**

1. Criar despesa parcelada (total 1200, 12x) → backend: `amount=100, parcelas=12, parcelasPagas=0`.
2. Dashboard: `saidas` do mês inclui 100; categoria recebe 100.
3. Contas a Pagar: "Parcela 1/12 • vence ..." R$ 100,00. Pagar → "2/12", backend `parcelasPagas=1`.
4. Aba Parcelamentos: card progresso 1/12, restante 1100, total 1200, próximo vencimento.
5. Criar entrada parcelada (600, 6x): aparece em Parcelamentos (badge Entrada), **não** em Contas a Pagar; dashboard soma em `entradas` no mês da parcela.
6. Transação normal (parcelas=1): comportamento inalterado (dashboard, contas, lista).
7. Concluir um plano (pagar todas): sai de Contas a Pagar; aba mostra "Concluído".

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais de parcelamentos"
```

---

## Notas de cobertura do spec

- Seção 1 (modelo) → Task 2.
- Seção 2 (derivação) → Task 1 (backend, com testes) + Task 5 (frontend).
- Seção 3 (dashboard) → Task 3.
- Seção 4 (Contas a Pagar + pagar parcela) → Task 7.
- Seção 5 (aba Parcelamentos) → Task 8.
- Seção 6 (form/UX) → Task 6 + Task 4 (api.js).
- Verificação → Task 9.
