const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Find duplicates: same user + game + description, ignoring contestId differences
  const dupes = await Transaction.aggregate([
    { $match: { type: 'credit', description: { $regex: /place prize/ } } },
    {
      $group: {
        _id: { user: '$user', game: '$game', description: '$description' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        amount: { $first: '$amount' },
        firstCreatedAt: { $min: '$createdAt' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log('Duplicate groups found:', dupes.length);

  for (const d of dupes) {
    // Keep the one with a real contestId if possible, else keep the oldest
    const allTxns = await Transaction.find({ _id: { $in: d.ids } }).sort({ createdAt: 1 }).lean();
    const withContestId = allTxns.filter(t => t.contestId && t.contestId !== '');
    const toKeep = withContestId.length > 0 ? withContestId[0] : allTxns[0];
    const toRemove = allTxns.filter(t => String(t._id) !== String(toKeep._id));

    console.log(
      '\nKeeping:', String(toKeep._id), '| contestId:', JSON.stringify(toKeep.contestId),
      '\nRemoving', toRemove.length, 'duplicate(s) for', d._id.description,
      '| user:', String(d._id.user)
    );

    const removeIds = toRemove.map(t => t._id);
    await Transaction.deleteMany({ _id: { $in: removeIds } });

    // Fix wallet: subtract the extra amount
    const extraAmount = parseFloat((d.amount * toRemove.length).toFixed(2));
    const result = await Wallet.updateOne(
      { user: d._id.user },
      { $inc: { balance: -extraAmount } }
    );
    console.log('  Wallet adjusted by -' + extraAmount, '| matched:', result.matchedCount);
  }

  if (dupes.length === 0) console.log('No duplicates to fix.');

  await mongoose.disconnect();
  console.log('\nDone.');
})();
