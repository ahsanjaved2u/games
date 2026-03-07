const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/auth');
const {
  getGames,
  getGameBySlug,
  getAllGamesAdmin,
  createGame,
  updateGame,
  deleteGame,
  toggleLive,
  uploadGameFiles,
} = require('../controllers/gameController');
const { adminEndCompetitionNow } = require('../controllers/competitionController');

// Multer — store ZIP in memory (small games, <50 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
});

// ── Public ──
router.get('/', getGames);

// ── Admin ── (must come before /:slug to avoid matching "admin")
router.get('/admin/all', protect, admin, getAllGamesAdmin);
router.post('/', protect, admin, createGame);
router.put('/:id', protect, admin, updateGame);
router.delete('/:id', protect, admin, deleteGame);
router.patch('/:id/toggle-live', protect, admin, toggleLive);
router.patch('/:id/end-competition', protect, admin, adminEndCompetitionNow);
router.post('/:id/upload', protect, admin, upload.single('gameZip'), uploadGameFiles);

// ── Public (slug param — MUST be last) ──
router.get('/:slug', getGameBySlug);

module.exports = router;
