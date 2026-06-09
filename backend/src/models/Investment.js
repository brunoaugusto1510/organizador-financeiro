import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema(
  {
    classe: {
      type: String,
      required: [true, 'A classe é obrigatória.'],
      trim: true,
    },
    valorAplicado: {
      type: Number,
      required: [true, 'O valor aplicado é obrigatório.'],
      validate: {
        validator: (value) => value > 0,
        message: 'O valor aplicado deve ser maior que zero.',
      },
    },
    valorAtual: {
      type: Number,
      required: [true, 'O valor atual é obrigatório.'],
      validate: {
        validator: (value) => value >= 0,
        message: 'O valor atual não pode ser negativo.',
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'O investimento deve estar vinculado a um usuário.'],
    },
  },
  {
    timestamps: true,
  }
);

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;
