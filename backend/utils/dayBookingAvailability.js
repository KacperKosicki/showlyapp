const { randomUUID } = require('node:crypto');
const Lock = require('../models/BookingWriteLock');
const { fail, conflicts, scheduleError, occupiedDates } = require('./dayBooking');
async function acquireDayLock(providerUserId) {
  const token = randomUUID(), now = new Date();
  try {
    await Lock.findOneAndUpdate({ _id: String(providerUserId), expiresAt: { $lte: now } }, { $set: { token, expiresAt: new Date(+now + 120000) } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code === 11000) throw fail('Trwa potwierdzanie innego terminu. Spróbuj ponownie.', 409);
    throw error;
  }
  return () => Lock.deleteOne({ _id: String(providerUserId), token });
}
async function ensureDayAvailable(Reservation, profile, booking, excludeId) {
  const message = scheduleError(profile, booking);
  if (message) throw fail(message, 409);
  if (booking.bookingKind === 'order') return;
  const dates = occupiedDates(booking);
  const filter = { providerUserId: profile.userId, status: 'zaakceptowana', date: { $lte: dates.at(-1) }, $or: [{ date: { $gte: booking.date } }, { endDate: { $gt: booking.date } }] };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Reservation.find(filter).lean();
  if (existing.some(item => conflicts(booking, item))) throw fail('Ten termin koliduje z potwierdzoną rezerwacją. Wybierz inny termin.', 409);
}
module.exports = { acquireDayLock, ensureDayAvailable };
