# Guia de Autenticação e JWT (JSON Web Token)

Este guia descreve como o mecanismo de autenticação baseado em JWT está configurado na aplicação, o papel da chave de segurança `JWT_SECRET` e o fluxo de geração de tokens.

---

## 1. O que é o JWT e por que usamos?

O **JSON Web Token (JWT)** é um padrão (RFC 7519) que define uma maneira compacta e segura de transmitir informações entre as partes como um objeto JSON.
No nosso sistema, usamos JWT para manter a sessão dos usuários de forma **stateless** (sem guardar sessões em memória no servidor ou em banco de dados).

O token é dividido em três partes separadas por pontos (`.`):
1. **Header**: Contém o tipo do token (JWT) e o algoritmo de criptografia (HS256).
2. **Payload**: Contém os dados do usuário (no nosso caso, o ID do usuário).
3. **Signature**: A assinatura de segurança que garante que o token não foi adulterado.

---

## 2. A Chave de Segurança (`JWT_SECRET`)

A assinatura do token necessita de uma chave secreta privada conhecida apenas pelo servidor: a variável `JWT_SECRET`.

### 2.1 Onde ela é guardada?
A chave é guardada localmente nas variáveis de ambiente:

* **`.env`** (Arquivo Local e Confidencial):
  Contém as senhas de produção/desenvolvimento e a chave secreta real. **Nunca deve ser enviado para o Git** (está bloqueado no `.gitignore`).
  ```env
  JWT_SECRET=chave_secreta_super_segura_para_o_organizador_financeiro
  ```

* **`.env.example`** (Arquivo Público de Modelo):
  Enviado para o repositório Git. Serve apenas como modelo para listar quais chaves a aplicação exige, contendo o valor em branco.
  ```env
  JWT_SECRET=
  ```

### 2.2 Como o Node.js lê esta chave?
No início da execução da API, o arquivo [server.js](file:///c:/Users/User/Documents/organizador-financeiro/backend/src/server.js) inicializa a biblioteca `dotenv`:
```js
import dotenv from 'dotenv';
dotenv.config();
```
O `dotenv` lê o arquivo `.env` e carrega o par de chave/valor no objeto global `process.env`. Assim, qualquer script pode ler o segredo usando `process.env.JWT_SECRET`.

---

## 3. Fluxo de Geração do Token

Criamos uma função utilitária dedicada em [generateToken.js](file:///c:/Users/User/Documents/organizador-financeiro/backend/src/utils/generateToken.js) para assinar o token:

```js
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não está definida nas variáveis de ambiente.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // O token expira em 30 dias
  });
};
```

1. Passamos o `user._id` como payload.
2. Usamos o `process.env.JWT_SECRET` para assinar digitalmente a carga.
3. Definimos uma validade razoável de expiração (30 dias).

---

## 4. Integração no Cadastro (`POST /api/auth/register`)

No [authController.js](file:///c:/Users/User/Documents/organizador-financeiro/backend/src/controllers/authController.js), após validar e salvar com sucesso o novo usuário com sua senha devidamente criptografada:

1. Invocamos a utilidade de geração de token:
   ```js
   const token = generateToken(user._id);
   ```
2. Devolvemos a resposta JSON com status `201 Created` contendo o usuário (sem a senha, que é excluída pelo método `toJSON()` do model `User.js`) e o `token`:
   ```js
   return res.status(201).json({
     success: true,
     message: 'Usuário cadastrado com sucesso.',
     user,
     token,
   });
   ```

---

## 5. Próximos Passos: Proteção de Rotas

Quando novos endpoints protegidos forem desenvolvidos (como os CRUDs de Transações):
1. O frontend deverá incluir o token JWT enviado no cabeçalho `Authorization` da requisição HTTP:
   ```http
   Authorization: Bearer <SEU_TOKEN_JWT>
   ```
2. Um middleware de autenticação interceptará a requisição no backend, extrairá o token, e usará o mesmo `process.env.JWT_SECRET` para descriptografar e validar o token com `jwt.verify()`.
3. Validado o token, o ID contido no payload será usado para consultar o banco e injetar os dados do usuário atual em `req.user`, permitindo o acesso seguro e o vínculo das transações a cada usuário específico.
