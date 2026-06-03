// Middleware global para tratamento de erros
const errorHandler = (err, req, res, next) => {
  console.error('[Erro no Servidor]:', err.stack);

  // Define o status status code (se não vier nenhum, assume 500)
  const statusCode = err.statusCode || 500;
  
  // Critério: Deve retornar erros no formato JSON padronizado
  return res.status(statusCode).json({
    sucesso: false,
    mensagem: err.message || 'Ocorreu um erro interno no servidor.',
    erro: process.env.NODE_ENV === 'production' ? null : err.message
  });
};

export default errorHandler;