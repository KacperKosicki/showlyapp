const express = require("express");
const router = express.Router();

const Profile = require("../models/Profile");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Favorite = require("../models/Favorite");
const VisitLock = require("../models/VisitLock");

const upload = require("../middleware/upload");
const cloudinary = require("../utils/cloudinary");
const { uploadBuffer } = require("../utils/cloudinaryUpload");

const requireAuth = require("../middleware/requireAuth");
const requireOwnerOrAdmin = require("../middleware/requireOwnerOrAdmin");

// -----------------------------
// Helpers: slug + public URLs
// -----------------------------
const polishMap = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ż: "z",
  ź: "z",
  Ą: "a",
  Ć: "c",
  Ę: "e",
  Ł: "l",
  Ń: "n",
  Ó: "o",
  Ś: "s",
  Ż: "z",
  Ź: "z",
};

const slugify = (text = "") =>
  String(text)
    .split("")
    .map((char) => polishMap[char] || char)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

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

function normalizeUploadPath(p = "") {
  if (!p) return "";
  if (p.startsWith("uploads/")) return `/${p}`;
  if (p.startsWith("./uploads/") || p.startsWith("../uploads/")) {
    return "/" + p.replace(/^\.{1,2}\//, "");
  }
  return p;
}

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

// ======= Cloudinary field helpers =======
function pickUrlField(val) {
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

function normalizeImageOut(req, img, updatedAt) {
  const rawUrl = pickUrlField(img);
  const base = rawUrl ? toPublicUrl(req, rawUrl) : "";
  const v = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const url = base ? withCacheBust(base, v) : "";
  const publicId = pickPublicIdField(img);
  return { url, publicId };
}

function normalizeAvatarOut(req, avatar, updatedAt) {
  return normalizeImageOut(req, avatar, updatedAt);
}

function normalizePhotosOut(req, photos = [], updatedAt) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => {
      if (typeof p === "string") {
        return normalizeImageOut(req, { url: p, publicId: "" }, updatedAt);
      }
      if (p && typeof p === "object") {
        return normalizeImageOut(req, p, updatedAt);
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeServiceOut(req, service = {}, updatedAt) {
  const raw = service?.toObject ? service.toObject() : service;

  return {
    ...raw,
    image: normalizeImageOut(req, raw.image, updatedAt),
    gallery: normalizePhotosOut(req, raw.gallery || [], updatedAt),
  };
}

function normalizeServicesOut(req, services = [], updatedAt) {
  if (!Array.isArray(services)) return [];
  return services.map((service) => normalizeServiceOut(req, service, updatedAt));
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

// -----------------------------
// Validators / sanitizers
// -----------------------------
const isDataImage = (s) => typeof s === "string" && s.trim().startsWith("data:image/");
const isBlobUrl = (s) => typeof s === "string" && s.trim().startsWith("blob:");
const clean = (v) => (v ?? "").toString().trim();

function sanitizeStringArray(arr = [], max = 20) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => clean(v))
    .filter(Boolean)
    .slice(0, max);
}

function sanitizeImageObject(img = {}) {
  return {
    url: clean(img?.url),
    publicId: clean(img?.publicId),
  };
}

function rejectIfInvalidImageValue(value, label = "Obraz") {
  const rawUrl = typeof value === "string" ? value : value?.url;

  if (isDataImage(rawUrl)) {
    throw new Error(`${label} nie może być base64. Wgraj plik przez upload.`);
  }

  if (isBlobUrl(rawUrl)) {
    throw new Error(`${label} nie może być blob URL.`);
  }
}

function sanitizeServicesInput(services = [], existingProfile) {
  if (!Array.isArray(services)) {
    throw new Error("Pole services musi być tablicą.");
  }

  return services.map((s, index) => {
    const image = s?.image || {};
    const gallery = Array.isArray(s?.gallery) ? s.gallery : [];

    rejectIfInvalidImageValue(image, `Zdjęcie główne usługi #${index + 1}`);
    gallery.forEach((g, i) =>
      rejectIfInvalidImageValue(g, `Zdjęcie galerii #${i + 1} usługi #${index + 1}`)
    );

    const service = {
      ...(s?._id ? { _id: s._id } : {}),

      name: clean(s?.name),
      shortDescription: clean(s?.shortDescription),
      description: clean(s?.description),
      category: clean(s?.category) || "service",

      image: sanitizeImageObject(image),

      gallery: gallery
        .map((g) => sanitizeImageObject(g))
        .filter((g) => g.url),

      price: {
        mode: clean(s?.price?.mode) || "contact",
        amount:
          s?.price?.amount === null || s?.price?.amount === undefined || s?.price?.amount === ""
            ? null
            : Number(s.price.amount),
        from:
          s?.price?.from === null || s?.price?.from === undefined || s?.price?.from === ""
            ? null
            : Number(s.price.from),
        to:
          s?.price?.to === null || s?.price?.to === undefined || s?.price?.to === ""
            ? null
            : Number(s.price.to),
        currency: clean(s?.price?.currency || "PLN").toUpperCase(),
        unitLabel: clean(s?.price?.unitLabel),
        note: clean(s?.price?.note),
      },

      duration: {
        value:
          s?.duration?.value === null ||
            s?.duration?.value === undefined ||
            s?.duration?.value === ""
            ? null
            : Number(s.duration.value),
        unit: clean(s?.duration?.unit || "minutes"),
        label: clean(s?.duration?.label),
      },

      booking: {
        enabled: !!s?.booking?.enabled,
        type: clean(s?.booking?.type || "none"),
      },

      delivery: {
        mode: clean(s?.delivery?.mode || "none"),
        turnaroundText: clean(s?.delivery?.turnaroundText),
      },

      tags: sanitizeStringArray(s?.tags, 10),
      featured: !!s?.featured,
      isActive: typeof s?.isActive === "boolean" ? s.isActive : true,
      order: Number.isFinite(Number(s?.order)) ? Number(s.order) : index,
    };

    return service;
  });
}

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearch = (value = "") =>
  String(value)
    .split("")
    .map((char) => polishMap[char] || char)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const includesNormalized = (source = "", query = "") =>
  normalizeSearch(source).includes(normalizeSearch(query));

function getMatchedServices(services = [], query = "") {
  if (!Array.isArray(services)) return [];

  return services.filter((service) => {
    if (service?.isActive === false) return false;

    return (
      includesNormalized(service?.name, query) ||
      includesNormalized(service?.shortDescription, query) ||
      includesNormalized(service?.description, query) ||
      (Array.isArray(service?.tags) &&
        service.tags.some((tag) => includesNormalized(tag, query)))
    );
  });
}

function scoreProfile(profile, query) {
  let score = 0;
  const q = normalizeSearch(query);

  if (!q) return score;

  const exact = (value, points) => {
    if (normalizeSearch(value) === q) score += points;
  };

  const partial = (value, points) => {
    if (includesNormalized(value, q)) score += points;
  };

  exact(profile?.name, 120);
  partial(profile?.name, 80);

  exact(profile?.role, 90);
  partial(profile?.role, 60);

  exact(profile?.location, 55);
  partial(profile?.location, 35);

  exact(profile?.profileType, 45);
  partial(profile?.profileType, 25);

  partial(profile?.description, 18);

  if (Array.isArray(profile?.tags)) {
    profile.tags.forEach((tag) => {
      if (normalizeSearch(tag) === q) score += 35;
      else if (includesNormalized(tag, q)) score += 18;
    });
  }

  if (Array.isArray(profile?.services)) {
    profile.services.forEach((service) => {
      if (service?.isActive === false) return;

      if (normalizeSearch(service?.name) === q) score += 95;
      else if (includesNormalized(service?.name, q)) score += 55;

      if (includesNormalized(service?.shortDescription, q)) score += 22;
      if (includesNormalized(service?.description, q)) score += 12;

      if (Array.isArray(service?.tags)) {
        service.tags.forEach((tag) => {
          if (normalizeSearch(tag) === q) score += 20;
          else if (includesNormalized(tag, q)) score += 10;
        });
      }
    });
  }

  score += Number(profile?.rating || 0) * 2;
  score += Math.min(Number(profile?.reviews || 0), 50) * 0.4;
  score += Math.min(Number(profile?.visits || 0), 500) * 0.03;

  return score;
}

// ------------------------------------------------------
// GET /api/profiles/search?q=... – wyszukiwanie profili
// ------------------------------------------------------
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const now = new Date();

    // opcjonalnie automatyczne wygaszenie starych profili
    await Profile.updateMany(
      { isVisible: true, visibleUntil: { $lt: now } },
      { $set: { isVisible: false } }
    );

    const baseMatch = {
      isVisible: true,
      visibleUntil: { $gte: now },
    };

    const selectFields = {
      name: 1,
      slug: 1,
      role: 1,
      location: 1,
      tags: 1,
      rating: 1,
      reviews: 1,
      visits: 1,
      priceFrom: 1,
      priceTo: 1,
      avatar: 1,
      photos: 1,
      profileType: 1,
      description: 1,
      bookingMode: 1,
      services: 1,
      favoritesCount: 1,
      theme: 1,
      updatedAt: 1,
      createdAt: 1,
    };

    let results = [];

    // 1) TEXT SEARCH (jeśli indeks istnieje)
    try {
      const textResults = await Profile.find(
        {
          ...baseMatch,
          $text: { $search: q },
        },
        {
          ...selectFields,
          score: { $meta: "textScore" },
        }
      )
        .sort({
          score: { $meta: "textScore" },
          rating: -1,
          reviews: -1,
          visits: -1,
        })
        .limit(limit)
        .lean();

      results = textResults.map((item) => ({
        ...item,
        _searchScore: (item.score || 0) * 10 + scoreProfile(item, q),
      }));
    } catch (err) {
      console.warn("⚠️ Text search fallback:", err.message);
    }

    // 2) fallback regex, jeśli mało wyników albo brak indeksu
    if (results.length < limit) {
      const regex = new RegExp(escapeRegex(q), "i");

      const fallback = await Profile.find(
        {
          ...baseMatch,
          $or: [
            { name: regex },
            { role: regex },
            { location: regex },
            { profileType: regex },
            { description: regex },
            { tags: regex },
            { "services.name": regex },
            { "services.shortDescription": regex },
            { "services.description": regex },
            { "services.tags": regex },
          ],
        },
        selectFields
      )
        .limit(limit * 3)
        .lean();

      const seen = new Set(results.map((item) => String(item._id)));

      for (const item of fallback) {
        const id = String(item._id);
        if (seen.has(id)) continue;

        results.push({
          ...item,
          _searchScore: scoreProfile(item, q),
        });

        seen.add(id);
      }
    }

    const finalResults = results
      .map((profile) => {
        const matchedServices = getMatchedServices(profile.services, q)
          .slice(0, 3)
          .map((service) => ({
            _id: service._id,
            name: service.name,
            shortDescription: service.shortDescription,
            category: service.category,
            price: service.price,
            duration: service.duration,
            tags: service.tags || [],
            image: normalizeImageOut(req, service.image, profile.updatedAt),
          }));

        return {
          ...profile,
          avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
          photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
          services: normalizeServicesOut(req, profile.services, profile.updatedAt),
          matchedServices,
        };
      })
      .sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0))
      .slice(0, limit);

    return res.json(finalResults);
  } catch (error) {
    console.error("❌ Błąd wyszukiwania profili:", error);
    return res.status(500).json({ message: "Błąd wyszukiwania profili." });
  }
});

