/**
 * Seed script — Inserts the Candy Crush game into the database.
 * Run once:  node seeds/seedCandyCrush.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('../models/Game');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await Game.findOne({ slug: 'candy-crush' });
  if (existing) {
    console.log('candy-crush already exists — skipping');
  } else {
    await Game.create({
      name: 'Candy Crush',
      slug: 'candy-crush',
      description: 'Swap and match colourful candies in rows of 3 or more to score points. Chain combos for massive rewards!',
      thumbnail: '',          // add a thumbnail image path later
      isLive: true,
      gamePath: 'Candy-Crush',
    });
    console.log('✅ candy-crush seeded');
  }

  await mongoose.disconnect();
  console.log('Done');
};

seed().catch(err => { console.error(err); process.exit(1); });
