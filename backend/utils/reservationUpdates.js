function markReservationUpdate(reservation, side, type, now = new Date()) {
  reservation[`${side}Seen`] = false;
  reservation[`${side}UpdateType`] = type;
  reservation[`${side}UpdateAt`] = now;
}
const unreadReservationQuery = uid => ({
  offline: { $ne: true }, status: { $ne: 'tymczasowa' },
  $or: [{ userId: uid, clientSeen: false }, { providerUserId: uid, providerSeen: false }],
});
module.exports = { markReservationUpdate, unreadReservationQuery };
