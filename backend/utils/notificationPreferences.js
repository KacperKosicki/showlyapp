const CATEGORIES = ['reservationRequests', 'reservationUpdates', 'messages', 'announcements'];
const normalizePreferences = (value = {}) => Object.fromEntries(CATEGORIES.map(key => [key, value?.[key] !== false]));
function validatePreferences(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 && Object.entries(value).every(([key, enabled]) => CATEGORIES.includes(key) && typeof enabled === 'boolean');
}
module.exports = { CATEGORIES, normalizePreferences, validatePreferences };
