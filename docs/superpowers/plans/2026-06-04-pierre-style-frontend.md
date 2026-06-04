# Redesign Frontend estilo Pierre — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir o frontend do FinançasFácil replicando as 7 telas do app Pierre (visual de app dark), com dados reais nas telas de transação e dados mock + contrato documentado nas demais, prontas para o backend plugar depois.

**Architecture:** SPA estática (sem build). `index.html` hospeda 7 seções `.pagina` trocadas por um router client-side via sidebar/hash. Camada de dados em módulos de API: reais (`TransacoesAPI`, `AuthAPI`) e stubs mock (`BancosAPI`, `InvestimentosAPI`, `AssinaturasAPI`, `ChatAPI`) que retornam `Promise` com dado falso e o shape esperado documentado. Gráficos via Chart.js (CDN); barra de categorias em CSS puro.

**Tech Stack:** HTML/CSS/JS vanilla (ES modules globais via `<script>`), Chart.js 4 (CDN), fonte Geist, tokens dark em `css/variables.css` (já existem).

**Verificação:** O repo não tem suíte de testes (`npm test` = erro) e é frontend estático. Cada tarefa é verificada **manualmente no navegador** com o server rodando (`npm start` → `http://localhost:3000`). Login exige token; usar conta de teste já criada.

**Nota de contexto:** O `index.html` atual é um mock estático com `<script>` inline e **não** carrega `js/app.js`/`js/api.js`. Este plano substitui o `index.html` por uma versão que carrega os módulos e hospeda as 7 seções. O `app.js`/`api.js` existentes já têm router por hash, modal de transação, filtros e fallback demo — serão reaproveitados e estendidos, não reescritos.

---

## Estrutura de arquivos

```
frontend/
  index.html          # SUBSTITUIR — 7 seções .pagina, sidebar 7 itens, Chart.js CDN, <script> dos módulos
  css/
    variables.css     # inalterado
    components.css     # + componentes novos (avatar-merchant, transacao-card, barra-categorias, etc.)
    pages.css          # + estilos por tela nova
    layout.css         # inalterado (sidebar/overlay já existem)
  js/
    mock-data.js       # CRIAR — MOCK.* + contratos (shape p/ backend)
    api.js             # MODIFICAR — + stubs BancosAPI/InvestimentosAPI/AssinaturasAPI/ChatAPI
    charts.js          # CRIAR — fábricas Chart.js (donut, linha)
    app.js             # MODIFICAR — render das telas novas + router p/ 7 seções
    ui.js, auth.js     # inalterados
```

Ordem de carga dos `<script>` no fim do `<body>`: Chart.js (CDN) → `ui.js` → `mock-data.js` → `api.js` → `charts.js` → `app.js`.

---

## Task 1: Scaffold do index.html (7 seções + sidebar + módulos)

**Files:**
- Modify (substitui conteúdo): `frontend/index.html`

- [ ] **Step 1: Reescrever `frontend/index.html`**

Substituir TODO o arquivo por este scaffold. Cada tela é uma `<section class="pagina" id="...">`. Só a `#dashboard` começa ativa. Os contêineres internos ficam vazios (preenchidos por `app.js`). Mantém header, sidebar (agora 7 itens), overlay mobile, spinner, toasts e modal de transação com os IDs que `app.js` já usa.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard — FinançasFácil</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/variables.css" />
  <link rel="stylesheet" href="css/reset.css" />
  <link rel="stylesheet" href="css/components.css" />
  <link rel="stylesheet" href="css/layout.css" />
  <link rel="stylesheet" href="css/pages.css" />
