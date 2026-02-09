const mongoose = require("mongoose");

const billingEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingEvent", billingEventSchema);
