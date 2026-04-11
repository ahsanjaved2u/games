const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('../models/Transaction');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const prizes = await Transaction.find({
    type: 'credit',
    description: { $regex: /place prize/ },
  }).sort({ createdAt: -1 }).lean();

  console.log('Total prize transactions:', prizes.length);
  prizes.forEach((t, i) => {
    console.log(`\n--- Prize #${i + 1} ---`);
    console.log('  _id:', String(t._id));
    console.log('  user:', String(t.user));
    console.log('  game:', t.game);
    console.log('  contestId:', JSON.stringify(t.contestId));
    console.log('  scheduleId:', JSON.stringify(t.scheduleId));
    console.log('  description:', t.description);
    console.log('  amount:', t.amount);
    console.log('  createdAt:', t.createdAt);
  });

  await mongoose.disconnect();
})();