</head>
<body>
  <div class="spinner-overlay oculto" id="spinner" role="status" aria-label="Carregando..."><div class="spinner"></div></div>
  <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>

  <div class="app-container">
    <header class="header" role="banner">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="header__menu-btn" id="menu-btn" aria-label="Abrir menu" aria-expanded="false" type="button"><span></span><span></span><span></span></button>
        <a href="#dashboard" class="header__logo">FinançasFácil <span>beta</span></a>
      </div>
      <div class="header__actions">
        <button class="btn btn--primario" id="btn-nova-transacao" type="button">+ Nova transação</button>
        <span id="header-usuario"></span>
      </div>
    </header>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <aside class="sidebar" id="sidebar" aria-label="Navegação principal">
      <nav class="nav">
        <ul class="nav__lista">
          <li class="nav__item"><a href="#dashboard" class="ativo">Visão geral</a></li>
          <li class="nav__item"><a href="#transacoes">Transações</a></li>
          <li class="nav__item"><a href="#categorias">Categorias</a></li>
          <li class="nav__item"><a href="#investimentos">Investimentos</a></li>
          <li class="nav__item"><a href="#assinaturas">Assinaturas</a></li>
          <li class="nav__item"><a href="#bancos">Bancos</a></li>
          <li class="nav__item"><a href="#chat">Pierre IA</a></li>
        </ul>
        <div class="nav__separador"></div>
        <ul class="nav__lista">
          <li class="nav__item"><a href="login.html" id="nav-sair">Sair</a></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content" role="main">
      <!-- 1. VISÃO GERAL -->
      <section class="pagina pagina--ativa" id="dashboard">
        <h1 class="pagina-titulo">Olá, <span id="nome-usuario">Usuário</span></h1>
        <div id="card-saldo-total" class="card-saldo-total"></div>
        <section class="secao">
          <div class="cards-resumo">
            <article class="card card--entrada"><p class="card__titulo">Entradas</p><p class="card__valor" id="entradas-valor">—</p></article>
            <article class="card card--saida"><p class="card__titulo">Saídas</p><p class="card__valor" id="saidas-valor">—</p></article>
            <article class="card card--pendente"><p class="card__titulo">A pagar</p><p class="card__valor" id="pendentes-valor">—</p></article>
            <article class="card"><p class="card__titulo">Saldo</p><p class="card__valor" id="saldo-valor">—</p></article>
          </div>
        </section>
        <div class="grid-graficos">
          <section class="secao secao--grafico"><h2 class="secao__titulo">Entradas × Saídas</h2><canvas id="grafico-donut-resumo" height="220"></canvas></section>
          <section class="secao secao--grafico"><h2 class="secao__titulo">Gastos por categoria</h2><div id="barra-categorias-dashboard"></div></section>
        </div>
        <section class="secao">
          <div class="secao__header"><h2 class="secao__titulo">Últimas transações</h2><a class="btn btn--secundario" href="#transacoes">Ver todas</a></div>
          <div id="lista-transacoes-recentes"></div>
        </section>
      </section>

      <!-- 2. TRANSAÇÕES -->
      <section class="pagina" id="transacoes">
        <h1 class="pagina-titulo">Transações</h1>
        <div class="filtros" role="group" aria-label="Filtros">
          <button class="filtro-btn ativo" id="filtro-todos" data-filtro-tipo="todos" type="button">Todas</button>
          <button class="filtro-btn" data-filtro-tipo="entrada" type="button">Entradas</button>
          <button class="filtro-btn" data-filtro-tipo="saida" type="button">Saídas</button>
          <button class="filtro-btn" data-filtro-tipo="pendente" type="button">Pendentes</button>
          <input type="search" id="filtro-busca" placeholder="Buscar..." />
          <input type="date" id="filtro-data-inicio" />
          <input type="date" id="filtro-data-fim" />
          <button class="btn btn--secundario" id="btn-limpar-filtros" type="button">Limpar</button>
        </div>
        <p class="resultado-contagem" id="resultado-contagem"></p>
        <div id="container-transacoes-lista"></div>
      </section>

      <!-- 3. CATEGORIAS -->
      <section class="pagina" id="categorias">
        <h1 class="pagina-titulo">Gastos por categoria</h1>
        <div id="barra-categorias-pagina"></div>
        <div class="grid-graficos">
          <section class="secao secao--grafico"><canvas id="grafico-donut-categorias" height="240"></canvas></section>
          <section class="secao"><div id="lista-categorias"></div></section>
        </div>
      </section>

      <!-- 4. INVESTIMENTOS -->
      <section class="pagina" id="investimentos">
        <h1 class="pagina-titulo">Investimentos</h1>
        <div id="card-investimentos"></div>
      </section>

      <!-- 5. ASSINATURAS -->
      <section class="pagina" id="assinaturas">
        <h1 class="pagina-titulo">Assinaturas</h1>
        <div id="lista-assinaturas" class="grid-assinaturas"></div>
      </section>

      <!-- 6. BANCOS -->
      <section class="pagina" id="bancos">
        <h1 class="pagina-titulo">Bancos conectados</h1>
        <div id="lista-bancos"></div>
      </section>

      <!-- 7. CHAT IA -->
      <section class="pagina" id="chat">
        <h1 class="pagina-titulo">Pierre IA</h1>
        <div class="chat-janela" id="chat-janela"></div>
        <div class="chat-chips" id="chat-chips"></div>
        <form class="chat-form" id="chat-form">
          <input type="text" id="chat-input" placeholder="Pergunte algo ao Pierre..." autocomplete="off" />
          <button class="btn btn--primario" type="submit">Enviar</button>
        </form>
      </section>

      <footer class="footer">Projeto acadêmico — FinançasFácil © 2026</footer>
    </main>
  </div>

  <!-- MODAL DE TRANSAÇÃO -->
  <div class="modal-overlay oculto" id="modal-transacao" role="dialog" aria-modal="true" aria-labelledby="modal-transacao-titulo">
    <div class="modal">
      <div class="modal__header">
        <h2 class="modal__titulo" id="modal-transacao-titulo">Nova transação</h2>
        <button class="modal__fechar" id="modal-fechar" aria-label="Fechar" type="button">×</button>
      </div>
      <div class="tipo-selector" role="radiogroup" aria-label="Tipo">
        <button class="tipo-btn tipo-btn--entrada ativo" data-tipo="entrada" type="button">Entrada</button>
        <button class="tipo-btn tipo-btn--saida" data-tipo="saida" type="button">Saída</button>
        <button class="tipo-btn tipo-btn--pendente" data-tipo="pendente" type="button">Pendente</button>
      </div>
      <form id="form-transacao">
        <input type="hidden" id="transacao-id" />
        <input type="hidden" id="transacao-tipo" value="entrada" />
        <div class="form-grupo"><label for="transacao-descricao">Descrição</label><input type="text" id="transacao-descricao" /><span class="form-erro-msg" id="erro-descricao"></span></div>
        <div class="form-row">
          <div class="form-grupo"><label for="transacao-valor">Valor</label><input type="number" step="0.01" id="transacao-valor" /><span class="form-erro-msg" id="erro-valor"></span></div>
          <div class="form-grupo"><label for="transacao-data">Data</label><input type="date" id="transacao-data" /><span class="form-erro-msg" id="erro-data"></span></div>
        </div>
        <div class="form-grupo"><label for="transacao-categoria">Categoria</label>
          <select id="transacao-categoria">
            <option value="">Selecione...</option>
            <option value="salario">Salário</option><option value="renda_extra">Renda Extra</option>
            <option value="moradia">Moradia</option><option value="alimentacao">Alimentação</option>
            <option value="transporte">Transporte</option><option value="saude">Saúde</option>
            <option value="educacao">Educação</option><option value="lazer">Lazer</option>
            <option value="utilidades">Utilidades</option><option value="outros">Outros</option>
          </select><span class="form-erro-msg" id="erro-categoria"></span>
        </div>
        <div class="form-grupo" id="grupo-parcelas" hidden><label for="transacao-parcelas">Parcelas</label><input type="number" id="transacao-parcelas" min="1" value="1" /></div>
        <div class="form-grupo"><label for="transacao-observacao">Observação</label><input type="text" id="transacao-observacao" /></div>
        <div class="modal__acoes">
          <button type="button" class="btn btn--secundario" id="btn-cancelar-transacao">Cancelar</button>
          <button type="submit" class="btn btn--primario" id="btn-salvar-transacao">Salvar transação</button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/mock-data.js"></script>
  <script src="js/api.js"></script>
  <script src="js/charts.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm start` e abrir `http://localhost:3000` (logado).