// =========================================================
// ✅ CLOUDINARY: AVATAR + PHOTOS
// =========================================================

// POST /api/profiles/:uid/avatar
router.post("/:uid/avatar", requireAuth, requireOwnerOrAdmin, upload.single("file"), async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!req.file) return res.status(400).json({ message: "Brak pliku." });

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const oldPublicId = pickPublicIdField(profile.avatar);
    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => { });
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: `showly/profiles/${uid}/avatar`,
      resource_type: "image",
      transformation: [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

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
router.delete("/:uid/avatar", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const uid = req.params.uid;
    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const oldPublicId = pickPublicIdField(profile.avatar);
    if (oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => { });
    }

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

// POST /api/profiles/:uid/photos
router.post("/:uid/photos", requireAuth, requireOwnerOrAdmin, upload.array("files", 6), async (req, res) => {
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

    profile.photos = Array.isArray(profile.photos) ? profile.photos : [];
    profile.photos = [...profile.photos, ...uploaded];

    await profile.save();

    return res.json({
      message: "Zdjęcia dodane.",
      photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
    });
  } catch (e) {
    console.error("❌ upload photos:", e);
    return res.status(500).json({ message: "Błąd uploadu zdjęć." });
  }
});

// DELETE /api/profiles/:uid/photos/:publicId
router.delete("/:uid/photos/:publicId", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const { uid, publicId } = req.params;

    const profile = await Profile.findOne({ userId: uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const decoded = decodeURIComponent(publicId);

    await cloudinary.uploader.destroy(decoded, { resource_type: "image" }).catch(() => { });

    profile.photos = Array.isArray(profile.photos) ? profile.photos : [];
    profile.photos = profile.photos.filter((p) => {
      if (typeof p === "string") return true;
      return p?.publicId !== decoded;
    });

    await profile.save();

    return res.json({
      message: "Zdjęcie usunięte.",
      photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
    });
  } catch (e) {
    console.error("❌ delete photo:", e);
    return res.status(500).json({ message: "Błąd usuwania zdjęcia." });
  }
});

