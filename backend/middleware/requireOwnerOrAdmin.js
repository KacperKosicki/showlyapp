// middleware/requireOwnerOrAdmin.js
module.exports = function requireOwnerOrAdmin(req, res, next) {
  try {
    const authUid = String(req.auth?.uid || "");
    if (!authUid) {
      return res.status(401).json({ message: "Brak autoryzacji" });
    }

    // ✅ Adminy z ENV (comma-separated)
    const adminUids = String(process.env.ADMIN_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = adminUids.includes(authUid);

    // ✅ Owner — próbujemy wyciągnąć UID właściciela z typowych miejsc
    const paramUid = req.params?.uid ? String(req.params.uid) : "";
    const bodyUid = req.body?.uid ? String(req.body.uid) : "";
    const bodyUserId = req.body?.userId ? String(req.body.userId) : "";

    const ownerUid = paramUid || bodyUid || bodyUserId;

    // Jeśli trasa nie ma kontekstu właściciela, a nie admin — blok
    if (!ownerUid && !isAdmin) {
      return res.status(403).json({ message: "Brak uprawnień (brak ownerUid w żądaniu)" });
    }

    const isOwner = ownerUid && ownerUid === authUid;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Brak uprawnień" });
    }

    // opcjonalnie: przyda się dalej
    req.isAdmin = isAdmin;
    req.isOwner = isOwner;

    return next();
  } catch (e) {
    console.error("❌ requireOwnerOrAdmin error:", e);
    return res.status(500).json({ message: "Błąd uprawnień" });
  }
};