import mongoose from 'mongoose';
import Investment from '../models/Investment.js';

function mapearInvestimento(doc) {
  const aplicado = doc.valorAplicado;
  const atual = doc.valorAtual;
  const variacaoPct = aplicado > 0 ? ((atual - aplicado) / aplicado) * 100 : 0;
  return {
    id: doc._id,
    classe: doc.classe,
    valor: atual,
    valorAplicado: aplicado,
    variacaoPct: Number(variacaoPct.toFixed(2)),
  };
}

export const criarInvestimento = async (req, res) => {
  try {
    const { classe, valorAplicado, valorAtual } = req.body;

    if (!classe || valorAplicado === undefined || Number(valorAplicado) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe a classe e um valor aplicado maior que zero.',
      });
    }

    const investimento = await Investment.create({
      classe,
      valorAplicado,
      valorAtual: valorAtual ?? valorAplicado,
      user: req.user._id,
    });

    return res.status(201).json(mapearInvestimento(investimento));
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao cadastrar investimento.',
      error: error.message,
    });
  }
};

export const listarInvestimentos = async (req, res) => {
  try {
    const investimentos = await Investment.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(investimentos.map(mapearInvestimento));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar investimentos.',
      error: error.message,
    });
  }
};

export const editarInvestimento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    const { classe, valorAplicado, valorAtual } = req.body;
    const dados = {};
    if (classe !== undefined) dados.classe = classe;
    if (valorAplicado !== undefined) dados.valorAplicado = valorAplicado;
    if (valorAtual !== undefined) dados.valorAtual = valorAtual;

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar.',
      });
    }

    const atualizado = await Investment.findOneAndUpdate(
      { _id: id, user: req.user._id },
      dados,
      { new: true, runValidators: true }
    );

    if (!atualizado) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    return res.status(200).json(mapearInvestimento(atualizado));
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao atualizar investimento.',
      error: error.message,
    });
  }
};

export const excluirInvestimento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    const excluido = await Investment.findOneAndDelete({ _id: id, user: req.user._id });

    if (!excluido) {
      return res.status(404).json({ success: false, message: 'Investimento não encontrado.' });
    }

    return res.status(200).json({ success: true, message: 'Investimento excluído com sucesso.' });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao excluir investimento.',
      error: error.message,
    });
  }
};
