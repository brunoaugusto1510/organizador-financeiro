# Guia do Banco de Dados (MongoDB + Mongoose)

Guia técnico de como o banco está montado e **como usar nos controllers**. Leitura obrigatória pra quem vai mexer em auth ou transações.

---

## 1. Visão geral

- **Banco:** MongoDB (NoSQL, orientado a documentos).
- **Hospedagem:** MongoDB Atlas (nuvem). Cluster compartilhado pelo time.
- **Driver/ODM:** [Mongoose](https://mongoosejs.com/) — mapeia documentos do Mongo para objetos JS, valida schema e dá métodos de CRUD prontos.
- **Padrão de código:** ES Modules (`import`/`export`), funções `async/await`.

Fluxo em uma frase: `server.js` conecta no Atlas → models definem/validam os documentos → controllers usam os models pra CRUD → respostas em JSON.

```
server.js ──> connectDatabase() ──> mongoose.connect(MONGO_URI)
                                          │
        models/*.js  (schemas)  <─────────┘
                │
        controllers/*.js  (usa os models: create/find/update/delete)
                │
              rotas  ──>  JSON
```

---

## 2. Configuração do ambiente (cada dev faz 1x)

### 2.1 Instalar dependências

```bash
cd backend
npm install
```

Já vêm no `package.json`: `mongoose`, `bcryptjs`, `express`, `cors`, `dotenv`.

### 2.2 Criar o `.env`

Crie `backend/.env` (use `backend/.env.example` como base). **Nunca commitar** — já está no `.gitignore`.

```env
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster0.kbqpnt0.mongodb.net/organizador-financeiro?appName=Cluster0
```

> A string de conexão (com usuário/senha) é passada por **canal seguro** entre o time — nunca por git, chat público ou print. Se a senha vazar, ela é rotacionada no Atlas.

Detalhes da URI:
- `mongodb+srv://` → formato Atlas (resolve os nós do cluster via DNS).
- `<usuario>:<senha>` → credenciais do Database User. Caracteres especiais (`@ : / ? # &`) precisam de URL-encoding.
- `/organizador-financeiro` → **nome do banco**. Se omitir, grava no banco `test`.
- `?appName=Cluster0` → metadado, aparece nas métricas do Atlas.

### 2.3 Liberar seu IP no Atlas

Atlas → **Network Access** → adicionar seu IP. Sem isso a conexão dá timeout (`ECONNREFUSED` / `serverSelectionTimeout`).

---

## 3. A conexão — `src/config/database.js`

```js
import mongoose from 'mongoose';

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Erro: variável de ambiente MONGO_URI não definida.');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erro ao conectar no MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDatabase;
```

Pontos técnicos:
- `mongoose.connect()` abre **um pool de conexões** reaproveitado em toda a app — não se conecta por request.
- É chamado **uma vez** no boot (`server.js`), antes do `app.listen`. Sem banco, o servidor não sobe:

```js
// server.js
connectDatabase().then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});
```

- Falha de conexão → loga e `process.exit(1)` (derruba o processo, em vez de servir API quebrada).
- **Não chame `mongoose.connect` de novo** em controller/model. A conexão é global; basta importar o model.

---

## 4. Models (schemas)

Ficam em `src/models`. Cada model = uma **collection**. Mongoose pluraliza o nome:

| Model | Arquivo | Collection no Mongo |
|-------|---------|---------------------|
| `User` | `models/User.js` | `users` |
| `Transaction` | `models/Transaction.js` | `transactions` |
| `Category` | `models/Category.js` | `categories` |

### 4.1 User — `models/User.js`

```js
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
}, { timestamps: true });
```

Lógica embutida no schema (importante — você **não** repete isso no controller):

- **Hash de senha** (hook `pre('save')`): a senha é criptografada com bcrypt antes de gravar, só quando muda.
  ```js
  userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  });
  ```
- **Comparar senha no login:**
  ```js
  userSchema.methods.matchPassword = async function (senhaPura) {
    return bcrypt.compare(senhaPura, this.password);
  };
  ```
- **Nunca retornar senha:** `toJSON()` remove `password` automaticamente quando o documento vira JSON na resposta.
  ```js
  userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
  };
  ```

> Consequência prática: `res.json(user)` já sai **sem** senha. Não precisa filtrar na mão.

### 4.2 Transaction — `models/Transaction.js`

```js
const transactionSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  type:        { type: String, required: true, enum: ['income', 'expense'] },
  amount:      { type: Number, required: true, validate: v => v > 0 },
  category:    { type: String, trim: true },
  date:        { type: Date, default: Date.now },
  description: { type: String, trim: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
```

- `type` só aceita `income` ou `expense` (enum).
- `amount` precisa ser **> 0** (validador).
- `category` é **string simples** (decisão do MVP), não referência ao model Category.
- `user` é `ObjectId` referenciando `User`, **obrigatório** → toda transação pertence a um dono. Permite `.populate('user')`.

### 4.3 Category — `models/Category.js`

```js
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
}, { timestamps: true });
```

`timestamps: true` em todos → adiciona `createdAt` e `updatedAt` automáticos.

---

## 5. Como usar os models nos controllers

Importe o model e use os métodos do Mongoose. Tudo é `async` → use `await` + `try/catch`.

### 5.1 CRUD básico

```js
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// CREATE — dispara validações + hook de hash
const user = await User.create({ name, email, password });

// READ — vários
const transacoes = await Transaction.find({ user: req.user._id });

// READ — um por id
const t = await Transaction.findById(id);

// UPDATE
const atualizado = await Transaction.findByIdAndUpdate(id, { amount: 200 }, { new: true });
// new: true → retorna o documento DEPOIS do update

// DELETE
await Transaction.findByIdAndDelete(id);
```

### 5.2 Exemplo: registro (`POST /api/auth/register`)

```js
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existe = await User.findOne({ email });
    if (existe) return res.status(409).json({ message: 'Email já cadastrado.' });

    const user = await User.create({ name, email, password }); // senha hasheada pelo hook
    const token = generateToken(user._id);

    return res.status(201).json({ user, token }); // user já sai SEM senha (toJSON)
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
```

### 5.3 Exemplo: login (`POST /api/auth/login`)

```js
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = generateToken(user._id);
  return res.json({ user, token });
};
```

### 5.4 Exemplo: transações do usuário logado (regra do projeto)

> **Regra fixa do AGENTS.md:** rotas de transação são protegidas por JWT e **sempre** filtradas/vinculadas ao usuário logado. O middleware de auth injeta `req.user`.

```js
// LISTAR só as do dono
export const listTransactions = async (req, res) => {
  const transacoes = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
  return res.json(transacoes);
};

// CRIAR vinculando ao dono
export const createTransaction = async (req, res) => {
  const transacao = await Transaction.create({ ...req.body, user: req.user._id });
  return res.status(201).json(transacao);
};

// UPDATE/DELETE: garantir que pertence ao dono antes de mexer
export const deleteTransaction = async (req, res) => {
  const t = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!t) return res.status(404).json({ message: 'Transação não encontrada.' });
  await t.deleteOne();
  return res.json({ message: 'Removida.' });
};
```

> ⚠️ **Nunca** faça `findById(id)` sozinho em transação e devolva — sem o filtro `user`, um usuário acessa transação de outro. Sempre combine `{ _id, user: req.user._id }`.

### 5.5 Agregação — resumo do dashboard (`GET /api/transactions/dashboard/summary`)

Soma receitas e despesas no próprio banco (mais rápido que somar no JS):

```js
export const summary = async (req, res) => {
  const result = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const income  = result.find(r => r._id === 'income')?.total  || 0;
  const expense = result.find(r => r._id === 'expense')?.total || 0;
  return res.json({ income, expense, balance: income - expense });
};
```

---

## 6. Validação e erros

Mongoose valida no `create`/`save`. Erros comuns e como tratar:

| Situação | O que acontece | HTTP sugerido |
|----------|----------------|---------------|
| Campo `required` faltando | `error.errors.<campo>` | 400 |
| `type` fora do enum | erro de validação | 400 |
| `amount <= 0` | erro do validador | 400 |
| email duplicado (`unique`) | `error.code === 11000` | 409 |
| id mal formado | `CastError` | 400 |

```js
try {
  await Transaction.create(req.body);
} catch (error) {
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.code === 11000)             return res.status(409).json({ message: 'Registro duplicado.' });
  return res.status(500).json({ message: 'Erro interno.' });
}
```

> `unique: true` no email **não é validador** — é índice. A garantia vem do índice único do Mongo (`E11000 duplicate key`). Trate o código `11000`.

---

## 7. Seed de categorias — `src/seed.js`

Popula o banco com as categorias padrão. Idempotente (rodar de novo não duplica, usa `upsert`).

```bash
cd backend
npm run seed
```

Insere — Receitas: Salário, Freelance, Outros · Despesas: Alimentação, Transporte, Moradia, Lazer, Outros.

---

## 8. Inspecionar os dados

- **Atlas (web):** Cluster0 → **Browse Collections** → banco `organizador-financeiro`.
- **MongoDB Compass (GUI):** cole a `MONGO_URI`, conecta.
- **mongosh (CLI):**
  ```bash
  mongosh "<MONGO_URI>"
  use organizador-financeiro
  db.users.find()
  db.transactions.find({ type: 'expense' })
  db.categories.countDocuments()
  ```

---

## 9. Regras do projeto (não quebrar)

- Senha **nunca** retornada pela API (o `toJSON` do User já cuida — não burle).
- Toda rota de transação: protegida por JWT + filtrada por `req.user._id`.
- `category` na transação é string, não ref.
- Banco real é compartilhado — cuidado com `deleteMany`/`updateMany` sem filtro.
- `.env` nunca vai pro git.

---

## 10. Troubleshooting

| Erro | Causa provável | Fix |
|------|----------------|-----|
| `MONGO_URI não definida` | `.env` ausente/sem a var | criar `backend/.env` |
| `serverSelectionTimeoutError` | IP não liberado / sem internet | liberar IP no Atlas Network Access |
| `Authentication failed` | usuário/senha errados na URI | conferir credenciais (senha rotacionada?) |
| `E11000 duplicate key` | email já existe | tratar como 409 |
| grava no banco `test` | faltou nome do banco na URI | adicionar `/organizador-financeiro` antes do `?` |
| `Cannot overwrite model once compiled` | model importado/registrado 2x | importar sempre do mesmo `models/*.js`, não recriar |

---

**Dúvidas de banco:** falar com o responsável pela camada DB.
