import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware para autenticação de rotas protegidas a partir do token JWT.
 * 
 * Este middleware:
 * 1. Verifica se o header Authorization está presente e se inicia com "Bearer".
 * 2. Extrai e valida o token JWT usando a chave JWT_SECRET.
 * 3. Busca o usuário correspondente no banco de dados (excluindo a senha).
 * 4. Insere as informações do usuário em req.user para uso nos próximos controllers.
 * 5. Bloqueia o acesso caso qualquer validação falhe, retornando status 401.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Validar token recebido no header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extrai o token do padrão "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Acesso não autorizado. Token não fornecido após prefixo Bearer.',
        });
      }

      // 2. Valida o token recebido
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Busca o usuário no banco de dados e exclui o campo password da resposta
      req.user = await User.findById(decoded.id).select('-password');

      // Se o usuário não existir no banco (deletado ou ID inválido)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Acesso não autorizado. Usuário associado a este token não foi encontrado.',
        });
      }

      // Continua para o próximo middleware ou controller
      return next();
    } catch (error) {
      console.error('Erro na autenticação JWT:', error.message);
      
      // Tratamento específico para token expirado ou malformado
      let message = 'Acesso não autorizado. Token inválido ou expirado.';
      if (error.name === 'TokenExpiredError') {
        message = 'Acesso não autorizado. O token expirou. Faça login novamente.';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Acesso não autorizado. Assinatura ou formato do token inválido.';
      }

      return res.status(401).json({
        success: false,
        message,
        error: error.message,
      });
    }
  }

  // Se nenhum token foi fornecido no formato correto
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. Token de autenticação não fornecido no cabeçalho.',
    });
  }
};
