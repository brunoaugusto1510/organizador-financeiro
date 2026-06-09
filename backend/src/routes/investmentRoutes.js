import express from 'express';
import {
  criarInvestimento,
  listarInvestimentos,
  editarInvestimento,
  excluirInvestimento,
} from '../controllers/investmentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listarInvestimentos);
router.post('/', criarInvestimento);
router.put('/:id', editarInvestimento);
router.delete('/:id', excluirInvestimento);

export default router;
