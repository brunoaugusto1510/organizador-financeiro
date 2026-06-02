import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from './config/database.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';

dotenv.config();

const runSeed = async () => {
  await connectDatabase();

  // 1. Limpar transações anteriores para evitar duplicações
  await Transaction.deleteMany({});
  console.log('Transações anteriores limpas.');

  // 2. Garantir que exista um usuário de teste
  let user = await User.findOne({ email: 'teste@email.com' });
  if (!user) {
    user = await User.create({
      name: 'Usuário Teste',
      email: 'teste@email.com',
      password: 'senhaSegura123', // Será hasheada pelo pre-save do Model
    });
    console.log(`Usuário de teste criado: ${user.email}`);
  } else {
    console.log(`Usuário de teste já existente: ${user.email}`);
  }

  // 3. Inserir transações com datas específicas
  const transactionsToInsert = [
    {
      title: 'Assinatura Streaming',
      type: 'expense',
      amount: 55.90,
      category: 'Lazer',
      date: new Date('2026-05-25T10:00:00Z'), // Mais antiga
      description: 'Mensalidade do streaming de vídeo.',
      user: user._id,
    },
    {
      title: 'Desenvolvimento Freelance',
      type: 'income',
      amount: 1500.00,
      category: 'Freelance',
      date: new Date('2026-06-01T14:30:00Z'), // Intermediária
      description: 'Pagamento por desenvolvimento de landing page.',
      user: user._id,
    },
    {
      title: 'Compras Supermercado',
      type: 'expense',
      amount: 250.45,
      category: 'Alimentação',
      date: new Date('2026-06-02T18:00:00Z'), // Mais recente
      description: 'Compras mensais do lar.',
      user: user._id,
    },
  ];

  const createdTransactions = await Transaction.insertMany(transactionsToInsert);
  console.log(`${createdTransactions.length} transações criadas com sucesso.`);

  await mongoose.disconnect();
  console.log('Conexão encerrada.');
  process.exit(0);
};

runSeed().catch(async (error) => {
  console.error(`Erro ao rodar semente de testes: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
