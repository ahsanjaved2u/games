const AppSettings = require('../models/AppSettings');

// GET /api/settings/public — anyone can read public settings (signup reward, etc.)
exports.getPublicSettings = async (req, res, next) => {
  try {
    const signupReward = await AppSettings.getSetting('signupReward', 0);
    res.json({ success: true, signupReward: Number(signupReward) });
  } catch (error) {
    next(error);
  }
};

// GET /api/settings — admin reads all settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const docs = await AppSettings.find().sort('key').lean();
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings — admin updates settings
exports.updateSettings = async (req, res, next) => {
  try {
    const { signupReward } = req.body;

    if (signupReward !== undefined) {
      const val = Number(signupReward);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: 'signupReward must be a non-negative number' });
      }
      await AppSettings.setSetting('signupReward', val);
    }

    // Return updated settings
    const docs = await AppSettings.find().sort('key').lean();
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};