// =========================================================
// ✅ CLOUDINARY: SERVICE IMAGE + SERVICE GALLERY
// =========================================================

// POST /api/profiles/:uid/services/:serviceId/image
router.post(
  "/:uid/services/:serviceId/image",
  requireAuth,
  requireOwnerOrAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      const { uid, serviceId } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "Brak pliku." });
      }

      const profile = await Profile.findOne({ userId: uid });
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const service = profile.services.id(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Nie znaleziono usługi." });
      }

      const oldPublicId = pickPublicIdField(service.image);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => { });
      }

      const result = await uploadBuffer(req.file.buffer, {
        folder: `showly/profiles/${uid}/services/${serviceId}/cover`,
        resource_type: "image",
        transformation: [
          { width: 1400, height: 1400, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });

      service.image = {
        url: result.secure_url,
        publicId: result.public_id,
      };

      await profile.save();

      return res.json({
        message: "Zdjęcie usługi zapisane.",
        image: normalizeImageOut(req, service.image, profile.updatedAt),
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      });
    } catch (e) {
      console.error("❌ upload service image:", e);
      return res.status(500).json({ message: "Błąd uploadu zdjęcia usługi." });
    }
  }
);

// DELETE /api/profiles/:uid/services/:serviceId/image
router.delete(
  "/:uid/services/:serviceId/image",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    try {
      const { uid, serviceId } = req.params;

      const profile = await Profile.findOne({ userId: uid });
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const service = profile.services.id(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Nie znaleziono usługi." });
      }

      const oldPublicId = pickPublicIdField(service.image);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" }).catch(() => { });
      }

      service.image = { url: "", publicId: "" };
      await profile.save();

      return res.json({
        message: "Zdjęcie usługi usunięte.",
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      });
    } catch (e) {
      console.error("❌ delete service image:", e);
      return res.status(500).json({ message: "Błąd usuwania zdjęcia usługi." });
    }
  }
);

