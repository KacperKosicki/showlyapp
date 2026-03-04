// src/api/adminApi.js
import { api } from "./api";

export const adminApi = {
  // ===== dashboard =====
  stats: () => api.get("/api/admin/stats"),

  // ===== users =====
  users: (page = 1, limit = 50) => api.get(`/api/admin/users?page=${page}&limit=${limit}`),

  setUserRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),

  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),

  // ===== profiles =====
  profiles: (page = 1, limit = 50) => api.get(`/api/admin/profiles?page=${page}&limit=${limit}`),

  // UWAGA: u Ciebie endpoint jest /visible (tak masz w routes/admin.js)
  setProfileVisible: (id, isVisible) => api.patch(`/api/admin/profiles/${id}/visible`, { isVisible }),

  // ===== reports (NOWE) =====
  /**
   * opts: { page, limit, type, status, q }
   * type: "profile" | "review"
   * status: "open" | "resolved" | "rejected" | "all"
   */
  reports: (opts = {}) => {
    const {
      page = 1,
      limit = 25,
      type = "profile",
      status = "open",
      q = "",
    } = opts;

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    qs.set("type", String(type));
    qs.set("status", String(status));
    if (q && String(q).trim()) qs.set("q", String(q).trim());

    return api.get(`/api/admin/reports?${qs.toString()}`);
  },

  /**
   * status: "resolved" | "rejected" | "open"
   */
  setReportStatus: (id, status) => api.patch(`/api/admin/reports/${id}/status`, { status }),

  deleteReport: (id) => api.delete(`/api/admin/reports/${id}`),
};