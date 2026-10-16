import { getAvailabilityPresentation } from '../../utils/profileAvailabilityStatus';
const parsed = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return undefined; } };
export const normalizeFavoriteProfile = (item = {}) => {
  const profile = item?.profile || item?.profileData || item?.profileDoc || item;
  const theme = parsed(profile.theme ?? item.theme ?? item.profileTheme ?? item.themeConfig);
  const partner = parsed(profile.partnership ?? item.partnership ?? item.partnerData ?? item.profilePartnership);
  const isPartner = partner?.isPartner ?? profile.isPartner ?? item.isPartner ?? profile.partner ?? item.partner ?? false;
  return {
    ...item, ...profile, ...(theme ? { theme } : {}), userId: profile.userId || item.userId || item.profileUserId || item.profileId || profile._id || item._id,
    partnership: isPartner ? { ...partner, isPartner: true, tier: String(partner?.tier ?? profile.partnerTier ?? item.partnerTier ?? 'partner').toLowerCase(), badgeText: partner?.badgeText || partner?.label || profile.partnerLabel || item.partnerLabel || 'Partner Showly' } : partner || {}, isFavorite: true
  };
};
export const isAcceptingWork = (profile, now = new Date()) => {
  if (profile.isVisible === false || profile.visibilityBlockedByAdmin) return false;
  if (!profile.billingPublic?.betaPremiumEnabled && profile.visibleUntil && new Date(profile.visibleUntil) < now) return false;
  return ['open', 'limited'].includes(getAvailabilityPresentation(profile.availabilityStatus, now)?.state);
};
const searchable = value => String(value || '').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
export const filterFavorites = (profiles, { query = '', filter = 'all', sort = 'default', now = new Date() } = {}) => {
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
  const result = profiles.filter(profile => {
    if (filter === 'available' && !isAcceptingWork(profile, now)) return false;
    const services = (profile.services || []).filter(service => service.isActive !== false).map(service => service.name);
    const text = searchable([profile.name, profile.role, profile.location, ...(profile.tags || []), ...services].join(' '));
    return terms.every(term => text.includes(term));
  });
  if (sort === 'name') result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));
  if (sort === 'rating') result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.reviews) || 0) - (Number(a.reviews) || 0));
  return result;
};
