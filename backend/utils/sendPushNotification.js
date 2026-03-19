const admin = require("./firebaseAdmin");
const User = require("../models/User");

async function sendPushToUserUid(userUid, { title, body, url = "/" }) {
  if (!userUid) {
    return { ok: false, reason: "no-user-uid" };
  }

  const user = await User.findOne({ firebaseUid: userUid })
    .select("pushTokens")
    .lean();

  const tokens = Array.isArray(user?.pushTokens)
    ? user.pushTokens.filter(Boolean)
    : [];

  if (!tokens.length) {
    console.log("⚠️ Brak push tokenów dla:", userUid);
    return { ok: false, reason: "no-tokens" };
  }

  const message = {
    tokens,
    notification: {
      title: String(title || "Nowe powiadomienie"),
      body: String(body || ""),
    },
    data: {
      title: String(title || "Nowe powiadomienie"),
      body: String(body || ""),
      url: String(url || "/"),
    },
    webpush: {
      fcmOptions: {
        link: String(url || "/"),
      },
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
        tokens[i],
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

module.exports = { sendPushToUserUid };