const express = require("express");
const router = express.Router();

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { sendPushToUserUid } = require("../utils/sendPushNotification");

const requireAuth = require("../middleware/requireAuth");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const CHANNELS = ["account_to_profile", "profile_to_account", "system"];

function makePairKey(a, b) {
  return [String(a), String(b)].sort().join("|");
}

async function getUsersMapByFirebaseUid(uids = []) {
  const clean = [...new Set((uids || []).map(String).filter(Boolean))];
  if (!clean.length) return new Map();

  const users = await User.find({ firebaseUid: { $in: clean } })
    .select("firebaseUid displayName name avatar email")
    .lean();

  const map = new Map();
  users.forEach((u) => {
    map.set(u.firebaseUid, {
      displayName: u.displayName || u.name || u.email || "Użytkownik",
      avatar: u.avatar || "",
      email: u.email || "",
    });
  });

  return map;
}

// opcjonalne: jeśli chcesz zachować auto-tworzenie usera w DB
async function ensureUser(uid) {
  const firebaseUid = String(uid || "");
  if (!firebaseUid) return null;

  let u = await User.findOne({ firebaseUid }).select("_id firebaseUid").lean();
  if (!u) {
    u = await User.create({ firebaseUid });
  }
  return u;
}

/**
 * POST /api/conversations/send
 * 🔐 auth uid = from
 * body:
 *  - START: { to, content, channel }
 *  - REPLY: { conversationId, content }
 */
router.post("/send", requireAuth, async (req, res) => {
  const from = String(req.auth?.uid || "");
  const { to, content, channel, conversationId } = req.body || {};

  const text = String(content || "").trim();

  if (!from) return res.status(401).json({ message: "Brak autoryzacji." });
  if (!text) return res.status(400).json({ message: "Brakuje treści wiadomości." });

  try {
    // Odpowiedź w istniejącym wątku po ID
    if (conversationId) {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return res.status(404).json({ message: "Nie znaleziono konwersacji" });
      if (convo.isClosed) return res.status(403).json({ message: "Wątek jest zamknięty" });

      const isParticipant = convo.participants?.some((p) => p.uid === from);
      if (!isParticipant) return res.status(403).json({ message: "Brak dostępu do tej konwersacji" });

      const last = convo.messages?.[convo.messages.length - 1];
      if (last && last.fromUid === from) {
        return res.status(403).json({ message: "Poczekaj na odpowiedź drugiej osoby." });
      }

      const other = convo.participants.find((p) => p.uid !== from);
      if (!other?.uid) return res.status(400).json({ message: "Nie udało się ustalić odbiorcy." });

      convo.messages.push({ fromUid: from, toUid: other.uid, content: text });
      convo.updatedAt = new Date();
      await convo.save();

      const senderUser = await User.findOne({ firebaseUid: from })
        .select("displayName name email")
        .lean();

      const senderName =
        senderUser?.displayName || senderUser?.name || senderUser?.email || "Użytkownik";

      await sendPushToUserUid(other.uid, {
        title: "Nowa wiadomość",
        body: `${senderName} napisał do Ciebie wiadomość`,
        url: `${FRONTEND_URL}/powiadomienia`,
      });

      return res.status(200).json({ ok: true, id: convo._id });
    }

    // START nowego / kontynuacja "startowego" — tu wymagamy to+channel
    const toUid = String(to || "");
    const ch = String(channel || "");

    if (!toUid) return res.status(400).json({ message: "Brakuje pola: to" });
    if (!ch) return res.status(400).json({ message: "Brakuje parametru: channel" });
    if (!CHANNELS.includes(ch)) return res.status(400).json({ message: "Nieprawidłowy channel" });
    if (from === toUid) return res.status(400).json({ message: "Nie możesz pisać do siebie." });

    await Promise.all([ensureUser(from), ensureUser(toUid)]);

    const pairKey = makePairKey(from, toUid);

    // Szukamy TYLKO wątku zaczętego przez "from"
    let convo = await Conversation.findOne({
      pairKey,
      channel: ch,
      firstFromUid: from,
      isClosed: { $ne: true },
    }).sort({ updatedAt: -1 });

    if (!convo) {
      convo = await Conversation.create({
        channel: ch,
        pairKey,
        participants: [{ uid: from }, { uid: toUid }],
        firstFromUid: from,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isClosed: false,
      });
    } else {
      const last = convo.messages?.[convo.messages.length - 1];
      if (last && last.fromUid === from) {
        return res.status(403).json({ message: "Poczekaj na odpowiedź drugiej osoby." });
      }
    }

    convo.messages.push({ fromUid: from, toUid: toUid, content: text });
    convo.updatedAt = new Date();
    await convo.save();

    const senderUser = await User.findOne({ firebaseUid: from })
      .select("displayName name email")
      .lean();

    const senderName =
      senderUser?.displayName || senderUser?.name || senderUser?.email || "Użytkownik";

    await sendPushToUserUid(toUid, {
      title: "Nowa wiadomość",
      body: `${senderName} napisał do Ciebie wiadomość`,
      url: `${FRONTEND_URL}/powiadomienia`,
    });

    return res.status(200).json({ ok: true, id: convo._id });
  } catch (err) {
    console.error("❌ /conversations/send error:", err);
    return res.status(500).json({ message: "Błąd zapisu wiadomości" });
  }
});

/**
 * GET /api/conversations/by-uid/:uid
 * 🔐 ignorujemy :uid jako źródło prawdy (możesz zostawić, ale musi == auth uid)
 * opcjonalnie ?channel=
 */
