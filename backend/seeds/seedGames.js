/**
 * Seed script — Inserts the Neon Bubble Shooter game into the database.
 * Run once:  node seeds/seedGames.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('../models/Game');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await Game.findOne({ slug: 'bubble-shooter' });
  if (existing) {
    console.log('bubble-shooter already exists — skipping');
  } else {
    await Game.create({
      name: 'Neon Bubble Shooter',
      slug: 'bubble-shooter',
      description: 'Pop neon bubbles, collect shields, and survive as long as you can!',
      thumbnail: 'images/background.png',
      isLive: true,
      gamePath: 'bubble-shooter',
      instructions: [
        { icon: '🎯', title: 'Aim & Shoot', text: 'Tap or click anywhere on screen to shoot bubbles in that direction.' },
        { icon: '💥', title: 'Pop Bubbles', text: 'Hit the falling neon bricks to reduce their strength. When it reaches 0 — pop!' },
        { icon: '🛡️', title: 'Collect Shields', text: 'A shield power-up appears every 50 points. Grab it for 5 seconds of protection.' },
        { icon: '⚡', title: 'Upgrade Strength', text: 'Your bullet strength grows as you score. Stronger bullets break bricks faster.' },
        { icon: '⏱️', title: 'Survive', text: 'Bricks keep coming! If any brick reaches the bottom, game over.' },
      ],
      tag: 'Popular',
      color: '#00e5ff',
    });
    console.log('✅ bubble-shooter seeded');
  }

  await mongoose.disconnect();
  console.log('Done');
};

seed().catch(err => { console.error(err); process.exit(1); });
