const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["profile", "review"], required: true },

    // kto zgłosił
    reporterUid: { type: String, required: true },

    // kogo dotyczy (właściciel profilu)
    profileUserId: { type: String, required: true }, // to samo co Profile.userId

    // opcjonalnie: łatwe linkowanie
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    profileSlug: { type: String },

    // jeżeli zgłaszasz opinię (subdocument _id w ratedBy)
    reviewId: { type: mongoose.Schema.Types.ObjectId, default: null },

    reason: {
      type: String,
      enum: ["spam", "fake", "abuse", "illegal", "other"],
      required: true,
    },

    message: { type: String, maxlength: 400, default: "" },

    status: { type: String, enum: ["open", "closed"], default: "open" },
    adminNote: { type: String, maxlength: 400, default: "" },

    // snapshot (żeby admin widział co było zgłoszone nawet po zmianach)
    snapshot: {
      profileName: String,
      reviewUserName: String,
      reviewComment: String,
      reviewRating: Number,
    },
  },
  { timestamps: true }
);

// prosta blokada spamu: niech 1 user nie zgłasza tego samego celu w kółko
reportSchema.index(
  { reporterUid: 1, type: 1, profileUserId: 1, reviewId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

module.exports = mongoose.model("Report", reportSchema);