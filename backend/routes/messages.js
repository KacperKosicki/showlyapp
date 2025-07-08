const express = require('express');
const mongoose = require('mongoose'); // ⬅ NAJWAŻNIEJSZY BRAKUJĄCY IMPORT
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// 📩 Wysyłanie wiadomości
router.post('/send', async (req, res) => {
  const { from, to, content } = req.body;

  if (!from || !to || !content) {
    return res.status(400).json({ message: 'Brakuje danych: from, to, content' });
  }

  try {
    // Znajdź istniejący wątek
    const existingThread = await Message.findOne({
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    }).sort({ createdAt: -1 }); // ⬅️ ostatnia wiadomość

    const threadId = existingThread ? existingThread.threadId : new mongoose.Types.ObjectId().toString();

    // 🔒 BLOKADA SPAMU: jeśli istnieje wątek i ostatnia wiadomość była od nadawcy
    if (existingThread) {
      const lastMsg = await Message.findOne({ threadId }).sort({ createdAt: -1 });

      if (lastMsg && lastMsg.from === from) {
        return res.status(403).json({
          message: 'Nie możesz wysłać kolejnej wiadomości przed odpowiedzią drugiej osoby.',
        });
      }
    }

    const msg = await Message.create({ from, to, content, threadId });
    res.status(200).json(msg);
  } catch (err) {
    console.error('❌ Błąd zapisu wiadomości:', err);
    res.status(500).json({ message: 'Błąd zapisu wiadomości' });
  }
});

// 📥 Pobieranie wiadomości po firebaseUid
router.get('/inbox/by-uid/:uid', async (req, res) => {
  try {
    const messages = await Message.find({ to: req.params.uid }).sort({ createdAt: -1 });

    const senderUids = [...new Set(messages.map(msg => msg.from))];
    const senders = await User.find({ firebaseUid: { $in: senderUids } });

    const senderMap = {};
    senders.forEach(user => {
      senderMap[user.firebaseUid] = user.name || user.email;
    });

    const enrichedMessages = messages.map(msg => ({
      ...msg._doc,
      senderName: senderMap[msg.from] || msg.from
    }));

    res.json(enrichedMessages);
  } catch (err) {
    console.error('❌ Błąd pobierania wiadomości (by-uid):', err);
    res.status(500).json({ message: 'Błąd pobierania wiadomości' });
  }
});

// 📥 Pobieranie wiadomości po MongoDB _id
router.get('/inbox/by-id/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    const messages = await Message.find({ to: user.firebaseUid }).sort({ createdAt: -1 });

    const senderUids = [...new Set(messages.map(msg => msg.from))];
    const senders = await User.find({ firebaseUid: { $in: senderUids } });

    const senderMap = {};
    senders.forEach(user => {
      senderMap[user.firebaseUid] = user.name || user.email;
    });

    const enrichedMessages = messages.map(msg => ({
      ...msg._doc,
      senderName: senderMap[msg.from] || msg.from
    }));

    res.json(enrichedMessages);
  } catch (err) {
    console.error('❌ Błąd pobierania wiadomości (by-id):', err);
    res.status(500).json({ message: 'Błąd pobierania wiadomości' });
  }
});

// 📂 Pobierz całą konwersację (thread) z kontrolą dostępu
router.get('/thread/:threadId', async (req, res) => {
  const { threadId } = req.params;
  const uid = req.headers['uid']; // 👈 użytkownik wysyła swój identyfikator w nagłówku

  if (!uid) {
    return res.status(401).json({ message: 'Brak autoryzacji' });
  }

  try {
    const messages = await Message.find({ threadId }).sort({ createdAt: 1 });

    if (!messages.length) {
      return res.status(404).json({ message: 'Nie znaleziono konwersacji' });
    }

    // 👇 Sprawdzenie, czy użytkownik należy do tej konwersacji
    const isParticipant = messages.some(msg => msg.from === uid || msg.to === uid);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Brak dostępu do tej konwersacji' });
    }

    // ✅ Pobranie nazw
    const allUserIds = [...new Set(messages.flatMap(m => [m.from, m.to]))];
    const users = await User.find({ firebaseUid: { $in: allUserIds } });

    const nameMap = {};
    users.forEach(u => {
      nameMap[u.firebaseUid] = u.name || u.email;
    });

    const enriched = messages.map(msg => ({
      ...msg._doc,
      senderName: nameMap[msg.from] || msg.from,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('❌ Błąd pobierania wątku:', err);
    res.status(500).json({ message: 'Błąd pobierania wątku' });
  }
});

// 🔍 Sprawdzenie istnienia konwersacji
router.get('/check-conversation/:from/:to', async (req, res) => {
  const { from, to } = req.params;

  try {
    const existing = await Message.findOne({
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    });

    if (existing) {
      res.json({ exists: true, threadId: existing.threadId });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Błąd sprawdzania konwersacji' });
  }
});

// 🔢 Liczenie nieprzeczytanych
router.get('/unread/:userId', async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.params.userId, read: false });
    res.json({ count });
  } catch (err) {
    console.error('❌ Błąd liczenia nieprzeczytanych:', err);
    res.status(500).json({ message: 'Błąd liczenia nieprzeczytanych' });
  }
});

// ✅ Oznaczenie jako przeczytane
router.patch('/read/:messageId', async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.messageId, { read: true });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Błąd oznaczania jako przeczytane:', err);
    res.status(500).json({ message: 'Błąd oznaczania wiadomości' });
  }
});

// 🔁 Wysyłanie odpowiedzi w istniejącej konwersacji
router.post('/reply', async (req, res) => {
  const { from, to, content, threadId } = req.body;

  if (!from || !to || !content || !threadId) {
    return res.status(400).json({ message: 'Brakuje danych: from, to, content, threadId' });
  }

  try {
    const lastMsg = await Message.findOne({ threadId }).sort({ createdAt: -1 });

    if (lastMsg && lastMsg.from === from) {
      return res.status(403).json({ message: 'Nie możesz wysłać kolejnej wiadomości przed odpowiedzią drugiej osoby.' });
    }

    const msg = await Message.create({ from, to, content, threadId });
    res.status(200).json(msg);
  } catch (err) {
    console.error('❌ Błąd odpowiedzi na wiadomość:', err);
    res.status(500).json({ message: 'Błąd zapisu wiadomości (reply)' });
  }
});

// 📚 Lista wątków konwersacji użytkownika (ostatnia wiadomość z każdej)
router.get('/threads/by-uid/:uid', async (req, res) => {
  try {
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: req.params.uid },
            { to: req.params.uid }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$threadId',
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $replaceWith: '$lastMessage'
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    const uids = [...new Set(messages.flatMap(m => [m.from, m.to]))];
    const users = await User.find({ firebaseUid: { $in: uids } });

    const nameMap = {};
    users.forEach(user => {
      nameMap[user.firebaseUid] = user.name || user.email;
    });

    const enriched = messages.map(msg => ({
      ...msg,
      senderName: nameMap[msg.from],
      recipientName: nameMap[msg.to],
    }));

    res.json(enriched);
  } catch (err) {
    console.error('❌ Błąd pobierania konwersacji:', err);
    res.status(500).json({ message: 'Błąd pobierania konwersacji' });
  }
});

module.exports = router;
