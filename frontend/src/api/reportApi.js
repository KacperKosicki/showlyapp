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
   * Lista zgłoszeń (admin/mod)
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
   * Zamknięcie zgłoszenia (admin/mod)
   */
  close: (id, adminNote = "Zamknięto w panelu.") =>
    api.patch(`/api/admin/reports/${id}/close`, { adminNote }),

  /**
   * Usunięcie zgłoszonej opinii z poziomu zgłoszenia (admin/mod)
   */
  removeReview: (id) =>
    api.delete(`/api/admin/reports/${id}/remove-review`),
};