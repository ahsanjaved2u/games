const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'withdrawal'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be positive'],
  },
  description: {
    type: String,
    default: '',
    maxlength: 200,
  },
  game: {
    type: String,
    default: '',
  },
  scheduleId: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'rejected'],
    default: 'completed',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  note: {
    type: String,
    default: '',
  },
  paymentMethod: {
    method: { type: String, enum: ['bank', 'easypaisa', 'jazzcash', ''], default: '' },
    bankName: { type: String, default: '' },
    accountTitle: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
  },
}, {
  timestamps: true,
});

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