Expected: As 7 seções existem; sidebar mostra 7 itens; clicar nos itens troca a seção visível (router já existe em `app.js`); nenhum erro no console exceto possíveis funções de render ainda não criadas (próximas tasks). A `#dashboard` carrega resumo/transações reais (lógica já existe).

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(frontend): scaffold das 7 telas estilo Pierre no index.html

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Camada de dados mock + contratos (`mock-data.js`)

**Files:**
- Create: `frontend/js/mock-data.js`

- [ ] **Step 1: Criar `frontend/js/mock-data.js`**

Objeto global `MOCK`. Cada bloco tem comentário com o **contrato** que o backend deverá retornar.

```js
/**
 * mock-data.js — Dados de demonstração para as telas ainda sem backend.
 * Cada bloco documenta o CONTRATO que o backend deverá retornar.
 * O time de backend troca o corpo dos stubs em api.js por fetch real,
 * mantendo exatamente estes formatos.
 */
const MOCK = {
  // Backend: GET /api/banks -> { id, nome, saldo }[]
  bancos: [
    { id: 'b1', nome: 'PicPay',    saldo: 120.00 },
    { id: 'b2', nome: 'BTG Pactual', saldo: 1450.00 },
    { id: 'b3', nome: 'Santander', saldo: 130.00 },
  ],

  // Backend: GET /api/investments -> { classe, valor, variacaoPct }[]
  // variacaoPct: número (ex. 6.0 = +6%, -3.5 = -3,5%)
  investimentos: [
    { classe: 'Renda fixa',     valor: 20000, variacaoPct: 6.0 },
    { classe: 'Renda variável', valor: 18000, variacaoPct: -3.5 },
    { classe: 'Fundos',         valor: 12000, variacaoPct: 2.1 },
  ],

  // Backend: GET /api/subscriptions -> { nome, valor, proximaCobranca }[]
  // proximaCobranca: data ISO 'YYYY-MM-DD'
  assinaturas: [
    { nome: 'Spotify', valor: 21.90, proximaCobranca: '2026-06-16' },
    { nome: 'Netflix', valor: 39.90, proximaCobranca: '2026-06-26' },
    { nome: 'Amazon Prime', valor: 14.90, proximaCobranca: '2026-06-24' },
  ],

  // Backend: POST /api/chat { mensagem } -> { resposta }
  respostaChat(mensagem) {
    const texto = String(mensagem).toLowerCase();
    if (texto.includes('plano')) return 'Posso montar um plano: separe 50% para essenciais, 30% para desejos e 20% para poupança. Quer que eu detalhe com base nos seus gastos?';
    if (texto.includes('grana') || texto.includes('apertado')) return 'Entendi. Vejo que suas saídas estão altas este mês. Que tal revisar as assinaturas? Você tem 3 ativas somando R$ 76,70/mês.';
    return 'Sou o Pierre, seu assistente financeiro. (Resposta de demonstração — a IA real será conectada pelo backend.)';
  },
};
```

