import Category from '../models/Category.js';

export const listarCategorias = async (req, res) => {
  try {
    const categorias = await Category.find().sort({ name: 1 });
    return res.status(200).json(categorias);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar categorias.',
      error: error.message,
    });
  }
};
