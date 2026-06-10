# Dropdown custom do sistema — Design

Data: 2026-06-10
Status: aprovado

## Objetivo

Substituir a aparência dos dropdowns do sistema (hoje `<select>` nativos, cuja lista
aberta é renderizada pelo browser/OS com fundo claro, destoando do tema escuro) por um
dropdown custom temático, condizente com o redesign estilo Nubank.

## Abordagem (decidida no brainstorming)

**Enhancement progressivo sobre o `<select>` nativo**, não substituição. Um enhancer
`melhorarSelect(select)` mantém o `<select>` no DOM (escondido visualmente, fonte da
verdade e fallback acessível) e renderiza por cima uma UI custom:
- um **botão** (`.select-custom__controle`) com o rótulo da opção atual + **chevron**;
- um **popover** (`.select-custom__lista`) com as opções escuras, hover e a opção
  selecionada destacada.

Selecionar uma opção seta `select.value` e dispara `change` (bubbles). Assim **todo o
código existente continua funcionando sem alteração**: listeners de filtro (`change`),
leitura de `.value` no submit do formulário e o `onchange` da paginação. Risco baixo —
o contrato value/`change` é preservado.

## Arquitetura

### Novo arquivo: `frontend/js/dropdown.js`

Carregado em `index.html` **antes** de `js/app.js` (após `js/charts.js`, linha ~263).

API:
- `melhorarSelect(select)` — idempotente (guarda via `select.dataset.enhanced`).
  1. Cria `<div class="select-custom">`, insere-o antes do `select` e move o `select`
     para dentro (o select fica visualmente escondido via classe `.select-custom__nativo`).
  2. Cria o botão `.select-custom__controle` (com `aria-haspopup="listbox"`,
     `aria-expanded="false"`) exibindo o texto da opção atualmente selecionada — ou, se
     `value === ''`, o texto da option vazia (placeholder, ex.: "Selecione").
  3. Cria a `<ul class="select-custom__lista" role="listbox">` com um
     `<li role="option">` por `<option>` do select (texto = label da option).
  4. Liga eventos:
     - clique no controle → alterna aberto/fechado;
     - clique numa opção → seta `select.value`, dispara `select.dispatchEvent(new Event('change', { bubbles: true }))`, fecha;
     - **`select` `change`** (de qualquer origem, inclusive programática) → atualiza o
       texto do controle e a opção marcada como selecionada. Isso cobre sets
       programáticos do app (ver "Integração").
     - teclado (ver Acessibilidade);
     - fechar ao clicar fora / `Esc` / `blur`.
- `inicializarDropdowns()` — chama `melhorarSelect` nos 4 selects de filtro de Transações.

Estado de "aberto": um único dropdown aberto por vez (variável de módulo
`_dropdownAberto` + listener global de clique, no mesmo padrão de `fecharMenuAcoes`/
`_onDocClickMenu` já existente em `app.js`). `dropdown.js` tem o seu próprio par
fechar/ouvir, independente do menu ⋮.

### CSS (`frontend/css/components.css`)

Classes novas: `.select-custom` (wrapper, `position: relative`), `.select-custom__nativo`
(esconde o select nativo sem removê-lo do fluxo de acessibilidade — `position:absolute;
opacity:0; pointer-events:none; width:0; height:0`), `.select-custom__controle`
(botão; herda o visual hoje em `.tx-select`), `.select-custom__chevron` (▾, rotaciona
quando aberto), `.select-custom__lista` (popover absoluto, fundo escuro, sombra, scroll
se longo), `.select-custom__opcao` (item; hover e `--selecionada`), e
`.select-custom--aberto`. Reaproveita os tokens de cor já usados em `.tx-select` e
`.tx-acoes-menu`.

`.tx-select` continua existindo para o controle herdar o estilo base (o botão recebe
`class="tx-select select-custom__controle"`), evitando duplicar regras.

## Integração (os 5 selects)

| Select | Quando aplicar o enhancer | Observação |
|---|---|---|
| `filtro-periodo`, `filtro-tipo`, `filtro-ordenacao`, `filtro-categoria` | `inicializarDropdowns()` no `DOMContentLoaded` | estáticos no HTML |
| `transacao-categoria` (modal) | re-enhance ao final de `loadCategorias` (após popular as `<option>`) | ver sets programáticos abaixo |
| `select` da paginação ("Por página") | enhance ao final de `renderizarPaginacao` (o select é recriado a cada render) | `melhorarSelect` é idempotente, mas aqui é sempre um elemento novo |

**Sets programáticos de valor (precisam notificar o enhancer):** o app define
`transacao-categoria.value` direto em dois pontos — ao abrir o modal de **edição**
(`app.js:387`) e ao **resetar** o formulário para nova transação. Como o enhancer atualiza
o rótulo no evento `change` do select, esses pontos passam a **disparar `change`** após
setar o valor (ou resetar), para o controle custom refletir o estado. Isso é inócuo (não
há listener de filtro em `transacao-categoria`).

`DOMContentLoaded`: chamar `inicializarDropdowns()` junto às demais inicializações.

## Acessibilidade / teclado

- Botão: `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` apontando para a lista.
- Lista: `role="listbox"`; itens `role="option"` com `aria-selected`.
- Teclado: abrir com Enter/Espaço/↓; navegar com ↑/↓ (move o destaque); selecionar com
  Enter ou clique; fechar com Esc, clique fora ou `blur`. Foco volta ao botão ao fechar.
- Sem type-ahead (YAGNI). O `<select>` nativo permanece como fallback acessível.

## Erros / edge cases

- `melhorarSelect` chamado duas vezes no mesmo select: no-op (guarda `dataset.enhanced`).
- Select sem opções (ex.: categoria antes de `loadCategorias`): enhance ocorre só após
  popular; a paginação só renderiza com dados.
- Opção placeholder (`value=""`): controle mostra o texto dela; não vira item "fantasma".
- Mudança de `value` programática sem `change`: coberto disparando `change` nos pontos
  citados.

## Verificação

- Frontend é vanilla, sem runner. `node --check frontend/js/dropdown.js` e
  `node --check frontend/js/app.js` → sintaxe OK.
- Manual contra os prints: abrir cada um dos 5 dropdowns (lista escura, chevron, hover,
  selecionado destacado); confirmar que filtros de Transações, paginação e
  cadastro/edição de transação seguem funcionando (value/`change` intactos), inclusive
  abrir o modal de edição e ver a categoria correta no controle; testar teclado e
  fechar-ao-clicar-fora.

## Fora de escopo (YAGNI)

- Menu de ações ⋮ (`tx-acoes-menu`) — já é popover custom; no máximo alinhar tokens de cor.
- Type-ahead, busca dentro do dropdown, multi-select, agrupamento por `<optgroup>`.
- Trocar a biblioteca de selects por dependência externa.