- [ ] **Step 2: Verificar**

Run: abrir DevTools console em `http://localhost:3000`, digitar `MOCK.bancos`.
Expected: array com 3 bancos. `MOCK.respostaChat('me ajuda com um plano')` retorna a string do plano.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/mock-data.js
git commit -m "feat(frontend): dados mock + contratos para telas sem backend

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Stubs de API mock (`api.js`)

**Files:**
- Modify: `frontend/js/api.js` (adicionar ao final, antes de qualquer export/IIFE de fechamento — o arquivo hoje termina na linha 138 com `TransacoesAPI`)

- [ ] **Step 1: Adicionar stubs ao final de `frontend/js/api.js`**

```js
// ============================================================
// STUBS MOCK — backend substitui o corpo por fetch real,
// mantendo o mesmo retorno (ver contratos em mock-data.js).
// ============================================================
const BancosAPI = {
  // Backend: return normalizar(await request('/banks'));
  listar: async () => MOCK.bancos,
};

const InvestimentosAPI = {
  // Backend: return await request('/investments');
  listar: async () => MOCK.investimentos,
};

const AssinaturasAPI = {
  // Backend: return await request('/subscriptions');
  listar: async () => MOCK.assinaturas,
};

const ChatAPI = {
  // Backend: return await request('/chat', { method:'POST', body: JSON.stringify({ mensagem }) });
  enviar: async (mensagem) => ({ resposta: MOCK.respostaChat(mensagem) }),
};
```

- [ ] **Step 2: Verificar**

Run: console → `await BancosAPI.listar()`.
Expected: array com 3 bancos. `await ChatAPI.enviar('oi')` → `{ resposta: '...' }`.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/api.js
git commit -m "feat(frontend): stubs de API mock (bancos, investimentos, assinaturas, chat)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Fábricas de gráfico Chart.js (`charts.js`)

**Files:**
- Create: `frontend/js/charts.js`

- [ ] **Step 1: Criar `frontend/js/charts.js`**

Guarda instâncias por canvas-id para destruir antes de recriar (evita sobreposição ao re-renderizar).

```js
/** charts.js — fábricas de gráfico usando Chart.js (carregado via CDN). */
const _chartInstances = {};

function _resetChart(canvasId) {
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
}

const CORES_GRAFICO = ['#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa', '#fb923c'];

/** Donut. labels: string[], valores: number[]. */
function criarDonut(canvasId, labels, valores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  _resetChart(canvasId);
  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: CORES_GRAFICO, borderWidth: 0 }] },
    options: {
      responsive: true, cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 16 } } },
    },
  });
}
```

- [ ] **Step 2: Verificar**

Run: console em `#dashboard` → `criarDonut('grafico-donut-resumo', ['Entradas','Saídas'], [4820, 3215])`.
Expected: donut verde/rosa renderiza no canvas; legenda embaixo.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/charts.js
git commit -m "feat(frontend): fabricas de grafico Chart.js (donut)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Componentes CSS compartilhados

**Files:**
- Modify: `frontend/css/components.css` (append)
- Modify: `frontend/css/pages.css` (append)

- [ ] **Step 1: Adicionar ao final de `frontend/css/components.css`**

