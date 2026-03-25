const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
});

// Helper: get a setting by key with optional default
appSettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper: set a setting by key (upsert)
appSettingsSchema.statics.setSetting = async function (key, value) {
  return this.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true, runValidators: true }
  );
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
