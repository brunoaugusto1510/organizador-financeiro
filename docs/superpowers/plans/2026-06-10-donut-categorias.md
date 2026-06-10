# Melhoria do donut de categorias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a legenda nativa do Chart.js (que trunca rótulos dentro de um canvas 130px) por uma legenda HTML custom ao lado de um anel maior, com rótulo completo + percentual por grupo.

**Architecture:** `criarDonut` passa a desenhar só o anel (legenda nativa off). O markup do header da aba Categorias ganha um bloco `.cat-header__grafico` (anel + `<ul class="donut-legenda">`), montado em `renderizarPaginaCategorias` a partir de `gruposSaida`/`totalGasto`. Estilos novos em `pages.css`.

**Tech Stack:** JS vanilla (scripts globais via `<script>`), Chart.js (CDN), CSS. Verificação via Playwright + Edge.

---

## File Structure

- `frontend/js/charts.js` — **Modify**: `criarDonut` desliga a legenda nativa.
- `frontend/js/app.js` — **Modify**: `renderizarPaginaCategorias` monta markup do gráfico (anel + legenda HTML) e trata estado vazio.
- `frontend/css/pages.css` — **Modify**: estilos `.cat-header__grafico`, `.cat-header__anel`, `.donut-legenda*`; remove/ajusta `.cat-header__donut`.

Sem runner de teste no frontend — verificação por harness Playwright (Task 4), seguindo o padrão do projeto.

Contexto atual (para referência ao implementar):
- `renderizarPaginaCategorias` (app.js ~835-865) já calcula `const saidas`, `const totalGasto`, `const gruposSaida = agregarPorGrupo(saidas)`. Cada grupo tem `g.group` (chave) e `g.total` (número). `GRUPOS[g.group]?.label` e `GRUPOS[g.group]?.cor` dão rótulo e cor; fallback de cor `#52525b`.
- O header é montado via `header.innerHTML = ...` com um `<div class="cat-header__donut"><canvas id="grafico-donut-categorias" ...></canvas></div>` no meio.

---

## Task 1: `criarDonut` desenha só o anel

**Files:**
- Modify: `frontend/js/charts.js` (função `criarDonut`, ~80-93)

- [ ] **Step 1: Desligar a legenda nativa**

Substitua o bloco `options` da função `criarDonut` por:

```js
    options: {
      responsive: true, cutout: '68%',
      plugins: { legend: { display: false } },
    },
```

A assinatura e o resto (`type: 'doughnut'`, `data` com `backgroundColor: cores`, `borderWidth: 0`) ficam iguais.

- [ ] **Step 2: Validar sintaxe**

Run: `node --check frontend/js/charts.js`
Expected: sem saída (OK).

- [ ] **Step 3: Commit**

```bash
git add frontend/js/charts.js
git commit -m "feat(frontend): donut sem legenda nativa (so o anel)"
```

---

## Task 2: Markup do gráfico + legenda HTML

**Files:**
- Modify: `frontend/js/app.js` (`renderizarPaginaCategorias`, ~835-865)

- [ ] **Step 1: Helper de legenda + markup**

Logo antes de `function renderizarPaginaCategorias()` (app.js ~835), adicione um helper puro:

```js
/** Monta o HTML da legenda do donut a partir dos grupos e do total. */
function _legendaDonutHTML(grupos, totalGasto) {
  return grupos.map((g) => {
    const label = GRUPOS[g.group]?.label ?? g.group;
    const cor = GRUPOS[g.group]?.cor ?? '#52525b';
    const pct = totalGasto > 0 ? Math.round((g.total / totalGasto) * 100) : 0;
    return `
      <li class="donut-legenda__item">
        <span class="donut-legenda__cor" style="background:${cor}"></span>
        <span class="donut-legenda__rotulo">${label}</span>
        <span class="donut-legenda__pct">${pct}%</span>
      </li>`;
  }).join('');
}
```

