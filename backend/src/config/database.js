import mongoose from 'mongoose';

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('Aviso: variável de ambiente MONGO_URI não definida. O backend rodará em modo de fallback local (dados simulados).');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Aviso: Erro ao conectar no MongoDB (${error.message}). O backend rodará em modo de fallback local (dados simulados).`);
  }
};

export default connectDatabase;
