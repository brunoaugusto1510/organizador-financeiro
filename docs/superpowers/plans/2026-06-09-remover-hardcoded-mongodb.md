# Remover Hardcoded e Migrar para MongoDB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar todo dado hardcoded do frontend (DEMO, MOCK, categorias e comparativos fabricados) e operar 100% sobre MongoDB, com agregação no backend e frontend como render puro.

**Architecture:** Backend Express + Mongoose ganha endpoint de dashboard agregado (escopado no mês), endpoint de categorias e CRUD de investimentos — todos user-scoped via middleware `protect`. Frontend remove fallbacks demo/mock e passa a renderizar exclusivamente respostas da API.

**Tech Stack:** Node.js (ESM), Express 4, Mongoose 9, JWT, frontend vanilla JS + Chart.js.

**Verificação:** O repo não tem framework de testes. Cada task de backend é verificada rodando o servidor (`npm run dev` em `backend/`) e batendo nos endpoints via PowerShell `Invoke-RestMethod`. Pré-requisito: `MONGO_URI` e `JWT_SECRET` definidos em `backend/.env` e MongoDB acessível.

---

## Convenções de verificação (ler antes de começar)

Servidor sobe em `http://localhost:3000` (`PORT` padrão). Para obter um token JWT em PowerShell e reusar nas chamadas protegidas:

```powershell
$base = "http://localhost:3000/api"
$reg  = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" `
  -Body (@{ name="Teste"; email="teste@ex.com"; password="123456" } | ConvertTo-Json)
$token = $reg.token
$H = @{ Authorization = "Bearer $token" }
```

(Se o email já existir, troque por `/auth/login` com os mesmos campos.)

---

## Task 1: Categorias — model, seed, controller, rota

**Files:**
- Modify: `backend/src/models/Category.js`
- Modify: `backend/src/seed.js`
- Create: `backend/src/controllers/categoryController.js`
- Create: `backend/src/routes/categoryRoutes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Adicionar `slug` e `icon` ao Category model**

Substituir o conteúdo de `backend/src/models/Category.js` por:

```javascript
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'O slug é obrigatório.'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'O tipo é obrigatório.'],
      enum: {
        values: ['income', 'expense'],
        message: 'O tipo deve ser income ou expense.',
      },
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
```

- [ ] **Step 2: Atualizar `seed.js` com o conjunto completo e upsert por slug**

Substituir o array `defaultCategories` e o corpo do loop em `backend/src/seed.js`. Trocar o bloco `const defaultCategories = [ ... ];` por:

```javascript
// Categorias padrão para popular o banco na primeira execução.
const defaultCategories = [
  { slug: 'salario',      name: 'Salário',      type: 'income',  icon: '💰' },
  { slug: 'renda_extra',  name: 'Renda Extra',  type: 'income',  icon: '💵' },
  { slug: 'investimento', name: 'Investimento', type: 'income',  icon: '📈' },
  { slug: 'moradia',      name: 'Moradia',      type: 'expense', icon: '🏠' },
  { slug: 'alimentacao',  name: 'Alimentação',  type: 'expense', icon: '🍽️' },
  { slug: 'transporte',   name: 'Transporte',   type: 'expense', icon: '🚗' },
  { slug: 'saude',        name: 'Saúde',        type: 'expense', icon: '🏥' },
  { slug: 'educacao',     name: 'Educação',     type: 'expense', icon: '📚' },
  { slug: 'lazer',        name: 'Lazer',        type: 'expense', icon: '🎮' },
  { slug: 'vestuario',    name: 'Vestuário',    type: 'expense', icon: '👕' },
  { slug: 'utilidades',   name: 'Utilidades',   type: 'expense', icon: '💡' },
  { slug: 'outros',       name: 'Outros',       type: 'expense', icon: '📦' },
];
```

E trocar o `Category.updateOne(...)` dentro do loop para fazer upsert por `slug` (atualizando name/type/icon):

```javascript
    const result = await Category.updateOne(
      { slug: category.slug },
      { $set: category },
      { upsert: true }
    );
```

- [ ] **Step 3: Criar o controller de categorias**

Criar `backend/src/controllers/categoryController.js`:

```javascript
import Category from '../models/Category.js';

export const listarCategorias = async (req, res) => {
  try {
    const categorias = await Category.find().sort({ name: 1 });
    return res.status(200).json(categorias);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar categorias.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 4: Criar a rota de categorias**

Criar `backend/src/routes/categoryRoutes.js`:

```javascript
import express from 'express';
import { listarCategorias } from '../controllers/categoryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listarCategorias);

