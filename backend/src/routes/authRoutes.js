import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota de cadastro de usuário: POST /api/auth/register
router.post('/register', register);

// Rota de login de usuário: POST /api/auth/login
router.post('/login', login);

// Rota para obter dados do usuário autenticado: GET /api/auth/me
router.get('/me', protect, getMe);

export default router;

