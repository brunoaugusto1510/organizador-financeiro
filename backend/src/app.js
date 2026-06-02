import express from 'express';
import cors from 'cors';
import transactionRoutes from './routes/transactionRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API do Organizador Financeiro funcionando.',
  });
});

app.use('/api/transactions', transactionRoutes);

export default app;
