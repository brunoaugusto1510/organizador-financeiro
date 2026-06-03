import express from 'express';
import { criarTransacao } from '../controllers/transactionController.js';

const router = express.Router();

// Rota para cadastrar transação
router.post('/transacoes', criarTransacao);

export default router;