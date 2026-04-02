const mongoose = require('mongoose');

const gameLikeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  },
  { timestamps: true }
);

gameLikeSchema.index({ user: 1, game: 1 }, { unique: true });
gameLikeSchema.index({ game: 1 });

module.exports = mongoose.model('GameLike', gameLikeSchema);
