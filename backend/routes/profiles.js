const express = require("express");
const router = express.Router();

const Profile = require("../models/Profile");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Favorite = require("../models/Favorite");
const VisitLock = require("../models/VisitLock");

const upload = require("../middleware/upload"); // multer memoryStorage (buffer)
const cloudinary = require("../utils/cloudinary");
const { uploadBuffer } = require("../utils/cloudinaryUpload");

// -----------------------------
// Helpers: slug + public URLs
// -----------------------------
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

// 🔧 pełne https URL-e (Render/Vercel za proxy)
function getProto(req) {
  const xf = req.headers["x-forwarded-proto"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.protocol || "https";
}

function withCacheBust(url, v) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${v}`;
}

function absoluteUrl(req, relative) {
  const proto = getProto(req);
  const host = req.get("host");
  return `${proto}://${host}${relative.startsWith("/") ? "" : "/"}${relative}`;
}

// --- doprowadza wszystkie warianty "uploads" do /uploads/...
function normalizeUploadPath(p = "") {
  if (!p) return "";
  if (p.startsWith("uploads/")) return `/${p}`;
  if (p.startsWith("./uploads/") || p.startsWith("../uploads/")) {
    return "/" + p.replace(/^\.{1,2}\//, "");
  }
  return p;
}

// akceptuj /uploads, http i https
function toPublicUrl(req, val = "") {
  if (!val) return "";
  const v = normalizeUploadPath(val);

  if (v.startsWith("/uploads/")) return absoluteUrl(req, v);

  if (/^https?:\/\/.+/i.test(v)) {
    const wantedProto = getProto(req);
    return v.replace(/^https?:\/\//i, `${wantedProto}://`);
  }

  return v;
}

// ======= Cloudinary field helpers (kompatybilność string/obiekt) =======
function pickUrlField(val) {
  // avatar / photo może być: string lub {url, publicId}
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.url === "string") return val.url;
  return "";
}

function pickPublicIdField(val) {
  if (!val) return "";
  if (typeof val === "object" && typeof val.publicId === "string") return val.publicId;
  return "";
}

function normalizeAvatarOut(req, avatar, updatedAt) {
  const rawUrl = pickUrlField(avatar);
  const base = rawUrl ? toPublicUrl(req, rawUrl) : "";
  const v = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const url = base ? withCacheBust(base, v) : "";
  const publicId = pickPublicIdField(avatar);
  // zwracamy obiekt – front ma jasno
  return { url, publicId };
}

function normalizePhotosOut(req, photos = []) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => {
      if (typeof p === "string") {
        return { url: toPublicUrl(req, p), publicId: "" };
      }
      if (p && typeof p === "object") {
        return { url: toPublicUrl(req, p.url || ""), publicId: p.publicId || "" };
      }
      return null;
    })
    .filter(Boolean);
}

// Odwiedziny – identyfikacja oglądającego
function getViewerKey(req) {
  const uid = req.headers.uid && String(req.headers.uid);
  if (uid) return `uid:${uid}`;
  const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
  const ua = (req.get("user-agent") || "").slice(0, 100);
  return `ipua:${ip}:${ua}`;
}

async function canCountVisit(ownerUid, viewerKey) {
  try {
    const res = await VisitLock.updateOne(
      { ownerUid, viewerKey },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return res.upsertedCount === 1 || !!res.upsertedId;
  } catch (e) {
    return false;
  }
}

// =========================================================
// ✅ CLOUDINARY: AVATAR + PHOTOS
// =========================================================

// POST /api/profiles/:uid/avatar
router.post("/:uid/avatar", upload.single("file"), async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!req.file) return res.status(400).json({ message: "Brak pliku." });

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    // usuń stary avatar (jeśli był w Cloudinary)
    const oldPublicId = pickPublicIdField(profile.avatar);
    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => {});
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: `showly/profiles/${uid}/avatar`,
      resource_type: "image",
      transformation: [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    // zapisuj jako obiekt
    profile.avatar = { url: result.secure_url, publicId: result.public_id };
    await profile.save();

    return res.json({
      message: "Avatar zapisany.",
      avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
    });
  } catch (e) {
    console.error("❌ upload avatar:", e);
    return res.status(500).json({ message: "Błąd uploadu avatara." });
  }
});

