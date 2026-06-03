import express from 'express';
import { criarTransacao, editarTransacao, excluirTransacao } from '../controllers/transactionController.js';

const router = express.Router();

// Rota para cadastrar transação
router.post('/transacoes', criarTransacao);

// Rota para editar transação
router.put('/transacoes/:id', editarTransacao);

// Nova Rota para excluir transação (Usa o método DELETE do Express)
router.delete('/transacoes/:id', excluirTransacao);

export default router;