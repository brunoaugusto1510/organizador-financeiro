# Organizador Financeiro Pessoal

Sistema web simples de organização financeira pessoal (projeto acadêmico).

## Backend

### Configuração

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend` (use `.env.example` como base):

```
PORT=3000
MONGO_URI=<sua string de conexao do MongoDB>
```

### Executar

```bash
npm run dev    # desenvolvimento (nodemon)
npm start      # produção
```

## Seed de categorias padrão

Popula o banco com as categorias iniciais de receitas e despesas.

```bash
cd backend
npm run seed
```

Categorias inseridas:

- **Receitas:** Salário, Freelance, Outros
- **Despesas:** Alimentação, Transporte, Moradia, Lazer, Outros

O seed é idempotente: rodar mais de uma vez não duplica categorias já existentes.
