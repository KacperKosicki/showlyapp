const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const Profile = require('../models/Profile');
const PlatformSettings = require('../models/PlatformSettings');

const publicSettings = (settings) => ({
  enabled: settings?.betaPremiumEnabled === true,
  enabledAt: settings?.enabledAt || null,
  updatedAt: settings?.updatedAt || null,
});
router.get('/beta-premium', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    return res.json(publicSettings(await PlatformSettings.findById('platform').lean()));
  } catch (error) {
    return res.status(503).json({ message: 'Nie udało się pobrać ustawień testów.' });
  }
});
router.patch('/beta-premium', requireAuth, requireRole(['admin']), async (req, res) => {
  if (typeof req.body.enabled !== 'boolean') return res.status(400).json({ message: 'Podaj enabled jako wartość logiczną.' });
  try {
    if (req.body.enabled && /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || '')) {
      await Profile.updateMany({
        'billing.stripeSubscriptionId': { $nin: ['', null], $exists: true },
        'billing.paymentEnvironment': { $in: ['unknown', null] },
      }, { $set: { 'billing.paymentEnvironment': 'test' } });
    }
    const settings = await PlatformSettings.findOneAndUpdate({ _id: 'platform' }, {
      $set: { betaPremiumEnabled: req.body.enabled, enabledAt: req.body.enabled ? new Date() : null, updatedBy: req.auth.uid },
    }, { upsert: true, new: true, runValidators: true });
    return res.json(publicSettings(settings));
  } catch (error) {
    return res.status(503).json({ message: 'Nie udało się zapisać ustawień testów.' });
  }
});

module.exports = router;
