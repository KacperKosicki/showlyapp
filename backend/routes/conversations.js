const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const CHANNELS = ['account_to_profile', 'profile_to_account'];

function makePairKey(a, b) {
  return [a, b].sort().join('|');
}

async function getUsersMapByFirebaseUid(uids = []) {
  if (!uids.length) return new Map();
  const users = await User.find({ firebaseUid: { $in: uids } })
    .select('firebaseUid displayName name avatar email');
  const map = new Map();
  users.forEach(u => {
    map.set(u.firebaseUid, {
      displayName: u.displayName || u.name || u.email || 'Użytkownik',
      avatar: u.avatar || '',
      email: u.email || ''
    });
  });
  return map;
}

async function ensureUser(uid) {
  let u = await User.findOne({ firebaseUid: uid }).select('_id firebaseUid');
  if (!u) u = await User.create({ firebaseUid: uid });
  return u;
}

/**
 * POST /api/conversations/send
 * body:
 *  - WĄTEK NOWY (start “ZADAJ PYTANIE”): { from, to, content, channel }
 *      • szukamy otwartego wątku pairKey+channel z firstFromUid === from
 *      • jeśli brak → tworzymy nowy (firstFromUid = from)
 *
 *  - Odpowiedź w ISTNIEJĄCYM wątku: { from, to, content, channel, conversationId }
 *      • dopinamy wiadomość po ID (nie tworzymy nowego wątku)
 *      • blokada dwóch wiadomości pod rząd od tej samej osoby
 */
router.post('/send', async (req, res) => {
  const { from, to, content, channel, conversationId } = req.body;

  if (!from || !to || !content) {
    return res.status(400).json({ message: 'Brakuje danych: from, to, content' });
  }
  if (!conversationId) {
    // tryb START lub kontynuacja własnego kanału startowego — potrzebny channel
    if (!channel) return res.status(400).json({ message: 'Brakuje parametru channel' });
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ message: 'Nieprawidłowy channel' });
    }
  }
  if (from === to) {
    return res.status(400).json({ message: 'Nadawca i odbiorca nie mogą być tacy sami' });
  }

  try {
    await Promise.all([ensureUser(from), ensureUser(to)]);
    const pairKey = makePairKey(from, to);

    // 🔹 ŚCIEŻKA 1: Odpowiedź w istniejącym wątku po ID (nie tworzymy nowego)
    if (conversationId) {
      const convo = await Conversation.findById(conversationId);
      if (!convo) {
        return res.status(404).json({ message: 'Nie znaleziono konwersacji' });
      }
      if (convo.isClosed) {
        return res.status(403).json({ message: 'Wątek jest zamknięty' });
      }
      // bezpieczeństwo: uczestnicy i pairKey muszą pasować
      if (convo.pairKey !== pairKey) {
        return res.status(403).json({ message: 'Niewłaściwi uczestnicy dla tego wątku' });
      }
      if (channel && convo.channel !== channel) {
        return res.status(403).json({ message: 'Kanał nie zgadza się z wątkiem' });
      }
      const isParticipant = convo.participants.some(p => p.uid === from);
      if (!isParticipant) {
        return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
      }

      const last = convo.messages[convo.messages.length - 1];
      if (last && last.fromUid === from) {
        return res.status(403).json({ message: 'Poczekaj na odpowiedź drugiej osoby.' });
      }

      // wyliczamy odbiorcę z wątku, żeby nie dało się "przekręcić" to
      const other = convo.participants.find(p => p.uid !== from);
      if (!other) {
        return res.status(400).json({ message: 'Nie udało się ustalić odbiorcy' });
      }

      convo.messages.push({ fromUid: from, toUid: other.uid, content });
      convo.updatedAt = new Date();
      await convo.save();

      return res.status(200).json({ ok: true, id: convo._id });
    }

    // 🔹 ŚCIEŻKA 2: Start/ciąg dalszy własnego “startowego” wątku (konto ➜ wizytówka)
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ message: 'Nieprawidłowy channel' });
    }

    // Szukamy TYLKO wątku zaczętego przez "from" (firstFromUid === from)
    let convo = await Conversation.findOne({
      pairKey,
      channel,
      firstFromUid: from,
      isClosed: { $ne: true }
    }).sort({ updatedAt: -1 });

    if (!convo) {
      // brak — tworzymy NOWY wątek
      convo = await Conversation.create({
        channel,
        pairKey,
        participants: [{ uid: from }, { uid: to }],
        firstFromUid: from,
        messages: []
      });
    } else {
      // wątek istnieje — pilnujemy, by nie wysłać dwóch msg pod rząd
      const last = convo.messages[convo.messages.length - 1];
      if (last && last.fromUid === from) {
        return res.status(403).json({ message: 'Poczekaj na odpowiedź drugiej osoby.' });
      }
    }

    convo.messages.push({ fromUid: from, toUid: to, content });
    convo.updatedAt = new Date();
    await convo.save();

    return res.status(200).json({ ok: true, id: convo._id });
  } catch (err) {
    console.error('❌ Błąd zapisu wiadomości:', err);
    return res.status(500).json({ message: 'Błąd zapisu wiadomości' });
  }
});

