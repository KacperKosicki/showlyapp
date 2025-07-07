const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// 📩 Wysyłanie wiadomości
router.post('/send', async (req, res) => {
  const { from, to, content } = req.body;
  try {
    const msg = await Message.create({ from, to, content });
    res.status(200).json(msg);
  } catch (err) {
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

module.exports = router;
