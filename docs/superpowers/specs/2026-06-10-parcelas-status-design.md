# Design — Status individual de parcelas (pagar / adiantar)

Data: 2026-06-10
Branch: `feat/parcelas-status`

## Objetivo

A aba Parcelamentos hoje só mostra um resumo agregado e o progresso vem de um
contador `parcelasPagas` (as pagas são sempre as primeiras N, em sequência).
Como o sistema **não** integra com Open Finance, o usuário precisa marcar
manualmente o estado de cada parcela. Esta entrega dá **status individual por
parcela** — `pendente`, `paga` ou `adiantada` — com marcação fora de ordem,
direto na aba Parcelamentos.

## Decisões de design

1. **Status individual, fonte única em array** — cada parcela tem estado
   próprio em `parcelasStatus` (abordagem A). `parcelasPagas` passa a ser
   derivado.
2. **`paga` vs `adiantada` = escolha manual** — o usuário decide explicitamente,
   independente da data de vencimento. Ambas quitam a parcela; a distinção é
   informativa (quitada no vencimento vs antecipada).
3. **Pagamento fora de ordem** — pode quitar a parcela 5 com 1–4 ainda
   pendentes.
4. **Impacto do dashboard inalterado** — o impacto é por **vencimento**
   (competência), não depende do pagamento; a derivação de status não toca a
   agregação do dashboard.
5. **Migração lazy, sem script** — docs antigos derivam o array a partir do
   contador na primeira leitura/normalização.

## Seção 1 — Modelo de dados

`backend/src/models/Transaction.js` (sem coleção nova):

| Campo | Tipo / regra | Significado |
|---|---|---|
| `parcelasStatus` | `[String]`, enum `pendente\|paga\|adiantada`, default `[]` | estado de cada parcela; índice 0 = parcela 1 |
| `parcelasPagas` | Number (já existe) | **derivado** = contagem de status ≠ `pendente`; recalculado no `pre('save')` |
| `parcelas` | Number (já existe) | total N de parcelas |
| `amount` | Number (já existe) | valor de **uma** parcela |
| `date` | Date (já existe) | vencimento da 1ª parcela (âncora) |

- Invariante: `parcelasStatus.length == parcelas`. Normaliza no save — se vier
  menor, completa com `pendente`; se maior, trunca.
- `parcelas == 1` (transação normal) → array vazio, ignorado; comportamento
  atual intacto.
- **Migração lazy:** ao normalizar uma transação com `parcelas > 1` e
  `parcelasStatus` vazio, deriva `['paga' × parcelasPagas, 'pendente' × resto]`.
  Persiste no próximo save (quando o usuário marcar algo).
- `parcelasPagas` recalculado no `pre('save')` = `parcelasStatus.filter(s => s !== 'pendente').length`.

## Seção 2 — Derivação (fonte única da verdade)

`backend/src/utils/parcelas.js` (puro) + espelho `frontend/js/parcelas.js`
(puro, sem DOM). Mesma lógica nos dois lados.

- `proximaParcelaEmAberto(tx)` → **reescrita**: menor índice `i` (0-based) com
  `parcelasStatus[i] === 'pendente'`; retorna
  `{ indice: i + 1, vencimento: addMeses(date, i), valor: amount }`, ou `null`
  se nenhuma pendente. Suporta pagamento fora de ordem.
- `quitadas(tx)` = count(status ≠ `pendente`); `emAberto(tx)` = count(`pendente`).
- `restante(tx)` = `emAberto × amount`. `progresso(tx)` = `quitadas / parcelas`.
- `vencimentoParcela(tx, i)` = `addMeses(date, i-1)`, valor `amount` (inalterado).
- `parcelaDoMes(tx, ano, mes)` e o impacto do dashboard → **inalterados**
  (competência por vencimento, não olham status de pagamento).
- Compat: quando `parcelasStatus` estiver vazio, as derivações tratam as
  primeiras `parcelasPagas` como quitadas (mesma migração lazy do front).

## Seção 3 — Aba Parcelamentos (UI)

`renderizarPaginaParcelamentos` em `frontend/js/app.js`. O card mantém o resumo
atual (descrição, badge de tipo, valor da parcela, barra de progresso,
restante, próximo vencimento, valor total, botão Excluir). Adiciona:

- Botão **"Ver parcelas ▾"** → faz toggle de uma lista in-line. Estado de
  expansão vive só no DOM (classe/atributo), não persiste.