```css
/* --- Avatar de merchant/banco (círculo colorido com inicial) --- */
.avatar-merchant { width: 40px; height: 40px; border-radius: var(--raio-pill); display: inline-flex; align-items: center; justify-content: center; font-weight: var(--peso-bold); color: #fff; flex-shrink: 0; }

/* --- Card de transação (estilo Pierre) --- */
.transacao-card { display: flex; align-items: center; gap: var(--espaco-md); padding: var(--espaco-md); background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-lg); margin-bottom: var(--espaco-sm); }
.transacao-card__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.transacao-card__desc { font-weight: var(--peso-medio); color: var(--cor-texto-principal); }
.transacao-card__meta { font-size: 0.8rem; color: var(--cor-texto-secundario); }
.transacao-card__valor { margin-left: auto; font-weight: var(--peso-bold); font-variant-numeric: tabular-nums; }

/* --- Barra de categorias multicolor --- */
.barra-categorias__trilha { display: flex; height: 12px; border-radius: var(--raio-pill); overflow: hidden; gap: 2px; }
.barra-categorias__seg { height: 100%; }
.barra-categorias__legenda { display: flex; flex-wrap: wrap; gap: var(--espaco-md); margin-top: var(--espaco-md); }
.barra-categorias__item { display: flex; align-items: center; gap: var(--espaco-sm); font-size: 0.85rem; color: var(--cor-texto-secundario); }
.barra-categorias__dot { width: 10px; height: 10px; border-radius: 50%; }

/* --- Card de saldo total (hero) --- */
.card-saldo-total { padding: var(--espaco-lg); background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-xl); margin-bottom: var(--espaco-lg); box-shadow: var(--sombra-card); }
.card-saldo-total__valor { font-size: 2rem; font-weight: var(--peso-bold); }
.card-saldo-total__saude { color: var(--cor-sucesso); font-size: 0.9rem; }

/* --- Investimentos --- */
.investimento-row { display: flex; align-items: center; justify-content: space-between; padding: var(--espaco-md) 0; border-bottom: 1px solid var(--cor-borda); }
.variacao--alta { color: var(--cor-sucesso); }
.variacao--baixa { color: var(--cor-erro); }

/* --- Assinaturas --- */
.assinatura-card { padding: var(--espaco-lg); background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-lg); text-align: center; }
.assinatura-card__valor { font-size: 1.4rem; font-weight: var(--peso-bold); }
.assinatura-card__prazo { font-size: 0.8rem; color: var(--cor-texto-secundario); margin-top: var(--espaco-sm); }

/* --- Bancos --- */
.banco-row { display: flex; align-items: center; gap: var(--espaco-md); padding: var(--espaco-md); border: 1px solid var(--cor-borda); border-radius: var(--raio-lg); margin-bottom: var(--espaco-sm); background: var(--cor-fundo-card); }
.banco-row__saldo { margin-left: auto; font-weight: var(--peso-bold); }

/* --- Chat --- */
.chat-janela { display: flex; flex-direction: column; gap: var(--espaco-sm); min-height: 320px; padding: var(--espaco-md); background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-lg); }
.chat-bubble { max-width: 75%; padding: var(--espaco-sm) var(--espaco-md); border-radius: var(--raio-lg); }
.chat-bubble--usuario { align-self: flex-end; background: var(--cor-primaria); color: #042; }
.chat-bubble--assistente { align-self: flex-start; background: var(--cor-fundo-elevado); color: var(--cor-texto-principal); }
.chat-chips { display: flex; flex-wrap: wrap; gap: var(--espaco-sm); margin: var(--espaco-md) 0; }
.chat-chip { padding: 6px 12px; border: 1px solid var(--cor-borda-forte); border-radius: var(--raio-pill); background: transparent; color: var(--cor-texto-secundario); cursor: pointer; }
.chat-form { display: flex; gap: var(--espaco-sm); }
.chat-form input { flex: 1; }
```

- [ ] **Step 2: Adicionar ao final de `frontend/css/pages.css`**

```css
.grid-graficos { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espaco-lg); margin-bottom: var(--espaco-lg); }
.secao--grafico { display: flex; flex-direction: column; gap: var(--espaco-md); }
.grid-assinaturas { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--espaco-md); }
@media (max-width: 720px) { .grid-graficos { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Verificar**

Run: recarregar `http://localhost:3000`.
Expected: sem erro de CSS; layout do dashboard não quebra. (Componentes ainda sem conteúdo até as próximas tasks.)

- [ ] **Step 4: Commit**

```bash
git add frontend/css/components.css frontend/css/pages.css
git commit -m "feat(frontend): estilos dos componentes estilo Pierre

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Helpers de render compartilhados + Visão geral (donut, barra, saldo)

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Adicionar helpers ao final de `app.js`**

```js
// ============================================================
// HELPERS DE RENDER (estilo Pierre)
// ============================================================
/** Cor determinística a partir de um nome (para avatar). */
function corDeNome(nome) {
  const cores = ['#10b981','#f472b6','#fbbf24','#60a5fa','#a78bfa','#fb923c','#22d3ee'];
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h);
  return cores[Math.abs(h) % cores.length];
}

/** HTML de um avatar circular com a inicial. */
function avatarMerchant(nome) {
  const inicial = (nome || '?').trim().charAt(0).toUpperCase();
  return `<span class="avatar-merchant" style="background:${corDeNome(nome || '?')}">${inicial}</span>`;
}

