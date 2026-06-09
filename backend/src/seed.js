import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDatabase from './config/database.js';
import Category from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

// Categorias padrão para popular o banco na primeira execução.
const defaultCategories = [
  { slug: 'salario',      name: 'Salário',      type: 'income',  icon: '💰' },
  { slug: 'renda_extra',  name: 'Renda Extra',  type: 'income',  icon: '💵' },
  { slug: 'investimento', name: 'Investimento', type: 'income',  icon: '📈' },
  { slug: 'moradia',      name: 'Moradia',      type: 'expense', icon: '🏠' },
  { slug: 'alimentacao',  name: 'Alimentação',  type: 'expense', icon: '🍽️' },
  { slug: 'transporte',   name: 'Transporte',   type: 'expense', icon: '🚗' },
  { slug: 'saude',        name: 'Saúde',        type: 'expense', icon: '🏥' },
  { slug: 'educacao',     name: 'Educação',     type: 'expense', icon: '📚' },
  { slug: 'lazer',        name: 'Lazer',        type: 'expense', icon: '🎮' },
  { slug: 'vestuario',    name: 'Vestuário',    type: 'expense', icon: '👕' },
  { slug: 'utilidades',   name: 'Utilidades',   type: 'expense', icon: '💡' },
  { slug: 'outros',       name: 'Outros',       type: 'expense', icon: '📦' },
];

const seedCategories = async () => {
  await connectDatabase();

  let inseridas = 0;

  for (const category of defaultCategories) {
    // upsert evita duplicar categorias em execuções repetidas.
    // $set é intencional: o seed é a fonte de verdade para as categorias padrão,
    // então re-execuções atualizam name/type/icon pelo slug estável.
    const result = await Category.updateOne(
      { slug: category.slug },
      { $set: category },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inseridas += 1;
      console.log(`Inserida: ${category.name} (${category.type})`);
    } else if (result.modifiedCount > 0) {
      console.log(`Atualizada: ${category.name} (${category.type})`);
    } else {
      console.log(`Sem mudança: ${category.name} (${category.type})`);
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
