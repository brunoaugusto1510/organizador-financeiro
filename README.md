# 💰 Organizador Financeiro Pessoal (FinançasFácil)

Sistema web de organização financeira pessoal: cadastro de receitas e despesas, categorização e dashboard com resumo dos gastos. Projeto acadêmico, desenvolvido em equipe.

## 🛠️ Stack

- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, dotenv e cors.
- **Frontend:** HTML, CSS responsivo e JavaScript puro (com Chart.js para os gráficos).
- **Deploy:** Vercel.

## ⚙️ Configuração

Instale as dependências pela raiz do repositório. Este também é o ponto usado no deploy da Vercel.

```bash
npm install
```

Crie as variáveis de ambiente localmente. O projeto carrega `.env` da raiz e também `backend/.env`.

```env
PORT=3000
MONGO_URI=<sua string de conexão do MongoDB>
JWT_SECRET=<segredo forte para assinar tokens JWT>
```

Na Vercel, configure pelo menos:

- `MONGO_URI`
- `JWT_SECRET`

## ▶️ Executar localmente

```bash
npm run dev    # desenvolvimento com nodemon
npm start      # execução normal
```

A aplicação fica disponível em:

- `http://localhost:3000/`
- `http://localhost:3000/login`

## 🔌 Rotas principais

Autenticação:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Transações protegidas por JWT:

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/dashboard/summary`

## 🌱 Seed de categorias padrão

Popula o banco com as categorias iniciais de receitas e despesas.

```bash
npm run seed
```

O seed é idempotente: rodar mais de uma vez não duplica categorias já existentes.

## 🚀 Deploy na Vercel

O deploy deve usar a raiz do repositório como root directory. O `vercel.json` aponta a função Node para `backend/src/server.js` e inclui os arquivos do frontend no bundle.

Requisitos:

- Dependências instaladas pelo `package.json` da raiz.
- Node.js `>=20.19.0`.
- Variáveis `MONGO_URI` e `JWT_SECRET` configuradas no ambiente da Vercel.
