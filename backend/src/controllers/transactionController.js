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

// Função para editar uma transação existente
export const editarTransacao = async (req, res) => {
  try {
    const { id } = req.params; // Captura o ID vindo na URL
    const { title, type, amount, category, date, description } = req.body;

    // 1. Validação: Se o valor for enviado, deve ser maior que zero
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O valor da transação deve ser maior que zero.'
      });
    }

    // 2. Validação: Se o tipo for enviado, deve ser "income" ou "expense"
    if (type !== undefined && type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O tipo deve ser "income" (receita) ou "expense" (despesa).'
      });
    }

    // 3. Busca a transação pelo ID e atualiza com os novos dados
    // { new: true } serve para o MongoDB retornar a transação já atualizada
    // { runValidators: true } garante que as validações do Schema do Gustavo sejam executadas
    const transacaoAtualizada = await Transaction.findByIdAndUpdate(
      id,
      { title, type, amount, category, date, description },
      { new: true, runValidators: true }
    );

    // 4. Critério de aceitação: Deve retornar erro se a transação não existir
    if (!transacaoAtualizada) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Transação não encontrada.'
      });
    }

    // 5. Critério de aceitação: Deve retornar a transação atualizada
    return res.status(200).json(transacaoAtualizada);

  } catch (error) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar transação.',
      erro: error.message
    });
  }
};

// Função para eliminar uma transação existente do banco de dados
export const excluirTransacao = async (req, res) => {
  try {
    const { id } = req.params; // Captura o ID dinâmico passado na URL

    // 1. Busca no MongoDB Atlas e remove o documento correspondente
    const transacaoExcluida = await Transaction.findByIdAndDelete(id);

    // 2. Critério de aceitação: Deve retornar erro se a transação não existir
    if (!transacaoExcluida) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Transação não encontrada.'
      });
    }

    // 3. Critérios de aceitação: Deve retornar mensagem de sucesso
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Transação eliminada com sucesso.'
    });

  } catch (error) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Erro ao eliminar transação.',
      erro: error.message
    });
  }
};