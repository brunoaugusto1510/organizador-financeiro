import Transaction from '../models/Transaction.js';

// 1. Criar Transação (Validações transferidas para o middleware)
export const criarTransacao = async (req, res, next) => {
  try {
    const { user, title, type, amount, category, date, description } = req.body;

    const novaTransacao = new Transaction({
      user,
      title,
      type,
      amount,
      category,
      date,
      description
    });

    const transacaoSalva = await novaTransacao.save();
    return res.status(201).json(transacaoSalva);

  } catch (error) {
    next(error); // Encaminha o erro para o errorHandler global
  }
};

// 2. Editar Transação (Validações complexas geridas via Mongoose runValidators)
export const editarTransacao = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, type, amount, category, date, description } = req.body;

    // { runValidators: true } garante a execução das validações do Schema do Gustavo
    const transacaoAtualizada = await Transaction.findByIdAndUpdate(
      id,
      { title, type, amount, category, date, description },
      { new: true, runValidators: true }
    );

    if (!transacaoAtualizada) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Transação não encontrada.'
      });
    }

    return res.status(200).json(transacaoAtualizada);

  } catch (error) {
    next(error);
  }
};

// 3. Excluir Transação
export const excluirTransacao = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transacaoExcluida = await Transaction.findByIdAndDelete(id);

    if (!transacaoExcluida) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Transação não encontrada.'
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Transação eliminada com sucesso.'
    });

  } catch (error) {
    next(error);
  }
};

// 4. Listar Transações com Filtros Dinâmicos
export const listarTransacoes = async (req, res, next) => {
  try {
    const { type, month, year } = req.query;
    let filtro = {};

    if (type) {
      filtro.type = type;
    }

    if (month && year) {
      const anoInt = parseInt(year);
      const mesInt = parseInt(month) - 1;

      const dataInicio = new Date(anoInt, mesInt, 1);
      const dataFim = new Date(anoInt, mesInt + 1, 1);

      filtro.date = {
        $gte: dataInicio,
        $lt: dataFim
      };
    }

    const transacoes = await Transaction.find(filtro).sort({ date: -1 });
    return res.status(200).json(transacoes);

  } catch (error) {
    next(error);
  }
};