// POST /api/profiles/:uid/services/:serviceId/gallery
router.post(
  "/:uid/services/:serviceId/gallery",
  requireAuth,
  requireOwnerOrAdmin,
  upload.array("files", 6),
  async (req, res) => {
    try {
      const { uid, serviceId } = req.params;
      const files = req.files || [];

      if (!files.length) {
        return res.status(400).json({ message: "Brak plików." });
      }

      const profile = await Profile.findOne({ userId: uid });
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const service = profile.services.id(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Nie znaleziono usługi." });
      }

      const MAX = 6;
      const currentCount = Array.isArray(service.gallery) ? service.gallery.length : 0;
      if (currentCount + files.length > MAX) {
        return res.status(400).json({ message: `Maksymalnie ${MAX} zdjęć w galerii usługi.` });
      }

      const uploaded = [];
      for (const f of files) {
        const r = await uploadBuffer(f.buffer, {
          folder: `showly/profiles/${uid}/services/${serviceId}/gallery`,
          resource_type: "image",
          transformation: [
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        });

        uploaded.push({
          url: r.secure_url,
          publicId: r.public_id,
        });
      }

      service.gallery = Array.isArray(service.gallery) ? service.gallery : [];
      service.gallery = [...service.gallery, ...uploaded];

      await profile.save();

      return res.json({
        message: "Zdjęcia galerii usługi dodane.",
        service: normalizeServiceOut(req, service, profile.updatedAt),
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      });
    } catch (e) {
      console.error("❌ upload service gallery:", e);
      return res.status(500).json({ message: "Błąd uploadu galerii usługi." });
    }
  }
);

// DELETE /api/profiles/:uid/services/:serviceId/gallery/:publicId
router.delete(
  "/:uid/services/:serviceId/gallery/:publicId",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    try {
      const { uid, serviceId, publicId } = req.params;

      const profile = await Profile.findOne({ userId: uid });
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const service = profile.services.id(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Nie znaleziono usługi." });
      }

      const decoded = decodeURIComponent(publicId);

      await cloudinary.uploader.destroy(decoded, { resource_type: "image" }).catch(() => { });

      service.gallery = Array.isArray(service.gallery) ? service.gallery : [];
      service.gallery = service.gallery.filter((img) => img?.publicId !== decoded);

      await profile.save();

      return res.json({
        message: "Zdjęcie z galerii usługi usunięte.",
        service: normalizeServiceOut(req, service, profile.updatedAt),
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      });
    } catch (e) {
      console.error("❌ delete service gallery image:", e);
      return res.status(500).json({ message: "Błąd usuwania zdjęcia z galerii usługi." });
    }
  }
);

