const dotenv = require('dotenv'); dotenv.config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ referralCode: { $exists: false } }).select('_id name email');
  console.log('Users missing referral code:', users.length);
  for (const u of users) {
    const code = 'GV-' + crypto.randomBytes(4).toString('hex');
    await User.updateOne({ _id: u._id }, { $set: { referralCode: code } });
    console.log('Generated for', u.name, ':', code);
  }
  console.log('Done');
  mongoose.disconnect();
});
