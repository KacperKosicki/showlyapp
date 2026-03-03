// middleware/requireAuth.js
const admin = require("../utils/firebaseAdmin"); // ✅ poprawna ścieżka

module.exports = async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Brak tokena autoryzacji." });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ message: "Nieprawidłowy token." });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.auth = {
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: decoded.email_verified || false,
    };

    return next();
  } catch (error) {
    console.error("❌ requireAuth error:", error.message);
    return res.status(401).json({ message: "Token nieważny lub wygasł." });
  }
};