export default router;
```

- [ ] **Step 5: Montar a rota no `app.js`**

Em `backend/src/app.js`, adicionar o import junto aos outros (após a linha de `transactionRoutes`):

```javascript
import categoryRoutes from './routes/categoryRoutes.js';
```

E registrar a rota logo após `app.use('/api/transactions', transactionRoutes);`:

```javascript
app.use('/api/categories', categoryRoutes);
```

- [ ] **Step 6: Rodar o seed**

Run (em `backend/`): `npm run seed`
Expected: log "Seed concluído. N categoria(s) inserida(s)." sem erro. Em re-execução, mostra "Já existe / atualizado" sem duplicar.

- [ ] **Step 7: Verificar o endpoint**

Subir o server (`npm run dev`), obter token (ver "Convenções de verificação"), então:

```powershell
Invoke-RestMethod -Uri "$base/categories" -Headers $H | Format-Table slug,name,type,icon
```

Expected: 12 linhas com slug/name/type/icon preenchidos.

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/Category.js backend/src/seed.js backend/src/controllers/categoryController.js backend/src/routes/categoryRoutes.js backend/src/app.js
git commit -m "feat(backend): endpoint de categorias com slug e icon"
```

---

## Task 2: Investimentos — model, controller, rota

**Files:**
- Create: `backend/src/models/Investment.js`
- Create: `backend/src/controllers/investmentController.js`
- Create: `backend/src/routes/investmentRoutes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Criar o Investment model**

Criar `backend/src/models/Investment.js`:

```javascript
import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema(
  {
    classe: {
      type: String,
      required: [true, 'A classe é obrigatória.'],
      trim: true,
    },
    valorAplicado: {
      type: Number,
      required: [true, 'O valor aplicado é obrigatório.'],
      validate: {
        validator: (value) => value > 0,
        message: 'O valor aplicado deve ser maior que zero.',
      },
    },
    valorAtual: {
      type: Number,
      required: [true, 'O valor atual é obrigatório.'],
      validate: {
        validator: (value) => value >= 0,
        message: 'O valor atual não pode ser negativo.',
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'O investimento deve estar vinculado a um usuário.'],
    },
  },
  {
    timestamps: true,
  }
);

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;
```

- [ ] **Step 2: Criar o controller de investimentos**

Criar `backend/src/controllers/investmentController.js`:

```javascript
import mongoose from 'mongoose';
import Investment from '../models/Investment.js';

function mapearInvestimento(doc) {
  const aplicado = doc.valorAplicado;
  const atual = doc.valorAtual;
  const variacaoPct = aplicado > 0 ? ((atual - aplicado) / aplicado) * 100 : 0;
  return {
    id: doc._id,
    classe: doc.classe,
    valor: atual,
    valorAplicado: aplicado,
    variacaoPct: Number(variacaoPct.toFixed(2)),
  };
}

export const criarInvestimento = async (req, res) => {
  try {
    const { classe, valorAplicado, valorAtual } = req.body;

    if (!classe || Number(valorAplicado) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe a classe e um valor aplicado maior que zero.',
      });
    }

    const investimento = await Investment.create({
      classe,
      valorAplicado,
      valorAtual: valorAtual ?? valorAplicado,
      user: req.user._id,
    });

    return res.status(201).json(mapearInvestimento(investimento));
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao cadastrar investimento.',
      error: error.message,
    });
  }
};

export const listarInvestimentos = async (req, res) => {
  try {
    const investimentos = await Investment.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(investimentos.map(mapearInvestimento));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar investimentos.',
      error: error.message,
    });
  }
};

export const editarInvestimento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    const { classe, valorAplicado, valorAtual } = req.body;
    const dados = {};
    if (classe !== undefined) dados.classe = classe;
    if (valorAplicado !== undefined) dados.valorAplicado = valorAplicado;
    if (valorAtual !== undefined) dados.valorAtual = valorAtual;

    const atualizado = await Investment.findOneAndUpdate(
      { _id: id, user: req.user._id },
      dados,
      { new: true, runValidators: true }
    );

    if (!atualizado) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    return res.status(200).json(mapearInvestimento(atualizado));
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao atualizar investimento.',
      error: error.message,
    });
  }
};