// ======================================
// GET /api/profiles – aktywne i ważne
// ======================================
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    await Profile.updateMany(
      { isVisible: true, visibleUntil: { $lt: now } },
      { $set: { isVisible: false } }
    );

    const visible = await Profile.find({
      isVisible: true,
      visibleUntil: { $gte: now },
    }).lean();

    const normalized = visible.map((profile) => ({
      ...profile,
      avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
      photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
      services: normalizeServicesOut(req, profile.services, profile.updatedAt),
    }));

    res.json(normalized);
  } catch (e) {
    console.error("❌ Błąd GET /profiles:", e);
    res.status(500).json({ message: "Błąd pobierania profili" });
  }
});

// -------------------------------------------------
// GET /api/profiles/by-user/:uid – profil po userId
// -------------------------------------------------
router.get("/by-user/:uid", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid }).lean();
    if (!profile) {
      return res.status(404).json({ message: "Brak wizytówki dla tego użytkownika." });
    }

    const avatar = normalizeAvatarOut(req, profile.avatar, profile.updatedAt);
    const photos = normalizePhotosOut(req, profile.photos, profile.updatedAt);
    const services = normalizeServicesOut(req, profile.services, profile.updatedAt);

    return res.json({ ...profile, avatar, photos, services });
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

    let ratedBy = Array.isArray(profile.ratedBy) ? profile.ratedBy : [];
    const ids = [...new Set(ratedBy.map((r) => r.userId).filter(Boolean))];

    let usersMap = {};
    if (ids.length) {
      const users = await User.find({ firebaseUid: { $in: ids } })
        .select("firebaseUid avatar updatedAt")
        .lean();

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
    const photos = normalizePhotosOut(req, profile.photos, profile.updatedAt);
    const services = normalizeServicesOut(req, profile.services, profile.updatedAt);

    let isFavorite = false;
    const favoritesCount = profile.favoritesCount;

    if (viewerUid) {
      const favExists = await Favorite.exists({
        ownerUid: viewerUid,
        profileUserId: profile.userId,
      });
      isFavorite = !!favExists;
    }

    return res.json({
      ...profile,
      ratedBy,
      avatar,
      photos,
      services,
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

    const profile = await Profile.findOne({ userId: ownerUid }).select(
      "visits isVisible visibleUntil userId"
    );

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

    const updated = await Profile.findOneAndUpdate(
      { userId: ownerUid },
      { $inc: { visits: 1 } },
      { new: true, select: "visits" }
    );

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

    const profile = await Profile.findOne({ slug }).select(
      "userId visits isVisible visibleUntil"
    );

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

    const updated = await Profile.findOneAndUpdate(
      { slug },
      { $inc: { visits: 1 } },
      { new: true, select: "visits" }
    );

    return res.json({ visits: updated.visits });
  } catch (e) {
    console.error("❌ Błąd /slug/:slug/visit:", e);
    return res.status(500).json({ message: "Błąd serwera." });
  }
});

