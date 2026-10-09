const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();

const runWithSettings = (settings, callback) => context.run(settings || {}, callback);
const isBetaPremiumEnabled = () => context.getStore()?.betaPremiumEnabled === true;
const getBetaCampaignId = () => context.getStore()?.enabledAt || null;
function isBlocked(profile, now = new Date()) {
  return profile.visibilityBlockedByAdmin === true ||
    (profile.visibilityBlockedByAdmin === undefined && profile.isVisible === false && new Date(profile.visibleUntil) > now);
}
function isProfileVisible(profile, now = new Date()) {
  if (isBlocked(profile, now)) return false;
  return isBetaPremiumEnabled() || (profile.isVisible === true && new Date(profile.visibleUntil) > now);
}
function visibleProfileQuery(now = new Date()) {
  if (!isBetaPremiumEnabled()) return { isVisible: true, visibleUntil: { $gte: now } };
  return { visibilityBlockedByAdmin: { $ne: true }, $nor: [
    { visibilityBlockedByAdmin: { $exists: false }, isVisible: false, visibleUntil: { $gt: now } },
  ] };
}
function betaVisibility(profile) {
  return isBetaPremiumEnabled() && !isBlocked(profile) ? { isVisible: true, visibleUntil: null } : {};
}
function checkoutBlocked() {
  return isBetaPremiumEnabled() ? 'W czasie testów Premium jest bezpłatne. Nie musisz kupować planu ani podawać karty.' : null;
}
module.exports = { runWithSettings, isBetaPremiumEnabled, getBetaCampaignId, isProfileVisible, visibleProfileQuery, betaVisibility, checkoutBlocked };
