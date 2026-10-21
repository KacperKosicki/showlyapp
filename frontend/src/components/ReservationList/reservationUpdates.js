export const isReservationUnread = (reservation, variant) => !reservation.offline && reservation[variant === 'sent' ? 'clientSeen' : 'providerSeen'] === false;
export function reservationUpdateLabel(reservation, variant) {
  const side = variant === 'sent' ? 'client' : 'provider';
  const type = reservation[`${side}UpdateType`];
  if (type === 'note') return side === 'client' ? 'Usługodawca dodał informację do rezerwacji.' : 'Klient dodał informację do rezerwacji.';
  if (type === 'expired' || reservation.closedReason === 'expired') return 'Rezerwacja wygasła — czas na potwierdzenie minął.';
  if (reservation.status === 'anulowana') return reservation.closedBy === 'provider' ? 'Usługodawca anulował rezerwację.' : 'Klient anulował rezerwację.';
  if (reservation.status === 'odrzucona') return 'Usługodawca odrzucił rezerwację.';
  if (reservation.status === 'zaakceptowana') return 'Rezerwacja została potwierdzona.';
  return 'Nowa rezerwacja do sprawdzenia.';
}
