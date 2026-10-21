const admin = require("./firebaseAdmin");
const User = require("../models/User");
const { normalizePreferences } = require('./notificationPreferences');

async function deliverPush(userUid, { title, body, url = "/", category = 'messages' }) {
  if (!userUid) {
    return { ok: false, reason: "no-user-uid" };
  }

  const user = await User.findOne({ firebaseUid: userUid })
    .select("pushTokens notificationPreferences")
    .lean();

  if (normalizePreferences(user?.notificationPreferences)[category] === false) return { ok: false, reason: 'disabled-by-user' };

  const tokens = Array.isArray(user?.pushTokens)
    ? user.pushTokens.filter(Boolean)
    : [];

  if (!tokens.length) {
    console.log("⚠️ Brak push tokenów dla:", userUid);
    return { ok: false, reason: "no-tokens" };
  }

  const message = {
    tokens,
    data: {
      title: String(title || "Nowe powiadomienie"),
      body: String(body || ""),
      url: String(url || "/"),
      category,
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  console.log("✅ Push response:", {
    successCount: response.successCount,
    failureCount: response.failureCount,
  });

  const invalidTokens = [];

  response.responses.forEach((r, i) => {
    if (!r.success) {
      console.error(
        "❌ Push token error:",
        r.error?.code,
        r.error?.message
      );

      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  if (invalidTokens.length) {
    await User.updateOne(
      { firebaseUid: userUid },
      { $pull: { pushTokens: { $in: invalidTokens } } }
    );
  }

  return {
    ok: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

// A notification transport failure must never turn a committed booking/message into a 500.
async function sendPushToUserUid(userUid, payload) {
  try { return await deliverPush(userUid, payload); }
  catch (error) {
    console.error('Push delivery failed:', error?.code || error?.message);
    return { ok: false, reason: 'delivery-failed' };
  }
}

module.exports = { sendPushToUserUid };