router.get("/by-uid/:uid", requireAuth, async (req, res) => {
  const authUid = String(req.auth?.uid || "");
  const uidParam = String(req.params.uid || "");

  if (!authUid) return res.status(401).json({ message: "Brak autoryzacji." });
  if (uidParam && uidParam !== authUid) {
    return res.status(403).json({ message: "Brak uprawnień." });
  }

  const { channel } = req.query;

  try {
    const findQuery = { "participants.uid": authUid };

    if (channel) {
      if (!CHANNELS.includes(channel)) {
        return res.status(400).json({ message: "Nieprawidłowy channel" });
      }
      findQuery.channel = channel;
    }

    const conversations = await Conversation.find(findQuery).sort({ updatedAt: -1 }).lean();

    const otherUids = [];
    conversations.forEach((c) => {
      const other = (c.participants || []).find((p) => p.uid !== authUid);
      if (other?.uid) otherUids.push(other.uid);
    });

    const usersMap = await getUsersMapByFirebaseUid(otherUids);

    const result = conversations.map((c) => {
      const other = (c.participants || []).find((p) => p.uid !== authUid);
      const otherInfo =
        usersMap.get(other?.uid) || {
          displayName: c.channel === "system" ? "Showly.me" : "Użytkownik",
          avatar: "",
          email: "",
        };

      const lastMessage = (c.messages || [])[c.messages.length - 1] || null;
      const unreadCount = (c.messages || []).filter((m) => m.toUid === authUid && !m.read).length;

      return {
        _id: c._id,
        channel: c.channel,
        withUid: other?.uid || null,
        withDisplayName: otherInfo.displayName,
        withAvatar: otherInfo.avatar,
        lastMessage,
        unreadCount,
        updatedAt: c.updatedAt,
        firstFromUid: c.firstFromUid || (c.messages?.[0]?.fromUid ?? null),
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("❌ /conversations/by-uid error:", err);
    return res.status(500).json({ message: "Błąd pobierania konwersacji" });
  }
});

/**
 * GET /api/conversations/:id
 * 🔐 auth uid musi być participant
 */
router.get("/:id", requireAuth, async (req, res) => {
  const requesterUid = String(req.auth?.uid || "");
  const convoId = req.params.id;

  if (!requesterUid) return res.status(401).json({ message: "Brak autoryzacji." });

  try {
    const convo = await Conversation.findById(convoId).lean();
    if (!convo) return res.status(404).json({ message: "Nie znaleziono konwersacji" });

    const isParticipant = (convo.participants || []).some((p) => p.uid === requesterUid);
    if (!isParticipant) return res.status(403).json({ message: "Brak dostępu do tej konwersacji" });

    const participantUids = (convo.participants || []).map((p) => p.uid);
    const usersMap = await getUsersMapByFirebaseUid(participantUids);

    const participants = (convo.participants || []).map((p) => ({
      uid: p.uid,
      displayName: usersMap.get(p.uid)?.displayName || "Użytkownik",
      avatar: usersMap.get(p.uid)?.avatar || "",
    }));

    return res.json({
      _id: convo._id,
      channel: convo.channel,
      participants,
      messages: convo.messages || [],
      updatedAt: convo.updatedAt,
      firstFromUid: convo.firstFromUid,
    });
  } catch (err) {
    console.error("❌ /conversations/:id error:", err);
    return res.status(500).json({ message: "Błąd pobierania konwersacji" });
  }
});

/**
 * PATCH /api/conversations/:id/read
 * 🔐 auth uid musi być participant
 */
router.patch("/:id/read", requireAuth, async (req, res) => {
  const uid = String(req.auth?.uid || "");
  if (!uid) return res.status(401).json({ message: "Brak autoryzacji." });

  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: "Nie znaleziono" });

    const isParticipant = (convo.participants || []).some((p) => p.uid === uid);
    if (!isParticipant) return res.status(403).json({ message: "Brak dostępu do tej konwersacji" });

    let changed = false;
    (convo.messages || []).forEach((m) => {
      if (m.toUid === uid && !m.read) {
        m.read = true;
        changed = true;
      }
    });

    if (changed) await convo.save();
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ /conversations/:id/read error:", err);
    return res.status(500).json({ message: "Błąd oznaczania jako przeczytane" });
  }
});

/**
 * GET /api/conversations/check/:uid1/:uid2?channel=...&starter=<uid>
 * 🔐 auth uid musi być jednym z uid1/uid2
 * starter (opcjonalnie) MUSI == auth uid jeśli podany
 */
router.get("/check/:uid1/:uid2", requireAuth, async (req, res) => {
  const authUid = String(req.auth?.uid || "");
  const uid1 = String(req.params.uid1 || "");
  const uid2 = String(req.params.uid2 || "");
  const { channel, starter } = req.query;

  if (!authUid) return res.status(401).json({ message: "Brak autoryzacji." });
  if (!channel) return res.status(400).json({ message: "Brakuje parametru channel" });
  if (!CHANNELS.includes(channel)) return res.status(400).json({ message: "Nieprawidłowy channel" });

  // ✅ nie pozwól sprawdzać cudzych par
  if (authUid !== uid1 && authUid !== uid2) {
    return res.status(403).json({ message: "Brak uprawnień." });
  }

  // ✅ starter tylko jeśli to Ty
  if (starter && String(starter) !== authUid) {
    return res.status(403).json({ message: "Brak uprawnień (starter)." });
  }

  try {
    const pairKey = makePairKey(uid1, uid2);

    const query = { pairKey, channel, isClosed: { $ne: true } };
    if (starter) query.firstFromUid = authUid;

    const convo = await Conversation.findOne(query).sort({ updatedAt: -1 }).lean();

    if (convo) return res.json({ exists: true, id: convo._id });
    return res.json({ exists: false });
  } catch (err) {
    console.error("❌ /conversations/check error:", err);
    return res.status(500).json({ message: "Błąd sprawdzania konwersacji" });
  }
});

module.exports = router;