// DELETE /api/profiles/:uid/avatar
router.delete("/:uid/avatar", async (req, res) => {
  try {
    const uid = req.params.uid;
    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const oldPublicId = pickPublicIdField(profile.avatar);
    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => {});
    }

    // czyścimy (obiekt)
    profile.avatar = { url: "", publicId: "" };
    await profile.save();

    return res.json({
      message: "Avatar usunięty.",
      avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
    });
  } catch (e) {
    console.error("❌ delete avatar:", e);
    return res.status(500).json({ message: "Błąd usuwania avatara." });
  }
});

// POST /api/profiles/:uid/photos (max 6 łącznie)
router.post("/:uid/photos", upload.array("files", 6), async (req, res) => {
  try {
    const uid = req.params.uid;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "Brak plików." });

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const MAX = 6;
    const currentCount = Array.isArray(profile.photos) ? profile.photos.length : 0;
    if (currentCount + files.length > MAX) {
      return res.status(400).json({ message: `Maksymalnie ${MAX} zdjęć w galerii.` });
    }

    const uploaded = [];
    for (const f of files) {
      const r = await uploadBuffer(f.buffer, {
        folder: `showly/profiles/${uid}/photos`,
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });
      uploaded.push({ url: r.secure_url, publicId: r.public_id });
    }

    // zapewnij tablicę
    profile.photos = Array.isArray(profile.photos) ? profile.photos : [];
    profile.photos = [...profile.photos, ...uploaded];

    await profile.save();

    return res.json({
      message: "Zdjęcia dodane.",
      photos: normalizePhotosOut(req, profile.photos),
    });
  } catch (e) {
    console.error("❌ upload photos:", e);
    return res.status(500).json({ message: "Błąd uploadu zdjęć." });
  }
});

// DELETE /api/profiles/:uid/photos/:publicId
router.delete("/:uid/photos/:publicId", async (req, res) => {
  try {
    const { uid, publicId } = req.params;

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const decoded = decodeURIComponent(publicId);

    await cloudinary.uploader.destroy(decoded, { resource_type: "image" }).catch(() => {});

    profile.photos = Array.isArray(profile.photos) ? profile.photos : [];
    profile.photos = profile.photos.filter((p) => {
      if (typeof p === "string") return true; // stary typ (nie umiemy usunąć po publicId)
      return p?.publicId !== decoded;
    });

    await profile.save();

    return res.json({
      message: "Zdjęcie usunięte.",
      photos: normalizePhotosOut(req, profile.photos),
    });
  } catch (e) {
    console.error("❌ delete photo:", e);
    return res.status(500).json({ message: "Błąd usuwania zdjęcia." });
  }
});

// ======================================
// GET /api/profiles – aktywne i ważne
// ======================================
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    await Profile.updateMany({ isVisible: true, visibleUntil: { $lt: now } }, { $set: { isVisible: false } });

    const visible = await Profile.find({ isVisible: true, visibleUntil: { $gte: now } });
    res.json(visible);
  } catch (e) {
    res.status(500).json({ message: "Błąd pobierania profili" });
  }
});

// -------------------------------------------------
// GET /api/profiles/by-user/:uid – profil po userId
// -------------------------------------------------
router.get("/by-user/:uid", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid }).lean();
    if (!profile) return res.status(404).json({ message: "Brak wizytówki dla tego użytkownika." });

    const avatar = normalizeAvatarOut(req, profile.avatar, profile.updatedAt);
    const photos = normalizePhotosOut(req, profile.photos);

    return res.json({ ...profile, avatar, photos });
  } catch (err) {
    console.error("❌ Błąd w GET /by-user/:uid:", err);
    res.status(500).json({ message: "Błąd serwera." });
  }
});

