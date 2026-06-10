# Design — Melhoria do donut de categorias

Data: 2026-06-10
Branch: `feat/donut-categorias`

## Objetivo

O donut de gastos por categoria (aba Categorias, header) usa a legenda nativa
do Chart.js em `position: 'bottom'` dentro de um canvas de 130×130. A legenda é
desenhada **dentro** do canvas, então espreme e **trunca** os rótulos
("Saúde e bem-est…") e o anel fica pequeno/desproporcional. Esta entrega troca a
legenda nativa por uma **legenda HTML custom** ao lado de um anel maior, sem
truncamento, com **rótulo + percentual** por grupo. Não muda o tipo de gráfico
nem os dados.

## Decisões de design

1. **Anel limpo** — `criarDonut` desliga a legenda do Chart.js; o canvas desenha
   só o anel.
2. **Legenda HTML** — montada no `app.js`, onde os grupos já existem
   (`gruposSaida`: label, total, cor). Robusta a nomes longos e a N grupos.
3. **Rótulo + percentual** — cada item mostra bolinha de cor, rótulo completo e
   `% = round(total / totalGasto * 100)`.
4. **Escopo: só a aba Categorias** — o donut do dashboard/linha não muda.

## Seção 1 — `criarDonut` (charts.js)

`frontend/js/charts.js`, função `criarDonut`:

- `options.plugins.legend.display: false` (remove a legenda nativa).
- Mantém `type: 'doughnut'`, `cutout: '68%'`, `responsive: true`,
  `backgroundColor: cores`, `borderWidth: 0`.
- Assinatura inalterada: `criarDonut(canvasId, labels, valores, cores)`.

## Seção 2 — Legenda HTML (app.js)

`frontend/js/renderizarPaginaCategorias`:

- Já existe `gruposSaida = agregarPorGrupo(saidas)` e `totalGasto`.
- Ordena os grupos por `total` desc (maior fatia primeiro).
- Para cada grupo monta um `<li class="donut-legenda__item">`:
  - `<span class="donut-legenda__cor" style="background:{cor}">` (bolinha)
  - `<span class="donut-legenda__rotulo">{label}</span>`
  - `<span class="donut-legenda__pct">{pct}%</span>`
  - `pct = totalGasto > 0 ? Math.round((g.total / totalGasto) * 100) : 0`
- A `<ul class="donut-legenda">` é injetada junto ao canvas no header (ver §3).
- **Estado vazio:** se `totalGasto === 0` (sem saídas no mês), não renderiza
  canvas nem legenda — mostra um texto curto "Sem gastos neste mês." no bloco do
  gráfico. (O `criarDonut` só é chamado quando há grupos, como hoje.)
- A ordenação dos grupos usada na legenda e a passada ao `criarDonut` (labels,
  valores, cores) devem ser **a mesma**, para cor/percentual baterem com as
  fatias.

## Seção 3 — Layout / CSS

`frontend/js/app.js` (markup do `categorias-header`) e `frontend/css/pages.css`:

- Substitui `.cat-header__donut` (130×130) por um bloco
  `.cat-header__grafico` em flex row: anel (`~150×150`) + `.donut-legenda` à
  direita.
- `.cat-header__grafico { display: flex; align-items: center; gap: 16px; }`
- `.cat-header__anel { width: 150px; height: 150px; flex-shrink: 0; }`
  (canvas dentro).
- `.donut-legenda { list-style: none; margin: 0; padding: 0; display: flex;
  flex-direction: column; gap: 8px; }`
- `.donut-legenda__item { display: flex; align-items: center; gap: 8px;
  font-size: 0.85rem; }`
- `.donut-legenda__cor { width: 10px; height: 10px; border-radius: 50%;
  flex-shrink: 0; }`
- `.donut-legenda__rotulo { color: #e4e4e7; }` (sem truncar — quebra se preciso).
- `.donut-legenda__pct { color: #a1a1aa; margin-left: auto; }`
- O `.cat-header` continua `flex` com `flex-wrap`; em tela estreita o bloco do
  gráfico desce e empilha naturalmente. Em telas bem estreitas o
  `.cat-header__grafico` pode envolver (anel em cima, legenda embaixo) — aceitável.

## Seção 4 — Verificação

Sem testes de frontend; harness Playwright (Edge) com dados mock dos grupos:

1. Carregar header com ≥3 grupos (incluindo um rótulo longo, ex.: "Saúde e
   bem-estar").
2. Conferir que a legenda lista **todos** os grupos, rótulo **completo** (sem
   `…`), com `%` ao lado.
3. Conferir que a soma dos `%` ≈ 100 (tolerância por arredondamento).
4. Conferir que o canvas do anel renderiza (elemento presente, sem legenda
   nativa).
5. Screenshot do header pra checagem visual de proporção/legibilidade.

## Componentes e fronteiras

- `frontend/js/charts.js` — `criarDonut` só desenha o anel (sem legenda).
- `frontend/js/app.js` — `renderizarPaginaCategorias` monta markup do gráfico +
  legenda HTML a partir de `gruposSaida`/`totalGasto`.
- `frontend/css/pages.css` — estilos do bloco do gráfico e da legenda.

## Tratamento de erros

- `totalGasto === 0` → bloco do gráfico mostra "Sem gastos neste mês.", sem
  canvas/legenda.
- Grupo sem cor mapeada → fallback `#52525b` (já é o padrão atual).