- [ ] **Step 2: Usar grupos ordenados e montar o bloco do gráfico**

Dentro de `renderizarPaginaCategorias`, logo após `const totalGasto = ...` e a obtenção de `saidas`, calcule os grupos ordenados UMA vez (antes do header), para legenda e donut usarem a mesma ordem. Substitua o trecho atual que monta o header e chama `criarDonut`.

Hoje o código é (referência):
```js
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
```

Troque por:
```js
  // Grupos de despesa do mês, maior fatia primeiro (legenda e donut na mesma ordem)
  const gruposSaida = agregarPorGrupo(saidas).slice().sort((a, b) => b.total - a.total);
  const temGasto = totalGasto > 0 && gruposSaida.length > 0;

  const blocoGrafico = temGasto
    ? `<div class="cat-header__grafico">
         <div class="cat-header__anel">
           <canvas id="grafico-donut-categorias" height="150" role="img" aria-label="Gráfico de gastos por categoria"></canvas>
         </div>
         <ul class="donut-legenda">${_legendaDonutHTML(gruposSaida, totalGasto)}</ul>
       </div>`
    : `<div class="cat-header__grafico cat-header__grafico--vazio">Sem gastos neste mês.</div>`;

  const header = document.getElementById('categorias-header');
  if (header) {
    header.innerHTML = `
      <div class="cat-header__total">
        <strong>${formatarBRL(totalGasto)}</strong>
        <span>gasto em ${rotuloMes(mesCategorias)}</span>
      </div>
      ${blocoGrafico}
      <div class="cat-mes-nav">
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(-1)" aria-label="Mês anterior">‹</button>
        <span class="cat-mes-nav__label">${rotuloMes(mesCategorias)}</span>
        <button class="cat-mes-nav__btn" onclick="mudarMesCategorias(1)" aria-label="Próximo mês">›</button>
      </div>`;
  }

  if (temGasto) {
    criarDonut(
      'grafico-donut-categorias',
      gruposSaida.map((g) => GRUPOS[g.group]?.label ?? g.group),
      gruposSaida.map((g) => g.total),
      gruposSaida.map((g) => GRUPOS[g.group]?.cor ?? '#52525b'),
    );
  }
```

Observação: o `criarDonut` precisa rodar **depois** do `header.innerHTML` (o canvas precisa existir no DOM) — a ordem acima garante isso.

- [ ] **Step 3: Validar sintaxe**

Run: `node --check frontend/js/app.js`
Expected: sem saída (OK).

- [ ] **Step 4: Commit**

```bash
git add frontend/js/app.js
git commit -m "feat(frontend): legenda HTML do donut com rotulo + percentual"
```

---

## Task 3: Estilos do gráfico e da legenda

**Files:**
- Modify: `frontend/css/pages.css` (~561-572, seção "Aba Categorias")

- [ ] **Step 1: Substituir a regra do donut e adicionar a legenda**

Localize a linha:
```css
.cat-header__donut { width: 130px; height: 130px; }
```
Substitua por:
```css
.cat-header__grafico { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cat-header__grafico--vazio { color: #71717a; font-size: 0.9rem; }
.cat-header__anel { width: 150px; height: 150px; flex-shrink: 0; }
.donut-legenda { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-width: 160px; }
.donut-legenda__item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
.donut-legenda__cor { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.donut-legenda__rotulo { color: #e4e4e7; }
.donut-legenda__pct { color: #a1a1aa; margin-left: auto; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/css/pages.css
git commit -m "style(frontend): estilos do anel e da legenda do donut"
```

---

## Task 4: Verificação (harness Playwright)

**Files:**
- Create (temporário): `frontend/_verify_donut.html`, `frontend/_verify_donut.py`

- [ ] **Step 1: Harness HTML carregando CSS real + Chart.js + charts.js real**

