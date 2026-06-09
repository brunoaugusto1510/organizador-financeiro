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
  const { title, type, amount, category, date, description, parcelas, parcelasPagas } = body;

  return {
    title,
    type,
    amount,
    category,
    date,
    description,
    parcelas,
    parcelasPagas,
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

function intervaloMes(ano, mes) {
  // mes: 0-11
  return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 1) };
}

function acumularPorDia(transacoes, diasNoMes) {
  const porDia = new Array(diasNoMes).fill(0);
  transacoes.forEach((t) => {
    const dia = new Date(t.date).getDate();
    if (dia >= 1 && dia <= diasNoMes) porDia[dia - 1] += t.amount;
  });
  let acc = 0;
  return porDia.map((v) => {
    acc += v;
    return Math.round(acc);
  });
}

export const resumirDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    const atual = intervaloMes(ano, mes);
    const anterior = intervaloMes(ano, mes - 1);
    const diasAtual = new Date(ano, mes + 1, 0).getDate();
    const diasAnterior = new Date(ano, mes, 0).getDate();
    const diaCorrente = Math.min(hoje.getDate(), diasAtual);

    // Resumo do mês atual por tipo
    const totais = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: atual.inicio, $lt: atual.fim } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const resumoMap = totais.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});
    const entradas = resumoMap.income || 0;
    const saidas = resumoMap.expense || 0;
    const pendentes = resumoMap.pending || 0;

    // Gasto (expense) do mês anterior para comparativo
    const gastoAnteriorAgg = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: anterior.inicio, $lt: anterior.fim } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const gastoAtual = saidas;
    const gastoAnterior = gastoAnteriorAgg[0]?.total || 0;
    const difPct = gastoAnterior > 0 ? ((gastoAtual - gastoAnterior) / gastoAnterior) * 100 : 0;

    // Séries diárias (expense + pending) dos dois meses
    const tipoGasto = { $in: ['expense', 'pending'] };
    const [txAtual, txAnterior] = await Promise.all([
      Transaction.find({ user: userId, type: tipoGasto, date: { $gte: atual.inicio, $lt: atual.fim } }, 'amount date'),
      Transaction.find({ user: userId, type: tipoGasto, date: { $gte: anterior.inicio, $lt: anterior.fim } }, 'amount date'),
    ]);
    const serieAtualFull = acumularPorDia(txAtual, diasAtual);
    const serieAtual = serieAtualFull.map((v, i) => (i + 1 <= diaCorrente ? v : null));
    const serieAnterior = acumularPorDia(txAnterior, diasAnterior);

    // Categorias (expense) do mês atual, desc
    const categoriasAgg = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: atual.inicio, $lt: atual.fim } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const categorias = categoriasAgg.map((c) => ({ categoria: c._id || 'outros', total: c.total }));

    return res.status(200).json({
      resumo: { saldo: entradas - saidas, entradas, saidas, pendentes },
      comparativo: {
        gastoAtual,
        gastoAnterior,
        difPct: Number(difPct.toFixed(2)),
      },
      serieDiaria: { atual: serieAtual, anterior: serieAnterior, diaCorrente },
      categorias,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar resumo financeiro.',
      error: error.message,
    });
  }
};
