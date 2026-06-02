import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

/**
 * @desc    Cadastra um novo usuário e retorna dados do usuário e o token JWT
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validação básica dos campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios (nome, email e senha).',
      });
    }

    // Validação básica de formato de email (opcional, mas boa prática)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, insira um endereço de email válido.',
      });
    }

    // Validação do tamanho da senha (mínimo de 6 caracteres, conforme especificado no Model)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres.',
      });
    }

    // Verifica se o email já está cadastrado
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado.',
      });
    }

    // Cria o novo usuário (a senha será criptografada automaticamente pelo Hook pre-save do Model)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Gera o token JWT para o usuário recém-cadastrado
    const token = generateToken(user._id);

    // Retorna o sucesso do cadastro, os dados do usuário (automaticamente sem senha devido ao toJSON) e o token JWT
    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso.',
      user,
      token,
    });
  } catch (error) {
    console.error('Erro no cadastro de usuário:', error);
    
    // Tratamento de erros específicos conforme a seção 6 do guia do banco de dados
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao cadastrar usuário.',
      error: error.message,
    });
  }
};
