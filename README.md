# Organizador Financeiro Pessoal

Sistema web simples de organizacao financeira pessoal (projeto academico).

## Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, dotenv e cors.
- Frontend: HTML, CSS responsivo e JavaScript puro.

## Configuracao

Instale as dependencias pela raiz do repositorio. Este tambem e o ponto usado no deploy da Vercel.

```bash
npm install
```

Crie as variaveis de ambiente localmente. O projeto carrega `.env` da raiz e tambem `backend/.env`.

```env
PORT=3000
MONGO_URI=<sua string de conexao do MongoDB>
JWT_SECRET=<segredo forte para assinar tokens JWT>
```

Na Vercel, configure pelo menos:

- `MONGO_URI`
- `JWT_SECRET`

## Executar localmente

```bash
npm run dev    # desenvolvimento com nodemon
npm start      # execucao normal
```

A aplicacao fica disponivel em:

- `http://localhost:3000/`
- `http://localhost:3000/login`

## Rotas principais

Autenticacao:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Transacoes protegidas por JWT:

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/dashboard/summary`

## Seed de categorias padrao

Popula o banco com as categorias iniciais de receitas e despesas.

```bash
npm run seed
```

O seed e idempotente: rodar mais de uma vez nao duplica categorias ja existentes.

## Deploy na Vercel

O deploy deve usar a raiz do repositorio como root directory. O `vercel.json` aponta a funcao Node para `backend/src/server.js` e inclui os arquivos do frontend no bundle.

Requisitos:

- Dependencias instaladas pelo `package.json` da raiz.
- Node.js `>=20.19.0`.
- Variaveis `MONGO_URI` e `JWT_SECRET` configuradas no ambiente da Vercel.
