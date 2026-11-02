const assert = require("node:assert/strict");
const { test } = require("node:test");
const Profile = require("../models/Profile");
const Reservation = require("../models/Reservation");
const Conversation = require("../models/Conversation");
const { reconcileAchievements, achievementState, publicBadges } = require("../utils/achievements");

const query = value => ({ select: () => ({ lean: async () => value }) });

test("awards existing milestones, keeps them earned, and only notifies once per badge", async t => {
  const profile = {
    _id: "profile",
    services: [{ name: "Portret", isActive: true }],
    photos: [{ url: "one" }, { url: "two" }, { url: "three" }],
    ratedBy: [{ userId: "client", comment: "Polecam" }, { userId: "client", comment: "Polecam ponownie" }],
    earnedAchievements: [],
    featuredAchievements: [],
  };
  const messages = [];
  let accepted = 10;
  t.mock.method(Profile, "findOne", () => query({ ...profile }));
  t.mock.method(Profile, "findOneAndUpdate", (_, update) => {
    profile.earnedAchievements = [...new Set([...profile.earnedAchievements, ...update.$addToSet.earnedAchievements.$each])];
    return query({ ...profile });
  });
  t.mock.method(Reservation, "countDocuments", filter => {
    assert.equal(filter.providerUserId, "owner");
    assert.equal(filter.status, "zaakceptowana");
    assert.deepEqual(filter.offline, { $ne: true });
    return { limit: async () => accepted };
  });
  t.mock.method(Reservation, "distinct", async (field, filter) => {
    assert.equal(field, "userId");
    assert.deepEqual(filter.date, { $gte: "2026-10-04", $lte: "2026-11-02" });
    return ["client", "other", "another"];
  });
  t.mock.method(Conversation, "findById", () => query({ messages }));
  t.mock.method(Conversation, "updateOne", async () => {});
  t.mock.method(Conversation, "bulkWrite", async operations => {
    for (const { updateOne } of operations) {
      const message = updateOne.update.$push.messages;
      assert.equal(String(updateOne.filter["messages._id"].$ne), String(message._id));
      assert.equal(message.toUid, "owner");
      assert.equal(message.isSystem, true);
      messages.push(message);
    }
  });

  const now = new Date("2026-11-02T12:00:00Z");
  const state = achievementState(await reconcileAchievements("owner", now));
  assert.deepEqual(state.badges.filter(badge => badge.earned).map(badge => badge.id),
    ["first-profile", "first-service", "portfolio", "first-booking", "ten-bookings", "regular-bookings"]);
  assert.equal(messages.length, 6);

  profile.services = [];
  accepted = 0;
  profile.createdAt = new Date("2025-11-02T12:00:00Z");
  profile.isVisible = false;
  await reconcileAchievements("owner", now);
  assert.equal(profile.earnedAchievements.includes("profile-365-days"), false);
  assert.ok(profile.earnedAchievements.includes("first-service"));
  assert.equal(messages.length, 6);

  profile.isVisible = true;
  profile.visibleUntil = new Date("2026-11-03T12:00:00Z");
  profile.ratedBy = Array.from({ length: 10 }, (_, index) => ({ userId: String(index), comment: "Polecam" }));
  await reconcileAchievements("owner", now);
  assert.ok(profile.earnedAchievements.includes("profile-90-days"));
  assert.ok(profile.earnedAchievements.includes("profile-365-days"));
  assert.ok(profile.earnedAchievements.includes("ten-reviews"));
  assert.equal(messages.length, 10);

  profile.featuredAchievements = ["unearned", "portfolio"];
  assert.deepEqual(publicBadges(profile).map(badge => badge.id), ["portfolio"]);
});

test("accounts without a provider profile have no profile achievements", async t => {
  t.mock.method(Profile, "findOne", () => query(null));
  assert.equal(await reconcileAchievements("owner"), null);
});
