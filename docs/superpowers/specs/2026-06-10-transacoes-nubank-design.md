# Aba Transações estilo Nubank — Design

Data: 2026-06-10
Status: aprovado

## Objetivo

Redesenhar a aba **Transações** para o layout dos prints (estilo Nubank): barra de
filtros (período, tipo, ordenação, categorias, toggle "Mostrar ocultos", busca), 4 KPIs
(Total, Despesas, Receitas, Saldo), tabela com colunas (Descrição, Categoria, Data, Valor,
menu de ações) e paginação client-side.

Estado atual: lista de cards (`.transacao-card`) com filtros simples (botões de tipo,
busca textual, intervalo de datas). Sem KPIs, sem tabela com colunas, sem paginação, sem
conceito de transação oculta.

## Decisões (fechadas no brainstorming)

1. **Coluna "Conta"**: omitida (app de conta única; evita mudança de modelo desnecessária).
2. **"Mostrar ocultos"**: funcional — novo campo `oculto` na transação, ação "Ocultar" no
   menu da linha, toggle que mostra/esconde ocultas.
3. **Filtros funcionais**: Período (Este mês / Mês passado / Todos), Tipo (Todas / Entradas
   / Saídas / Pendentes), Ordenação (Data recentes/antigas, Maior/Menor valor), Categorias
   (Todas + por categoria), além da busca textual.
4. **Paginação**: client-side (seletor por-página 10/25/50, contador, navegação).
5. **Controles de filtro**: `<select>` nativos estilizados (acessíveis, menos código) em vez
   de dropdowns custom dos prints.
6. **Avatar da linha**: emoji da subcategoria sobre a cor do grupo (consistente com a aba
   Categorias, que já usa `GRUPOS` + `MAPA_GRUPO_CATEGORIA`).

## Arquitetura

### Backend

**`backend/src/models/Transaction.js`**
- Adicionar campo `oculto: { type: Boolean, default: false }`.

**`backend/src/controllers/transactionController.js`**
- `montarDadosTransacao(body)`: incluir `oculto` no destructuring e no objeto retornado, para
  que tanto `criarTransacao` quanto `editarTransacao` persistam o campo. O toggle de
  ocultar reutiliza a rota `PUT /:id` existente — nenhuma rota nova.

### API (`frontend/js/api.js`)

- `normalizarTransacaoApi`: adicionar `oculto: transacao.oculto ?? false` ao objeto
  normalizado.
- `montarPayloadTransacao`: adicionar `oculto: dados.oculto` ao payload.
  (O `atualizar(id, dados)` já envia o payload completo; ocultar/mostrar chama
  `atualizar(id, { ...transacao, oculto: !transacao.oculto })`.)

### Frontend (`frontend/js/app.js`)

**Estado.** `estadoFiltros` passa a ser:
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

**`aplicarFiltros()`** reescrito — pipeline:
1. Começa de `[...todasTransacoes]`.
2. **Ocultos**: se `!mostrarOcultos`, remove `t.oculto === true`.
3. **Período**: `este-mes` → mês corrente; `mes-passado` → mês anterior; `todos` → sem
   filtro. Compara `String(t.data).slice(0,7)` com a chave `YYYY-MM` do período.
4. **Tipo**: se `!== 'todos'`, filtra `t.tipo === tipo`.
5. **Categoria**: se `!== 'todas'`, filtra `t.categoria === categoria`.
6. **Busca**: descrição ou label da categoria contém o termo (case-insensitive).
7. Guarda o conjunto filtrado → calcula **KPIs** (sobre o conjunto inteiro, antes de paginar).
8. **Ordenação**: aplica conforme `ordenacao` (`localeCompare` para data, numérica para valor).
9. **Paginação**: fatia `[(pagina-1)*porPagina, pagina*porPagina]`.
10. Renderiza KPIs, tabela (página atual) e rodapé de paginação.

Qualquer mudança de filtro/ordenação/busca/toggle reseta `pagina = 1`.

**KPIs** (`atualizarKpisTransacoes(filtradas)`):
- Total = `filtradas.length`
- Despesas = soma de `valor` onde `tipo === 'saida'`
- Receitas = soma de `valor` onde `tipo === 'entrada'`
- Saldo = Receitas − Despesas
- Pendentes não entram em Despesas/Receitas.

**Tabela** (`renderizarTabelaTransacoes(pagina)`): `<tbody>` com uma `<tr>` por transação:
- **Descrição**: avatar (emoji da subcategoria sobre `GRUPOS[grupo].cor`) + texto `t.descricao`.
- **Categoria**: pill `.badge-categoria` com fundo translúcido da cor do grupo, ícone
  (`emojiCategoria`) + label (`labelCategoria`).
