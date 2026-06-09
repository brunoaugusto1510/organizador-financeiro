# Design — Remover hardcoded e migrar para MongoDB

Data: 2026-06-09
Branch: `feat/remove-hardcoded-mongodb`

## Objetivo

Eliminar todo dado hardcoded do frontend e fazer o sistema operar 100% sobre o
MongoDB. Sem dados fabricados, sem fallback "demo", sem mock. API indisponível =
estado de erro/vazio real, nunca dado falso.

## Estado atual

Já no Mongo:
- Transações: CRUD + `GET /api/transactions/dashboard/summary` (controller `transactionController.js`).
- Autenticação: register/login/me (`authController.js`), JWT via middleware `protect`.

Hardcoded a remover:
1. `frontend/js/app.js` — objeto `DEMO` (resumo + 7 transações fake) usado como
   fallback em todos os `catch`. Constantes `LABELS_CATEGORIA`, `EMOJI_CATEGORIA`,
   `ROTULOS_CATEGORIA`. Comparativo mês-anterior fabricado (`gasto * 1.18`) e
   série diária fabricada (`construirSerieGastos`).
2. `frontend/js/mock-data.js` + `InvestimentosAPI` (stub) — investimentos sem
   nenhum backend (sem model, sem rota).
3. `frontend/index.html` — `<option>`s de categoria hardcoded no `<select>`.
4. `Category` model + `seed.js` existem, mas **sem endpoint** de leitura.

Bug latente: `summary` soma transações de todos os tempos, mas o KPI "Gasto em
<mês>" trata o valor como gasto do mês corrente.

## Abordagem escolhida (A)

Endpoint de dashboard consolidado + recursos dedicados (categorias, investimentos).
Agregação fica no Mongo; frontend vira renderização pura. Centraliza lógica de
negócio no backend, que é o ponto do pedido.

---

## Seção 1 — Backend: Dashboard agregado

Novo `GET /api/transactions/dashboard` (substitui `/dashboard/summary`), tudo
escopado no **mês corrente** do usuário, via `aggregate` com `$match` por `user`
e intervalo de datas.

Resposta:

```json
{
  "resumo":      { "saldo": 0, "entradas": 0, "saidas": 0, "pendentes": 0 },
  "comparativo": { "gastoAtual": 0, "gastoAnterior": 0, "difPct": 0 },
  "serieDiaria": { "atual": [/* acumulado por dia, mês atual */],
                   "anterior": [/* acumulado por dia, mês anterior */] },
  "categorias":  [ { "categoria": "moradia", "total": 0 } ]
}
```

Detalhes:
- `resumo`: soma de `income`/`expense`/`pending` **do mês corrente**; `saldo = entradas - saidas`.
- `comparativo`: total de `expense` do mês atual vs mês anterior; `difPct = ((atual - anterior) / anterior) * 100` (0 quando anterior = 0).
- `serieDiaria.atual`: gasto (`expense`+`pending`) acumulado por dia do mês atual, só até o dia de hoje (dias futuros omitidos/`null`).
- `serieDiaria.anterior`: gasto acumulado por dia do mês anterior, mês cheio.
- `categorias`: soma de `expense` por categoria no mês atual, ordenada desc.

Remove do frontend: `DEMO.resumo`, `gasto * 1.18`, `construirSerieGastos`.

A rota antiga `/dashboard/summary` é removida (nenhum outro consumidor).

## Seção 2 — Backend: Categorias

`Category` model ganha campos:
- `slug` (String, obrigatório) — valor estável salvo em `Transaction.category`.
- `icon` (String) — emoji para a UI.
Mantém `name`, `type` (`income`|`expense`), timestamps.

`categoryController.listarCategorias` → `GET /api/categories` (protegido por
`protect`), retorna todas as categorias ordenadas por `name`.

`categoryRoutes.js` montado em `/api/categories` no `app.js`.

`seed.js` expandido para o conjunto completo, casando os slugs já usados pelo
frontend. Upsert por `slug` (idempotente):

| slug         | name        | type    | icon |
|--------------|-------------|---------|------|
| salario      | Salário     | income  | 💰   |
| renda_extra  | Renda Extra | income  | 💵   |
| investimento | Investimento| income  | 📈   |
| moradia      | Moradia     | expense | 🏠   |
| alimentacao  | Alimentação | expense | 🍽️   |
| transporte   | Transporte  | expense | 🚗   |
| saude        | Saúde       | expense | 🏥   |
| educacao     | Educação    | expense | 📚   |
| lazer        | Lazer       | expense | 🎮   |
| vestuario    | Vestuário   | expense | 👕   |
| utilidades   | Utilidades  | expense | 💡   |
| outros       | Outros      | expense | 📦   |

