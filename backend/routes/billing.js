// routes/billing.js
const express = require("express");
const Stripe = require("stripe");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const Profile = require("../models/Profile");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.warn("⚠️ Brak STRIPE_SECRET_KEY w env!");
}
const stripe = new Stripe(stripeSecret);

// 🔥 TESTOWO
const RENEW_WINDOW_DAYS = Number(process.env.RENEW_WINDOW_DAYS ?? 999); // docelowo np. 7
const DURATION_DAYS = Number(process.env.DURATION_DAYS ?? 30);

const addDays = (date, days) => new Date(date.getTime() + Number(days) * 86400000);

// ------------------------------------
// POST /api/billing/checkout-extension
// - tworzy Stripe Checkout Session
// - uid tylko z tokena
// ------------------------------------
router.post("/checkout-extension", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");
    if (!uid) return res.status(401).json({ error: "Brak autoryzacji" });

    const priceId = process.env.STRIPE_PRICE_EXTENSION_30D;
    if (!priceId) {
      return res.status(500).json({ error: "Brak STRIPE_PRICE_EXTENSION_30D w env" });
    }

    const frontendUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
    if (!frontendUrl) {
      return res.status(500).json({ error: "Brak FRONTEND_URL w env" });
    }

    const profile = await Profile.findOne({ userId: uid }).select("visibleUntil isVisible userId");
    if (!profile) return res.status(404).json({ error: "Profil nie istnieje" });

    const now = new Date();
    const visibleUntil = profile.visibleUntil ? new Date(profile.visibleUntil) : new Date(0);

    // 🔥 DEBUG DO RENDER LOGS
    console.log("💰 CHECKOUT HIT", {
      uid,
      renewWindowDays: RENEW_WINDOW_DAYS,
      now: now.toISOString(),
      visibleUntil: visibleUntil.toISOString(),
      allowAfter: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
    });

    // 🔥 blokada: jeśli ważność jest dalej niż (now + window)
    if (visibleUntil > addDays(now, RENEW_WINDOW_DAYS)) {
      return res.status(409).json({
        error: `BLOCK: możesz przedłużyć dopiero gdy zostanie ≤ ${RENEW_WINDOW_DAYS} dni`,
        renewWindowDays: RENEW_WINDOW_DAYS,
        now: now.toISOString(),
        visibleUntil: visibleUntil.toISOString(),
        allowAfter: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success`,
      cancel_url: `${frontendUrl}/billing/cancel`,
      // warto dopiąć, żeby Stripe miał klienta w kontekście
      client_reference_id: uid,
      metadata: {
        uid,
        kind: "extension",
        daysToAdd: String(DURATION_DAYS),
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.log("❌ checkout error:", err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});

// ------------------------------------
// (opcjonalnie) GET /api/billing/status
// - szybki podgląd czy user może przedłużać
// ------------------------------------
router.get("/status", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");
    if (!uid) return res.status(401).json({ error: "Brak autoryzacji" });

    const profile = await Profile.findOne({ userId: uid }).select("visibleUntil isVisible");
    if (!profile) return res.status(404).json({ error: "Profil nie istnieje" });

    const now = new Date();
    const visibleUntil = profile.visibleUntil ? new Date(profile.visibleUntil) : new Date(0);
    const allow = visibleUntil <= addDays(now, RENEW_WINDOW_DAYS);

    return res.json({
      canExtend: allow,
      now: now.toISOString(),
      visibleUntil: visibleUntil.toISOString(),
      renewWindowDays: RENEW_WINDOW_DAYS,
      durationDays: DURATION_DAYS,
    });
  } catch (e) {
    console.log("❌ status error:", e);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = router;