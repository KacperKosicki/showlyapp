// src/components/auth/AdminRoute.jsx
import { Navigate } from "react-router-dom";

export default function AdminRoute({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;
  const ok = role === "admin" || role === "mod";
  if (!ok) return <Navigate to="/" replace />;
  return children;
}