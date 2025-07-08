const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// 📩 Wysyłanie nowej wiadomości
router.post('/send', async (req, res) => {
  const { from, to, content } = req.body;

  if (!from || !to || !content) {
    return res.status(400).json({ message: 'Brakuje danych: from, to, content' });
  }

  try {
    const sender = await User.findOne({ firebaseUid: from });
    const receiver = await User.findOne({ firebaseUid: to });

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Nie znaleziono użytkowników' });
    }

    const fromName = sender.name || sender.email;
    const toName = receiver.name || receiver.email;

    const participantsSorted = [from, to].sort();
    const convo = await Conversation.findOne({
      'participants.uid': { $all: participantsSorted }
    });

    if (convo) {
      const lastMsg = convo.messages[convo.messages.length - 1];
      if (lastMsg?.fromUid === from) {
        return res.status(403).json({ message: 'Poczekaj na odpowiedź drugiej osoby.' });
      }

      convo.messages.push({
        fromUid: from,
        fromName,
        toUid: to,
        toName,
        content
      });
      convo.updatedAt = new Date();
      await convo.save();
      return res.status(200).json(convo);
    } else {
      const newConvo = await Conversation.create({
        participants: [
          { uid: from, name: fromName },
          { uid: to, name: toName }
        ],
        messages: [
          {
            fromUid: from,
            fromName,
            toUid: to,
            toName,
            content
          }
        ]
      });

      return res.status(200).json(newConvo);
    }
  } catch (err) {
    console.error('❌ Błąd zapisu wiadomości:', err);
    res.status(500).json({ message: 'Błąd zapisu wiadomości' });
  }
});

// 📬 Pobierz wszystkie konwersacje użytkownika
router.get('/by-uid/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const conversations = await Conversation.find({ 'participants.uid': uid }).sort({ updatedAt: -1 });

    const result = conversations.map(convo => {
      const other = convo.participants.find(p => p.uid !== uid);
      const lastMsg = convo.messages[convo.messages.length - 1];

      return {
        _id: convo._id,
        withUid: other?.uid,
        withName: other?.name,
        lastMessage: lastMsg,
        unreadCount: convo.messages.filter(m => m.toUid === uid && !m.read).length
      };
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

// 🧵 Pobranie pełnej konwersacji
router.get('/:id', async (req, res) => {
  const uid = req.headers['uid'];
  const convoId = req.params.id;

  try {
    const convo = await Conversation.findById(convoId);
    if (!convo || !convo.participants.some(p => p.uid === uid)) {
      return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
    }

    res.json({
      _id: convo._id,
      participants: convo.participants,
      messages: convo.messages
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
    res.status(500).json({ message: 'Błąd oznaczania jako przeczytane' });
  }
});

// 🔍 Sprawdź czy konwersacja istnieje między użytkownikami
router.get('/check/:uid1/:uid2', async (req, res) => {
  const [uid1, uid2] = [req.params.uid1, req.params.uid2].sort();
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
    res.status(500).json({ message: 'Błąd sprawdzania konwersacji' });
  }
});

module.exports = router;
