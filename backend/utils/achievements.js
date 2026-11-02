const { createHash } = require("node:crypto");
const { Types } = require("mongoose");
const Profile = require("../models/Profile");
const Reservation = require("../models/Reservation");
const Conversation = require("../models/Conversation");
const { isProfileVisible } = require("./betaAccess");

const MAX_FEATURED = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const bookingDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" });
const catalog = [
  { id: "first-profile", title: "Pierwszy krok", tier: "common", description: "Utwórz wizytówkę Showly." },
  { id: "first-service", title: "Oferta gotowa", tier: "common", description: "Dodaj aktywną usługę z nazwą." },
  { id: "portfolio", title: "Pokaż realizacje", tier: "common", description: "Dodaj trzy zdjęcia do galerii." },
  { id: "first-booking", title: "Pierwsza rezerwacja", tier: "rare", description: "Zaakceptuj pierwszą rezerwację klienta." },
  { id: "reviews", title: "Głos klientów", tier: "rare", description: "Zbierz opinie z komentarzem od trzech różnych klientów." },
  { id: "ten-bookings", title: "Mistrz kalendarza", tier: "exclusive", description: "Zbierz dziesięć zaakceptowanych rezerwacji." },
  { id: "profile-90-days", title: "Na dłużej", tier: "rare", description: "Miej publiczną wizytówkę utworzoną co najmniej 90 dni temu." },
  { id: "regular-bookings", title: "W stałym rytmie", tier: "rare", description: "Miej zaakceptowane terminy trzech różnych klientów w ostatnich 30 dniach." },
  { id: "profile-365-days", title: "Weteran Showly", tier: "exclusive", description: "Miej publiczną wizytówkę utworzoną co najmniej 365 dni temu." },
  { id: "ten-reviews", title: "Marka z polecenia", tier: "exclusive", description: "Zbierz opinie z komentarzem od dziesięciu różnych klientów." },
];

const selectBadges = (ids = []) => ids.map(id => catalog.find(badge => badge.id === id)).filter(Boolean);
const publicBadges = profile => selectBadges((profile.featuredAchievements || []).filter(id => profile.earnedAchievements?.includes(id)));
const stableId = key => new Types.ObjectId(createHash("sha256").update(key).digest("hex").slice(0, 24));

async function notifyAchievements(uid, earned) {
  if (!earned.length) return;
  const threadId = stableId(`showly-achievements:thread:${uid}`);
  const now = new Date();
  const messageIds = new Set(
    ((await Conversation.findById(threadId).select("messages._id").lean())?.messages || [])
      .map(message => String(message._id))
  );
  const messages = selectBadges(earned).map(badge => ({
    _id: stableId(`showly-achievements:message:${uid}:${badge.id}`),
    fromUid: "SYSTEM",
    toUid: uid,
    content: `Zdobywasz odznakę „${badge.title}”! Możesz wybrać ją w gablocie w panelu Twoja wizytówka, aby pokazać ją na publicznym profilu.`,
    isSystem: true,
    read: false,
    createdAt: now,
  })).filter(message => !messageIds.has(String(message._id)));
  if (!messages.length) return;

  await Conversation.updateOne({ _id: threadId }, {
    $setOnInsert: {
      channel: "system",
      pairKey: `SYSTEM|achievements|${uid}`,
      participants: [{ uid: "SYSTEM" }, { uid }],
      firstFromUid: "SYSTEM",
      createdAt: now,
      updatedAt: now,
      messages: [],
      isClosed: false,
    },
  }, { upsert: true });

  await Conversation.bulkWrite(messages.map(message => ({
    updateOne: {
      filter: { _id: threadId, "messages._id": { $ne: message._id } },
      update: { $push: { messages: message }, $max: { updatedAt: now } },
    },
  })));
}