/** Card de transação estilo Pierre. */
function transacaoCard(t) {
  const sinal = t.tipo === 'entrada' ? '+' : t.tipo === 'saida' ? '−' : '';
  return `
    <div class="transacao-card">
      ${avatarMerchant(t.descricao)}
      <div class="transacao-card__info">
        <span class="transacao-card__desc">${t.descricao}</span>
        <span class="transacao-card__meta">${labelCategoria(t.categoria)} • ${formatarData(t.data)}</span>
      </div>
      <span class="transacao-card__valor valor--${t.tipo}">${sinal} ${formatarBRL(t.valor)}</span>
    </div>`;
}

/** Agrega transações de saída por categoria → [{categoria, total}] desc. */
function agregarPorCategoria(transacoes) {
  const mapa = {};
  transacoes.filter(t => t.tipo === 'saida').forEach(t => {
    const c = t.categoria || 'outros';
    mapa[c] = (mapa[c] || 0) + t.valor;
  });
  return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/** Renderiza a barra multicolor de categorias num container. */
function renderizarBarraCategorias(containerId, transacoes) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const dados = agregarPorCategoria(transacoes);
  const total = dados.reduce((s, d) => s + d.total, 0) || 1;
  const cores = ['#f472b6','#a78bfa','#fbbf24','#60a5fa','#34d399','#fb923c'];
  const segs = dados.map((d, i) => `<div class="barra-categorias__seg" style="width:${(d.total/total*100).toFixed(1)}%;background:${cores[i%cores.length]}"></div>`).join('');
  const legenda = dados.map((d, i) => `<span class="barra-categorias__item"><span class="barra-categorias__dot" style="background:${cores[i%cores.length]}"></span>${labelCategoria(d.categoria)} — ${formatarBRL(d.total)}</span>`).join('');
  el.innerHTML = `<div class="barra-categorias__trilha">${segs}</div><div class="barra-categorias__legenda">${legenda}</div>`;
}
```

- [ ] **Step 2: Atualizar `renderizarTransacoesRecentes` para usar cards**

Substituir o corpo da função `renderizarTransacoesRecentes` (app.js ~linha 155) por:

```js
function renderizarTransacoesRecentes(lista) {
  const container = document.getElementById('lista-transacoes-recentes');
  if (!container) return;
  if (!lista.length) { container.innerHTML = criarEstadoVazio('Nenhuma transação registrada ainda.'); return; }
  container.innerHTML = lista.map(transacaoCard).join('');
}
```

- [ ] **Step 3: Renderizar card de saldo, donut e barra na Visão geral**

Modificar `renderizarResumo` (app.js ~linha 128) para também montar o hero e os gráficos:

```js
function renderizarResumo({ saldo, entradas, saidas, pendentes }) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = formatarBRL(v ?? 0); };
  set('saldo-valor', saldo); set('entradas-valor', entradas);
  set('saidas-valor', saidas); set('pendentes-valor', pendentes);

  const hero = document.getElementById('card-saldo-total');
  if (hero) hero.innerHTML = `
    <p class="card__titulo">Saldo total</p>
    <p class="card-saldo-total__valor">${formatarBRL(saldo ?? 0)}</p>
    <p class="card-saldo-total__saude">Sua saúde financeira está ${(saldo ?? 0) >= 0 ? 'em dia' : 'no vermelho'}</p>`;

  criarDonut('grafico-donut-resumo', ['Entradas', 'Saídas'], [entradas ?? 0, saidas ?? 0]);
  renderizarBarraCategorias('barra-categorias-dashboard', todasTransacoes.length ? todasTransacoes : DEMO.transacoes);
}
```

- [ ] **Step 4: Verificar**

Run: abrir `#dashboard`.
Expected: hero "Saldo total" no topo; 4 cards; donut Entradas×Saídas; barra multicolor de categorias com legenda; últimas transações como cards com avatar colorido.

- [ ] **Step 5: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): visao geral estilo Pierre (saldo, donut, barra, cards)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Tela Transações (cards) + Tela Categorias

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Render de Transações como cards**

Substituir o corpo de `renderizarTabelaTransacoes` (app.js ~linha 576) por cards + ações:

