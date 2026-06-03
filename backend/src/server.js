import dotenv from 'dotenv';
import app from './app.js';
import connectDatabase from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Inicializa a conexão com o banco de dados
connectDatabase();

// Só escuta a porta localmente se NÃO estiver rodando no Vercel (Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;
