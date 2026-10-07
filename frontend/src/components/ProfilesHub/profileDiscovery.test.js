import { discoverProfiles, normalizeSearch } from './profileDiscovery';
const labels = { category: value => typeof value === 'string' ? value : value?.label, type: value => value, booking: value => value };
const profiles = [
  { name: 'Anna', location: 'Łódź', category: { label: 'Fotografia' }, services: [{ name: 'Portrety w plenerze' }], rating: 4.8, visits: 0, views: 99, isFavorite: true, createdAt: '2026-01-01' },
  { name: 'Ola', location: 'Poznań', category: 'Beauty', tags: ['makijaż'], rating: 3, visits: 20, createdAt: '2026-02-01' },
];
test('matches Polish letters and all words independently across services and location', () => {
  expect(normalizeSearch('ŁÓDŹ')).toBe('lodz');
  expect(discoverProfiles(profiles, { query: 'plenerze portrety', place: 'lodz' }, labels).map(p => p.name)).toEqual(['Anna']);
  expect(discoverProfiles(profiles, { query: 'makijaz' }, labels).map(p => p.name)).toEqual(['Ola']);
  expect(discoverProfiles(profiles, { query: 'portrety makijaz' }, labels)).toEqual([]);
});
test('combines category, ratings and favorite filters and respects zero visits', () => {
  expect(discoverProfiles(profiles, { category: 'Fotografia', ratedOnly: true, favoritesOnly: true }, labels).map(p => p.name)).toEqual(['Anna']);
  expect(discoverProfiles(profiles, { category: 'Beauty', ratedOnly: true }, labels)).toEqual([]);
  expect(discoverProfiles(profiles, {}, labels).map(p => p.name)).toEqual(['Ola', 'Anna']);
  expect(profiles[0].name).toBe('Anna');
});
test('sorts by rating and creation date', () => {
  expect(discoverProfiles(profiles, { sort: 'rating' }, labels)[0].name).toBe('Anna');
  expect(discoverProfiles(profiles, { sort: 'newest' }, labels)[0].name).toBe('Ola');
});