// -----------------------------------------
// POST /api/profiles — tworzenie profilu
// -----------------------------------------
router.post("/", requireAuth, async (req, res) => {
  const userId = String(req.auth?.uid || "");

  const name = String(req.body.name || "");
  const role = String(req.body.role || "");
  const location = String(req.body.location || "");

  if (!userId || !name) {
    return res.status(400).json({ message: "Brakuje userId lub name w danych profilu" });
  }

  try {
    const existing = await Profile.findOne({
      name: name.trim(),
      role: role.trim(),
      location: location.trim(),
    });

    if (existing) {
      return res.status(409).json({
        message: "Taka wizytówka już istnieje (imię + rola + lokalizacja).",
      });
    }

    const existingByUser = await Profile.findOne({ userId });
    if (existingByUser) {
      return res.status(409).json({ message: "Ten użytkownik już posiada wizytówkę." });
    }

    const baseSlug = slugify(`${name}-${role || "profil"}`);
    let uniqueSlug = baseSlug || `profil-${Date.now()}`;
    let i = 1;

    while (await Profile.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug || "profil"}-${i++}`;
    }

    const { userId: _ignoredUserId, services, ...safeBody } = req.body || {};

    const safeServices = services ? sanitizeServicesInput(services) : [];

    const newProfile = new Profile({
      ...safeBody,
      services: safeServices,
      userId,
      name: name.trim(),
      role: role.trim(),
      location: location.trim(),
      slug: uniqueSlug,
      isVisible: true,
      visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await newProfile.save();

    res.status(201).json({
      message: "Profil utworzony",
      profile: {
        ...newProfile.toObject(),
        avatar: normalizeAvatarOut(req, newProfile.avatar, newProfile.updatedAt),
        photos: normalizePhotosOut(req, newProfile.photos, newProfile.updatedAt),
        services: normalizeServicesOut(req, newProfile.services, newProfile.updatedAt),
      },
    });

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
          "• avatar i krótki opis,",
          "• rola / specjalizacja i lokalizacja,",
          "• tagi i widełki cenowe.",
          "",
          "🧰 Dodaj ofertę / usługi:",
          "• nazwa, krótki opis i pełny opis,",
          "• cena lub wycena indywidualna,",
          "• czas trwania lub czas realizacji,",
          "• zdjęcie główne i galeria.",
          "",
          "🔗 Linki i media:",
          "• dodaj zdjęcia, social media i dane kontaktowe.",
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
          convo.messages.push({
            fromUid,
            toUid,
            content: welcomeContent,
            isSystem: true,
            createdAt: new Date(),
          });
          convo.updatedAt = new Date();
          await convo.save();
        }
      } catch (e) {
        console.error("⚠️ Błąd wątku systemowego:", e);
      }
    });
  } catch (err) {
    console.error("❌ Błąd w POST /api/profiles:", err);

    if (err?.message?.includes("Usługa") || err?.message?.includes("services")) {
      return res.status(400).json({ message: err.message });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        message: "Błąd walidacji danych.",
        details: Object.values(err.errors || {}).map((e) => e.message),
      });
    }

    return res.status(500).json({ message: "Błąd tworzenia profilu" });
  }
});

// ------------------------------------------------------
// PATCH /api/profiles/extend/:uid – +30 dni widoczności
// ------------------------------------------------------
router.patch("/extend/:uid", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) {
      return res.status(404).json({ message: "Nie znaleziono profilu do przedłużenia." });
    }

    profile.isVisible = true;
    profile.visibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await profile.save();

    res.json({
      message: "Widoczność przedłużona o 30 dni.",
      profile: {
        ...profile.toObject(),
        avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
        photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      },
    });
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
  "bookingBufferMin",
  "workingDays",
  "team",
  "theme",
  "contact",
  "socials",
  "blockedDays",
  "name",
  "hasBusiness",
  "nip",
  "partnership",
];

router.patch("/update/:uid", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    const updates = { ...req.body };

    if (updates.avatar) {
      const avatarUrl = typeof updates.avatar === "string" ? updates.avatar : updates.avatar?.url;
      if (isDataImage(avatarUrl)) {
        return res.status(400).json({
          message: "Avatar nie może być base64. Wgraj przez upload i zapisz URL.",
        });
      }
      if (isBlobUrl(avatarUrl)) {
        updates.avatar = profile.avatar || { url: "", publicId: "" };
      }
    }

    if (Array.isArray(updates.photos)) {
      if (
        updates.photos.some((p) => {
          const u = typeof p === "string" ? p : p?.url;
          return isDataImage(u);
        })
      ) {
        return res.status(400).json({
          message: "Zdjęcia nie mogą być base64. Wgrywaj przez upload i zapisuj URL-e.",
        });
      }

      updates.photos = updates.photos.filter((p) => {
        const u = typeof p === "string" ? p : p?.url;
        return p && !isBlobUrl(u);
      });
    }

    if (updates.services !== undefined) {
      updates.services = sanitizeServicesInput(updates.services, profile);
    }

    if (updates.contact) {
      const prev = profile.contact?.toObject ? profile.contact.toObject() : profile.contact || {};

      const street = clean(updates.contact.street);
      const postcode = clean(updates.contact.postcode);
      const locationForAddress = clean(
        typeof updates.location !== "undefined" ? updates.location : profile.location
      );

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

    if (updates.socials) {
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

    if (updates.quickAnswers) {
      updates.quickAnswers = Array.isArray(updates.quickAnswers)
        ? updates.quickAnswers
          .map((qa) => ({
            title: clean(qa?.title),
            answer: clean(qa?.answer),
          }))
          .filter((qa) => qa.title || qa.answer)
          .slice(0, 3)
        : [];
    }

    if (updates.tags) {
      updates.tags = sanitizeStringArray(updates.tags, 20);
    }

    if (updates.links) {
      updates.links = sanitizeStringArray(updates.links, 10);
    }

    if (updates.blockedDays) {
      updates.blockedDays = sanitizeStringArray(updates.blockedDays, 365);
    }

    if (updates.availableDates) {
      updates.availableDates = Array.isArray(updates.availableDates)
        ? updates.availableDates
          .map((item) => ({
            date: clean(item?.date),
            fromTime: clean(item?.fromTime),
            toTime: clean(item?.toTime),
          }))
          .filter((item) => item.date && item.fromTime && item.toTime)
        : [];
    }

    if (updates.workingHours) {
      updates.workingHours = {
        from: clean(updates.workingHours.from || profile.workingHours?.from || "08:00"),
        to: clean(updates.workingHours.to || profile.workingHours?.to || "20:00"),
      };
    }

    if (updates.workingDays) {
      updates.workingDays = Array.isArray(updates.workingDays)
        ? updates.workingDays
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        : profile.workingDays;
    }

    if (updates.priceFrom !== undefined) {
      updates.priceFrom =
        updates.priceFrom === null || updates.priceFrom === ""
          ? null
          : Number(updates.priceFrom);
    }

    if (updates.priceTo !== undefined) {
      updates.priceTo =
        updates.priceTo === null || updates.priceTo === ""
          ? null
          : Number(updates.priceTo);
    }

    if (updates.partnership) {
      const prev =
        profile.partnership?.toObject ? profile.partnership.toObject() : profile.partnership || {};

      const isPartner = !!updates.partnership.isPartner;
      const tier = clean(updates.partnership.tier || prev.tier || "none");

      updates.partnership = {
        ...prev,
        isPartner,
        tier: isPartner ? tier || "partner" : "none",
        label: clean(updates.partnership.label || prev.label || ""),
        badgeText: clean(updates.partnership.badgeText || prev.badgeText || ""),
        color: clean(updates.partnership.color || prev.color || "#59d0ff"),
        priority: Number.isFinite(Number(updates.partnership.priority))
          ? Number(updates.partnership.priority)
          : Number(prev.priority || 0),
        since: updates.partnership.since || prev.since || null,
      };
    }

    for (const field of allowedFields) {
      if (field !== "team" && field !== "theme" && updates[field] !== undefined) {
        profile[field] = updates[field];
      }
    }

    if (updates.theme) {
      if (typeof updates.theme.variant !== "undefined") {
        profile.set("theme.variant", updates.theme.variant);
      }
      if (typeof updates.theme.primary !== "undefined") {
        profile.set("theme.primary", clean(updates.theme.primary));
      }
      if (typeof updates.theme.secondary !== "undefined") {
        profile.set("theme.secondary", clean(updates.theme.secondary));
      }
    }

    if (updates.team) {
      if (typeof updates.team.enabled !== "undefined") {
        profile.set("team.enabled", !!updates.team.enabled);
      }
      if (updates.team.assignmentMode) {
        profile.set(
          "team.assignmentMode",
          updates.team.assignmentMode === "auto-assign" ? "auto-assign" : "user-pick"
        );
      }
    }

    await profile.save();

    return res.json({
      message: "Profil zaktualizowany",
      profile: {
        ...profile.toObject(),
        avatar: normalizeAvatarOut(req, profile.avatar, profile.updatedAt),
        photos: normalizePhotosOut(req, profile.photos, profile.updatedAt),
        services: normalizeServicesOut(req, profile.services, profile.updatedAt),
      },
    });
  } catch (err) {
    console.error("❌ Błąd aktualizacji profilu:", err);

    if (
      err?.message?.includes("Usługa") ||
      err?.message?.includes("services") ||
      err?.message?.includes("base64") ||
      err?.message?.includes("blob")
    ) {
      return res.status(400).json({ message: err.message });
    }

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
router.patch("/rate/:slug", requireAuth, async (req, res) => {
  const userId = String(req.auth?.uid || "");

  const { rating, comment, userName: bodyName, userAvatar: bodyAvatar } = req.body;
  const numericRating = Number(rating);

  if (
    !userId ||
    isNaN(numericRating) ||
    numericRating < 1 ||
    numericRating > 5 ||
    !comment ||
    String(comment).trim().length < 10 ||
    String(comment).trim().length > 200
  ) {
    return res.status(400).json({
      message: "Ocena musi być liczbą od 1 do 5, a komentarz musi mieć od 10 do 200 znaków.",
    });
  }

  try {
    const profile = await Profile.findOne({ slug: req.params.slug }).select(
      "userId ratedBy rating reviews"
    );

    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    if (profile.userId === userId) {
      return res.status(403).json({ message: "Nie możesz ocenić własnej wizytówki." });
    }

    if (!Array.isArray(profile.ratedBy)) profile.ratedBy = [];
    if (profile.ratedBy.find((r) => r.userId === userId)) {
      return res.status(400).json({ message: "Już oceniłeś ten profil." });
    }

    let finalName = String(bodyName || "").trim();
    let rawAvatar = String(bodyAvatar || "").trim();

    if (!finalName || !rawAvatar) {
      try {
        const dbUser = await User.findOne({ firebaseUid: userId })
          .select("displayName name avatar")
          .lean();

        if (!finalName) finalName = dbUser?.displayName || dbUser?.name || "Użytkownik";
        if (!rawAvatar) rawAvatar = dbUser?.avatar || "";
      } catch { }
    }

    const storedUserAvatar = normalizeUploadPath(rawAvatar);

    profile.ratedBy.push({
      userId,
      rating: numericRating,
      comment: String(comment).trim(),
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

module.exports = router;