export const excluirInvestimento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    const excluido = await Investment.findOneAndDelete({ _id: id, user: req.user._id });

    if (!excluido) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    return res.status(200).json({ success: true, message: 'Investimento excluído com sucesso.' });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao excluir investimento.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 3: Criar a rota de investimentos**

Criar `backend/src/routes/investmentRoutes.js`:

```javascript
import express from 'express';
import {
  criarInvestimento,
  listarInvestimentos,
  editarInvestimento,
  excluirInvestimento,
} from '../controllers/investmentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listarInvestimentos);
router.post('/', criarInvestimento);
router.put('/:id', editarInvestimento);
router.delete('/:id', excluirInvestimento);

export default router;
```

- [ ] **Step 4: Montar a rota no `app.js`**

Em `backend/src/app.js`, adicionar import junto aos outros:

```javascript
import investmentRoutes from './routes/investmentRoutes.js';
```

E registrar após `app.use('/api/categories', categoryRoutes);`:

```javascript
app.use('/api/investments', investmentRoutes);
```

- [ ] **Step 5: Verificar CRUD**

Server rodando + token (`$H`):

```powershell
$inv = Invoke-RestMethod -Method Post -Uri "$base/investments" -Headers $H -ContentType "application/json" `
  -Body (@{ classe="Renda fixa"; valorAplicado=10000; valorAtual=10600 } | ConvertTo-Json)
$inv   # variacaoPct deve ser 6
Invoke-RestMethod -Uri "$base/investments" -Headers $H            # lista com 1 item
Invoke-RestMethod -Method Delete -Uri "$base/investments/$($inv.id)" -Headers $H
```

Expected: criação retorna `variacaoPct = 6`; listagem traz o item; delete retorna `success: true`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Investment.js backend/src/controllers/investmentController.js backend/src/routes/investmentRoutes.js backend/src/app.js
git commit -m "feat(backend): CRUD de investimentos user-scoped"
```

---

## Task 3: Dashboard agregado (substitui summary)

**Files:**
- Modify: `backend/src/controllers/transactionController.js`
- Modify: `backend/src/routes/transactionRoutes.js`

- [ ] **Step 1: Adicionar o controller `resumirDashboard` agregado**

Em `backend/src/controllers/transactionController.js`, **substituir** a função `resumirDashboard` existente (linhas ~189-223) por uma versão escopada no mês com comparativo, série diária e categorias. Colar:

```javascript
function intervaloMes(ano, mes) {
  // mes: 0-11
  return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 1) };
}

function acumularPorDia(transacoes, diasNoMes) {
  const porDia = new Array(diasNoMes).fill(0);
  transacoes.forEach((t) => {
    const dia = new Date(t.date).getDate();
    if (dia >= 1 && dia <= diasNoMes) porDia[dia - 1] += t.amount;
  });
  let acc = 0;
  return porDia.map((v) => {
    acc += v;
    return Math.round(acc);
  });
}

export const resumirDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    const atual = intervaloMes(ano, mes);
    const anterior = intervaloMes(ano, mes - 1);
    const diasAtual = new Date(ano, mes + 1, 0).getDate();
    const diasAnterior = new Date(ano, mes, 0).getDate();
    const diaCorrente = Math.min(hoje.getDate(), diasAtual);

    // Resumo do mês atual por tipo
    const totais = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: atual.inicio, $lt: atual.fim } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const resumoMap = totais.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});
    const entradas = resumoMap.income || 0;
    const saidas = resumoMap.expense || 0;
    const pendentes = resumoMap.pending || 0;

    // Gasto (expense) do mês anterior para comparativo
    const gastoAnteriorAgg = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: anterior.inicio, $lt: anterior.fim } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const gastoAtual = saidas;
    const gastoAnterior = gastoAnteriorAgg[0]?.total || 0;
    const difPct = gastoAnterior > 0 ? ((gastoAtual - gastoAnterior) / gastoAnterior) * 100 : 0;

    // Séries diárias (expense + pending) dos dois meses
    const tipoGasto = { $in: ['expense', 'pending'] };
    const [txAtual, txAnterior] = await Promise.all([
      Transaction.find({ user: userId, type: tipoGasto, date: { $gte: atual.inicio, $lt: atual.fim } }, 'amount date'),
      Transaction.find({ user: userId, type: tipoGasto, date: { $gte: anterior.inicio, $lt: anterior.fim } }, 'amount date'),
    ]);
    const serieAtualFull = acumularPorDia(txAtual, diasAtual);
    const serieAtual = serieAtualFull.map((v, i) => (i + 1 <= diaCorrente ? v : null));
    const serieAnterior = acumularPorDia(txAnterior, diasAnterior);

    // Categorias (expense) do mês atual, desc
    const categoriasAgg = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: atual.inicio, $lt: atual.fim } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const categorias = categoriasAgg.map((c) => ({ categoria: c._id || 'outros', total: c.total }));

    return res.status(200).json({
      resumo: { saldo: entradas - saidas, entradas, saidas, pendentes },
      comparativo: {
        gastoAtual,
        gastoAnterior,
        difPct: Number(difPct.toFixed(2)),
      },
      serieDiaria: { atual: serieAtual, anterior: serieAnterior, diaCorrente },
      categorias,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar resumo financeiro.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 2: Atualizar a rota**

Em `backend/src/routes/transactionRoutes.js`, trocar a linha:

```javascript
router.get('/dashboard/summary', resumirDashboard);
```

por:

```javascript
router.get('/dashboard', resumirDashboard);
```

- [ ] **Step 3: Verificar o endpoint**

Server rodando + token. Criar algumas transações do mês corrente e bater no dashboard:

```powershell
Invoke-RestMethod -Method Post -Uri "$base/transactions" -Headers $H -ContentType "application/json" `
  -Body (@{ title="Salário"; type="income"; amount=3500; category="salario"; date="2026-06-01" } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Method Post -Uri "$base/transactions" -Headers $H -ContentType "application/json" `
  -Body (@{ title="Aluguel"; type="expense"; amount=1200; category="moradia"; date="2026-06-02" } | ConvertTo-Json) | Out-Null
