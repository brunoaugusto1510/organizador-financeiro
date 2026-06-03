import express from 'express';
import { 
  criarTransacao, 
  editarTransacao, 
  excluirTransacao, 
  listarTransacoes // Adicione o import aqui
} from '../controllers/transactionController.js';

const router = express.Router();

// Nova Rota para listar/filtrar transações (Usa o método GET)
router.get('/transacoes', listarTransacoes);

// Rota para cadastrar transação
router.post('/transacoes', criarTransacao);

// Rota para editar transação
router.put('/transacoes/:id', editarTransacao);

// Rota para excluir transação
router.delete('/transacoes/:id', excluirTransacao);

export default router;