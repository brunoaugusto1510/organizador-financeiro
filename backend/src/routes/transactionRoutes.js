import express from 'express';
import { criarTransacao, editarTransacao } from '../controllers/transactionController.js';

const router = express.Router();

// Rota para cadastrar transação
router.post('/transacoes', criarTransacao);

// Nova Rota para editar transação (O :id recebe o ID da transação dinamicamente)
router.put('/transacoes/:id', editarTransacao);

export default router;