# Aba Categorias estilo Nubank — Design

Data: 2026-06-10
Status: aprovado

## Objetivo

Redesenhar a aba **Categorias** para o layout dos prints (estilo Nubank): header com
total gasto + donut + navegação de mês, e lista de grupos em acordeão com subcategorias,
badges de contagem, barras de progresso e cores por grupo.

Diferença em relação ao estado atual: a aba hoje renderiza linhas simples
(`investimento-row`) a partir de categorias planas e sem filtro de mês. O modelo de
dados atual não tem hierarquia grupo→subcategoria.

## Decisões (fechadas no brainstorming)

1. **Hierarquia**: novo modelo com grupos-pai + subcategorias.
2. **Taxonomia**: definida aqui (estilo Nubank), revisada e aprovada pelo usuário.
3. **Migração**: reseed limpo. Dados são de teste — categorias antigas removidas;
   transações com slug órfão caem em "Outros" na agregação do front.
4. **Filtro de mês**: header com navegação `‹ Mês Ano ›`; donut, total e lista filtram
   pelo mês selecionado.
5. **Modelo de dados**: campo `group` na `Category` + config de estilo (cor/ícone do
   grupo) numa constante no front. DB define a quem cada sub pertence; front define estilo.

## Taxonomia

Cada subcategoria é um documento `Category` com `slug`, `name`, `type`
(`income`/`expense`), `icon`, `group` (slug do grupo-pai).

### Grupos de despesa (`type: expense`)

| group slug | nome | ícone | cor | subcategorias (slug · nome · ícone) |
|---|---|---|---|---|
| `alimentacao` | Alimentação | 🍽️ | roxo `#a78bfa` | `supermercado` Supermercado 🛒 · `restaurantes` Restaurantes 🍴 · `delivery` Delivery 🛵 · `padaria` Padaria 🥖 · `cafeteria` Cafeteria ☕ |
| `transporte` | Transporte | 🚗 | azul `#60a5fa` | `combustivel` Combustível ⛽ · `app_transporte` App de transporte 🚕 · `transporte_publico` Transporte público 🚌 · `estacionamento` Estacionamento 🅿️ · `manutencao_veiculo` Manutenção 🔧 |
| `moradia` | Moradia | 🏠 | laranja `#fb923c` | `aluguel` Aluguel 🏠 · `condominio` Condomínio 🏢 · `energia` Energia 💡 · `agua` Água 🚰 · `internet_tv` Internet/TV 📶 · `gas` Gás 🔥 |
| `saude` | Saúde e bem-estar | 💊 | vermelho `#fb7185` | `farmacia` Farmácia 💊 · `consultas_exames` Consultas e exames 🩺 · `plano_saude` Plano de saúde 🏥 · `academia_lazer` Academia e centros de lazer 🏋️ |
| `compras` | Compras | 🛍️ | rosa `#f472b6` | `compras` Compras 🛍️ · `eletronicos` Eletrônicos 📱 · `vestuario` Vestuário 👕 · `livraria` Livraria 📚 · `casa_decoracao` Casa e decoração 🛋️ |
| `lazer` | Lazer | 🎮 | amarelo `#fbbf24` | `streaming` Streaming 📺 · `cinema_teatro` Cinema e teatro 🎬 · `viagens` Viagens ✈️ · `jogos` Jogos 🎮 · `bares_baladas` Bares e baladas 🍻 |
| `educacao` | Educação | 📚 | verde-água `#2dd4bf` | `cursos` Cursos 🎓 · `mensalidade_escolar` Mensalidade 🏫 · `material_escolar` Material escolar ✏️ |
| `financas` | Finanças | 💰 | verde `#34d399` | `transferencias` Transferências 💸 · `emprestimos_financiamento` Empréstimos e financiamento 🏦 · `tarifas_bancarias` Tarifas bancárias 🧾 · `impostos` Impostos 🧮 |
| `servicos` | Serviços | 🧰 | cinza `#94a3b8` | `servicos` Serviços 🧰 · `assinaturas` Assinaturas 🔁 · `profissionais` Profissionais 👔 |
| `outros` | Outros | 📦 | marrom `#b8a08a` | `outros` Outros 📦 |

### Grupos de renda (`type: income`)

| group slug | nome | ícone | cor | subcategorias |
|---|---|---|---|---|
| `renda` | Renda | 💵 | esmeralda `#10b981` | `salario` Salário 💰 · `renda_extra` Renda extra 💵 · `renda_nao_recorrente` Renda não-recorrente 🎁 · `rendimentos` Rendimentos 📈 |

Total: 11 grupos, 45 subcategorias.

## Arquitetura

### Backend

**`backend/src/models/Category.js`**
- Adicionar campo `group` (`String`, `trim`, slug do grupo-pai). Sem `required` para
  não quebrar docs legados durante reseed; o seed sempre preenche.

**`backend/src/seed.js`**
- Substituir `defaultCategories` pela lista de 45 subcategorias acima, cada uma com
  `{ slug, name, type, icon, group }`.
- Lógica de upsert por slug e purga de não-canônicos já existe — reaproveitada. Após o
  reseed, só as 45 subcategorias permanecem.

**Controller / rotas**: sem mudança. `CategoriasAPI.listar()` retorna o documento
mongoose inteiro, então `group` chega ao front automaticamente.

### Frontend

**`frontend/js/app.js`**

