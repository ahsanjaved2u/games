const dotenv = require('dotenv'); dotenv.config();
const mongoose = require('mongoose');
const Referral = require('../models/Referral');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // 1. Fix the player1 -> AhsanGmail referral
  const gmail = await User.findOne({ email: 'ahsanjaved2u@gmail.com' });
  if (gmail) {
    const ref = await Referral.findOne({ referee: gmail._id });
    if (ref) {
      ref.status = 'active';
      ref.activatedAt = new Date();
      ref.expiresAt = new Date(Date.now() + 30 * 86400000);
      await ref.save();
      console.log('Fixed:', ref.referrer, '->', ref.referee, '| status:', ref.status);
    }
  }

  // 2. Delete orphaned referrals (where referee user no longer exists)
  const allRefs = await Referral.find({});
  let cleaned = 0;
  for (const r of allRefs) {
    const refereeExists = await User.findById(r.referee);
    const referrerExists = await User.findById(r.referrer);
    if (!refereeExists || !referrerExists) {
      await Referral.deleteOne({ _id: r._id });
      cleaned++;
    }
  }
  console.log('Cleaned orphaned referrals:', cleaned);

  // 3. Show final state
  const refs = await Referral.find({}).populate('referrer', 'name email').populate('referee', 'name email');
  console.log('\nFinal referral records:');
  refs.forEach(r => console.log(
    ' ', r.referrer?.name, '(' + r.referrer?.email + ')',
    '->', r.referee?.name, '(' + r.referee?.email + ')',
    '| status:', r.status,
    '| flagReason:', r.flagReason || 'none',
    '| activatedAt:', r.activatedAt,
    '| expiresAt:', r.expiresAt
  ));

  mongoose.disconnect();
});