async function reconcileAchievements(uid, now = new Date()) {
  const profile = await Profile.findOne({ userId: uid })
    .select("services.name services.isActive photos.url ratedBy.userId ratedBy.comment createdAt isVisible visibleUntil visibilityBlockedByAdmin +earnedAchievements +featuredAchievements")
    .lean();
  if (!profile) return null;

  const earned = new Set(profile.earnedAchievements);
  const eligible = ["first-profile"];
  if (profile.services?.some(service => service.isActive !== false && service.name?.trim())) eligible.push("first-service");
  if (profile.photos?.filter(photo => photo?.url).length >= 3) eligible.push("portfolio");
  const reviewers = new Set((profile.ratedBy || []).filter(review => review.userId && review.userId !== uid && review.comment?.trim()).map(review => review.userId));
  if (reviewers.size >= 3) eligible.push("reviews");
  if (reviewers.size >= 10) eligible.push("ten-reviews");

  if (profile.createdAt && isProfileVisible(profile, now)) {
    const age = now - new Date(profile.createdAt);
    if (age >= 90 * DAY_MS) eligible.push("profile-90-days");
    if (age >= 365 * DAY_MS) eligible.push("profile-365-days");
  }

  const acceptedBookings = {
    providerUserId: uid,
    status: "zaakceptowana",
    offline: { $ne: true },
    userId: { $exists: true, $nin: [uid, null, ""] },
  };

  if (!earned.has("first-booking") || !earned.has("ten-bookings")) {
    const accepted = await Reservation.countDocuments(acceptedBookings).limit(10);
    if (accepted >= 1) eligible.push("first-booking");
    if (accepted >= 10) eligible.push("ten-bookings");
  }

  if (!earned.has("regular-bookings")) {
    const today = bookingDate.format(now);
    const from = new Date(Date.parse(today) - 29 * DAY_MS).toISOString().slice(0, 10);
    const clients = await Reservation.distinct("userId", {
      ...acceptedBookings,
      date: { $gte: from, $lte: today },
    });
    if (clients.length >= 3) eligible.push("regular-bookings");
  }
  const newlyEligible = eligible.filter(id => !earned.has(id));
  if (newlyEligible.length) {
    const updated = await Profile.findOneAndUpdate(
      { _id: profile._id },
      { $addToSet: { earnedAchievements: { $each: newlyEligible } } },
      { new: true, timestamps: false }
    ).select("earnedAchievements featuredAchievements").lean();
    if (!updated) return null;
    profile.earnedAchievements = updated.earnedAchievements;
    profile.featuredAchievements = updated.featuredAchievements;
  }

  try { await notifyAchievements(uid, profile.earnedAchievements || []); }
  catch (error) { console.error("Nie udało się zapisać powiadomienia o odznace:", error); }
  return profile;
}

function achievementState(profile) {
  return {
    badges: catalog.map(badge => ({ ...badge, earned: profile.earnedAchievements?.includes(badge.id) ?? false })),
    featured: publicBadges(profile).map(badge => badge.id),
    maxFeatured: MAX_FEATURED,
  };
}

function achievementCatalog() {
  return {
    badges: catalog,
    maxFeatured: MAX_FEATURED,
    rules: [
      "Odznaki są przyznawane automatycznie przy sprawdzaniu gabloty lub wiadomości Showly. Zapisane wcześniej działania też się liczą.",
      "Odznaki stażowe wymagają obecnie publicznej wizytówki. Staż liczy się od utworzenia profilu.",
      "Do odznak za rezerwacje liczą się zaakceptowane rezerwacje online klientów. W stałym rytmie obejmuje daty terminów z ostatnich 30 dni kalendarzowych, włącznie z dzisiejszą.",
      "Do odznak za opinie liczy się najwyżej jeden komentarz od każdego klienta. Własne opinie nie są liczone.",
      "Zdobyta odznaka pozostaje w gablocie. Showly wysyła jedną wiadomość systemową za każdą odznakę.",
    ],
  };
}

module.exports = { reconcileAchievements, achievementState, achievementCatalog, publicBadges, MAX_FEATURED };
