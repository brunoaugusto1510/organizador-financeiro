# Redesign do Frontend moderno — Design

**Data:** 2026-06-04
**Projeto:** organizador-financeiro (FinançasFácil)
**Autor:** Gustavo Falci + Claude

## Objetivo

Redesenhar o frontend para replicar as telas do um app de referência,
construindo **todas as telas no frontend agora** com dados reais onde o backend
já suporta e **dados mock** onde ainda não. O time de backend pluga a lógica
real depois, trocando o corpo dos stubs de API por chamadas `fetch` reais.

## Princípios

- **Visual de app, não de marketing.** Replicar o dashboard dark limpo do app,
  não os cards flutuando sobre fotos de pessoas da landing page.
- **Reaproveitar a base existente.** O frontend já é dark + fonte Geist + cards
  glassmorphism (`variables.css` já diz "com tema dark"). Estender, não
  reescrever do zero.
- **Costura de API limpa.** Cada domínio de dado é um módulo de API. Telas mock
  expõem o mesmo formato que o backend deverá retornar, documentado inline.
- **YAGNI.** Sem IA real, sem Open Finance real, sem integração bancária real
  nesta entrega. Só a UI + contratos.

## Estética / Design System

- Mantém os tokens de `css/variables.css` (dark, emerald, Geist, glassmorphism).
- **Chart.js** via CDN (`<script>`) para donut, barras e linha de evolução.
- Ícone de merchant/banco = **círculo colorido com a inicial** do nome (cor
  derivada de hash do nome). Não usar logos reais (direito autoral).
- Sem fotos de fundo.

## Telas (7)

Navegação via **router client-side**: cada tela é uma seção `.pagina`; clicar na
sidebar troca a seção ativa (mais hash na URL, ex. `#investimentos`).

| # | Tela | Conteúdo | Fonte de dados |
|---|------|----------|----------------|
| 1 | **Visão geral** | Card "seus bancos" (saldo total + frase de saúde financeira); 4 cards resumo (entradas, saídas, a pagar, saldo); donut entradas×saídas; barra de categorias multicolor; transações recentes (cards com avatar) | **real** (transações + resumo) |
| 2 | **Transações** | Lista estilo card: avatar do merchant, descrição, categoria, data, parcelamento; filtros por tipo; busca | **real** |
| 3 | **Categorias** | "Gastos por categoria • mês"; barra multicolor; lista de categorias com % e valor; donut por categoria | **real** (agrega transações no front) |
| 4 | **Investimentos** | Card "Investimentos"; donut por classe; total investido + nº de ativos; breakdown (renda fixa / variável / fundos) com variação ↑verde/↓vermelho | **mock** |
| 5 | **Assinaturas** | Cards de assinatura (nome, valor, "em X dias") com countdown até a próxima cobrança | **mock** |
| 6 | **Bancos** | Lista de contas conectadas: avatar + nome + saldo; botão "conectar banco" (placeholder) | **mock** |
| 7 | **Assistente (Chat IA)** | Interface de chat: bolhas usuário/assistente, chips de sugestão rápida ("Me ajuda com um plano", "Tô apertado de grana"); respostas mock | **mock** |

## Arquitetura Frontend

### Estrutura de arquivos

```
frontend/
  index.html            # 7 seções .pagina + sidebar atualizada + Chart.js CDN
  css/
    variables.css       # (inalterado)
    components.css       # + novos componentes (avatar, transaction-card, etc.)
    pages.css           # + estilos por tela nova
    layout.css          # (ajustes de nav se preciso)
  js/
    api.js              # APIs reais (existe) + stubs mock documentados
    mock-data.js        # NOVO — dados falsos + contratos (shape esperado)
    router.js           # NOVO — troca de seção .pagina via sidebar/hash
    charts.js           # NOVO — setup Chart.js (donut, barra, linha)
    app.js              # render por tela (estende o existente)
    ui.js               # (existe) helpers de toast/spinner
    auth.js             # (existe)
```

### Camada de dados — contrato para o backend

Cada domínio mock é um objeto de API cujo método retorna `Promise`. Hoje
resolve com `MOCK.*`; o backend troca por `fetch` real mantendo o mesmo shape.

```js
// api.js — STUBS (backend substitui o corpo, mantém o retorno)

// Backend: GET /api/banks  -> { id, nome, saldo }[]
const BancosAPI = { listar: async () => MOCK.bancos };

// Backend: GET /api/investments -> { classe, valor, variacaoPct }[]
const InvestimentosAPI = { listar: async () => MOCK.investimentos };

// Backend: GET /api/subscriptions -> { nome, valor, proximaCobranca:ISO }[]
const AssinaturasAPI = { listar: async () => MOCK.assinaturas };

// Backend: POST /api/chat { mensagem } -> { resposta }
const ChatAPI = { enviar: async (msg) => MOCK.respostaChat(msg) };
```

Contratos completos (campos, tipos, exemplo) ficam em `mock-data.js` como
comentário acima de cada bloco, para o backend implementar sem adivinhar.

### Router

`router.js` expõe `navegar(pagina)`:
- Esconde todas as `.pagina`, mostra a alvo (`.pagina--ativa`).
- Marca o link ativo na sidebar.
- Atualiza `location.hash`; lê o hash no load para deep-link.
- Chama a função de render da página alvo (lazy: só renderiza ao abrir).

### Gráficos (Chart.js)

`charts.js` com fábricas:
- `donut(canvas, labels, valores, cores)` — investimentos e entradas×saídas.
- `barraEvolucao(canvas, ...)` — linha/barra de evolução mensal (visão geral).
A barra de categorias multicolor é **CSS puro** (segmentos `flex` com `width %`),
não Chart.js — mais fiel ao visual de referência.

### Componentes novos (CSS em components.css)

- `.avatar-merchant` — círculo colorido com inicial; cor por hash do nome.
- `.transacao-card` — avatar + descrição/categoria/data + valor à direita.
- `.barra-categorias` — segmentos multicolor + legenda.
- `.assinatura-card` — nome, valor, badge "em X dias".
- `.investimento-row` — classe, valor, variação colorida.
- `.banco-row` — avatar + nome + saldo.
- `.chat-bubble` (`--usuario` / `--assistente`) + `.chat-chip`.

## Fluxo de dados (Visão geral, exemplo real)

1. `app.js` no load chama `TransacoesAPI.resumo()` e `TransacoesAPI.listar()`.
2. Render dos 4 cards + card de saldo total.
3. `charts.donut(...)` com entradas vs saídas do resumo.
4. Agrega transações por categoria no front → `barra-categorias` + donut categoria.
5. Render das transações recentes como `.transacao-card`.
6. Fallback: se a API falhar (sem backend), usa `MOCK` e mostra toast discreto.

## Tratamento de erro

- Toda chamada de API passa pelo `request()` existente (já trata HTTP/JSON).
- Falha de rede → fallback para `MOCK` + toast "exibindo dados de demonstração".
- Telas 100% mock nunca falham (resolvem local).

## Testes / Verificação

Projeto não tem suíte automatizada. Verificação manual:
- Subir server (`npm start`), abrir `http://localhost:3000`.
- Navegar pelas 7 telas via sidebar; confirmar render e gráficos.
- Telas reais (1–3) com dados do Atlas; telas mock (4–7) com dados falsos.
- Responsividade mobile (sidebar overlay já existe).

## Fora de escopo

- Backend novo (bancos, investimentos, assinaturas, chat) — outra entrega.
- IA real no chat. Open Finance real. Logos reais de marcas.
- Autenticação/refresh de token (já existe e funciona).
```
