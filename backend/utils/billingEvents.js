const claimBillingEvent = async (BillingEvent, event) => {
  try {
    const object = event?.data?.object || {};

    await BillingEvent.create({
      eventId: event.id,
      type: event.type,
      objectId: String(object.id || ""),
      livemode: !!event.livemode,
      status: "processing",
      leaseUntil: new Date(Date.now() + 5 * 60 * 1000),
      metadata: {
        objectType: object.object || "",
      },
    });

    return true;
  } catch (err) {
    if (err?.code === 11000) {
      const claimed = await BillingEvent.findOneAndUpdate(
        { eventId: event.id, $or: [{ status: "failed" }, { status: "received" }, { status: "processing", leaseUntil: { $lt: new Date() } }] },
        { $set: { status: "processing", leaseUntil: new Date(Date.now() + 5 * 60 * 1000), errorMessage: "" } },
        { new: true }
      );
      if (claimed) return true;
      const existing = await BillingEvent.findOne({ eventId: event.id });
      if (!["processed", "skipped"].includes(existing?.status)) { const busy = new Error("Zdarzenie jest jeszcze przetwarzane. Spróbuj ponownie."); busy.billingBusy = true; throw busy; }
      return false;
    }

    throw err;
  }
};

module.exports = { claimBillingEvent };
