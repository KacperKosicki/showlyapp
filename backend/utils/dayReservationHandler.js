const { buildDayBooking, fail } = require('./dayBooking');
const { acquireDayLock, ensureDayAvailable } = require('./dayBookingAvailability');
module.exports = function dayReservationHandler({ Reservation, Profile, User, getReservationPlanAccess, ensureServiceIsBookable, calculatePendingExpiresAt, sendPushToUserUid, FRONTEND_URL }, offline = false) {
  return async (req, res) => {
    let release;
    try {
      const body = req.body;
      if (String(offline ? body.providerUserId : body.userId) !== String(req.auth.uid)) throw fail('Brak uprawnień.', 403);
      if (!body.providerUserId || !body.providerProfileId || !body.date) throw fail('Brak wymaganych danych.');
      if (offline && !String(body.offlineClientName || '').trim()) throw fail('Podaj nazwę klienta.');
      const profile = await Profile.findById(body.providerProfileId).lean();
      if (!profile) throw fail('Profil nie istnieje.', 404);
      if (String(profile.userId) !== String(body.providerUserId)) throw fail('Nieprawidłowy profil usługodawcy.', 403);
      const access = getReservationPlanAccess(profile);
      if (access.bookingMode !== 'request-blocking') throw fail('Rezerwacje na datę wymagają aktywnego planu i włączonego trybu.', 403);
      const booking = buildDayBooking(profile, body);
      const check = ensureServiceIsBookable(profile, body.serviceId);
      if (!check.ok) throw fail(check.message, check.status);
      if ((profile.services || []).some(s => s.isActive !== false) && !check.service) throw fail('Wybierz usługę.');
      const accepted = offline || access.autoAcceptReservations;
      const expiry = booking.bookingKind === 'hours' ? calculatePendingExpiresAt(booking.startAt) : new Date(Math.min(Date.now() + 60 * 60000, +booking.endAt));
      if (!accepted && (!expiry || expiry <= new Date())) throw fail('Ten termin jest zbyt blisko. Wybierz późniejszy lub skontaktuj się z usługodawcą.');
      release = await acquireDayLock(body.providerUserId);
      await ensureDayAvailable(Reservation, profile, booking);
      if (!offline) {
        const duplicate = await Reservation.findOne({ userId: req.auth.uid, providerUserId: body.providerUserId, date: booking.date, endDate: booking.endDate, bookingKind: booking.bookingKind, fromTime: booking.fromTime, toTime: booking.toTime, serviceId: body.serviceId || null, status: 'oczekująca', pendingExpiresAt: { $gt: new Date() } }).lean();
        if (duplicate) throw fail('Masz już oczekujące zgłoszenie na ten termin.', 409);
      }
      const client = offline ? null : await User.findOne({ firebaseUid: req.auth.uid }).lean();
      const name = offline ? String(body.offlineClientName).trim() : client?.name || body.userName || 'Klient';
      const created = await Reservation.create({
        ...booking, offline, userId: offline ? null : req.auth.uid, userName: name,
        offlineClientName: offline ? name : null, offlineClientPhone: offline ? String(body.offlineClientPhone || '').trim() : null, offlineNote: offline ? String(body.offlineNote || '').trim() : null,
        providerUserId: profile.userId, providerProfileId: profile._id, providerName: profile.name, providerProfileName: profile.name, providerProfileRole: profile.role,
        serviceId: check.service?._id ? String(check.service._id) : null, serviceName: check.service?.name || null,
        description: String(body.description || '').trim().slice(0, 4000), status: accepted ? 'zaakceptowana' : 'oczekująca', pendingExpiresAt: accepted ? null : expiry,
        providerSeen: offline, clientSeen: !accepted || offline, providerUpdateType: offline ? '' : 'created', providerUpdateAt: offline ? null : new Date(), clientUpdateType: accepted && !offline ? 'accepted' : '', clientUpdateAt: accepted && !offline ? new Date() : null,
      });
      await release().catch(console.error); release = null;
      const label = booking.bookingKind === 'order' ? 'Zamówienie' : 'Rezerwacja';
      if (!offline) {
        // Notification transport must not turn a successfully saved booking into a failed request.
        await sendPushToUserUid(profile.userId, { category: 'reservationRequests', title: booking.bookingKind === "order" ? "Nowe zamówienie" : "Nowa rezerwacja", body: `${name}: ${check.service?.name || label}, ${booking.date}${booking.bookingKind === 'stay' ? ' – ' + booking.endDate : booking.bookingKind === 'hours' ? ' ' + booking.fromTime + '–' + booking.toTime : ''}`, url: `${FRONTEND_URL}/rezerwacje` }).catch(console.error);
        if (accepted) await sendPushToUserUid(req.auth.uid, { category: 'reservationUpdates', title: booking.bookingKind === "order" ? "Zamówienie potwierdzone" : "Rezerwacja potwierdzona", body: `Termin: ${booking.date}. Szczegóły znajdziesz w rezerwacjach.`, url: `${FRONTEND_URL}/rezerwacje` }).catch(console.error);
      }
      return offline ? res.status(201).json({ reservation: created }) : res.json(created);
    } catch (error) {
      if (!error.status) console.error('Day booking failed:', error);
      return res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.status ? error.message : error.code === 11000 ? 'Ten termin został już zajęty.' : 'Nie udało się zapisać zgłoszenia.' });
    } finally { if (release) await release().catch(console.error); }
  };
};
