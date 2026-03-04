// src/components/AdminPanel/AdminPanel.jsx
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPanel.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import { adminApi } from "../../api/adminApi";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Użytkownicy" },
  { key: "profiles", label: "Profile" },
  { key: "reports", label: "Zgłoszenia" },
];

const REPORT_TABS = [
  { key: "profile", label: "Zgłoszenia profili" },
  { key: "review", label: "Zgłoszenia opinii" },
];

const reasonLabel = (v) => {
  switch (String(v || "").toLowerCase()) {
    case "spam":
      return "Spam / reklama";
    case "fake":
      return "Fałszywe informacje";
    case "abuse":
      return "Nękanie / obraźliwe treści";
    case "illegal":
      return "Nielegalne treści";
    case "other":
      return "Inne";
    default:
      return v || "—";
  }
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ✅ normalizacja raportu – DOPASOWANA do Twojego backendu (snapshot + stare pola)
const normalizeReport = (r) => {
  const profileName =
    r?.snapshot?.profileName ||
    r?.profileName ||
    r?.profile?.name ||
    r?.profile?.title ||
    r?.profileDisplayName ||
    "—";

  const profileSlug = r?.profileSlug || r?.profile?.slug || r?.slug || "";

  const profileUserId =
    r?.profileUserId ||
    r?.profileUid ||
    r?.profile?.userId ||
    r?.profile?.uid ||
    r?.profileId ||
    "—";

  const reviewId =
    (r?.reviewId ? String(r.reviewId) : "") ||
    r?.review?.id ||
    r?.review?._id ||
    r?.reviewRef ||
    "—";

  const reviewText =
    r?.snapshot?.reviewComment ||
    r?.reviewText ||
    r?.review?.comment ||
    r?.review?.text ||
    r?.reviewMessage ||
    "";

  const reporterUid =
    r?.reporterUid ||
    r?.reporterId ||
    r?.reporter?.uid ||
    r?.reporter?.userId ||
    "—";

  const reporterEmail = r?.reporterEmail || r?.reporter?.email || "";

  const reviewUserName = r?.snapshot?.reviewUserName || "";
  const reviewRating =
    typeof r?.snapshot?.reviewRating === "number" ? r.snapshot.reviewRating : null;

  return {
    ...r,
    _profileName: profileName,
    _profileSlug: profileSlug,
    _profileUserId: profileUserId,
    _reviewId: reviewId,
    _reviewText: reviewText,
    _reviewUserName: reviewUserName,
    _reviewRating: reviewRating,
    _reporterUid: reporterUid,
    _reporterEmail: reporterEmail,
  };
};

export default function AdminPanel() {
  const [tab, setTab] = useState("dashboard");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // stats
  const [stats, setStats] = useState(null);

  // users
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const usersLimit = 25;

  // profiles
  const [profiles, setProfiles] = useState([]);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesPage, setProfilesPage] = useState(1);
  const profilesLimit = 25;

  // reports
  const [reportTab, setReportTab] = useState("profile");
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const reportsLimit = 25;

  // ✅ dopasowane do Twojego backendu: open / closed / all
  const [reportsStatus, setReportsStatus] = useState("open");
  const [reportsQ, setReportsQ] = useState("");

  const closeAlert = () => setAlert(null);

  const fetchStats = async () => {
    const res = await adminApi.stats();
    setStats(res.data);
  };

  const fetchUsers = async (page = usersPage) => {
    const res = await adminApi.users(page, usersLimit);
    setUsers(res.data.items || []);
    setUsersTotal(res.data.total || 0);
    setUsersPage(res.data.page || page);
  };

  const fetchProfiles = async (page = profilesPage) => {
    const res = await adminApi.profiles(page, profilesLimit);
    setProfiles(res.data.items || []);
    setProfilesTotal(res.data.total || 0);
    setProfilesPage(res.data.page || page);
  };

  const fetchReports = async (page = reportsPage, opts = {}) => {
    const nextType = opts.type ?? reportTab;
    const nextStatus = opts.status ?? reportsStatus;
    const nextQ = opts.q ?? reportsQ;

    // ✅ backend /admin/reports ma tylko status, bez type/q
    // => filtrujemy po stronie frontu, a do backendu wysyłamy tylko status/pagination
    const res = await adminApi.reports({
      page,
      limit: reportsLimit,
      status: nextStatus,
    });

    let items = (res.data.items || []).map(normalizeReport);

    // filtr typu (profile/review)
    items = items.filter((r) => (nextType ? r.type === nextType : true));

    // filtr "q" (uid/email/slug/id/opinia/nazwa)
    if (String(nextQ || "").trim()) {
      const qq = String(nextQ).trim().toLowerCase();
      items = items.filter((r) => {
        const hay = [
          r?._id,
          r?.type,
          r?.reason,
          r?.status,
          r?.message,
          r?._reporterUid,
          r?._reporterEmail,
          r?._profileUserId,
          r?._profileSlug,
          r?._profileName,
          r?._reviewId,
          r?._reviewUserName,
          r?._reviewText,
          r?.adminNote,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(qq);
      });
    }

    setReports(items);
    // ❗ UWAGA: total z backendu dotyczy wszystkich, a po filtrach frontowych to już inny wynik
    // dlatego total ustawiamy jako długość po filtrze (dla prawidłowej paginacji w UI)
    setReportsTotal(items.length);
    setReportsPage(res.data.page || page);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setAlert(null);

        if (tab === "dashboard") await fetchStats();
        if (tab === "users") await fetchUsers(1);
        if (tab === "profiles") await fetchProfiles(1);
        if (tab === "reports") await fetchReports(1);
      } catch (e) {
        setAlert({
          type: "error",
          message: e?.response?.data?.message || "Błąd pobierania danych admina.",
        });
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const usersPages = useMemo(
    () => Math.max(1, Math.ceil(usersTotal / usersLimit)),
    [usersTotal]
  );
  const profilesPages = useMemo(
    () => Math.max(1, Math.ceil(profilesTotal / profilesLimit)),
    [profilesTotal]
  );
  const reportsPages = useMemo(
    () => Math.max(1, Math.ceil(reportsTotal / reportsLimit)),
    [reportsTotal]
  );

  const onQuickRefresh = async () => {
    try {
      setLoading(true);
      if (tab === "dashboard") await fetchStats();
      if (tab === "users") await fetchUsers(usersPage);
      if (tab === "profiles") await fetchProfiles(profilesPage);
      if (tab === "reports") await fetchReports(1);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Błąd odświeżania.",
      });
    } finally {
      setLoading(false);
    }
  };

  // users
  const onChangeRole = async (userId, nextRole) => {
    try {
      setLoading(true);
      await adminApi.setUserRole(userId, nextRole);
      setAlert({ type: "success", message: "Rola zaktualizowana." });
      await fetchUsers(usersPage);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się zmienić roli.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDeleteUser = async (userId) => {
    const ok = window.confirm(
      "Na pewno usunąć użytkownika z bazy? (Firebase zostanie, jeśli nie masz endpointu deleteUser w Firebase)"
    );
    if (!ok) return;

    try {
      setLoading(true);
      await adminApi.deleteUser(userId);
      setAlert({ type: "success", message: "Użytkownik usunięty (Mongo)." });
      await fetchUsers(usersPage);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się usunąć użytkownika.",
      });
    } finally {
      setLoading(false);
    }
  };

  // profiles
  const onToggleProfileVisible = async (profileId, currentIsVisible) => {
    try {
      setLoading(true);
      await adminApi.setProfileVisible(profileId, !currentIsVisible);
      setAlert({ type: "success", message: "Zmieniono widoczność profilu." });
      await fetchProfiles(profilesPage);
    } catch (e) {
      setAlert({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Nie udało się zmienić widoczności profilu.",
      });
    } finally {
      setLoading(false);
    }
  };

  // reports (dopasowane do backendu: status = open/closed, endpoint close)
  const onSetReportStatus = async (reportId, status) => {
    try {
      setLoading(true);

      if (status === "closed") {
        await adminApi.closeReport(reportId, "Zamknięto w panelu.");
      } else if (status === "open") {
        // opcjonalnie: jeśli nie masz endpointu "reopen", to pokaż info
        setAlert({
          type: "error",
          message: "Brak endpointu do ponownego otwarcia zgłoszenia (reopen).",
        });
      }

      setAlert({ type: "success", message: "Zaktualizowano status zgłoszenia." });
      await fetchReports(1);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się zmienić statusu.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRemoveReview = async (reportId) => {
    const ok = window.confirm("Usunąć zgłoszoną opinię z profilu? (nieodwracalne)");
    if (!ok) return;

    try {
      setLoading(true);
      await adminApi.removeReviewFromReport(reportId);
      setAlert({ type: "success", message: "Usunięto opinię i zamknięto zgłoszenie." });
      await fetchReports(1);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się usunąć opinii.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onApplyReportFilters = async () => {
    try {
      setLoading(true);
      await fetchReports(1);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się pobrać zgłoszeń.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onChangeReportType = async (nextType) => {
    setReportTab(nextType);
    try {
      setLoading(true);
      await fetchReports(1, { type: nextType });
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się pobrać zgłoszeń.",
      });
    } finally {
      setLoading(false);
    }
  };

  // lokalna paginacja dla przefiltrowanych wyników
  const pagedReports = useMemo(() => {
    const start = (reportsPage - 1) * reportsLimit;
    return reports.slice(start, start + reportsLimit);
  }, [reports, reportsPage, reportsLimit]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel admina</h1>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tabBtn} ${tab === t.key ? styles.active : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {alert && (
        <div className={styles.alertWrap}>
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={closeAlert}
          />
        </div>
      )}

      {tab === "dashboard" && (
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Użytkownicy</div>
            <div className={styles.cardValue}>{stats?.users ?? "—"}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Profile</div>
            <div className={styles.cardValue}>{stats?.profiles ?? "—"}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Rezerwacje</div>
            <div className={styles.cardValue}>{stats?.reservations ?? "—"}</div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className={styles.section}>
          <div className={styles.sectionTop}>
            <h2>Użytkownicy</h2>
            <LoadingButton isLoading={loading} onClick={onQuickRefresh}>
              Odśwież
            </LoadingButton>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nazwa</th>
                  <th>Provider</th>
                  <th>Rola</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className={styles.mono}>{u.email}</td>
                    <td>{u.displayName || u.name || "—"}</td>
                    <td className={styles.badgeCell}>{u.provider}</td>
                    <td>
                      <select
                        className={styles.select}
                        value={u.role || "user"}
                        onChange={(e) => onChangeRole(u._id, e.target.value)}
                        disabled={loading}
                      >
                        <option value="user">user</option>
                        <option value="mod">mod</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.danger}
                        onClick={() => onDeleteUser(u._id)}
                        disabled={loading}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={loading || usersPage <= 1}
              onClick={() => fetchUsers(usersPage - 1)}
            >
              ◀
            </button>
            <span className={styles.pageInfo}>
              Strona {usersPage} / {usersPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={loading || usersPage >= usersPages}
              onClick={() => fetchUsers(usersPage + 1)}
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {tab === "profiles" && (
        <div className={styles.section}>
          <div className={styles.sectionTop}>
            <h2>Profile</h2>
            <LoadingButton isLoading={loading} onClick={onQuickRefresh}>
              Odśwież
            </LoadingButton>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>UID</th>
                  <th>Widoczny</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name || "—"}</td>
                    <td className={styles.mono}>
                      {p.uid || p.userId || p.firebaseUid || "—"}
                    </td>
                    <td>
                      <span
                        className={`${styles.pill} ${
                          p.isVisible === false
                            ? styles.pillOff
                            : styles.pillOn
                        }`}
                      >
                        {p.isVisible === false ? "NIE" : "TAK"}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.btn}
                        onClick={() =>
                          onToggleProfileVisible(p._id, p.isVisible !== false)
                        }
                        disabled={loading}
                      >
                        {p.isVisible === false ? "Włącz" : "Wyłącz"}
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={loading || profilesPage <= 1}
              onClick={() => fetchProfiles(profilesPage - 1)}
            >
              ◀
            </button>
            <span className={styles.pageInfo}>
              Strona {profilesPage} / {profilesPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={loading || profilesPage >= profilesPages}
              onClick={() => fetchProfiles(profilesPage + 1)}
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* ✅ REPORTS */}
      {tab === "reports" && (
        <div className={styles.section}>
          <div className={styles.sectionTop}>
            <h2>Zgłoszenia</h2>
            <LoadingButton isLoading={loading} onClick={onQuickRefresh}>
              Odśwież
            </LoadingButton>
          </div>

          <div className={styles.subTabs}>
            {REPORT_TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.subTabBtn} ${
                  reportTab === t.key ? styles.subActive : ""
                }`}
                onClick={() => onChangeReportType(t.key)}
                disabled={loading}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.reportsFilters}>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Status</label>
              <select
                className={styles.select}
                value={reportsStatus}
                onChange={(e) => setReportsStatus(e.target.value)}
                disabled={loading}
              >
                <option value="open">Otwarte</option>
                <option value="closed">Zamknięte</option>
                <option value="all">Wszystkie</option>
              </select>
            </div>

            <div className={styles.filterItemGrow}>
              <label className={styles.filterLabel}>Szukaj</label>
              <input
                className={styles.input}
                value={reportsQ}
                onChange={(e) => setReportsQ(e.target.value)}
                placeholder="np. UID, email, slug, id opinii, treść…"
                disabled={loading}
              />
            </div>

            <button
              className={styles.btn}
              onClick={onApplyReportFilters}
              disabled={loading}
            >
              Filtruj
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Powód</th>
                  <th>Opis zgłoszenia</th>
                  <th>Zgłaszający</th>

                  <th>Nazwa profilu</th>
                  <th>Profil (UID)</th>

                  {reportTab === "review" && (
                    <>
                      <th>Opinia (ID)</th>
                      <th>Treść opinii</th>
                    </>
                  )}

                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>

              <tbody>
                {pagedReports.map((r) => (
                  <tr key={r._id}>
                    <td className={styles.mono}>{formatDate(r.createdAt)}</td>
                    <td>{reasonLabel(r.reason)}</td>

                    <td
                      className={`${styles.truncate} ${styles.reportMessage}`}
                      title={r.message || ""}
                    >
                      {r.message || "—"}
                    </td>

                    <td className={styles.mono} title={r._reporterEmail || ""}>
                      {r._reporterUid}
                    </td>

                    <td className={styles.profileCell}>
                      <div
                        className={styles.profileName}
                        title={r._profileName}
                      >
                        {r._profileName}
                      </div>

                      {r._profileSlug ? (
                        <div className={styles.profileHint}>
                          <a
                            className={styles.linkLike}
                            href={`/profil/${r._profileSlug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Otwórz profil
                          </a>
                        </div>
                      ) : null}
                    </td>

                    <td className={styles.mono}>{r._profileUserId}</td>

                    {reportTab === "review" && (
                      <>
                        <td className={styles.mono}>{r._reviewId}</td>

                        <td
                          className={styles.reviewTextCell}
                          title={r._reviewText || ""}
                        >
                          {r._reviewText ? (
                            <>
                              {(r._reviewUserName || r._reviewRating != null) && (
                                <div className={styles.reviewMeta}>
                                  {r._reviewUserName
                                    ? r._reviewUserName
                                    : "—"}
                                  {r._reviewRating != null
                                    ? ` • ★${r._reviewRating}`
                                    : ""}
                                </div>
                              )}
                              <div className={styles.reviewBody}>
                                {r._reviewText}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    )}

                    <td>
                      <span
                        className={`${styles.pill} ${
                          r.status === "closed"
                            ? styles.pillOn
                            : styles.pillWarn
                        }`}
                      >
                        {r.status === "closed" ? "ZAMKNIĘTE" : "OTWARTE"}
                      </span>
                    </td>

                    <td className={styles.actions}>
                      <button
                        className={styles.btn}
                        disabled={loading || r.status === "closed"}
                        onClick={() => onSetReportStatus(r._id, "closed")}
                      >
                        Zamknij
                      </button>

                      {reportTab === "review" && (
                        <button
                          className={styles.danger}
                          disabled={loading || r.status === "closed"}
                          onClick={() => onRemoveReview(r._id)}
                          title="Usuwa opinię z profilu i zamyka zgłoszenie"
                        >
                          Usuń opinię
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {pagedReports.length === 0 && (
                  <tr>
                    <td
                      colSpan={reportTab === "review" ? 10 : 8}
                      className={styles.empty}
                    >
                      Brak zgłoszeń do wyświetlenia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={loading || reportsPage <= 1}
              onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
            >
              ◀
            </button>
            <span className={styles.pageInfo}>
              Strona {reportsPage} / {reportsPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={loading || reportsPage >= reportsPages}
              onClick={() =>
                setReportsPage((p) => Math.min(reportsPages, p + 1))
              }
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}