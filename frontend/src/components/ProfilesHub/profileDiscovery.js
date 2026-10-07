export const normalizeSearch = (value) => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().trim();

export function discoverProfiles(profiles, { query = '', place = '', category = 'Wszystkie', type = 'Wszystkie', booking = 'Wszystkie', sort = 'popular', ratedOnly = false, favoritesOnly = false }, labels) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return profiles.filter(profile => {
    const profileCategory = labels.category(profile.category);
    const profileType = labels.type(profile.profileType);
    const profileBooking = labels.booking(profile.bookingMode);
    const text = normalizeSearch([profile.name, profile.role, profile.location, profile.description,
      profileCategory, profileType, profileBooking, ...(Array.isArray(profile.tags) ? profile.tags : []),
      ...(Array.isArray(profile.services) ? profile.services : []).map(service => [service?.name, service?.shortDescription, service?.description, ...(Array.isArray(service?.tags) ? service.tags : [])].filter(Boolean).join(' '))].filter(Boolean).join(' '));
    return (category === 'Wszystkie' || profileCategory === category)
      && (type === 'Wszystkie' || profileType === type)
      && (booking === 'Wszystkie' || profileBooking === booking)
      && terms.every(term => text.includes(term))
      && normalizeSearch(profile.location).includes(normalizeSearch(place))
      && (!ratedOnly || Number(profile.rating || 0) >= 4)
      && (!favoritesOnly || profile.isFavorite);
  }).sort((a, b) => {
    if (sort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
    if (sort === 'newest') return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
    return Number(b.visits ?? b.views ?? 0) - Number(a.visits ?? a.views ?? 0);
  });
}
