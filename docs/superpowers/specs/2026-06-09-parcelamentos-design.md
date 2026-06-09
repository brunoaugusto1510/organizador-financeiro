# Design — Lógica de Parcelamentos

Data: 2026-06-09
Branch: `feat/parcelamentos`

## Objetivo

Dar lógica real às transações parceladas. Hoje o formulário coleta um campo
`parcelas` que é descartado (não enviado ao backend, não persistido) e a aba
Parcelamentos é um placeholder. Esta entrega persiste o parcelamento, distribui
seu impacto mês a mês no dashboard, integra com Contas a Pagar e popula a aba
Parcelamentos.

## Decisões de design

1. **Documento único + cronograma derivado** — um parcelamento é UMA transação
   com campos extras; o cronograma de parcelas é derivado, não materializado em
   N documentos.
2. **Parcela futura = obrigação pendente** — paga/recebida individualmente.
3. **Impacto por vencimento agendado** — uma parcela conta no mês em que vence
   (regime de competência), independente de já ter sido paga.
4. **Contas a Pagar mostra só a próxima parcela em aberto** de cada plano.
5. **Escopo: saídas e entradas** — `expense` e `income` podem ser parcelados.

## Seção 1 — Modelo de dados

Estende `backend/src/models/Transaction.js` (sem coleção nova):

| Campo | Tipo / regra | Significado |
|---|---|---|
| `parcelas` | Number, default 1, min 1 | total N de parcelas |
| `parcelasPagas` | Number, default 0, min 0, ≤ `parcelas` | quantas já pagas/recebidas |
| `amount` | Number (já existe) | valor de **uma** parcela |
| `date` | Date (já existe) | vencimento da **1ª** parcela (âncora) |
| `type` | `income`\|`expense` (já existe) | natureza; parcelado **não** usa `pending` |

- `parcelas == 1` → transação normal; comportamento atual intacto.
- `valorTotal` = `amount × parcelas` (derivado, não armazenado).
- Validação: `parcelasPagas` entre 0 e `parcelas`.

## Seção 2 — Regras de derivação (fonte única da verdade)

Um helper `backend/src/utils/parcelas.js` expõe funções puras reusadas por
dashboard, contas a pagar e aba Parcelamentos. O frontend replica a mesma lógica
em `frontend/js/parcelas.js` (funções puras, sem DOM) para render local.

- `addMeses(date, n)` → nova Date com `n` meses somados.
- `vencimentoParcela(tx, i)` = `addMeses(tx.date, i-1)` (i de 1..N), valor `tx.amount`.
- Parcelas pagas: `1 .. parcelasPagas`; em aberto: `parcelasPagas+1 .. parcelas`.
- `proximaParcelaEmAberto(tx)` → `{ indice: parcelasPagas+1, vencimento: addMeses(date, parcelasPagas), valor: amount }` quando `parcelasPagas < parcelas`; senão `null` (plano concluído).
- `mesesEntre(de, ate)` → diferença inteira de meses (ano*12+mês).
- `parcelaDoMes(tx, ano, mes)` → índice da parcela cujo vencimento cai em
  (`ano`,`mes`), ou `null`. Calculado por `k = mesesEntre(tx.date, primeiroDiaDoMes)`;
  válido se `0 ≤ k < parcelas`; índice = `k+1`.
- Pagar/receber → `parcelasPagas++`. Concluído quando `parcelasPagas == parcelas`.
- Sem data de pagamento por parcela (impacto é por vencimento, não por pagamento).

## Seção 3 — Agregação do dashboard

`resumirDashboard` passa a separar dois grupos:

- **Não parcelado (`parcelas <= 1`)**: caminho atual — `$match` por intervalo do
  mês + `$group` por `type`; séries diárias e categorias como hoje.
- **Parcelado (`parcelas > 1`)**: busca os docs do usuário (`Transaction.find({ user, parcelas: { $gt: 1 } })`)
  e, em JS via helper, para cada plano:
  - Se `parcelaDoMes(tx, anoAtual, mesAtual)` ≠ null → soma `amount` em `entradas`
    (income) ou `saidas` (expense) do mês atual.
  - Idem para o mês anterior (comparativo) e para a `serieDiaria` (soma no dia do
    vencimento daquela parcela).
  - `categorias`: parcelado `expense` com parcela no mês soma `amount` na sua categoria.
- `saldo = entradas - saidas` permanece. Resultado do dashboard mantém o mesmo
  formato de payload (resumo/comparativo/serieDiaria/categorias).

## Seção 4 — Contas a Pagar + pagar parcela

