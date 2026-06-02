import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';

// Fallback de transações fictícias na memória se o banco não estiver conectado
const mockTransactions = [
  {
    _id: '646e33db56e7ab9b207df8f1',
    title: 'Compras Supermercado',
    type: 'expense',
    amount: 250.45,
    category: 'Alimentação',
    date: new Date('2026-06-02T18:00:00Z'), // Mais recente
    description: 'Compras mensais do lar (Simulado).',
    user: '646e33db56e7ab9b207df8a0',
    createdAt: new Date('2026-06-02T18:00:00Z'),
    updatedAt: new Date('2026-06-02T18:00:00Z'),
  },
  {
    _id: '646e33db56e7ab9b207df8f2',
    title: 'Desenvolvimento Freelance',
    type: 'income',
    amount: 1500.00,
    category: 'Freelance',
    date: new Date('2026-06-01T14:30:00Z'), // Intermediária
    description: 'Pagamento por desenvolvimento de landing page (Simulado).',
    user: '646e33db56e7ab9b207df8a0',
    createdAt: new Date('2026-06-01T14:30:00Z'),
    updatedAt: new Date('2026-06-01T14:30:00Z'),
  },
  {
    _id: '646e33db56e7ab9b207df8f3',
    title: 'Assinatura Streaming',
    type: 'expense',
    amount: 55.90,
    category: 'Lazer',
    date: new Date('2026-05-25T10:00:00Z'), // Mais antiga
    description: 'Mensalidade do streaming de vídeo (Simulado).',
    user: '646e33db56e7ab9b207df8a0',
    createdAt: new Date('2026-05-25T10:00:00Z'),
    updatedAt: new Date('2026-05-25T10:00:00Z'),
  },
];

/**
 * @desc    Listar todas as transações cadastradas
 * @route   GET /api/transactions
 * @access  Public (por enquanto, até implementação do JWT)
 */
export const getTransactions = async (req, res) => {
  try {
    // Se o banco não estiver conectado, retorna os dados simulados
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB desconectado. Retornando dados fictícios em memória (fallback)...');
      return res.status(200).json({
        success: true,
        count: mockTransactions.length,
        data: mockTransactions,
        note: 'Utilizando dados simulados de fallback (MongoDB desconectado).',
      });
    }

    const transactions = await Transaction.find().sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar transações.',
      error: error.message,
    });
  }
};
