import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Rota de cadastro de usuário: POST /api/auth/register
router.post('/register', register);

// Rota de login de usuário: POST /api/auth/login
router.post('/login', login);

export default router;
