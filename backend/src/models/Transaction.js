import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'O título é obrigatório.'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'O tipo é obrigatório.'],
      enum: {
        values: ['income', 'expense', 'pending'],
        message: 'O tipo deve ser income, expense ou pending.',
      },
    },
    amount: {
      type: Number,
      required: [true, 'O valor é obrigatório.'],
      validate: {
        validator: (value) => value > 0,
        message: 'O valor deve ser maior que zero.',
      },
    },
    category: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    parcelas: {
      type: Number,
      default: 1,
      min: [1, 'O número de parcelas deve ser no mínimo 1.'],
    },
    parcelasPagas: {
      type: Number,
      default: 0,
      min: [0, 'Parcelas pagas não pode ser negativo.'],
      validate: {
        validator: function (value) {
          return value <= (this.parcelas ?? 1);
        },
        message: 'Parcelas pagas não pode exceder o total de parcelas.',
      },
    },
    oculto: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A transação deve estar vinculada a um usuário.'],
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