Crie `frontend/_verify_donut.html` que:
- carrega `css/variables.css`, `css/layout.css`, `css/components.css`, `css/pages.css`;
- carrega Chart.js via CDN (`https://cdn.jsdelivr.net/npm/chart.js`) e `js/charts.js` (real);
- define `GRUPOS`, `formatarBRL`, `rotuloMes`, `mudarMesCategorias` (stubs) e `agregarPorGrupo` stub que devolve grupos fixos;
- cola **verbatim** o `_legendaDonutHTML` e o bloco de montagem do header da Task 2 (com `temGasto`), usando estes grupos seed (inclui rótulo longo):

```js
const GRUPOS = {
  servicos: { label: 'Serviços', cor: '#60a5fa' },
  saude:    { label: 'Saúde e bem-estar', cor: '#f472b6' },
  casa:     { label: 'Casa', cor: '#34d399' },
};
const gruposSeed = [
  { group: 'servicos', total: 620 },
  { group: 'saude', total: 300 },
  { group: 'casa', total: 80 },
];
```
`totalGasto = 1000`. Renderize dentro de `<section id="categorias-header" class="cat-header"></section>` e chame `criarDonut(...)` depois de setar o innerHTML.

- [ ] **Step 2: Driver Playwright**

Crie `frontend/_verify_donut.py`:

```python
import pathlib
from playwright.sync_api import sync_playwright

url = pathlib.Path(__file__).parent.joinpath("_verify_donut.html").as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    pg = b.new_page(viewport={"width": 760, "height": 500})
    pg.goto(url)
    pg.wait_for_selector(".donut-legenda__item")
    itens = pg.query_selector_all(".donut-legenda__item")
    print("ITENS =", len(itens), "(esperado 3)")
    for it in itens:
        rot = it.query_selector(".donut-legenda__rotulo").inner_text()
        pct = it.query_selector(".donut-legenda__pct").inner_text()
        print(f"  {rot!r} {pct}")
    truncado = any("…" in it.query_selector(".donut-legenda__rotulo").inner_text() for it in itens)
    print("TEM TRUNCAMENTO =", truncado, "(esperado False)")
    soma = pg.evaluate("Array.from(document.querySelectorAll('.donut-legenda__pct')).reduce((s,e)=>s+parseInt(e.textContent),0)")
    print("SOMA % =", soma, "(esperado ~100)")
    canvas = pg.query_selector("#grafico-donut-categorias")
    print("CANVAS PRESENTE =", canvas is not None)
    pg.screenshot(path=str(pathlib.Path(__file__).parent / "_verify_donut.png"))
    b.close()
```

- [ ] **Step 3: Rodar e conferir**

Run: `cd frontend; $env:PYTHONUTF8=1; python _verify_donut.py`
Expected: `ITENS = 3`; rótulos completos incluindo `'Saúde e bem-estar'` (sem `…`); `TEM TRUNCAMENTO = False`; `SOMA % = 100`; `CANVAS PRESENTE = True`. Abrir `_verify_donut.png` e confirmar anel + legenda legível.

- [ ] **Step 4: Limpar temporários**

```bash
cd frontend; Remove-Item _verify_donut.html, _verify_donut.py, _verify_donut.png -Force
cd ..; git status --short
```
Não deve restar temporário no `git status`.

---

## Self-Review

- **Cobertura do spec:** §1 anel limpo (Task 1) ✓; §2 legenda HTML rótulo+% ordenada desc + estado vazio (Task 2) ✓; §3 layout/CSS (Task 3) ✓; §4 verificação (Task 4) ✓. Ordenação compartilhada legenda/donut garantida (mesma var `gruposSaida` ordenada) ✓.
- **Placeholders:** nenhum — todo passo traz código/comando completo.
- **Consistência de nomes:** classes `cat-header__grafico` / `cat-header__anel` / `donut-legenda(__item|__cor|__rotulo|__pct)` e `_legendaDonutHTML(grupos, totalGasto)` idênticas entre Task 2, 3 e 4. Canvas id `grafico-donut-categorias` inalterado.
