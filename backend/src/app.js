import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import errorHandler from './middlewares/errorHandler.js'; // 1. Importou o tratador global de erros

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api', transactionRoutes);

// Rota para renderizar a tela de login/cadastro
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

// Fallback para index.html em caso de rota não reconhecida (SPA)
app.get('*', (req, res, next) => {
  // Ignora chamadas de API para não retornar HTML no lugar de JSON em caso de erro 404 de API
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 2. O Middleware Global de Erro DEVE ser sempre o último a ser declarado!
app.use(errorHandler);

export default app;