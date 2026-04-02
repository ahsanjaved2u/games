const Game = require('../models/Game');
const GameLike = require('../models/GameLike');
const Comment = require('../models/Comment');

/* ─── helpers ─── */
const findGameBySlug = async (slug) => {
  const game = await Game.findOne({ slug });
  if (!game) throw Object.assign(new Error('Game not found'), { status: 404 });
  return game;
};

/* ══════════════════════════════════════════
   LIKES
   ══════════════════════════════════════════ */

// POST /reviews/:slug/like  — toggle heart
const toggleLike = async (req, res) => {
  try {
    const game = await findGameBySlug(req.params.slug);
    const existing = await GameLike.findOneAndDelete({ user: req.user._id, game: game._id });
    if (!existing) {
      await GameLike.create({ user: req.user._id, game: game._id });
    }
    const totalLikes = await GameLike.countDocuments({ game: game._id });
    res.json({ liked: !existing, totalLikes });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /reviews/:slug/likes
const getLikes = async (req, res) => {
  try {
    const game = await findGameBySlug(req.params.slug);
    const totalLikes = await GameLike.countDocuments({ game: game._id });
    let userLiked = false;
    if (req.user) {
      userLiked = !!(await GameLike.findOne({ user: req.user._id, game: game._id }));
    }
    res.json({ totalLikes, userLiked });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════
   COMMENTS
   ══════════════════════════════════════════ */

const POPULATE_USER = { path: 'user', select: 'name avatar' };

// GET /reviews/:slug/comments?page=1&limit=20
const getComments = async (req, res) => {
  try {
    const game = await findGameBySlug(req.params.slug);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Top-level comments only (parent === null), not soft-deleted
    const filter = { game: game._id, parent: null, deletedAt: null };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_USER)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    // Fetch replies for each top-level comment
    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({ parent: { $in: commentIds }, deletedAt: null })
      .sort({ createdAt: 1 })
      .populate(POPULATE_USER)
      .lean();

    const replyMap = {};
    replies.forEach(r => {
      const pid = r.parent.toString();
      if (!replyMap[pid]) replyMap[pid] = [];
      replyMap[pid].push(r);
    });

    const enriched = comments.map(c => ({
      ...c,
      replies: replyMap[c._id.toString()] || [],
      replyCount: (replyMap[c._id.toString()] || []).length,
    }));

    res.json({ comments: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /reviews/:slug/comments  — { text, parentId? }
const addComment = async (req, res) => {
  try {
    const game = await findGameBySlug(req.params.slug);
    const { text, parentId } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });
    if (text.trim().length > 1000) return res.status(400).json({ message: 'Comment too long (max 1000 chars)' });

    // If replying, validate parent exists and belongs to same game (1-level only)
    let parent = null;
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.game.toString() !== game._id.toString()) {
        return res.status(400).json({ message: 'Invalid parent comment' });
      }
      if (parentComment.parent) {
        return res.status(400).json({ message: 'Cannot reply to a reply (1-level threading only)' });
      }
      parent = parentComment._id;
    }

    const comment = await Comment.create({
      user: req.user._id,
      game: game._id,
      text: text.trim(),
      parent,
    });

    const populated = await Comment.findById(comment._id).populate(POPULATE_USER).lean();
    populated.replies = [];
    populated.replyCount = 0;

    res.status(201).json(populated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// PUT /reviews/comments/:commentId  — owner edit
const editComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.deletedAt) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not your comment' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });
    if (text.trim().length > 1000) return res.status(400).json({ message: 'Comment too long (max 1000 chars)' });

    comment.text = text.trim();
    comment.isEdited = true;
    await comment.save();

    const populated = await Comment.findById(comment._id).populate(POPULATE_USER).lean();
    res.json(populated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// DELETE /reviews/comments/:commentId  — owner soft-delete
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.deletedAt) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not your comment' });

    comment.deletedAt = new Date();
    await comment.save();

    // Also soft-delete replies if it's a top-level comment
    if (!comment.parent) {
      await Comment.updateMany({ parent: comment._id, deletedAt: null }, { deletedAt: new Date() });
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /reviews/comments/:commentId/report  — { reason? }
const reportComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.deletedAt) return res.status(404).json({ message: 'Comment not found' });

    const alreadyReported = comment.reports.some(r => r.user.toString() === req.user._id.toString());
    if (alreadyReported) return res.status(400).json({ message: 'Already reported' });

    comment.reports.push({ user: req.user._id, reason: (req.body.reason || '').slice(0, 200) });
    await comment.save();

    res.json({ message: 'Comment reported' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════
   MY COMMENTS
   ══════════════════════════════════════════ */

// GET /reviews/my-comments?page=1&limit=20
const getMyComments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id, deletedAt: null };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'game', select: 'name slug thumbnail gamePath' })
        .populate({ path: 'parent', select: 'text user', populate: { path: 'user', select: 'name' } })
        .lean(),
      Comment.countDocuments(filter),
    ]);

    // Attach reply counts for top-level comments
    const topIds = comments.filter(c => !c.parent).map(c => c._id);
    const replyCounts = await Comment.aggregate([
      { $match: { parent: { $in: topIds }, deletedAt: null } },
      { $group: { _id: '$parent', count: { $sum: 1 } } },
    ]);
    const rcMap = {};
    replyCounts.forEach(r => { rcMap[r._id.toString()] = r.count; });

    const enriched = comments.map(c => ({
      ...c,
      replyCount: c.parent ? undefined : (rcMap[c._id.toString()] || 0),
    }));

    res.json({ comments: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════
   ADMIN
   ══════════════════════════════════════════ */

// GET /reviews/admin/comments?game=slug&user=name&reported=1&page=1&limit=30&sort=newest
const adminGetComments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by game slug
    if (req.query.game) {
      const game = await Game.findOne({ slug: req.query.game });
      if (game) filter.game = game._id;
      else return res.json({ comments: [], total: 0, page: 1, pages: 0 });
    }

    // Filter by user name (partial match)
    if (req.query.user) {
      const { default: mongoose } = await import('mongoose');
      const User = mongoose.model('User');
      const users = await User.find({ name: { $regex: req.query.user, $options: 'i' } }).select('_id');
      filter.user = { $in: users.map(u => u._id) };
    }

    // Filter reported only
    if (req.query.reported === '1') {
      filter['reports.0'] = { $exists: true };
    }

    // Include or exclude deleted
    if (req.query.deleted !== '1') {
      filter.deletedAt = null;
    }

    const sort = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_USER)
        .populate({ path: 'game', select: 'name slug' })
        .populate({ path: 'parent', select: 'text' })
        .lean(),
      Comment.countDocuments(filter),
    ]);

    // Stats
    const [totalAll, totalToday, totalReported] = await Promise.all([
      Comment.countDocuments({ deletedAt: null }),
      Comment.countDocuments({ deletedAt: null, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Comment.countDocuments({ deletedAt: null, 'reports.0': { $exists: true } }),
    ]);

    res.json({
      comments,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: { totalAll, totalToday, totalReported },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /reviews/admin/comments/:commentId  — hard delete
const adminDeleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Hard-delete replies if top-level
    if (!comment.parent) {
      await Comment.deleteMany({ parent: comment._id });
    }
    await Comment.findByIdAndDelete(comment._id);

    res.json({ message: 'Comment permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ══════════════════════════════════════════
   SUMMARIES (for GameCard badges)
   ══════════════════════════════════════════ */

// GET /reviews/:slug/summary
const getGameReviewSummary = async (req, res) => {
  try {
    const game = await findGameBySlug(req.params.slug);
    const [totalLikes, totalComments] = await Promise.all([
      GameLike.countDocuments({ game: game._id }),
      Comment.countDocuments({ game: game._id, deletedAt: null }),
    ]);
    res.json({ totalLikes, totalComments });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /reviews/bulk-summary  — { slugs: ['slug1', 'slug2'] }
const getBulkReviewSummary = async (req, res) => {
  try {
    const { slugs } = req.body;
    if (!Array.isArray(slugs) || slugs.length === 0) return res.json({});

    const games = await Game.find({ slug: { $in: slugs } }).select('_id slug').lean();
    const gameMap = {};
    games.forEach(g => { gameMap[g._id.toString()] = g.slug; });
    const gameIds = games.map(g => g._id);

    const [likeCounts, commentCounts, userLikes] = await Promise.all([
      GameLike.aggregate([
        { $match: { game: { $in: gameIds } } },
        { $group: { _id: '$game', count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { game: { $in: gameIds }, deletedAt: null } },
        { $group: { _id: '$game', count: { $sum: 1 } } },
      ]),
      req.user
        ? GameLike.find({ user: req.user._id, game: { $in: gameIds } }).select('game').lean()
        : Promise.resolve([]),
    ]);

    const likeMap = {};
    likeCounts.forEach(l => { likeMap[l._id.toString()] = l.count; });
    const commentMap = {};
    commentCounts.forEach(c => { commentMap[c._id.toString()] = c.count; });
    const userLikeSet = new Set(userLikes.map(l => l.game.toString()));

    const result = {};
    games.forEach(g => {
      const gid = g._id.toString();
      result[g.slug] = {
        totalLikes: likeMap[gid] || 0,
        totalComments: commentMap[gid] || 0,
        userLiked: userLikeSet.has(gid),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  toggleLike,
  getLikes,
  getComments,
  addComment,
  editComment,
  deleteComment,
  reportComment,
  getMyComments,
  adminGetComments,
  adminDeleteComment,
  getGameReviewSummary,
  getBulkReviewSummary,
};
