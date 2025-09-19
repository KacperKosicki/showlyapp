// routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');

/**
 * Pomocniczo: z listy uid-ów pobierz mapę firebaseUid -> {displayName, avatar, email}
 */
async function getUsersMapByFirebaseUid(uids = []) {
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

// 📩 Wyślij wiadomość
// body: { from: <uid>, to: <uid>, content: <string> }
router.post('/send', async (req, res) => {
  const { from, to, content } = req.body;
  if (!from || !to || !content) {
    return res.status(400).json({ message: 'Brakuje danych: from, to, content' });
  }

  try {
    // (opcjonalnie) weryfikacja, że obaj użytkownicy istnieją w naszej bazie
    const users = await User.find({ firebaseUid: { $in: [from, to] } }).select('_id firebaseUid');
    if (users.length !== 2) {
      return res.status(404).json({ message: 'Nie znaleziono uczestników rozmowy' });
    }

    let convo = await Conversation.findOne({
      'participants.uid': { $all: [from, to] }
    });

    if (!convo) {
      convo = await Conversation.create({
        participants: [{ uid: from }, { uid: to }],
        messages: []
      });
    }

    const last = convo.messages[convo.messages.length - 1];
    if (last && last.fromUid === from) {
      return res.status(403).json({ message: 'Poczekaj na odpowiedź drugiej osoby.' });
    }

    convo.messages.push({ fromUid: from, toUid: to, content });
    convo.updatedAt = new Date();
    await convo.save();

    return res.status(200).json({ ok: true, id: convo._id });
  } catch (err) {
    console.error('❌ Błąd zapisu wiadomości:', err);
    res.status(500).json({ message: 'Błąd zapisu wiadomości' });
  }
});

// 📬 Lista konwersacji użytkownika (skrót)
// GET /api/conversations/by-uid/:uid
router.get('/by-uid/:uid', async (req, res) => {
  const uid = req.params.uid;
  try {
    const conversations = await Conversation.find({ 'participants.uid': uid })
      .sort({ updatedAt: -1 });

    // zbierz uid-y „drugiej strony”
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
        withUid: other?.uid || null,
        withDisplayName: otherInfo.displayName,
        withAvatar: otherInfo.avatar,
        lastMessage,
        unreadCount,
        updatedAt: c.updatedAt
      };
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

// 🧵 Pełna konwersacja (widok wątku)
// HEADERS: { uid: <currentUserUid> }
router.get('/:id', async (req, res) => {
  const requesterUid = req.headers['uid'];
  const convoId = req.params.id;

  try {
    const convo = await Conversation.findById(convoId);
    if (!convo) return res.status(404).json({ message: 'Nie znaleziono konwersacji' });

    // Dostęp tylko dla uczestników
    const isParticipant = convo.participants.some(p => p.uid === requesterUid);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
    }

    // Hydratacja danych o uczestnikach
    const participantUids = convo.participants.map(p => p.uid);
    const usersMap = await getUsersMapByFirebaseUid(participantUids);

    // (opcjonalnie) możesz też dołączyć do każdej wiadomości nazwy/avatary nadawcy/odbiorcy,
    // ale zwykle wystarczy, że front ma mapę uczestników.
    const participants = convo.participants.map(p => ({
      uid: p.uid,
      displayName: usersMap.get(p.uid)?.displayName || 'Użytkownik',
      avatar: usersMap.get(p.uid)?.avatar || ''
    }));

    res.json({
      _id: convo._id,
      participants,
      messages: convo.messages,
      updatedAt: convo.updatedAt
    });
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

// ✅ Oznacz wszystkie wiadomości jako przeczytane
router.patch('/:id/read', async (req, res) => {
  const uid = req.headers['uid'];
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: 'Nie znaleziono' });

    convo.messages.forEach(m => {
      if (m.toUid === uid) m.read = true;
    });
    await convo.save();
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Błąd oznaczania jako przeczytane:', err);
    res.status(500).json({ message: 'Błąd oznaczania jako przeczytane' });
  }
});

// 🔍 Czy istnieje rozmowa między dwoma UID-ami
router.get('/check/:uid1/:uid2', async (req, res) => {
  const [uid1, uid2] = [req.params.uid1, req.params.uid2];
  try {
    const convo = await Conversation.findOne({
      'participants.uid': { $all: [uid1, uid2] }
    });
    if (convo) {
      res.json({ exists: true, id: convo._id });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('❌ Błąd sprawdzania konwersacji:', err);
    res.status(500).json({ message: 'Błąd sprawdzania konwersacji' });
  }
});

module.exports = router;
