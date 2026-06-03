import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';

const tiposValidos = ['income', 'expense', 'pending'];

function montarFiltroUsuario(req, extras = {}) {
  return {
    ...extras,
    user: req.user._id,
  };
}

function validarTipo(type) {
  return tiposValidos.includes(type);
}

function montarDadosTransacao(body) {
  const { title, type, amount, category, date, description } = body;

  return {
    title,
    type,
    amount,
    category,
    date,
    description,
  };
}

export const criarTransacao = async (req, res) => {
  try {
    const dados = montarDadosTransacao(req.body);

    if (!dados.title || !dados.amount || Number(dados.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe titulo e valor maior que zero.',
      });
    }

    if (!validarTipo(dados.type)) {
      return res.status(400).json({
        success: false,
        message: 'O tipo deve ser income, expense ou pending.',
      });
    }

    const transacaoSalva = await Transaction.create({
      ...dados,
      user: req.user._id,
    });

    return res.status(201).json(transacaoSalva);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao cadastrar transacao.',
      error: error.message,
    });
  }
};

export const editarTransacao = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Transacao nao encontrada.',
      });
    }

    const dados = montarDadosTransacao(req.body);

    if (dados.amount !== undefined && Number(dados.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'O valor da transacao deve ser maior que zero.',
      });
    }

    if (dados.type !== undefined && !validarTipo(dados.type)) {
      return res.status(400).json({
        success: false,
        message: 'O tipo deve ser income, expense ou pending.',
      });
    }

    Object.keys(dados).forEach((key) => {
      if (dados[key] === undefined) delete dados[key];
    });

    const transacaoAtualizada = await Transaction.findOneAndUpdate(
      montarFiltroUsuario(req, { _id: id }),
      dados,
      { new: true, runValidators: true }
    );

    if (!transacaoAtualizada) {
      return res.status(404).json({
        success: false,
        message: 'Transacao nao encontrada.',
      });
    }

    return res.status(200).json(transacaoAtualizada);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao atualizar transacao.',
      error: error.message,
    });
  }
};

export const excluirTransacao = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Transacao nao encontrada.',
      });
    }

    const transacaoExcluida = await Transaction.findOneAndDelete(
      montarFiltroUsuario(req, { _id: id })
    );

    if (!transacaoExcluida) {
      return res.status(404).json({
        success: false,
        message: 'Transacao nao encontrada.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transacao excluida com sucesso.',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao excluir transacao.',
      error: error.message,
    });
  }
};

export const listarTransacoes = async (req, res) => {
  try {
    const { type, month, year } = req.query;
    const filtro = montarFiltroUsuario(req);

    if (type) {
      if (!validarTipo(type)) {
        return res.status(400).json({
          success: false,
          message: 'O tipo deve ser income, expense ou pending.',
        });
      }
      filtro.type = type;
    }

    if (month && year) {
      const anoInt = parseInt(year, 10);
      const mesInt = parseInt(month, 10) - 1;

      filtro.date = {
        $gte: new Date(anoInt, mesInt, 1),
        $lt: new Date(anoInt, mesInt + 1, 1),
      };
    }

    const transacoes = await Transaction.find(filtro).sort({ date: -1 });

    return res.status(200).json(transacoes);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar transacoes.',
      error: error.message,
    });
  }
};

export const resumirDashboard = async (req, res) => {
  try {
    const totais = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const resumo = totais.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});

    const entradas = resumo.income || 0;
    const saidas = resumo.expense || 0;
    const pendentes = resumo.pending || 0;

    return res.status(200).json({
      saldo: entradas - saidas,
      entradas,
      saidas,
      pendentes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar resumo financeiro.',
      error: error.message,
    });
  }
};
