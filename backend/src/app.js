import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import connectDatabase from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../frontend')));

async function ensureDatabase(req, res, next) {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Banco de dados indisponivel. Verifique as variaveis de ambiente do servidor.',
    });
  }
}

app.use('/api', ensureDatabase);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Rota da API nao encontrada.',
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  return res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

export default app;
