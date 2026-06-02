import express from 'express';
import { register } from '../controllers/authController.js';

const router = express.Router();

// Rota de cadastro de usuário: POST /api/auth/register
router.post('/register', register);

export default router;