```js
function renderizarTabelaTransacoes(lista) {
  const container = document.getElementById('container-transacoes-lista');
  const contagem = document.getElementById('resultado-contagem');
  if (!container) return;
  if (contagem) contagem.innerHTML = lista.length ? `Exibindo <strong>${lista.length}</strong> transaç${lista.length === 1 ? 'ão' : 'ões'}` : '';
  if (!lista.length) { container.innerHTML = criarEstadoVazio('Nenhuma transação encontrada.'); return; }
  container.innerHTML = lista.map(t => `
    <div class="transacao-card" data-id="${t.id}">
      ${avatarMerchant(t.descricao)}
      <div class="transacao-card__info">
        <span class="transacao-card__desc">${t.descricao}</span>
        <span class="transacao-card__meta">${labelCategoria(t.categoria)} • ${formatarData(t.data)}</span>
      </div>
      <span class="transacao-card__valor valor--${t.tipo}">${formatarBRL(t.valor)}</span>
      <div class="acoes-tabela">
        <button class="btn-acao btn-acao--editar" onclick="editarTransacao('${t.id}')" aria-label="Editar">✏️</button>
        <button class="btn-acao btn-acao--excluir" onclick="excluirTransacao('${t.id}')" aria-label="Excluir">🗑️</button>
      </div>
    </div>`).join('');
}
```

- [ ] **Step 2: Render da tela Categorias**

Adicionar função e chamada no router. Adicionar ao final de `app.js`:

```js
function renderizarPaginaCategorias() {
  const fonte = todasTransacoes.length ? todasTransacoes : DEMO.transacoes;
  renderizarBarraCategorias('barra-categorias-pagina', fonte);
  const dados = agregarPorCategoria(fonte);
  criarDonut('grafico-donut-categorias', dados.map(d => labelCategoria(d.categoria)), dados.map(d => d.total));
  const lista = document.getElementById('lista-categorias');
  if (lista) lista.innerHTML = dados.map(d => `
    <div class="investimento-row"><span>${labelCategoria(d.categoria)}</span><strong>${formatarBRL(d.total)}</strong></div>`).join('') || criarEstadoVazio('Sem gastos no período.');
}
```

- [ ] **Step 3: Verificar**

Run: abrir `#transacoes` e `#categorias`.
Expected: Transações em cards com filtros funcionando; Categorias com barra, donut e lista por categoria.

- [ ] **Step 4: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): telas Transacoes (cards) e Categorias

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Telas mock — Investimentos, Assinaturas, Bancos

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Adicionar renders ao final de `app.js`**

```js
async function renderizarPaginaInvestimentos() {
  const el = document.getElementById('card-investimentos');
  if (!el) return;
  const dados = await InvestimentosAPI.listar();
  const total = dados.reduce((s, d) => s + d.valor, 0);
  el.innerHTML = `
    <div class="card-saldo-total">
      <p class="card__titulo">Total investido • ${dados.length} ativos</p>
      <p class="card-saldo-total__valor">${formatarBRL(total)}</p>
    </div>
    <div class="grid-graficos">
      <section class="secao secao--grafico"><canvas id="grafico-donut-invest" height="240"></canvas></section>
      <section class="secao">${dados.map(d => `
        <div class="investimento-row">
          <span>${d.classe}</span>
          <span>${formatarBRL(d.valor)}
            <span class="${d.variacaoPct >= 0 ? 'variacao--alta' : 'variacao--baixa'}">
              ${d.variacaoPct >= 0 ? '↑' : '↓'} ${Math.abs(d.variacaoPct)}%
            </span>
          </span>
        </div>`).join('')}</section>
    </div>`;
  criarDonut('grafico-donut-invest', dados.map(d => d.classe), dados.map(d => d.valor));
}

async function renderizarPaginaAssinaturas() {
  const el = document.getElementById('lista-assinaturas');
  if (!el) return;
  const dados = await AssinaturasAPI.listar();
  const hoje = new Date();
  el.innerHTML = dados.map(a => {
    const dias = Math.max(0, Math.ceil((new Date(a.proximaCobranca) - hoje) / 86400000));
    return `<div class="assinatura-card">
      ${avatarMerchant(a.nome)}
      <p class="transacao-card__desc">${a.nome}</p>
      <p class="assinatura-card__valor">${formatarBRL(a.valor)}</p>
      <p class="assinatura-card__prazo">em ${dias} dias</p>
    </div>`;
  }).join('');
}

async function renderizarPaginaBancos() {
  const el = document.getElementById('lista-bancos');
  if (!el) return;
  const dados = await BancosAPI.listar();
  el.innerHTML = dados.map(b => `
    <div class="banco-row">${avatarMerchant(b.nome)}<span>${b.nome}</span><span class="banco-row__saldo">${formatarBRL(b.saldo)}</span></div>`).join('');
}
```

- [ ] **Step 2: Verificar**

Run: abrir `#investimentos`, `#assinaturas`, `#bancos`.
Expected: Investimentos com donut + breakdown e variação verde/vermelho; Assinaturas em grid com countdown "em X dias"; Bancos em linhas com avatar e saldo.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): telas mock Investimentos, Assinaturas e Bancos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Tela Chat IA (mock)