$dash = Invoke-RestMethod -Uri "$base/transactions/dashboard" -Headers $H
$dash.resumo; $dash.comparativo; $dash.categorias
```

Expected: `resumo` com entradas 3500 / saidas 1200 / saldo 2300; `categorias` lista `moradia`; `serieDiaria.atual` é array com valores acumulados até hoje e `null` depois.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/transactionController.js backend/src/routes/transactionRoutes.js
git commit -m "feat(backend): dashboard agregado escopado no mes com comparativo e serie"
```

---

## Task 4: Frontend — serviços de API

**Files:**
- Modify: `frontend/js/api.js`

- [ ] **Step 1: Apontar `resumo` para o novo endpoint e adicionar Categorias/Investimentos reais**

Em `frontend/js/api.js`, na seção `TransacoesAPI`, trocar:

```javascript
  resumo: () => request('/transactions/dashboard/summary')
```

por:

```javascript
  resumo: () => request('/transactions/dashboard')
```

- [ ] **Step 2: Adicionar `CategoriasAPI`**

Logo após o objeto `TransacoesAPI` (antes do bloco de stubs), adicionar:

```javascript
// ============================================================
// SERVICOS DE CATEGORIAS
// ============================================================
const CategoriasAPI = {
  listar: () => request('/categories'),
};
```

- [ ] **Step 3: Substituir o stub de Investimentos por fetch real**

Trocar todo o bloco final (comentário "STUBS MOCK..." + `const InvestimentosAPI = { ... }`) por:

```javascript
// ============================================================
// SERVICOS DE INVESTIMENTOS
// ============================================================
const InvestimentosAPI = {
  listar: () => request('/investments'),

  criar: (dados) => request('/investments', {
    method: 'POST',
    body: JSON.stringify(dados),
  }),

  excluir: (id) => request(`/investments/${id}`, {
    method: 'DELETE',
  }),
};
```

- [ ] **Step 4: Verificar carregamento sem erro**

