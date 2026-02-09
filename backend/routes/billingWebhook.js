const express = require("express");
const Stripe = require("stripe");
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Profile = require("../models/Profile");
const BillingEvent = require("../models/BillingEvent");

const RENEW_WINDOW_DAYS = 999;
const DURATION_DAYS = 30;
const MAX_FORWARD_DAYS = 37;

const addDays = (date, days) =>
  new Date(date.getTime() + days * 86400000);

// 🔥 WEBHOOK STRIPE
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("❌ webhook signature error:", err.message);
    return res.status(400).send("Webhook error");
  }

  try {
    // idempotencja
    const exists = await BillingEvent.findOne({ eventId: event.id });
    if (exists) return res.json({ received: true });

    await BillingEvent.create({ eventId: event.id, type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status === "paid") {
        const { uid } = session.metadata || {};
        if (!uid) return res.json({ received: true });

        const profile = await Profile.findOne({ userId: uid });
        if (!profile) return res.json({ received: true });

        const now = new Date();
        const visibleUntil = profile.visibleUntil
          ? new Date(profile.visibleUntil)
          : new Date(0);

        if (visibleUntil > addDays(now, RENEW_WINDOW_DAYS)) {
          return res.json({ received: true });
        }

        const base = visibleUntil > now ? visibleUntil : now;
        let next = addDays(base, DURATION_DAYS);

        const cap = addDays(now, MAX_FORWARD_DAYS);
        if (next > cap) next = cap;

        profile.visibleUntil = next;
        profile.isVisible = true;
        await profile.save();

        console.log("💰 PRZEDŁUŻONO do:", next);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.log("❌ webhook handler error:", err);
    res.status(500).send("error");
  }
});

module.exports = router;