// -----------------------------------------------------------
// GET /api/profiles/slug/:slug – profil po unikalnym slugu
// -----------------------------------------------------------
router.get("/slug/:slug", async (req, res) => {
  try {
    const profile = await Profile.findOne({ slug: req.params.slug }).lean();
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const now = new Date();
    if (!profile.isVisible || profile.visibleUntil < now) {
      return res.status(403).json({ message: "Profil jest obecnie niewidoczny." });
    }

    const viewerUid = req.headers.uid || null;

    // ratedBy – jak masz (nie tykamy logiki, tylko normalizacja avatara w odpowiedzi)
    let ratedBy = Array.isArray(profile.ratedBy) ? profile.ratedBy : [];
    const ids = [...new Set(ratedBy.map((r) => r.userId).filter(Boolean))];

    let usersMap = {};
    if (ids.length) {
      const users = await User.find({ firebaseUid: { $in: ids } }).select("firebaseUid avatar updatedAt").lean();
      usersMap = users.reduce((acc, u) => {
        acc[u.firebaseUid] = { avatar: u.avatar || "", updatedAt: u.updatedAt || null };
        return acc;
      }, {});
    }

    ratedBy = ratedBy.map((r) => {
      const u = usersMap[r.userId];
      const picked = u?.avatar || r.userAvatar || "";
      const v = u?.updatedAt ? new Date(u.updatedAt).getTime() : null;
      const base = picked ? toPublicUrl(req, picked) : "";
      const userAvatar = v ? withCacheBust(base, v) : base;
      return { ...r, userAvatar };
    });

    const avatar = normalizeAvatarOut(req, profile.avatar, profile.updatedAt);
    const photos = normalizePhotosOut(req, profile.photos);

    // Ulubione: flaga + liczba
    let isFavorite = false;
    let favoritesCount = profile.favoritesCount;

    if (viewerUid) {
      const favExists = await Favorite.exists({ ownerUid: viewerUid, profileUserId: profile.userId });
      isFavorite = !!favExists;
    }

    return res.json({
      ...profile,
      ratedBy,
      avatar,
      photos,
      isFavorite,
      favoritesCount,
    });
  } catch (err) {
    console.error("❌ Błąd w GET /slug/:slug:", err);
    res.status(500).json({ message: "Błąd serwera." });
  }
});

// ------------------------------------------------------
// PATCH /api/profiles/:uid/visit — zlicz odwiedziny
// ------------------------------------------------------
router.patch("/:uid/visit", async (req, res) => {
  try {
    const ownerUid = req.params.uid;
    const viewerUid = req.headers.uid || null;

    const profile = await Profile.findOne({ userId: ownerUid }).select("visits isVisible visibleUntil userId");
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const now = new Date();
    if (!profile.isVisible || (profile.visibleUntil && profile.visibleUntil < now)) {
      return res.status(403).json({ message: "Profil niewidoczny/nieaktywny." });
    }

    if (viewerUid && viewerUid === ownerUid) {
      return res.json({ visits: profile.visits, skipped: true });
    }

    const viewerKey = getViewerKey(req);
    const ok = await canCountVisit(ownerUid, viewerKey);
    if (!ok) return res.json({ visits: profile.visits, throttled: true });

    const updated = await Profile.findOneAndUpdate({ userId: ownerUid }, { $inc: { visits: 1 } }, { new: true, select: "visits" });
    return res.json({ visits: updated.visits });
  } catch (e) {
    console.error("❌ Błąd /:uid/visit:", e);
    return res.status(500).json({ message: "Błąd serwera." });
  }
});

// ------------------------------------------------------------
// PATCH /api/profiles/slug/:slug/visit — zlicz po slugu
// ------------------------------------------------------------
router.patch("/slug/:slug/visit", async (req, res) => {
  try {
    const { slug } = req.params;
    const viewerUid = req.headers.uid || null;

    const profile = await Profile.findOne({ slug }).select("userId visits isVisible visibleUntil");
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const now = new Date();
    if (!profile.isVisible || (profile.visibleUntil && profile.visibleUntil < now)) {
      return res.status(403).json({ message: "Profil niewidoczny/nieaktywny." });
    }

    if (viewerUid && viewerUid === profile.userId) {
      return res.json({ visits: profile.visits, skipped: true });
    }

    const viewerKey = getViewerKey(req);
    const ok = await canCountVisit(profile.userId, viewerKey);
    if (!ok) return res.json({ visits: profile.visits, throttled: true });

    const updated = await Profile.findOneAndUpdate({ slug }, { $inc: { visits: 1 } }, { new: true, select: "visits" });
    return res.json({ visits: updated.visits });
  } catch (e) {
    console.error("❌ Błąd /slug/:slug/visit:", e);
    return res.status(500).json({ message: "Błąd serwera." });
  }
});

