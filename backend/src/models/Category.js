import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'O tipo é obrigatório.'],
      enum: {
        values: ['income', 'expense'],
        message: 'O tipo deve ser income ou expense.',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
