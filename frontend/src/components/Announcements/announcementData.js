export const categories = [
  ['music', 'Muzyka i wydarzenia'], ['photo', 'Fotografia i film'], ['beauty', 'Beauty i styl'],
  ['flowers', 'Kwiaty i dekoracje'], ['development', 'Programowanie i strony'], ['design', 'Grafika i kreacja'],
  ['education', 'Nauka i korepetycje'], ['local', 'Usługi lokalne'], ['other', 'Inny pomysł'],
];
export const workModes = { onsite: 'Na miejscu', remote: 'Zdalnie', hybrid: 'Na miejscu / zdalnie' };
export const scopes = { once: 'Jednorazowo', project: 'Projekt', recurring: 'Stała współpraca' };
export const statuses = { active: 'Widoczne', draft: 'Szkic', expired: 'Wygasło', paused: 'Ukryte', closed: 'Zakończone' };
export const applicationStatuses = { pending: 'Oczekuje na odpowiedź', shortlisted: 'Do dalszej rozmowy', declined: 'Odrzucone', withdrawn: 'Wycofane' };
export const emptyAnnouncement = { title: '', description: '', category: 'other', workMode: 'onsite', location: '', scope: 'once', dateMode: 'flexible', dateFrom: '', dateTo: '', budgetMode: 'negotiable', budgetMin: '', budgetMax: '' };
export const categoryName = value => categories.find(([key]) => key === value)?.[1] || 'Inny pomysł';
export const formatDate = value => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const money = value => Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 2 });
export const budgetLabel = item => item.budgetMode === 'negotiable' ? 'Do ustalenia' : item.budgetMode === 'fixed' ? `${money(item.budgetMin)} zł` : `${money(item.budgetMin)}–${money(item.budgetMax)} zł`;
export const dateLabel = item => item.dateMode === 'flexible' ? 'Termin do ustalenia' : item.dateMode === 'range' ? `${formatDate(item.dateFrom)} – ${formatDate(item.dateTo)}` : formatDate(item.dateFrom);
const pluralRules = new Intl.PluralRules('pl-PL');
export const countLabel = (count, kind = 'announcements') => {
  const words = kind === 'applications'
    ? { one: 'zgłoszenie', few: 'zgłoszenia', many: 'zgłoszeń', other: 'zgłoszeń' }
    : { one: 'ogłoszenie', few: 'ogłoszenia', many: 'ogłoszeń', other: 'ogłoszeń' };
  return `${count} ${words[pluralRules.select(count)]}`;
};
export const examples = [
  { ...emptyAnnouncement, _id: 'demo-dj', title: 'Szukam DJ-a na nasze wesele', description: 'Muzyka, która połączy pokolenia. Szukamy DJ-a z własnym nagłośnieniem i otwartością na naszą playlistę.', category: 'music', location: 'Poznań', budgetMode: 'range', budgetMin: 2500, budgetMax: 4000 },
  { ...emptyAnnouncement, _id: 'demo-web', title: 'Kto stworzy stronę dla pracowni?', description: 'Mała pracownia ceramiczna potrzebuje własnego miejsca w sieci. Strona z galerią, ofertą i prostym formularzem.', category: 'development', workMode: 'remote', scope: 'project', budgetMode: 'range', budgetMin: 3000, budgetMax: 6000 },
  { ...emptyAnnouncement, _id: 'demo-flowers', title: 'Kwiaty, które zrobią klimat', description: 'Szukam florysty do przygotowania naturalnych dekoracji stołów. Chętnie poznam pomysły i proponowany zakres.', category: 'flowers', location: 'Wrocław' },
  { ...emptyAnnouncement, _id: 'demo-lessons', title: 'Matematyka bez stresu', description: 'Regularne korepetycje online, raz w tygodniu. Zależy mi na spokojnym tłumaczeniu i przygotowaniu do matury.', category: 'education', workMode: 'remote', scope: 'recurring', budgetMode: 'fixed', budgetMin: 100, budgetMax: 100 },
];