/**
 * GET /api/conversations/by-uid/:uid
 * opcjonalnie ?channel=
 */
router.get('/by-uid/:uid', async (req, res) => {
  const uid = req.params.uid;
  const { channel } = req.query;

  try {
    const findQuery = { 'participants.uid': uid };
    if (channel) {
      if (!CHANNELS.includes(channel)) {
        return res.status(400).json({ message: 'Nieprawidłowy channel' });
      }
      findQuery.channel = channel;
    }

    const conversations = await Conversation.find(findQuery).sort({ updatedAt: -1 });

    const otherUids = [];
    conversations.forEach(c => {
      const other = c.participants.find(p => p.uid !== uid);
      if (other?.uid) otherUids.push(other.uid);
    });

    const usersMap = await getUsersMapByFirebaseUid(otherUids);

    const result = conversations.map(c => {
      const other = c.participants.find(p => p.uid !== uid);
      const otherInfo = usersMap.get(other?.uid) || {
        displayName: 'Użytkownik',
        avatar: '',
        email: ''
      };
      const lastMessage = c.messages[c.messages.length - 1] || null;
      const unreadCount = c.messages.filter(m => m.toUid === uid && !m.read).length;

      return {
        _id: c._id,
        channel: c.channel,
        withUid: other?.uid || null,
        withDisplayName: otherInfo.displayName,
        withAvatar: otherInfo.avatar,
        lastMessage,
        unreadCount,
        updatedAt: c.updatedAt,
        firstFromUid: c.firstFromUid || (c.messages[0]?.fromUid ?? null),
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    return res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

/**
 * GET /api/conversations/:id
 * HEADERS: { uid: <currentUserUid> }
 */
router.get('/:id', async (req, res) => {
  const requesterUid = req.headers['uid'];
  const convoId = req.params.id;

  try {
    const convo = await Conversation.findById(convoId);
    if (!convo) return res.status(404).json({ message: 'Nie znaleziono konwersacji' });

    const isParticipant = convo.participants.some(p => p.uid === requesterUid);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
    }

    const participantUids = convo.participants.map(p => p.uid);
    const usersMap = await getUsersMapByFirebaseUid(participantUids);

    const participants = convo.participants.map(p => ({
      uid: p.uid,
      displayName: usersMap.get(p.uid)?.displayName || 'Użytkownik',
      avatar: usersMap.get(p.uid)?.avatar || ''
    }));

    return res.json({
      _id: convo._id,
      channel: convo.channel,
      participants,
      messages: convo.messages,
      updatedAt: convo.updatedAt,
      firstFromUid: convo.firstFromUid
    });
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    return res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

/**
 * PATCH /api/conversations/:id/read
 * HEADERS: { uid: <currentUserUid> }
 */
router.patch('/:id/read', async (req, res) => {
  const uid = req.headers['uid'];
  if (!uid) return res.status(400).json({ message: 'Brakuje nagłówka uid' });

  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: 'Nie znaleziono' });

    const isParticipant = convo.participants.some(p => p.uid === uid);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
    }

    let changed = false;
    convo.messages.forEach(m => {
      if (m.toUid === uid && !m.read) {
        m.read = true;
        changed = true;
      }
    });

    if (changed) await convo.save();
    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Błąd oznaczania jako przeczytane:', err);
    return res.status(500).json({ message: 'Błąd oznaczania jako przeczytane' });
  }
});

/**
 * GET /api/conversations/check/:uid1/:uid2?channel=...&starter=<uid>
 * - ostatni OTWARTY wątek (jeśli istnieje)
 * - jeżeli podasz starter → zawęża do wątków zaczętych przez startera
 */
router.get('/check/:uid1/:uid2', async (req, res) => {
  const [uid1, uid2] = [req.params.uid1, req.params.uid2];
  const { channel, starter } = req.query;

  if (!channel) {
    return res.status(400).json({ message: 'Brakuje parametru channel' });
  }
  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ message: 'Nieprawidłowy channel' });
  }

  try {
    const pairKey = makePairKey(uid1, uid2);
    const query = { pairKey, channel, isClosed: { $ne: true } };
    if (starter) query.firstFromUid = starter;

    const convo = await Conversation.findOne(query).sort({ updatedAt: -1 });

    if (convo) return res.json({ exists: true, id: convo._id });
    return res.json({ exists: false });
  } catch (err) {
    console.error('❌ Błąd sprawdzania konwersacji:', err);
    return res.status(500).json({ message: 'Błąd sprawdzania konwersacji' });
  }
});

module.exports = router;
