import express from 'express';
import { listarCategorias } from '../controllers/categoryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listarCategorias);

export default router;
