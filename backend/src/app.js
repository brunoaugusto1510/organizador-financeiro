import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API do Organizador Financeiro funcionando.',
  });
});

export default app;
