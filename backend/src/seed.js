import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from './config/database.js';
import Category from './models/Category.js';

dotenv.config();

// Categorias padrão para popular o banco na primeira execução.
const defaultCategories = [
  { name: 'Salário', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Outros', type: 'income' },
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Outros', type: 'expense' },
];

const seedCategories = async () => {
  await connectDatabase();

  let inseridas = 0;

  for (const category of defaultCategories) {
    // upsert evita duplicar categorias em execuções repetidas.
    const result = await Category.updateOne(
      { name: category.name, type: category.type },
      { $setOnInsert: category },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inseridas += 1;
      console.log(`Inserida: ${category.name} (${category.type})`);
    } else {
      console.log(`Já existe: ${category.name} (${category.type})`);
    }
  }

  console.log(`\nSeed concluído. ${inseridas} categoria(s) inserida(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

seedCategories().catch(async (error) => {
  console.error(`Erro ao executar o seed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
