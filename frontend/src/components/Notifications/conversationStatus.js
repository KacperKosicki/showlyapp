const statuses = {
  profile_expired: ['Profil wygasł', 'Historia rozmowy jest zachowana. Rozmowa będzie dostępna po odnowieniu profilu.'],
  profile_missing: ['Profil został usunięty', 'Ten usługodawca nie ma obecnie wizytówki. Historia rozmowy jest zachowana.'],
  profile_hidden: ['Profil jest niewidoczny', 'Rozmowa będzie dostępna po ponownym włączeniu profilu. Historia jest zachowana.'],
  profile_blocked: ['Profil jest zablokowany', 'Rozmowa jest niedostępna. Historia została zachowana.'],
  account_missing: ['Konto zostało usunięte', 'Rozmowa jest niedostępna, ponieważ jedno z kont już nie istnieje. Historia została zachowana.'],
  account_disabled: ['Konto jest zablokowane', 'Rozmowa jest niedostępna do czasu odblokowania konta. Historia została zachowana.'],
  announcement_deleted: ['Ogłoszenie zostało usunięte', 'Rozmowy dotyczące tego ogłoszenia zostały usunięte.'],
  conversation_missing: ['Rozmowa nie istnieje', 'Mogła zostać usunięta wraz z ogłoszeniem. Pozostałe rozmowy znajdziesz w Powiadomieniach.'],
  unavailable: ['Nie można sprawdzić stanu rozmowy', 'Spróbuj ponownie za chwilę. Historia rozmowy jest zachowana.'],
};
export const conversationStatus = reason => statuses[reason] || statuses.unavailable;