**Files:**
- Modify: `frontend/js/app.js`

- [ ] **Step 1: Adicionar lógica de chat ao final de `app.js`**

```js
const CHAT_CHIPS = ['Me ajuda com um plano', 'Tô apertado de grana', 'Quanto gastei esse mês?'];

function adicionarBolhaChat(texto, autor) {
  const janela = document.getElementById('chat-janela');
  if (!janela) return;
  const div = document.createElement('div');
  div.className = `chat-bubble chat-bubble--${autor}`;
  div.textContent = texto;
  janela.appendChild(div);
  janela.scrollTop = janela.scrollHeight;
}

async function enviarMensagemChat(texto) {
  if (!texto.trim()) return;
  adicionarBolhaChat(texto, 'usuario');
  const { resposta } = await ChatAPI.enviar(texto);
  adicionarBolhaChat(resposta, 'assistente');
}

function inicializarChat() {
  const chips = document.getElementById('chat-chips');
  if (chips && !chips.dataset.pronto) {
    chips.innerHTML = CHAT_CHIPS.map(c => `<button class="chat-chip" type="button">${c}</button>`).join('');
    chips.querySelectorAll('.chat-chip').forEach(b => b.addEventListener('click', () => enviarMensagemChat(b.textContent)));
    chips.dataset.pronto = '1';
  }
  const form = document.getElementById('chat-form');
  if (form && !form.dataset.pronto) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      enviarMensagemChat(input.value);
      input.value = '';
    });
    form.dataset.pronto = '1';
    adicionarBolhaChat('Oi! Sou o Pierre. Como posso te ajudar com suas finanças?', 'assistente');
  }
}
```

- [ ] **Step 2: Verificar**

Run: abrir `#chat`, clicar num chip e digitar uma mensagem.
Expected: bolha do usuário à direita (verde), resposta do assistente à esquerda; chips disparam mensagens; saudação inicial aparece uma vez.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): tela de chat IA mock (Pierre)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Router lazy — renderizar a tela ao abrir

**Files:**
- Modify: `frontend/js/app.js` (função `inicializarNavegacao`, ~linha 198)

- [ ] **Step 1: Disparar render por página dentro de `ativarSecao`**

Dentro de `inicializarNavegacao`, no fim da função `ativarSecao(hash)` (logo após ativar a seção/link), adicionar o dispatch:

```js
    // Render lazy da tela alvo
    switch (alvo) {
      case 'categorias':    renderizarPaginaCategorias(); break;
      case 'investimentos': renderizarPaginaInvestimentos(); break;
      case 'assinaturas':   renderizarPaginaAssinaturas(); break;
      case 'bancos':        renderizarPaginaBancos(); break;
      case 'chat':          inicializarChat(); break;
    }
```

- [ ] **Step 2: Verificar fluxo completo**

Run: recarregar `http://localhost:3000`, navegar por TODAS as 7 telas pela sidebar; testar deep-link abrindo `http://localhost:3000/#investimentos` direto.
Expected: cada tela renderiza ao abrir; gráficos aparecem; sem erro no console; deep-link abre a tela certa já renderizada.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): router lazy renderiza cada tela ao abrir

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Verificação final + merge

- [ ] **Step 1: Smoke test manual completo**

Run: `npm start`, logar, percorrer as 7 telas, criar uma transação pelo modal e confirmar que Visão geral/Transações/Categorias atualizam.
Expected: tudo renderiza, gráficos ok, sem erro no console, responsivo no mobile (sidebar overlay).

- [ ] **Step 2: Invocar finishing-a-development-branch**

Usar a skill `superpowers:finishing-a-development-branch` para decidir merge/PR da branch `feat/pierre-style-frontend`.

---

## Self-review (cobertura do spec)

- Tela 1 Visão geral → Task 1 (scaffold) + Task 6. ✓
- Tela 2 Transações → Task 1 + Task 7. ✓
- Tela 3 Categorias → Task 1 + Task 7. ✓
- Tela 4 Investimentos → Task 1 + Task 8. ✓
- Tela 5 Assinaturas → Task 1 + Task 8. ✓
- Tela 6 Bancos → Task 1 + Task 8. ✓
- Tela 7 Chat → Task 1 + Task 9. ✓
- Chart.js / donut → Task 4, usado em 6/7/8. ✓
- Barra categorias CSS puro → Task 5 (CSS) + Task 6 (render). ✓
- Camada API mock + contratos → Task 2 + Task 3. ✓
- Avatar círculo colorido → Task 6 (`avatarMerchant`/`corDeNome`). ✓
- Router 7 seções + lazy render → Task 1 (reuso) + Task 10. ✓
- Fallback demo quando API falha → já existe em `app.js` (`carregarResumo`/`carregarTodasTransacoes`). ✓
```
