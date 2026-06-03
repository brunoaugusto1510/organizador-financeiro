// Middleware para validar os campos das transações
export const validarTransacao = (req, res, next) => {
  const { title, type, amount, category, date } = req.body;

  // 1. Critério: Deve validar campos obrigatórios nas transações
  if (!title || !type || !amount || !category || !date) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Todos os campos obrigatórios (title, type, amount, category, date) devem ser preenchidos.'
    });
  }

  // 2. Critério: Deve validar o tipo de transação
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'O tipo de transação deve ser "income" (receita) ou "expense" (despesa).'
    });
  }

  // 3. Critério: Deve validar valor maior que zero
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'O valor (amount) deve ser um número maior que zero.'
    });
  }

  // Se passou em tudo, vai para o controlador
  next();
};