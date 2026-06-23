const admin = require("./firebaseAdmin");
const User = require("../models/User");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function inferProvider(firebaseUser, fallbackProvider = "") {
  const providerIds = Array.isArray(firebaseUser?.providerData)
    ? firebaseUser.providerData.map((p) => p?.providerId).filter(Boolean)
    : [];

  if (providerIds.includes("google.com")) return "google";
  if (providerIds.includes("password")) return "password";
  if (fallbackProvider === "google" || fallbackProvider === "password") {
    return fallbackProvider;
  }

  return "password";
}

function inferName(firebaseUser, fallbackName = "") {
  const displayName =
    firebaseUser?.displayName ||
    firebaseUser?.providerData?.find((p) => p?.displayName)?.displayName ||
    fallbackName;

  return String(displayName || "").trim();
}

async function syncFirebaseUserToMongo(firebaseUser, options = {}) {
  const firebaseUid = String(firebaseUser?.uid || options.firebaseUid || "").trim();
  const email = normalizeEmail(firebaseUser?.email || options.email);

  if (!firebaseUid || !email) {
    return { skipped: true, reason: "missing_uid_or_email" };
  }

  const provider = inferProvider(firebaseUser, options.provider);
  const emailVerified = Boolean(firebaseUser?.emailVerified ?? options.emailVerified);
  const name = inferName(firebaseUser, options.name);

  const [userByUid, userByEmail] = await Promise.all([
    User.findOne({ firebaseUid }),
    User.findOne({ email }),
  ]);

  if (userByUid && userByEmail && String(userByUid._id) !== String(userByEmail._id)) {
    return {
      skipped: true,
      reason: "identity_conflict",
      firebaseUid,
      email,
      mongoId: userByEmail._id,
    };
  }

  if (userByEmail?.firebaseUid && String(userByEmail.firebaseUid) !== firebaseUid) {
    return {
      skipped: true,
      reason: "identity_conflict",
      firebaseUid,
      email,
      mongoId: userByEmail._id,
    };
  }

  let user = userByUid || userByEmail || null;

  if (!user) {
    user = new User({
      email,
      firebaseUid,
      name,
      displayName: name,
      avatar: firebaseUser?.photoURL || "",
      provider,
      emailVerified,
    });

    await user.save();

    return { created: true, user };
  }

  let changed = false;

  if (user.email !== email) {
    user.email = email;
    changed = true;
  }

  if (user.firebaseUid !== firebaseUid) {
    user.firebaseUid = firebaseUid;
    changed = true;
  }

  if (!user.provider || user.provider !== provider) {
    user.provider = provider;
    changed = true;
  }

  if (typeof user.emailVerified !== "boolean" || user.emailVerified !== emailVerified) {
    user.emailVerified = emailVerified;
    changed = true;
  }

  if (name && (!user.name || user.name === "Uzytkownik")) {
    user.name = name;
    changed = true;
  }

  if (name && !user.displayName) {
    user.displayName = name;
    changed = true;
  }

  if (firebaseUser?.photoURL && !user.avatar) {
    user.avatar = firebaseUser.photoURL;
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return { updated: changed, user };
}

async function syncAllFirebaseUsersToMongo() {
  let nextPageToken;
  const summary = {
    scanned: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
  };

  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    nextPageToken = page.pageToken;

    for (const firebaseUser of page.users) {
      summary.scanned += 1;

      const result = await syncFirebaseUserToMongo(firebaseUser);

      if (result.created) summary.created += 1;
      else if (result.updated) summary.updated += 1;
      else if (result.skipped) {
        summary.skipped += 1;
        if (result.reason === "identity_conflict") summary.conflicts += 1;
      }
    }
  } while (nextPageToken);

  return summary;
}

module.exports = {
  syncAllFirebaseUsersToMongo,
  syncFirebaseUserToMongo,
};