Transação continua guardando o `slug` em `category` → **zero migração de dados**.

## Seção 3 — Backend: Investimentos (feature nova completa)

`Investment` model:
- `user` (ObjectId ref User, obrigatório)
- `classe` (String, obrigatório, trim)
- `valorAplicado` (Number, obrigatório, > 0)
- `valorAtual` (Number, obrigatório, >= 0)
- timestamps

`investmentController` — CRUD user-scoped (mesmo padrão de `transactionController`):
- `criar` → `POST /api/investments`
- `listar` → `GET /api/investments` — mapeia cada doc para
  `{ id, classe, valor: valorAtual, valorAplicado, variacaoPct }`, onde
  `variacaoPct = valorAplicado > 0 ? ((valorAtual - valorAplicado) / valorAplicado) * 100 : 0`.
- `editar` → `PUT /api/investments/:id`
- `excluir` → `DELETE /api/investments/:id`

`investmentRoutes.js` protegido em `/api/investments`.

Variação **real**, derivada de aplicado vs atual — sem API de mercado externa.

## Seção 4 — Frontend: limpeza e wiring

`frontend/js/api.js`:
- `TransacoesAPI.resumo` → chama `/transactions/dashboard` (renomeia para `dashboard`).
- Adiciona `CategoriasAPI.listar` → `GET /api/categories`.
- Substitui `InvestimentosAPI` stub por fetch real: `listar`, `criar`, `excluir`.

`frontend/js/app.js`:
- Remove objeto `DEMO` e **todos** os branches de fallback nos `catch`
  (`carregarResumo`, `salvarTransacao`, `excluirTransacao`, `pagarConta`).
  Em erro: `mostrarToast(..., 'erro')` + estado vazio. Sem dado fake.
- `carregarDashboard` consome o novo payload e renderiza `resumo`, `comparativo`,
  `serieDiaria`, `categorias` diretamente (render puro).
- Remove `ROTULOS_CATEGORIA`, `EMOJI_CATEGORIA`, `LABELS_CATEGORIA`,
  `construirSerieGastos`. Mapas de label/emoji passam a ser construídos em runtime
  a partir de `CategoriasAPI.listar()`.
- `loadCategorias()` no `DOMContentLoaded`: busca categorias, popula o `<select>`
  e monta os mapas `labelCategoria`/emoji do DB.
- Investimentos: `renderizarPaginaInvestimentos` consome fetch real; adiciona
  form mínimo "Nova aplicação" (classe, valorAplicado, valorAtual) com criar/excluir;
  estado vazio quando não há aplicações.

`frontend/index.html`:
- Remove `<script src="js/mock-data.js">`.
- `<select id="transacao-categoria">` fica só com `<option value="">Selecione...</option>`
  (opções populadas via JS).
- Adiciona markup do form de nova aplicação na aba investimentos.

Deletar arquivo `frontend/js/mock-data.js`.

Nota: a página Categorias (`renderizarPaginaCategorias`) continua agregando
`todasTransacoes` no cliente — isso opera sobre **dados reais** carregados da API,
não é hardcoded, então permanece.

## Tratamento de erros

- Falha de rede/API: `mostrarToast(mensagem, 'erro')` + estado vazio na seção.
- Sem dados (lista vazia legítima): estado vazio amigável (já existe `criarEstadoVazio`).
- Backend mantém o padrão atual de respostas `{ success, message, error }` e os
  códigos HTTP já usados nos controllers.

## Ordem de implementação (dependências)

1. Categorias: model + seed + controller + rota.
2. Investimentos: model + controller + rota.
3. Dashboard endpoint agregado.
4. `api.js`: novos serviços.
5. `app.js`: remover DEMO/fallbacks + wiring do dashboard/categorias/investimentos.
6. `index.html`: remover mock-data, select dinâmico, form de investimentos.
7. Verificação manual.

## Verificação

Sem framework de testes no repo. Verificação manual com server + MongoDB:
1. `npm run seed` popula categorias (12 itens com slug/icon).
2. Login/register cria usuário real.
3. `<select>` de categoria preenchido a partir do DB.
4. Criar transações de cada tipo → dashboard mostra resumo do mês, comparativo e
   série diária reais; nenhum número fabricado.
5. Criar/excluir investimento → total e variação corretos; estado vazio sem aplicações.
6. Derrubar o backend → UI mostra toast de erro e estados vazios, **nunca** dado demo.
7. Confirmar ausência de referências a `DEMO`, `MOCK`, `mock-data.js` no frontend.
