import Transaction from '../models/Transaction.js';

export const criarTransacao = async (req, res) => {
  try {
    const { user, title, type, amount, category, date, description } = req.body;

    // 1. Validação: O valor deve ser maior que zero (Critério do GitHub)
    if (!amount || amount <= 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O valor da transação deve ser maior que zero.'
      });
    }

    // 2. Validação: O tipo deve ser receita (income) ou despesa (expense) (Critério do GitHub)
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O tipo deve ser "income" (receita) ou "expense" (despesa).'
      });
    }

    // Instanciando o modelo injetando a obrigatoriedade do usuário
    const novaTransacao = new Transaction({
      user,
      title,
      type,
      amount,
      category,
      date,
      description
    });

    // 3. Salva a transação no MongoDB Atlas
    const transacaoSalva = await novaTransacao.save();

    // 4. Devolve a transação criada com status 201 (Created)
    return res.status(201).json(transacaoSalva);

  } catch (error) {
    // 5. Retorna erro em caso de dados inválidos
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Erro ao cadastrar transação.',
      erro: error.message
    });
  }
};