Frontend (`renderizarContasPagar`, hoje baseado em `todasTransacoes`):

- Lista (a) transações `pending` avulsas (comportamento atual) **mais**
  (b) a **próxima parcela em aberto** de cada parcelado **`expense`** com
  `parcelasPagas < parcelas`. Income parcelado **não** entra (é "a receber").
- Linha do parcelado: "Parcela {parcelasPagas+1}/{parcelas} • vence {data}",
  valor = `amount`; botões pagar/editar/excluir.
- Total de Contas a Pagar = soma das próximas parcelas em aberto (expense) +
  pendentes avulsos.
- **Pagar parcela**: `PUT /transactions/:id` enviando `parcelasPagas` incrementado
  (reusa `editarTransacao`, que já aceita campos parciais). Não cria transação
  avulsa nem muda `type`; apenas avança o contador. Após pagar, recarrega
  dashboard + listas.

## Seção 5 — Aba Parcelamentos

`renderizarPaginaParcelamentos` (nova; substitui o placeholder), render a partir
de `todasTransacoes` filtrando `parcelas > 1`:

- Um card por plano: descrição, badge de tipo (Saída/Entrada), valor da parcela,
  **progresso** `parcelasPagas/parcelas` (barra), **restante** `(parcelas-parcelasPagas) × amount`,
  **próximo vencimento** (ou "Concluído"), **valor total** `amount × parcelas`.
- Estado vazio quando não há planos.
- Excluir plano = `DELETE /transactions/:id` (endpoint existente).
- A navegação (`ativarSecao`) ganha `case 'parcelamentos': renderizarPaginaParcelamentos()`.

## Seção 6 — Formulário / UX

`frontend/index.html` + `frontend/js/app.js`:

- O grupo Parcelas passa a aparecer para `income` **e** `expense` (hoje só saída);
  escondido para `pending`. Ajustar `selecionarTipo`.
- Usuário digita **valor total** + número de parcelas N. O frontend calcula
  `valorParcela = total / N` e envia ao backend `amount = valorParcela` e
  `parcelas = N`. Feedback dinâmico no form: "12x de R$ 100,00".
- `montarPayloadTransacao` (api.js) passa a incluir `parcelas` (e `parcelasPagas`
  quando presente, p/ o fluxo de pagar parcela).
- `normalizarTransacaoApi` passa a expor `parcelas` e `parcelasPagas` no objeto de
  UI, para que listas/aba/contas derivem o cronograma no cliente.
- Validação frontend: N inteiro ≥ 1; total > 0. Backend valida `parcelas ≥ 1` e
  `parcelasPagas` em [0, parcelas].
- Edição de um plano: ao abrir no modal, o campo Valor mostra o **total**
  (`amount × parcelas`); ao salvar, recalcula `valorParcela`.

## Tratamento de erros

- Reusa o padrão atual: toast de erro + estado vazio; respostas backend
  `{ success, message, error }` com os códigos HTTP já usados.
- `parcelasPagas` inválido (fora de [0, parcelas]) → 400 do controller/validação do model.

## Componentes e fronteiras

- `backend/src/utils/parcelas.js` — derivação pura (sem Express/Mongoose).
- `backend/src/controllers/transactionController.js` — usa o helper em
  `resumirDashboard`; `editarTransacao`/`criarTransacao` aceitam os novos campos.
- `backend/src/models/Transaction.js` — campos + validação.
- `frontend/js/parcelas.js` — derivação pura no cliente.
- `frontend/js/app.js` — render de Contas a Pagar, aba Parcelamentos, form.
- `frontend/js/api.js` — payload/normalização.

## Verificação

Sem framework de testes; verificação por smoke test de API ao vivo + checagem visual:
1. Criar despesa parcelada (total 1200, 12x) → doc com `amount=100`, `parcelas=12`, `parcelasPagas=0`.
2. Dashboard do mês da 1ª parcela → `saidas` inclui 100; meses seguintes idem (parcela do mês).
3. Contas a Pagar → linha "Parcela 1/12 • vence ..."; pagar → `parcelasPagas=1`, linha vira "2/12".
4. Aba Parcelamentos → card com progresso 1/12, restante 1100, total 1200, próximo vencimento.
5. Criar entrada parcelada → aparece na aba Parcelamentos (badge Entrada), **não** em Contas a Pagar; dashboard soma em `entradas` no mês da parcela.
6. Transação normal (parcelas=1) → comportamento inalterado.
7. Concluir plano (`parcelasPagas==parcelas`) → sai de Contas a Pagar; aba mostra "Concluído".