- **Data**: `formatarData(t.data)`.
- **Valor**: entrada → verde `+R$ x`; saída → `R$ x`; pendente → atenuado. Classe
  `valor--${t.tipo}` (já existe).
- **Ações**: botão `⋮` que abre um menu (popover) com **Editar** (`editarTransacao`),
  **Ocultar/Mostrar** (`alternarOcultaTransacao`), **Excluir** (`excluirTransacao`).
  O menu é absoluto, fecha ao clicar fora (listener global) ou ao escolher uma ação.

Grupo da subcategoria: `MAPA_GRUPO_CATEGORIA[t.categoria] || 'outros'`; metadados via
`GRUPOS[grupo]` (com fallback `outros`).

**Ocultar/mostrar** (`alternarOcultaTransacao(id)`): acha a transação em `todasTransacoes`,
chama `TransacoesAPI.atualizar(id, { ...t, oculto: !t.oculto })`, atualiza o item em
memória, re-aplica filtros, toast de confirmação.

**Paginação** (`renderizarPaginacao(total)`): seletor por-página (10/25/50), texto
"Mostrando X a Y de N", botões ‹ / › e número(s) de página. Mudanças chamam
`aplicarFiltros()`.

### `frontend/index.html`

Reescreve a section `#transacoes`:
- Barra de filtros: `<select>` para período, tipo, ordenação, categorias (categorias
  populadas no JS a partir de `CATEGORIAS`), toggle "Mostrar ocultos", e input de busca.
- Grid de 4 cards KPI (`#kpi-tx-total`, `#kpi-tx-despesas`, `#kpi-tx-receitas`,
  `#kpi-tx-saldo`) reaproveitando classes `.kpi`.
- Linha de ação: busca + botão "＋ Nova Transação" (abre o modal existente).
- `<table class="tabela-transacoes">` com `<thead>` (Descrição, Categoria, Data, Valor, "")
  e `<tbody id="container-transacoes-lista">`.
- Rodapé `#paginacao-transacoes`.
- Remove: botões `data-filtro-tipo`, inputs `filtro-data-inicio`/`fim`, `btn-limpar-filtros`,
  `resultado-contagem`. Os listeners desses controles em `app.js` são substituídos pelos
  novos (selects/toggle/busca/paginação).

### CSS (`frontend/css/pages.css` + `components.css`)

Novas classes: `.tx-filtros`, `.tx-select`, `.tx-toggle`, `.tx-kpis`, `.tabela-transacoes`
(thead/tbody/tr/td), `.tx-avatar`, `.tx-valor--entrada/--saida/--pendente`, `.tx-acoes-menu`
(popover) e `.tx-paginacao`. Reusa `.kpi`, `.badge-categoria` (estendida com cor de grupo
inline via `style="background:..."`).

## Fluxo de dados

`carregarTodasTransacoes` (API normaliza, agora com `oculto`) → `todasTransacoes` →
`aplicarFiltros()` (oculto→período→tipo→categoria→busca → KPIs → ordenação → paginação) →
`atualizarKpisTransacoes`, `renderizarTabelaTransacoes`, `renderizarPaginacao`.
`GRUPOS`/`MAPA_GRUPO_CATEGORIA` (já existentes da aba Categorias) fornecem cor/ícone.

## Erros / edge cases

- Conjunto filtrado vazio: tabela mostra estado vazio; KPIs zerados; paginação some/desabilita.
- Página além do total após mudar filtro: `pagina` é resetada para 1 a cada mudança de filtro.
- Subcategoria órfã (slug fora da taxonomia): grupo `outros` (cor/ícone fallback).
- Falha ao ocultar (API): toast de erro, estado em memória não muda.

## Verificação

- Backend: teste de schema confirmando `Transaction.schema.path('oculto')` do tipo Boolean.
- Frontend é vanilla, sem runner. Verificação manual: rodar app, abrir Transações, exercitar
  cada filtro, ordenação, busca, toggle de ocultos, ocultar/mostrar via menu, paginação, e
  conferir KPIs e layout contra os prints.

## Fora de escopo (YAGNI)

- Coluna/filtro de Conta e múltiplas contas.
- Filtro por intervalo de datas arbitrário (substituído por Período).
- Persistir preferências de filtro/paginação entre sessões.
- Seleção/edição em massa.
- Exportação.
