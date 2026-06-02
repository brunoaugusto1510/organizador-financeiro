import jwt from 'jsonwebtoken';

/**
 * Gera um token JWT para um determinado ID de usuário.
 * @param {string} id - ID do usuário.
 * @returns {string} Token assinado.
 */
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não está definida nas variáveis de ambiente.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;