// -----------------------------------------
// POST /api/profiles — tworzenie profilu
// -----------------------------------------
router.post("/", async (req, res) => {
  // bezpieczne Stringi
  const userId = String(req.body.userId || "");
  const name = String(req.body.name || "");
  const role = String(req.body.role || "");
  const location = String(req.body.location || "");

  if (!userId || !name) {
    return res.status(400).json({ message: "Brakuje userId lub name w danych profilu" });
  }

  try {
    const existing = await Profile.findOne({ name: name.trim(), role: role.trim(), location: location.trim() });
    if (existing) {
      return res.status(409).json({ message: "Taka wizytówka już istnieje (imię + rola + lokalizacja)." });
    }

    const existingByUser = await Profile.findOne({ userId });
    if (existingByUser) {
      return res.status(409).json({ message: "Ten użytkownik już posiada wizytówkę." });
    }

    const baseSlug = slugify(`${name}-${role}`);
    let uniqueSlug = baseSlug,
      i = 1;
    while (await Profile.findOne({ slug: uniqueSlug })) uniqueSlug = `${baseSlug}-${i++}`;

    const newProfile = new Profile({
      ...req.body,
      name: name.trim(),
      role: role.trim(),
      location: location.trim(),
      slug: uniqueSlug,
      isVisible: true,
      visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await newProfile.save();
    res.status(201).json({ message: "Profil utworzony", profile: newProfile });

    // 🔔 fire-and-forget: systemowa wiadomość powitalna
    queueMicrotask(async () => {
      try {
        const fromUid = "SYSTEM";
        const toUid = userId;
        const pairKey = [fromUid, toUid].sort().join("|");

        const welcomeContent = [
          "🎉 Dziękujemy za utworzenie profilu w Showly!",
          "",
          "✅ Co masz na start:",
          "• Twój profil jest widoczny przez 30 dni (możesz przedłużyć w „Twój profil”).",
          "• Domyślny tryb rezerwacji: „Zapytanie bez blokowania” — możesz zmienić w każdej chwili.",
          "",
          "👉 Uzupełnij podstawowe informacje:",
          "• avatar i krótki opis (max 500 znaków),",
          "• rola / specjalizacja i lokalizacja,",
          "• 1–3 tagi,",
          "• widełki cenowe: „od–do”.",
          "",
          "🧰 Dodaj usługi (z czasem trwania/realizacji):",
          "• każda usługa ma nazwę i czas trwania,",
          "• jednostki: minuty / godziny / dni,",
          "• minimum: 15 min / 1 h / 1 dzień,",
          "",
          "🔗 Linki i media:",
          "• do 3 linków i 6 zdjęć (ok. 3 MB).",
          "",
          "ℹ️ Wszystko edytujesz w zakładce „Twój profil”. Powodzenia! 👊",
        ].join("\n");

        let convo = await Conversation.findOne({ channel: "system", pairKey }).exec();
        if (!convo) {
          convo = await Conversation.create({
            channel: "system",
            pairKey,
            participants: [{ uid: fromUid }, { uid: toUid }],
            firstFromUid: fromUid,
            messages: [
              { fromUid, toUid, content: welcomeContent, isSystem: true, createdAt: new Date() },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            isClosed: false,
          });
        } else {
          convo.messages.push({ fromUid, toUid, content: welcomeContent, isSystem: true, createdAt: new Date() });
          convo.updatedAt = new Date();
          await convo.save();
        }
      } catch (e) {
        console.error("⚠️ Błąd wątku systemowego:", e);
      }
    });
  } catch (err) {
    console.error("❌ Błąd w POST /api/profiles:", err);
    return res.status(500).json({ message: "Błąd tworzenia profilu" });
  }
});

// ------------------------------------------------------
// PATCH /api/profiles/extend/:uid – +30 dni widoczności
// ------------------------------------------------------
router.patch("/extend/:uid", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu do przedłużenia." });

    profile.isVisible = true;
    profile.visibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await profile.save();

    res.json({ message: "Widoczność przedłużona o 30 dni.", profile });
  } catch (error) {
    console.error("❌ Błąd w PATCH /extend:", error);
    res.status(500).json({ message: "Błąd podczas przedłużania widoczności", error });
  }
});

// -------------------------------------------------------------
// PATCH /api/profiles/update/:uid – aktualizacja wybranych pól
// -------------------------------------------------------------
const allowedFields = [
  "avatar",
  "photos",
  "profileType",
  "location",
  "priceFrom",
  "priceTo",
  "role",
  "availableDates",
  "description",
  "tags",
  "links",
  "quickAnswers",
  "showAvailableDates",
  "services",
  "bookingMode",
  "workingHours",
  "workingDays",
  "team",
  "theme",
  "contact",
  "socials",
];

router.patch("/update/:uid", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const updates = { ...req.body };

    const isDataImage = (s) => typeof s === "string" && s.trim().startsWith("data:image/");
    const isBlobUrl = (s) => typeof s === "string" && s.trim().startsWith("blob:");

    // blokuj base64
    if (updates.avatar && typeof updates.avatar === "string" && isDataImage(updates.avatar)) {
      return res.status(400).json({ message: "Avatar nie może być base64. Wgraj przez upload i zapisz URL." });
    }
    if (Array.isArray(updates.photos) && updates.photos.some((p) => typeof p === "string" && isDataImage(p))) {
      return res.status(400).json({ message: "Zdjęcia nie mogą być base64. Wgrywaj przez upload i zapisuj URL-e." });
    }

    // blob url out
    if (typeof updates.avatar === "string" && isBlobUrl(updates.avatar)) {
      updates.avatar = profile.avatar || "";
    }
    if (Array.isArray(updates.photos)) {
      updates.photos = updates.photos.filter((p) => p && !(typeof p === "string" && isBlobUrl(p)));
    }

    // normalizacja kontaktu
    if (updates.contact) {
      const clean = (v) => (v ?? "").toString().trim();
      const prev = profile.contact?.toObject ? profile.contact.toObject() : profile.contact || {};

      const street = clean(updates.contact.street);
      const postcode = clean(updates.contact.postcode);
      const locationForAddress = clean(typeof updates.location !== "undefined" ? updates.location : profile.location);

      let addressFull = clean(updates.contact.addressFull);
      if (!addressFull) {
        const parts = [locationForAddress, postcode, street].filter(Boolean);
        addressFull = parts.join(", ");
      }

      updates.contact = {
        ...prev,
        street,
        postcode,
        addressFull,
        phone: clean(updates.contact.phone),
        email: clean(updates.contact.email).toLowerCase(),
      };

      profile.set("contact", updates.contact);
    }

    // normalizacja socials
    if (updates.socials) {
      const clean = (v) => (v ?? "").toString().trim();
      const prev = profile.socials?.toObject ? profile.socials.toObject() : profile.socials || {};

      updates.socials = {
        ...prev,
        website: clean(updates.socials.website),
        facebook: clean(updates.socials.facebook),
        instagram: clean(updates.socials.instagram),
        youtube: clean(updates.socials.youtube),
        tiktok: clean(updates.socials.tiktok),
        linkedin: clean(updates.socials.linkedin),
        x: clean(updates.socials.x),
      };

      profile.set("socials", updates.socials);
    }

    // zwykłe pola
    for (const field of allowedFields) {
      if (field !== "team" && field !== "theme" && updates[field] !== undefined) {
        profile[field] = updates[field];
      }
    }

    // theme
    if (updates.theme) {
      if (typeof updates.theme.variant !== "undefined") profile.set("theme.variant", updates.theme.variant);
      if (typeof updates.theme.primary !== "undefined") profile.set("theme.primary", updates.theme.primary);
      if (typeof updates.theme.secondary !== "undefined") profile.set("theme.secondary", updates.theme.secondary);
    }

    // team
    if (updates.team) {
      if (typeof updates.team.enabled !== "undefined") profile.set("team.enabled", !!updates.team.enabled);
      if (updates.team.assignmentMode) {
        profile.set("team.assignmentMode", updates.team.assignmentMode === "auto-assign" ? "auto-assign" : "user-pick");
      }
    }

    await profile.save();
    return res.json({ message: "Profil zaktualizowany", profile });
  } catch (err) {
    console.error("❌ Błąd aktualizacji profilu:", err);

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        message: "Błąd walidacji danych.",
        details: Object.values(err.errors || {}).map((e) => e.message),
      });
    }

    return res.status(500).json({ message: "Błąd podczas aktualizacji profilu." });
  }
});

