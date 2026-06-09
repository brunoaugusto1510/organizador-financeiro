import express from 'express';
import {
  criarTransacao,
  editarTransacao,
  excluirTransacao,
  listarTransacoes,
  resumirDashboard,
} from '../controllers/transactionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', resumirDashboard);
router.get('/', listarTransacoes);
router.post('/', criarTransacao);
router.put('/:id', editarTransacao);
router.delete('/:id', excluirTransacao);

export default router;
