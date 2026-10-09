const PlatformSettings = require('../models/PlatformSettings');
const { runWithSettings } = require('../utils/betaAccess');

module.exports = async (req, res, next) => {
  try {
    // Read per request: a switch applies across workers without restarting the API.
    const settings = await PlatformSettings.findById('platform').lean();
    res.set('Cache-Control', 'no-store');
    return runWithSettings(settings, next);
  } catch (error) {
    console.error('Platform settings unavailable:', error.message);
    return res.status(503).json({ message: 'Nie udało się sprawdzić ustawień platformy. Spróbuj ponownie.' });
  }
};
