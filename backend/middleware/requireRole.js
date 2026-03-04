// middleware/requireRole.js
const User = require("../models/User");

module.exports = function requireRole(roles = []) {
  return async (req, res, next) => {
    try {
      const authUid = String(req.auth?.uid || "");
      if (!authUid) {
        return res.status(401).json({ message: "Brak autoryzacji" });
      }

      const dbUser = await User.findOne({ firebaseUid: authUid });
      if (!dbUser) {
        return res.status(404).json({ message: "Użytkownik nie istnieje w bazie" });
      }

      if (!roles.includes(dbUser.role)) {
        return res.status(403).json({ message: "Brak uprawnień" });
      }

      req.dbUser = dbUser;      // przyda się w kontrolerach
      req.userRole = dbUser.role;

      return next();
    } catch (err) {
      console.error("❌ requireRole error:", err);
      return res.status(500).json({ message: "Błąd autoryzacji" });
    }
  };
};