- Lista: uma linha por parcela `i` (1..N):
  - `Parcela {i}/{total} • vence {data}` + **badge de status**: Pendente
    (cinza) / Paga (verde) / Adiantada (azul).
  - Linha **pendente** → 2 botões: `Pagar` e `Adiantar`.
  - Linha **quitada** (paga/adiantada) → botão `Desfazer` (volta a `pendente`).
- Barra de progresso e "restante / próximo" recalculam após cada ação
  (re-render do card).
- CSS novo em `frontend/css/components.css` (segue o padrão dos cards/badges
  existentes).

## Seção 4 — Ação de marcar (fluxo)

Nova função (ex.: `marcarParcela(id, indice, status)`) em `app.js`:

1. Acha a transação em `todasTransacoes`; clona `parcelasStatus` (aplica
   migração lazy se vazio).
2. Seta `parcelasStatus[indice]` = `paga` | `adiantada` | `pendente`.
3. `PUT /transactions/:id` enviando `parcelasStatus` completo (reusa
   `TransacoesAPI.atualizar` / `editarTransacao`, que já aceita campos parciais).
4. Backend recalcula `parcelasPagas` no save.
5. `carregarTodasTransacoes()` + `carregarDashboard()` + re-render aba/contas;
   toast de sucesso. Erro → toast de erro.
6. `frontend/js/api.js`: `montarPayloadTransacao` inclui `parcelasStatus` quando
   presente; `normalizarTransacaoApi` expõe `parcelasStatus` (com migração lazy
   do contador para o array, p/ o front derivar a lista).

## Seção 5 — Contas a Pagar (ajuste)

`pagarConta` em `app.js`:

- Para um parcelado, em vez de `parcelasPagas++`, marca a **próxima parcela
  pendente** (via `proximaParcelaEmAberto`) como `paga` no `parcelasStatus` e
  envia o array.
- A lista de Contas a Pagar continua mostrando a próxima parcela em aberto
  (agora derivada do array). Uma parcela adiantada lá no futuro deixa de ser
  obrigação e some das próximas.
- Total de Contas a Pagar (soma das próximas em aberto) inalterado no formato.

## Seção 6 — Tratamento de erros

- Índice fora de `[0, parcelas)` ou status fora do enum → 400 (validação do
  model / enum do Mongoose), padrão atual `{ success, message, error }`.
- Falha de rede na marcação → toast de erro, estado não muda (re-render a partir
  do dado atual).

## Componentes e fronteiras

- `backend/src/models/Transaction.js` — campo `parcelasStatus` + normalização e
  recálculo de `parcelasPagas` no `pre('save')`.
- `backend/src/utils/parcelas.js` — `proximaParcelaEmAberto` reescrita +
  `quitadas`/`emAberto`/`restante`/`progresso`.
- `backend/src/controllers/transactionController.js` — `editarTransacao` aceita
  `parcelasStatus`; dashboard inalterado.
- `frontend/js/parcelas.js` — espelho puro das derivações + migração lazy.
- `frontend/js/app.js` — render da lista expansível, `marcarParcela`,
  `pagarConta` ajustada.
- `frontend/js/api.js` — payload/normalização de `parcelasStatus`.
- `frontend/css/components.css` — estilos da lista de parcelas e badges.

## Verificação

Sem framework de testes; smoke test de API ao vivo + checagem visual:

1. Criar despesa parcelada (total 1200, 12x) → doc com `parcelas=12`,
   `parcelasStatus` vazio (ou 12× `pendente`), `parcelasPagas=0`.
2. Aba Parcelamentos → expandir "Ver parcelas" → 12 linhas, todas Pendente.
3. Pagar P1 → badge verde, progresso 1/12, restante 1100; doc `parcelasStatus[0]='paga'`, `parcelasPagas=1`.
4. Adiantar P5 → badge azul, progresso 2/12, restante 1000; `parcelasStatus[4]='adiantada'`.
5. Contas a Pagar → próxima parcela em aberto = **P2** (não P6), valor 100.
6. Desfazer P5 → volta Pendente, progresso 1/12, restante 1100.
7. Doc antigo só com `parcelasPagas=3` (sem array) → aba mostra P1–P3 quitadas,
   P4+ pendentes (migração lazy); ao marcar algo, persiste o array.
8. Transação normal (`parcelas=1`) → comportamento inalterado.
9. Dashboard → impacto por vencimento idêntico antes/depois de marcar (status
   não altera competência).