// -----------------------------------------------------------------
// PATCH /api/profiles/rate/:slug – dodanie oceny + komentarza
// -----------------------------------------------------------------
router.patch("/rate/:slug", async (req, res) => {
  const { userId, rating, comment, userName: bodyName, userAvatar: bodyAvatar } = req.body;
  const numericRating = Number(rating);

  if (
    !userId ||
    isNaN(numericRating) ||
    numericRating < 1 ||
    numericRating > 5 ||
    !comment ||
    comment.trim().length < 10 ||
    comment.trim().length > 200
  ) {
    return res.status(400).json({
      message: "Ocena musi być liczbą od 1 do 5, a komentarz musi mieć od 10 do 200 znaków.",
    });
  }

  try {
    const profile = await Profile.findOne({ slug: req.params.slug }).select("userId ratedBy rating reviews");
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    if (profile.userId === userId) return res.status(403).json({ message: "Nie możesz ocenić własnej wizytówki." });

    if (!Array.isArray(profile.ratedBy)) profile.ratedBy = [];
    if (profile.ratedBy.find((r) => r.userId === userId)) {
      return res.status(400).json({ message: "Już oceniłeś ten profil." });
    }

    let finalName = (bodyName || "").trim();
    let rawAvatar = (bodyAvatar || "").trim();

    if (!finalName || !rawAvatar) {
      try {
        const dbUser = await User.findOne({ firebaseUid: userId }).select("displayName name avatar").lean();
        if (!finalName) finalName = dbUser?.displayName || dbUser?.name || "Użytkownik";
        if (!rawAvatar) rawAvatar = dbUser?.avatar || "";
      } catch {}
    }

    const storedUserAvatar = normalizeUploadPath(rawAvatar);

    profile.ratedBy.push({
      userId,
      rating: numericRating,
      comment: comment.trim(),
      userName: finalName || "Użytkownik",
      userAvatar: storedUserAvatar,
      createdAt: new Date(),
    });

    const total = profile.ratedBy.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    profile.reviews = profile.ratedBy.length;
    profile.rating = Number((total / profile.reviews).toFixed(2));

    await profile.save();

    const rawLast = profile.ratedBy[profile.ratedBy.length - 1];
    const lastReview = {
      ...(rawLast.toObject?.() || rawLast),
      userAvatar: toPublicUrl(req, rawLast.userAvatar),
    };

    return res.json({
      message: "Ocena dodana.",
      rating: profile.rating,
      reviews: profile.reviews,
      review: lastReview,
    });
  } catch (err) {
    console.error("❌ Błąd oceniania:", err);
    return res.status(500).json({ message: "Błąd serwera.", error: err.message });
  }
});

// 🗑️ USUWANIE 1 zdjęcia z galerii (Cloudinary)
router.delete("/:uid/photos", async (req, res) => {
  try {
    const { uid } = req.params;
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "Brak publicId zdjęcia" });
    }

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) {
      return res.status(404).json({ message: "Profil nie istnieje" });
    }

    // usuń z cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.log("Cloudinary destroy error:", err.message);
    }

    // usuń z tablicy
    profile.photos = (profile.photos || []).filter(p => p.publicId !== publicId);
    await profile.save();

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE PHOTO ERROR:", err);
    res.status(500).json({ message: "Błąd usuwania zdjęcia" });
  }
});

module.exports = router;