Constante de estilo (única fonte de cor/ícone/ordem do grupo no front):
```js
const GRUPOS = {
  alimentacao: { label: 'Alimentação',      icon: '🍽️', cor: '#a78bfa', ordem: 1 },
  transporte:  { label: 'Transporte',        icon: '🚗', cor: '#60a5fa', ordem: 2 },
  moradia:     { label: 'Moradia',           icon: '🏠', cor: '#fb923c', ordem: 3 },
  saude:       { label: 'Saúde e bem-estar',  icon: '💊', cor: '#fb7185', ordem: 4 },
  compras:     { label: 'Compras',            icon: '🛍️', cor: '#f472b6', ordem: 5 },
  lazer:       { label: 'Lazer',              icon: '🎮', cor: '#fbbf24', ordem: 6 },
  educacao:    { label: 'Educação',           icon: '📚', cor: '#2dd4bf', ordem: 7 },
  financas:    { label: 'Finanças',           icon: '💰', cor: '#34d399', ordem: 8 },
  servicos:    { label: 'Serviços',           icon: '🧰', cor: '#94a3b8', ordem: 9 },
  outros:      { label: 'Outros',             icon: '📦', cor: '#b8a08a', ordem: 10 },
  renda:       { label: 'Renda',              icon: '💵', cor: '#10b981', ordem: 11 },
};
```

Mapa subcategoria→grupo derivado de `CATEGORIAS` (carregado da API): em `loadCategorias`,
construir `MAPA_GRUPO_CATEGORIA[c.slug] = c.group`. Subcategoria órfã (slug sem
correspondência) cai no grupo `outros`.

Estado de mês: `let mesCategorias = new Date();` (1º dia do mês corrente).

`renderizarPaginaCategorias()` reescrito:
1. Filtra `todasTransacoes` para o mês de `mesCategorias` (mesmo ano+mês de `t.data`).
2. **Total gasto**: soma das saídas (`tipo === 'saida'`) do mês → header.
3. **Donut-mini**: agrega saídas por grupo, cores de `GRUPOS`, render em canvas pequeno
   via `criarDonut` existente.
4. **Navegador de mês**: `‹ {Mês Ano} ›`; botões chamam `mudarMesCategorias(-1|+1)` que
   ajusta `mesCategorias` e re-renderiza.
5. **Lista (acordeão)**: agrega transações do mês por grupo (despesa + renda com
   atividade). Para cada grupo, soma valor e lista subcategorias com atividade.
   - Grupos ordenados por valor desc.
   - Barra do grupo: largura relativa ao maior valor de grupo do mês.
   - Linha do grupo: chevron, ícone quadrado na cor do grupo, badge com nº de
     subcategorias ativas, nome, valor, barra.
   - Subcategorias indentadas: ícone, nome, valor, barra fina (cor do grupo).
   - Estado expandido por padrão (igual prints). Toggle por grupo via
     `toggleGrupoCategoria(slug)` — guarda estado em `Set` de grupos colapsados.
   - Estado vazio: `criarEstadoVazio('Sem transações neste mês.')` quando não há dados.

Funções novas: `mudarMesCategorias(delta)`, `toggleGrupoCategoria(slug)`,
`agregarPorGrupo(transacoes)` → `[{ group, total, subs: [{categoria,total}] }]`.
`agregarPorCategoria` existente é reaproveitado dentro da agregação por grupo.

**`frontend/index.html`** — section `#categorias`:
- Remove `#barra-categorias-pagina`, `.grid-graficos`, `#lista-categorias`.
- Adiciona dois mounts: `#categorias-header` (header card) e `#categorias-lista`
  (acordeão). Markup interno gerado no JS. Canvas do donut-mini criado no markup do
  header.

**CSS** (`frontend/css/pages.css` + `components.css`)
Novas classes:
- `.cat-header`, `.cat-header__total`, `.cat-donut-mini`, `.cat-mes-nav`,
  `.cat-mes-nav__btn`
- `.cat-grupo`, `.cat-grupo__chevron`, `.cat-grupo__icone` (quadrado colorido),
  `.cat-grupo__badge` (contagem), `.cat-grupo__nome`, `.cat-grupo__valor`
- `.cat-sub`, `.cat-sub__icone`, `.cat-sub__nome`, `.cat-sub__valor`
- barras: reusar `.barra-progresso` / `.barra-progresso__preench` onde couber; variante
  fina para subcategoria.
Cor da barra/ícone vem inline (`style="background:..."`) a partir de `GRUPOS[slug].cor`.

## Fluxo de dados

`todasTransacoes` (já normalizado: `tipo` saida/entrada/pendente, `valor`, `data`,
`categoria` = slug da subcategoria) → filtro por mês → `agregarPorGrupo` usa
`MAPA_GRUPO_CATEGORIA` p/ mapear sub→grupo e `MAPA_LABEL/EMOJI_CATEGORIA` p/ rótulo/ícone
da sub → render header (total+donut) e lista (acordeão). `GRUPOS` fornece label/cor/ícone
do grupo.

## Erros / edge cases

- Subcategoria órfã (transação com slug fora da taxonomia): mapeada ao grupo `outros`.
- Mês sem transações: estado vazio na lista; total `R$ 0,00`; donut vazio.
- Grupo só com renda: aparece na lista, mas não entra no total gasto nem no donut.

## Verificação

- Backend: `npm run seed` (ou script equivalente) roda sem erro e deixa 45 categorias.
- Frontend é vanilla, sem suíte de testes. Verificação manual: rodar app, abrir aba
  Categorias, conferir contra os prints (header, navegação de mês, acordeão, cores,
  badges, barras) e navegar entre meses.

## Fora de escopo (YAGNI)

- CRUD de categorias/grupos pela UI.
- Persistir estado de colapso entre sessões.
- Subcategorias customizadas pelo usuário.
- Editar a taxonomia em runtime.
