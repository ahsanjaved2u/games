/**
 * Migration script — Creates Contest documents from existing competitive Game data
 * and backfills the `contest` ObjectId on GameScore, GameEntry, and Transaction.
 *
 * Run once:  node seeds/migrateToContestModel.js
 *
 * Safe to re-run: skips games that already have an activeContest set.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('../models/Game');
const Contest = require('../models/Contest');
const GameScore = require('../models/GameScore');
const GameEntry = require('../models/GameEntry');
const Transaction = require('../models/Transaction');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Step 1: Create Contest docs from competitive games ──
  const competitiveGames = await Game.find({ gameType: 'competitive' });
  console.log(`Found ${competitiveGames.length} competitive game(s)`);

  for (const game of competitiveGames) {
    // Skip if already migrated
    if (game.activeContest) {
      console.log(`  "${game.name}" already has activeContest — skipping`);
      continue;
    }

    const startDate = game.scheduleStart || game.createdAt;
    const endDate = game.scheduleEnd || new Date();
    const prizes = game.prizes || [];
    const entryFee = game.entryFee || 0;
    const minPlayers = game.minPlayersThreshold || 0;
    const distributed = game.prizesDistributed === true;

    // Determine status
    const now = new Date();
    let status;
    if (distributed) {
      status = 'distributed';
    } else if (endDate <= now) {
      status = 'ended';
    } else if (startDate <= now && endDate > now) {
      status = 'live';
    } else {
      status = 'scheduled';
    }

    const contest = await Contest.create({
      game: game._id,
      status,
      startDate,
      endDate,
      entryFee,
      prizes,
      minPlayersThreshold: minPlayers,
      prizesDistributed: distributed,
    });

    console.log(`  Created contest ${contest._id} for "${game.name}" (status: ${status})`);

    // Link contest to game
    game.activeContest = contest._id;
    if (status === 'distributed' || status === 'ended') {
      game.activeContest = null; // contest is over, don't keep as active
    }
    await game.save();

    // ── Step 2: Backfill GameScore documents ──
    // Old scores used string contestId like "competitive_<start>_<end>"
    const scoreResult = await GameScore.updateMany(
      { game: game.slug, contest: null },
      { $set: { contest: contest._id } }
    );
    console.log(`    GameScore: updated ${scoreResult.modifiedCount} docs`);

    // ── Step 3: Backfill GameEntry documents ──
    const entryResult = await GameEntry.updateMany(
      { game: game._id, contest: null },
      { $set: { contest: contest._id } }
    );
    console.log(`    GameEntry: updated ${entryResult.modifiedCount} docs`);

    // ── Step 4: Backfill Transaction documents ──
    const txResult = await Transaction.updateMany(
      { game: game._id, contest: null },
      { $set: { contest: contest._id } }
    );
    console.log(`    Transaction: updated ${txResult.modifiedCount} docs`);
  }

  console.log('\nMigration complete.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
