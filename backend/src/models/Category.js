import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório.'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'O slug é obrigatório.'],
      unique: true,
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
    icon: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
