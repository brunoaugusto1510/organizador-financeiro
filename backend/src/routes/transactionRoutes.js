import express from 'express';
import { criarTransacao, editarTransacao, excluirTransacao, listarTransacoes } from '../controllers/transactionController.js';
import { validarTransacao } from '../middlewares/validTransaction.js'; // Importa o validador

const router = express.Router();

router.get('/transacoes', listarTransacoes);

// Aplica o middleware de validação antes de chamar a função de criar
router.post('/transacoes', validarTransacao, criarTransacao);

router.put('/transacoes/:id', editarTransacao);
router.delete('/transacoes/:id', excluirTransacao);

export default router;