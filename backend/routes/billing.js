const express = require("express");
const Stripe = require("stripe");
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Profile = require("../models/Profile");

// 🔥 TESTOWO
const RENEW_WINDOW_DAYS = 999;   // ← zmienisz potem z powrotem na 7
const DURATION_DAYS = 30;

const addDays = (date, days) =>
  new Date(date.getTime() + days * 86400000);

// 🔥 checkout płatności
router.post("/checkout-extension", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Brak uid" });

    const profile = await Profile.findOne({ userId: uid });
    if (!profile)
      return res.status(404).json({ error: "Profil nie istnieje" });

    const now = new Date();
    const visibleUntil = profile.visibleUntil
      ? new Date(profile.visibleUntil)
      : new Date(0);

    // 🔥 DEBUG DO RENDER LOGS
    console.log("💰 CHECKOUT HIT", {
      uid,
      renewWindowDays: RENEW_WINDOW_DAYS,
      now: now.toISOString(),
      visibleUntil: visibleUntil.toISOString(),
      allowAfter: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
    });

    // 🔥 blokada
    if (visibleUntil > addDays(now, RENEW_WINDOW_DAYS)) {
      return res.status(409).json({
        error: `BLOCK: możesz przedłużyć dopiero gdy zostanie ≤ ${RENEW_WINDOW_DAYS} dni`,
        renewWindowDays: RENEW_WINDOW_DAYS,
        now: now.toISOString(),
        visibleUntil: visibleUntil.toISOString(),
        allowAfter: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
      });
    }

    console.log("🟢 PRZECHODZI DO STRIPE");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_EXTENSION_30D,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: {
        uid,
        kind: "extension",
        daysToAdd: String(DURATION_DAYS),
      },
    });

    res.json({ url: session.url });

  } catch (err) {
    console.log("❌ checkout error:", err);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = router;
