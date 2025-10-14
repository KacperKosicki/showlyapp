const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const Profile = require('../models/Profile');
const Reservation = require('../models/Reservation');

// 🔧 Helpery dat i czasu (zamiast dayjs)
function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function addMinutes(date, m) {
    return new Date(date.getTime() + m * 60000);
}

function startOfDay(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(dateStr) {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
}

function getWeekday(dateStr) {
    const d = new Date(dateStr);
    return d.getDay(); // 0 = niedziela, 6 = sobota
}

function toMinutesFromUnit(value, unit) {
    if (unit === 'godziny') return value * 60;
    if (unit === 'dni') return value * 60 * 24;
    return value; // 'minuty'
}

function getServiceDurationForStaff(globalService, staff) {
    const ov = staff.overrides?.find(o => String(o.serviceId) === String(globalService._id));
    if (!ov) return { value: globalService.durationValue, unit: globalService.durationUnit };
    return {
        value: ov.durationValue ?? globalService.durationValue,
        unit: ov.durationUnit ?? globalService.durationUnit,
    };
}

// 🧩 Główna trasa
router.get('/', async (req, res) => {
    try {
        const { profileId, serviceId, date, staffId } = req.query;
        if (!profileId || !serviceId || !date)
            return res.status(400).json({ error: 'profileId, serviceId, date wymagane' });

        const profile = await Profile.findById(profileId).lean();
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        if (profile.bookingMode !== 'calendar') return res.json([]); // tylko calendar generuje sloty

        // pobierz usługę z profilu
        const service = (profile.services || []).find(s => String(s._id) === String(serviceId));
        if (!service) return res.status(404).json({ error: 'Service not found' });

        // wybór personelu
        const staffQuery = { profileId, active: true };
        if (staffId) staffQuery._id = staffId;
        let staffList = await Staff.find(staffQuery).lean();

        // filtruj po usługach
        staffList = staffList.filter(s =>
            (s.serviceIds || []).some(id => String(id) === String(serviceId))
        );

        const results = [];
        const STEP = 15; // odstęp między slotami

        for (const s of staffList) {
            // pomiń osoby, które mają dzień wolny
            if ((s.daysOff || []).includes(date)) continue;

            const weekday = getWeekday(date); // 0–6
            const rawHours =
                (s.workingHours?.get?.(String(weekday)) ||
                    s.workingHours?.get?.(weekday) ||
                    s.workingHours?.[weekday] ||
                    []) ?? [];

            const intervals = rawHours.map(i => ({ start: i.start, end: i.end }));
            if (!intervals.length) continue;

            const { value, unit } = getServiceDurationForStaff(service, s);
            const durationMin = toMinutesFromUnit(value, unit);

            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);

            // pobierz rezerwacje tej osoby w danym dniu
            const reservations = await Reservation.find({
                profileId,
                staffId: s._id,
                status: { $in: ['pending', 'accepted'] },
                start: { $lt: dayEnd },
                end: { $gt: dayStart },
            }).lean();

            // generowanie slotów
            for (const interval of intervals) {
                const startM = toMinutes(interval.start);
                const endM = toMinutes(interval.end);

                for (let t = startM; t + durationMin <= endM; t += STEP) {
                    const start = addMinutes(dayStart, t);
                    const end = addMinutes(start, durationMin);

                    // sprawdź kolizje z rezerwacjami
                    const overlapCount = reservations.filter(
                        r => new Date(r.start) < end && new Date(r.end) > start
                    ).length;
                    const free = overlapCount < (s.capacity ?? 1);

                    if (free) {
                        results.push({ staffId: s._id, start, end });
                    }
                }
            }
        }

        res.json(results);
    } catch (err) {
        console.error('Błąd w /slots:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