Run: abrir o app no navegador após `npm run dev`, abrir DevTools Console.
Expected: nenhum erro de referência; `mock-data.js` ainda existe nesta etapa (removido na Task 6), então sem erro de script.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/api.js
git commit -m "feat(frontend): servicos de categorias e investimentos reais"
```

---

## Task 5: Frontend — remover DEMO/fallbacks e wiring do dashboard

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Remover o objeto `DEMO`**

Em `frontend/js/app.js`, apagar todo o bloco `const DEMO = { ... };` (o objeto com `resumo` e `transacoes`, ~linhas 16-33).

- [ ] **Step 2: Remover constantes hardcoded de categoria**

Apagar as constantes `ROTULOS_CATEGORIA` (~linhas 121-125), `EMOJI_CATEGORIA` (~linhas 127-131) e `LABELS_CATEGORIA` (~linhas 839-852). Serão substituídas por mapas montados em runtime no Step 4.

- [ ] **Step 3: Adicionar estado e helpers de categoria dinâmicos**

Perto do topo, junto a `let todasTransacoes = [];`, adicionar:

```javascript
// Categorias carregadas do backend (preenchidas em loadCategorias)
let CATEGORIAS = [];
let MAPA_LABEL_CATEGORIA = {};
let MAPA_EMOJI_CATEGORIA = {};
```

E (re)definir os helpers `labelCategoria` e um `emojiCategoria` (substituindo o `labelCategoria` antigo que usava `LABELS_CATEGORIA`):

```javascript
function labelCategoria(cat) {
  return MAPA_LABEL_CATEGORIA[cat] ?? cat ?? '—';
}

function emojiCategoria(cat) {
  return MAPA_EMOJI_CATEGORIA[cat] ?? '📦';
}
```

- [ ] **Step 4: Implementar `loadCategorias()` e popular o select**

Adicionar a função:

```javascript
async function loadCategorias() {
  try {
    CATEGORIAS = await CategoriasAPI.listar();
  } catch (erro) {
    console.error('Erro ao carregar categorias:', erro.message);
    mostrarToast('Não foi possível carregar as categorias.', 'erro');
    CATEGORIAS = [];
  }

  MAPA_LABEL_CATEGORIA = {};
  MAPA_EMOJI_CATEGORIA = {};
  CATEGORIAS.forEach((c) => {
    MAPA_LABEL_CATEGORIA[c.slug] = c.name;
    MAPA_EMOJI_CATEGORIA[c.slug] = c.icon || '📦';
  });

  const select = document.getElementById('transacao-categoria');
  if (select) {
    select.innerHTML = '<option value="">Selecione...</option>' +
      CATEGORIAS.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  }
}
```

- [ ] **Step 5: Chamar `loadCategorias` na inicialização**

No `DOMContentLoaded`, adicionar a chamada antes de `carregarDashboard();`:

```javascript
  loadCategorias();
