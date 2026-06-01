# AGENTS.md

## Papel do agente

Você está trabalhando em um projeto acadêmico chamado Organizador Financeiro Pessoal.

Atue como um engenheiro de software fullstack, priorizando simplicidade, clareza e funcionamento do MVP.

## Objetivo do projeto

Criar um sistema web simples de organização financeira pessoal.

O sistema deve permitir:

- Cadastro de usuário
- Login com JWT
- CRUD de transações financeiras
- Dashboard com resumo financeiro

## Stack obrigatória

Backend:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- dotenv
- cors

Frontend:

- HTML semântico
- CSS responsivo mobile first
- JavaScript puro
- DOM
- fetch

Não usar:

- React
- Vue
- Angular
- TypeScript
- ORM diferente do Mongoose
- Bibliotecas pesadas sem necessidade

## Estrutura esperada

O projeto deve seguir esta estrutura:

organizador-financeiro/
├── backend/
├── frontend/
├── docs/
├── README.md
└── .gitignore

Backend:

backend/src/config
backend/src/controllers
backend/src/middlewares
backend/src/models
backend/src/routes
backend/src/utils
backend/src/app.js
backend/src/server.js

Frontend:

frontend/index.html
frontend/pages/dashboard.html
frontend/pages/transactions.html
frontend/assets/css/style.css
frontend/assets/js/api.js
frontend/assets/js/auth.js
frontend/assets/js/dashboard.js
frontend/assets/js/transactions.js
frontend/assets/js/utils.js

## Regras importantes

- Priorize código simples e funcional.
- Não crie funcionalidades fora do escopo.
- Não implemente Open Finance neste MVP.
- Não implemente múltiplas contas bancárias.
- Não implemente metas financeiras.
- Não reestruture o projeto sem necessidade.
- Não remova arquivos existentes sem motivo claro.
- Sempre preserve a estrutura enxuta.
- Sempre proteger rotas de transações com JWT.
- Sempre vincular transações ao usuário logado.
- Nunca retornar senha do usuário nas respostas da API.

## Rotas principais

Autenticação:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Transações:

GET /api/transactions
POST /api/transactions
PUT /api/transactions/:id
DELETE /api/transactions/:id
GET /api/transactions/dashboard/summary

## Convenções de código

- Usar ES Modules.
- Usar nomes de arquivos em camelCase no backend.
- Usar nomes claros para controllers, routes e models.
- Controllers devem conter a lógica das requisições.
- Models devem conter apenas schemas do Mongoose.
- Middlewares devem ficar em src/middlewares.
- Respostas da API devem ser JSON.

## Comandos esperados

Backend:

```bash
cd backend
npm install
npm run dev