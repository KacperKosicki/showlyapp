// src/api/reportApi.js
import { api } from "./api";

export const reportApi = {
  /**
   * Tworzenie zgłoszenia (user)
   * payload przykładowo:
   * {
   *   type: "profile"|"review",
   *   profileUserId: "uid-profilu",
   *   reviewId?: "id-opinii",
   *   reason: "spam"|"fake"|"abuse"|"illegal"|"other",
   *   message: "opis"
   * }
   */
  create: (payload) => api.post("/api/reports", payload),

  /**
   * Lista zgłoszeń (admin/mod) — pod admin routerem
   * opts: { page, limit, type, status, q }
   */
  list: (opts = {}) => {
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
   * Zmiana statusu zgłoszenia (admin/mod)
   * status: "resolved" | "rejected" | "open"
   */
  setStatus: (id, status) => api.patch(`/api/admin/reports/${id}/status`, { status }),

  /**
   * Usunięcie zgłoszenia (admin/mod)
   */
  remove: (id) => api.delete(`/api/admin/reports/${id}`),
};