```

- [ ] **Step 6: Reescrever `carregarResumo` sem fallback demo**

Substituir a função `carregarResumo` por uma que consome o payload agregado e propaga erro sem dado fake:

```javascript
async function carregarResumo() {
  mostrarSpinner(true);
  try {
    const dados = await TransacoesAPI.resumo();
    renderizarResumo(dados);
  } catch (erro) {
    console.error('Erro ao carregar dashboard:', erro.message);
    mostrarToast('Não foi possível carregar o resumo financeiro.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

- [ ] **Step 7: Reescrever `renderizarResumo` para usar o payload real**

Substituir toda a função `renderizarResumo` (e remover `construirSerieGastos` e `formatarDataExtenso` se não usados em outro lugar — manter `formatarDataExtenso`, é usado aqui) por:

```javascript
function renderizarResumo(dados) {
  const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const resumo = dados.resumo || {};
  const comparativo = dados.comparativo || {};
  const serie = dados.serieDiaria || {};
  const categorias = dados.categorias || [];

  const nome = (localStorage.getItem('user_name') || 'Você').split(' ')[0];
  const gasto = resumo.saidas ?? 0;
  const pendentes = resumo.pendentes ?? 0;
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  const difPct = comparativo.difPct ?? 0;
  const gastoAnterior = comparativo.gastoAnterior ?? 0;
  const diferenca = Math.abs(gastoAnterior - gasto);
  const abaixo = gasto <= gastoAnterior;

  // Categoria principal (maior gasto do mês)
  const topCat = categorias[0];
  const categoriaPrincipal = topCat ? labelCategoria(topCat.categoria) : '—';
  const categoriaEmoji = topCat ? emojiCategoria(topCat.categoria) : '';

  // Card insight
  txt('insight-mensagem',
    `${nome}, seu gasto do mês está em ${formatarBRL(gasto)}, com ${formatarBRL(pendentes)} ainda pendente.`);
  txt('kpi-gasto-rotulo', `Gasto em ${mes}`);
  txt('kpi-gasto', formatarBRL(gasto));
  txt('kpi-comparativo', `${difPct <= 0 ? '↘' : '↗'} ${Math.abs(difPct).toFixed(0)}%`);
  txt('kpi-categoria', `${categoriaEmoji} ${categoriaPrincipal}`.trim());
  txt('insight-data', formatarDataExtenso(new Date()));

  const elComp = document.getElementById('kpi-comparativo');
  if (elComp) elComp.classList.toggle('kpi__valor--positivo', difPct <= 0);

  // Card gráfico
  txt('chart-destaque', formatarBRL(diferenca));
  txt('chart-variacao', `${difPct <= 0 ? '▾' : '▴'} ${Math.abs(difPct).toFixed(1)}%`);
  txt('chart-anterior', `vs ${formatarBRL(gastoAnterior)} mês anterior`);

  const elBadge = document.getElementById('chart-variacao');
  if (elBadge) elBadge.classList.toggle('badge-variacao--alta', difPct > 0);

  const elDestaqueEm = document.querySelector('.painel__destaque em');
  if (elDestaqueEm) elDestaqueEm.textContent = abaixo ? 'abaixo' : 'acima';

  // Série real do backend
  const dias = (serie.anterior || []).length || 30;
  const labels = Array.from({ length: dias }, (_, i) => String(i + 1));
  criarLinhaComparativa('grafico-linha-gastos', labels, serie.atual || [], serie.anterior || [], serie.diaCorrente || dias);
}
```

- [ ] **Step 8: Remover fallback demo de `salvarTransacao`**

No `catch` de `salvarTransacao`, substituir todo o bloco que manipula `DEMO`/`atualizarResumoDemo` por tratamento de erro simples. O `catch` passa a ser:

```javascript
  } catch (erro) {
    console.error('Erro ao salvar transação:', erro.message);
    mostrarToast('Não foi possível salvar a transação. Tente novamente.', 'erro');
  } finally {
```

E apagar a função `atualizarResumoDemo` inteira (não é mais usada).

- [ ] **Step 9: Remover fallback demo de `excluirTransacao`**

Reescrever `excluirTransacao` para depender do sucesso da API e só então atualizar a UI:

```javascript
async function excluirTransacao(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const confirmar = window.confirm(`Excluir "${transacao.descricao}"?\n\nEssa ação não pode ser desfeita.`);
  if (!confirmar) return;

  mostrarSpinner(true);
  try {
    await TransacoesAPI.excluir(id);
    todasTransacoes = todasTransacoes.filter(t => String(t.id) !== String(id));
    aplicarFiltros();
    renderizarTransacoesRecentes(todasTransacoes.slice(0, 5));
    renderizarContasPagar();
    carregarDashboard();
    mostrarToast('Transação excluída.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao excluir transação:', erro.message);
    mostrarToast('Não foi possível excluir a transação.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

- [ ] **Step 10: Remover fallback demo de `pagarConta`**

Reescrever `pagarConta` para depender da API:

```javascript
async function pagarConta(id) {
  const transacao = todasTransacoes.find(t => String(t.id) === String(id));
  if (!transacao) return;

  const confirmar = window.confirm(`Deseja marcar "${transacao.descricao}" como pago?`);
  if (!confirmar) return;

  mostrarSpinner(true);
  const payloadAtualizado = {
    ...transacao,
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
  };

  try {
    await TransacoesAPI.atualizar(id, payloadAtualizado);
    const idx = todasTransacoes.findIndex(t => String(t.id) === String(id));
    if (idx > -1) todasTransacoes[idx] = { ...payloadAtualizado, id };
    carregarDashboard();
    aplicarFiltros();
    renderizarContasPagar();
    mostrarToast('Conta marcada como paga!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao pagar conta:', erro.message);
    mostrarToast('Não foi possível marcar a conta como paga.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

- [ ] **Step 11: Remover fallback demo de `carregarTodasTransacoes`**

Reescrever o `catch` para não usar DEMO:

```javascript
async function carregarTodasTransacoes() {
  try {
    const dados = await TransacoesAPI.listar();
    todasTransacoes = Array.isArray(dados) ? dados : (dados.results ?? []);
  } catch (erro) {
    console.error('Erro ao carregar transações:', erro.message);
    mostrarToast('Não foi possível carregar as transações.', 'erro');
    todasTransacoes = [];
  }

  aplicarFiltros();
  renderizarContasPagar();
}
```

- [ ] **Step 12: Remover fallback demo de `carregarTransacoesRecentes`**

Reescrever o `catch`:

```javascript
async function carregarTransacoesRecentes() {
  try {
    const dados = await TransacoesAPI.listar();
    const lista = Array.isArray(dados) ? dados : (dados.results ?? []);
    renderizarTransacoesRecentes(lista.slice(0, 5));
  } catch (erro) {
    console.error('Erro ao carregar transações recentes:', erro.message);
    renderizarTransacoesRecentes([]);
  }
}
```

- [ ] **Step 13: Atualizar `renderizarPaginaCategorias` para usar dados reais**

Trocar a fonte de `DEMO.transacoes` por lista vazia (já opera sobre `todasTransacoes` reais):

```javascript
function renderizarPaginaCategorias() {
  const fonte = todasTransacoes;
  renderizarBarraCategorias('barra-categorias-pagina', fonte);
  const dados = agregarPorCategoria(fonte);
  criarDonut('grafico-donut-categorias', dados.map(d => labelCategoria(d.categoria)), dados.map(d => d.total));
  const lista = document.getElementById('lista-categorias');
  if (lista) lista.innerHTML = dados.map(d => `
    <div class="investimento-row"><span>${labelCategoria(d.categoria)}</span><strong>${formatarBRL(d.total)}</strong></div>`).join('') || criarEstadoVazio('Sem gastos no período.');
}
```

- [ ] **Step 14: Verificar no navegador**

Run: `npm run dev`, login no app, criar transações.
Expected: dashboard mostra resumo/comparativo/série reais; `<select>` de categoria preenchido do DB; nenhuma referência a `DEMO` resta (busca por "DEMO" em app.js não encontra nada).

- [ ] **Step 15: Commit**

```bash
git add frontend/js/app.js
git commit -m "refactor(frontend): remove DEMO e fallbacks, wiring do dashboard real"
```

---

## Task 6: Frontend — investimentos reais + remover mock-data

**Files:**
- Modify: `frontend/js/app.js`
- Modify: `frontend/index.html`
- Delete: `frontend/js/mock-data.js`

- [ ] **Step 1: Reescrever `renderizarPaginaInvestimentos` com fetch real e estado vazio**

Substituir a função por:

```javascript
async function renderizarPaginaInvestimentos() {
  const el = document.getElementById('card-investimentos');
  if (!el) return;

  let dados = [];
  try {
    dados = await InvestimentosAPI.listar();
  } catch (erro) {
    console.error('Erro ao carregar investimentos:', erro.message);
    mostrarToast('Não foi possível carregar os investimentos.', 'erro');
    el.innerHTML = criarEstadoVazio('Não foi possível carregar os investimentos.');
    return;
  }

  const total = dados.reduce((s, d) => s + d.valor, 0);
  const linhas = dados.map(d => `
    <div class="investimento-row" data-id="${d.id}">
      <span>${d.classe}</span>
      <span>${formatarBRL(d.valor)}
        <span class="${d.variacaoPct >= 0 ? 'variacao--alta' : 'variacao--baixa'}">
          ${d.variacaoPct >= 0 ? '↑' : '↓'} ${Math.abs(d.variacaoPct)}%
        </span>
        <button class="btn-acao btn-acao--excluir" onclick="excluirInvestimento('${d.id}')" aria-label="Excluir">🗑️</button>
      </span>
    </div>`).join('');

  el.innerHTML = `
    <div class="card-saldo-total">
      <p class="card__titulo">Total investido • ${dados.length} ativo(s)</p>
      <p class="card-saldo-total__valor">${formatarBRL(total)}</p>
    </div>
    <form id="form-investimento" class="form-investimento">
      <input type="text" id="inv-classe" placeholder="Classe (ex.: Renda fixa)" required />
      <input type="number" id="inv-aplicado" placeholder="Valor aplicado" min="0.01" step="0.01" required />
      <input type="number" id="inv-atual" placeholder="Valor atual" min="0" step="0.01" required />
      <button type="submit" class="btn btn--primario">Adicionar</button>
    </form>
    <div class="grid-graficos">
      <section class="secao secao--grafico"><canvas id="grafico-donut-invest" height="240" role="img" aria-label="Distribuição dos investimentos"></canvas></section>
      <section class="secao">${linhas || criarEstadoVazio('Nenhum investimento cadastrado ainda.')}</section>
    </div>`;

  if (dados.length) {
    criarDonut('grafico-donut-invest', dados.map(d => d.classe), dados.map(d => d.valor));
  }

  document.getElementById('form-investimento')?.addEventListener('submit', salvarInvestimento);
}
```

- [ ] **Step 2: Adicionar `salvarInvestimento` e `excluirInvestimento`**

Adicionar após `renderizarPaginaInvestimentos`:

```javascript
async function salvarInvestimento(e) {
  e.preventDefault();
  const classe = document.getElementById('inv-classe').value.trim();
  const valorAplicado = parseFloat(document.getElementById('inv-aplicado').value);
  const valorAtual = parseFloat(document.getElementById('inv-atual').value);

  if (!classe || !(valorAplicado > 0) || !(valorAtual >= 0)) {
    mostrarToast('Preencha classe, valor aplicado (> 0) e valor atual.', 'erro');
    return;
  }

  mostrarSpinner(true);
  try {
    await InvestimentosAPI.criar({ classe, valorAplicado, valorAtual });
    mostrarToast('Investimento adicionado!', 'sucesso');
    renderizarPaginaInvestimentos();
  } catch (erro) {
    console.error('Erro ao salvar investimento:', erro.message);
    mostrarToast('Não foi possível salvar o investimento.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}

async function excluirInvestimento(id) {
  if (!window.confirm('Excluir este investimento?')) return;
  mostrarSpinner(true);
  try {
    await InvestimentosAPI.excluir(id);
    mostrarToast('Investimento excluído.', 'sucesso');
    renderizarPaginaInvestimentos();
  } catch (erro) {
    console.error('Erro ao excluir investimento:', erro.message);
    mostrarToast('Não foi possível excluir o investimento.', 'erro');
  } finally {
    mostrarSpinner(false);
  }
}
```

- [ ] **Step 3: Remover `<option>`s hardcoded do select no index.html**

Em `frontend/index.html` (~linhas 213-219), substituir o conteúdo do `<select id="transacao-categoria">` por apenas o placeholder:

```html
          <select id="transacao-categoria">
            <option value="">Selecione...</option>
          </select>
```

- [ ] **Step 4: Remover o include do mock-data.js**

Em `frontend/index.html`, localizar e remover a linha:

```html
<script src="js/mock-data.js"></script>
```

(Confirmar a ordem dos demais scripts: `api.js` deve continuar carregando antes de `app.js`.)

- [ ] **Step 5: Deletar o arquivo mock-data.js**

```bash
git rm frontend/js/mock-data.js
```

- [ ] **Step 6: Verificar fim-a-fim no navegador**

Run: `npm run dev`, recarregar o app (hard refresh).
Expected:
- Console sem 404 de `mock-data.js` nem erro de `MOCK` indefinido.
- Aba Investimentos: form aparece, adicionar cria item real, excluir remove, total/variação corretos, estado vazio quando sem itens.
- Buscar "MOCK" e "DEMO" no frontend não retorna nenhuma referência viva.

- [ ] **Step 7: Commit**

```bash
git add frontend/js/app.js frontend/index.html
git rm frontend/js/mock-data.js
git commit -m "feat(frontend): investimentos reais e remocao do mock-data"
```

---

## Task 7: Verificação final integrada

**Files:** nenhum (apenas verificação)

- [ ] **Step 1: Checklist de ausência de hardcoded**

Run (na raiz):
```powershell
Select-String -Path frontend/js/*.js,frontend/index.html -Pattern "DEMO|MOCK|mock-data" 
```
Expected: nenhuma correspondência viva (comentários remanescentes devem ser removidos se aparecerem).

- [ ] **Step 2: Fluxo completo manual**

1. `npm run seed` (backend) → 12 categorias.
2. Registrar usuário novo no app.
3. Select de categoria preenchido do DB.
4. Criar income, expense e pending do mês corrente → dashboard reflete resumo, comparativo e série reais.
5. Marcar pending como pago → vira expense, dashboard atualiza.
6. Adicionar e excluir investimento → total/variação corretos.
7. Parar o backend e recarregar → toasts de erro + estados vazios, **sem** dado fake.

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais da migracao para MongoDB"
```

---

## Notas de cobertura do spec

- Seção 1 (Dashboard agregado) → Task 3.
- Seção 2 (Categorias) → Task 1 + wiring em Task 5 (loadCategorias) e Task 6 (select).
- Seção 3 (Investimentos) → Task 2 + frontend Task 6.
- Seção 4 (Limpeza frontend) → Tasks 4, 5, 6.
- Verificação manual → Task 7.
