import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const PARTNER_TIER_OPTIONS = [
  { value: "none", label: "Brak" },
  { value: "partner", label: "Partner" },
  { value: "verified", label: "Verified" },
  { value: "ambassador", label: "Ambassador" },
  { value: "founding-partner", label: "Founding Partner" },
  { value: "owner", label: "Owner" },
];

const PARTNER_DEFAULTS = {
  partner: {
    badgeText: "PARTNER SHOWLY",
    color: "#59d0ff",
  },
  verified: {
    badgeText: "ZWERYFIKOWANY",
    color: "#22c55e",
  },
  ambassador: {
    badgeText: "AMBASADOR SHOWLY",
    color: "#a855f7",
  },
  "founding-partner": {
    badgeText: "FOUNDING PARTNER",
    color: "#7dd3fc",
  },
  owner: {
    badgeText: "WŁAŚCICIEL",
    color: "#FFD700",
  },
};

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

const normalizePartnerDraft = (profile) => {
  const p = profile?.partnership || {};
  const tier = String(p?.tier || (p?.isPartner ? "partner" : "none"));

  return {
    isPartner: !!p?.isPartner,
    tier,
    badgeText: p?.badgeText || "",
    color: p?.color || "",
  };
};

const getVisibleUntilDate = (profile) => {
  const raw = profile?.visibleUntil;
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  return d;
};

const isProfileExpired = (profile) => {
  const visibleUntil = getVisibleUntilDate(profile);
  if (!visibleUntil) return false;

  return visibleUntil.getTime() < Date.now();
};

const getProfileStatus = (profile) => {
  const expired = isProfileExpired(profile);
  const manuallyHidden = profile?.isVisible === false;

  if (expired) {
    return {
      key: "expired",
      label: "WYGASŁ",
      canEnable: false,
      canDisable: false,
    };
  }

  if (manuallyHidden) {
    return {
      key: "hidden",
      label: "UKRYTY",
      canEnable: true,
      canDisable: false,
    };
  }

  return {
    key: "active",
    label: "AKTYWNY",
    canEnable: false,
    canDisable: true,
  };
};

const getExpiryInfo = (profile) => {
  const visibleUntil = getVisibleUntilDate(profile);
  if (!visibleUntil) {
    return {
      dateLabel: "—",
      expiredLabel: "Brak daty",
      expired: false,
    };
  }

  const now = Date.now();
  const diffMs = visibleUntil.getTime() - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return {
      dateLabel: formatDate(visibleUntil.toISOString()),
      expiredLabel:
        diffDays === -1
          ? "Wygasł 1 dzień temu"
          : `Wygasł ${Math.abs(diffDays)} dni temu`,
      expired: true,
    };
  }

  if (diffDays === 0) {
    return {
      dateLabel: formatDate(visibleUntil.toISOString()),
      expiredLabel: "Wygasa dziś",
      expired: false,
    };
  }

  if (diffDays === 1) {
    return {
      dateLabel: formatDate(visibleUntil.toISOString()),
      expiredLabel: "Wygasa za 1 dzień",
      expired: false,
    };
  }

  return {
    dateLabel: formatDate(visibleUntil.toISOString()),
    expiredLabel: `Wygasa za ${diffDays} dni`,
    expired: false,
  };
};

export default function AdminPanel() {
  const [tab, setTab] = useState("dashboard");

  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [stats, setStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const usersLimit = 25;

  const [profiles, setProfiles] = useState([]);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesPage, setProfilesPage] = useState(1);
  const profilesLimit = 25;

  const [partnerDrafts, setPartnerDrafts] = useState({});

  const [reportTab, setReportTab] = useState("profile");
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const reportsLimit = 25;

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
    const items = res.data.items || [];

    setProfiles(items);
    setProfilesTotal(res.data.total || 0);
    setProfilesPage(res.data.page || page);

    const nextDrafts = {};
    items.forEach((p) => {
      nextDrafts[p._id] = normalizePartnerDraft(p);
    });
    setPartnerDrafts(nextDrafts);
  };

  const fetchReports = async (page = reportsPage, opts = {}) => {
    const nextType = opts.type ?? reportTab;
    const nextStatus = opts.status ?? reportsStatus;
    const nextQ = opts.q ?? reportsQ;

    const res = await adminApi.reports({
      page,
      limit: reportsLimit,
      status: nextStatus,
    });

    let items = (res.data.items || []).map(normalizeReport);

    items = items.filter((r) => (nextType ? r.type === nextType : true));

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

  useEffect(() => {
    const scrollToId = location.state?.scrollToId;
    if (!scrollToId) return;

    const el = document.getElementById(scrollToId);

    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

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

  const onToggleProfileVisible = async (profileId, currentIsVisible) => {
    const profile = profiles.find((item) => item._id === profileId);

    if (!profile) {
      setAlert({
        type: "error",
        message: "Nie znaleziono profilu.",
      });
      return;
    }

    if (isProfileExpired(profile)) {
      setAlert({
        type: "warning",
        message:
          "Ten profil wygasł czasowo. Nie można go ręcznie włączyć bez przedłużenia ważności.",
      });
      return;
    }

    try {
      setLoading(true);
      await adminApi.setProfileVisible(profileId, !currentIsVisible);
      setAlert({
        type: "success",
        message:
          currentIsVisible
            ? "Profil został ręcznie ukryty."
            : "Profil został ponownie włączony.",
      });
      await fetchProfiles(profilesPage);
    } catch (e) {
      setAlert({
        type: "error",
        message:
          e?.response?.data?.message || "Nie udało się zmienić widoczności profilu.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPartnerDraftChange = (profileId, field, value) => {
    setPartnerDrafts((prev) => {
      const current = prev[profileId] || {
        isPartner: false,
        tier: "none",
        badgeText: "",
        color: "",
      };

      let next = {
        ...current,
        [field]: value,
      };

      if (field === "isPartner") {
        const enabled = !!value;
        next.isPartner = enabled;

        if (!enabled) {
          next.tier = "none";
        } else if (!next.tier || next.tier === "none") {
          next.tier = "partner";
          next.badgeText = next.badgeText || PARTNER_DEFAULTS.partner.badgeText;
          next.color = next.color || PARTNER_DEFAULTS.partner.color;
        }
      }

      if (field === "tier") {
        if (value === "none") {
          next.isPartner = false;
        } else {
          next.isPartner = true;
          const defaults = PARTNER_DEFAULTS[value];
          if (defaults) {
            if (
              !current.badgeText ||
              current.badgeText === PARTNER_DEFAULTS[current.tier]?.badgeText
            ) {
              next.badgeText = defaults.badgeText;
            }
            if (
              !current.color ||
              current.color === PARTNER_DEFAULTS[current.tier]?.color
            ) {
              next.color = defaults.color;
            }
          }
        }
      }

      return {
        ...prev,
        [profileId]: next,
      };
    });
  };

  const onSavePartnership = async (profile) => {
    const profileId = profile?._id;

    if (!profileId) {
      setAlert({
        type: "error",
        message: "Brak identyfikatora profilu.",
      });
      return;
    }

    const draft = partnerDrafts[profileId] || {
      isPartner: false,
      tier: "none",
      badgeText: "",
      color: "",
    };

    const partnership = {
      isPartner: !!draft.isPartner,
      tier: draft.isPartner ? draft.tier || "partner" : "none",
      badgeText: draft.isPartner ? String(draft.badgeText || "").trim() : "",
      color: draft.isPartner ? String(draft.color || "").trim() : "#59d0ff",
    };

    try {
      setLoading(true);

      await adminApi.setProfilePartnership(profileId, partnership);

      setAlert({
        type: "success",
        message: `Partnerstwo zapisane dla profilu: ${profile?.name || "—"}.`,
      });

      await fetchProfiles(profilesPage);
    } catch (e) {
      setAlert({
        type: "error",
        message:
          e?.response?.data?.message || "Nie udało się zapisać partnerstwa.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSetReportStatus = async (reportId, status) => {
    try {
      setLoading(true);

      if (status === "closed") {
        await adminApi.closeReport(reportId, "Zamknięto w panelu.");
      } else if (status === "open") {
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

  const pagedReports = useMemo(() => {
    const start = (reportsPage - 1) * reportsLimit;
    return reports.slice(start, start + reportsLimit);
  }, [reports, reportsPage, reportsLimit]);

  return (
    <section id="adminPanel" className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      {alert && <AlertBox type={alert.type} message={alert.message} onClose={closeAlert} />}

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Admin</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Panel zarządzania platformą</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Dashboard • Users • Profiles • Reports</span>
          </div>

          <h1 className={styles.heading}>
            Panel <span className={styles.headingAccent}>administratora</span> 🛠️
          </h1>

          <p className={styles.description}>
            Tutaj zarządzasz użytkownikami, profilami, zgłoszeniami oraz danymi
            operacyjnymi całej platformy <strong className={styles.inlineStrong}>Showly</strong>.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{stats?.users ?? "—"}</strong>
              <span>użytkowników</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{stats?.profiles ?? "—"}</strong>
              <span>profili</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{stats?.reservations ?? "—"}</strong>
              <span>rezerwacji</span>
            </div>
          </div>

          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tabBtn} ${tab === t.key ? styles.active : ""}`}
                onClick={() => setTab(t.key)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "dashboard" && (
          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>Szybki podgląd platformy</h2>
              <LoadingButton
                isLoading={loading}
                onClick={onQuickRefresh}
                className={styles.primaryBtn}
              >
                Odśwież
              </LoadingButton>
            </div>

            <div className={styles.cardGrid}>
              <div className={styles.statCard}>
                <div className={styles.cardLabel}>Użytkownicy</div>
                <div className={styles.cardValue}>{stats?.users ?? "—"}</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.cardLabel}>Profile</div>
                <div className={styles.cardValue}>{stats?.profiles ?? "—"}</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.cardLabel}>Rezerwacje</div>
                <div className={styles.cardValue}>{stats?.reservations ?? "—"}</div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>Użytkownicy</h2>
              <LoadingButton
                isLoading={loading}
                onClick={onQuickRefresh}
                className={styles.primaryBtn}
              >
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
                          className={styles.dangerBtn}
                          onClick={() => onDeleteUser(u._id)}
                          disabled={loading}
                          type="button"
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
                type="button"
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
                type="button"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {tab === "profiles" && (
          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>Profile</h2>
              <LoadingButton
                isLoading={loading}
                onClick={onQuickRefresh}
                className={styles.primaryBtn}
              >
                Odśwież
              </LoadingButton>
            </div>

            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.profilesTable}`}>
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>UID</th>
                    <th>Status</th>
                    <th>Ważny do</th>
                    <th>Info</th>
                    <th>Partner</th>
                    <th>Tier</th>
                    <th>Badge</th>
                    <th>Kolor</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const draft = partnerDrafts[p._id] || {
                      isPartner: false,
                      tier: "none",
                      badgeText: "",
                      color: "",
                    };

                    const profileStatus = getProfileStatus(p);
                    const expiryInfo = getExpiryInfo(p);
                    const canToggleVisibility = profileStatus.key !== "expired";

                    return (
                      <tr key={p._id}>
                        <td>{p.name || "—"}</td>

                        <td className={styles.mono}>
                          {p.uid || p.userId || p.firebaseUid || "—"}
                        </td>

                        <td>
                          <span
                            className={`${styles.pillState} ${profileStatus.key === "active"
                                ? styles.pillOn
                                : profileStatus.key === "hidden"
                                  ? styles.pillWarn
                                  : styles.pillOff
                              }`}
                          >
                            {profileStatus.label}
                          </span>
                        </td>

                        <td className={styles.mono}>
                          {expiryInfo.dateLabel}
                        </td>

                        <td>
                          <div className={styles.profileInfoCell}>
                            <strong>{expiryInfo.expiredLabel}</strong>
                            {p.isVisible === false && !expiryInfo.expired && (
                              <span className={styles.profileInfoSub}>Ukryty ręcznie przez admina</span>
                            )}
                            {expiryInfo.expired && (
                              <span className={styles.profileInfoSub}>
                                Profil wymaga przedłużenia ważności — samo włączenie jest zablokowane
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <label className={styles.switchWrap}>
                            <input
                              type="checkbox"
                              checked={!!draft.isPartner}
                              onChange={(e) =>
                                onPartnerDraftChange(p._id, "isPartner", e.target.checked)
                              }
                              disabled={loading}
                            />
                            <span>{draft.isPartner ? "TAK" : "NIE"}</span>
                          </label>
                        </td>

                        <td>
                          <select
                            className={styles.select}
                            value={draft.tier || "none"}
                            onChange={(e) =>
                              onPartnerDraftChange(p._id, "tier", e.target.value)
                            }
                            disabled={loading}
                          >
                            {PARTNER_TIER_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            className={styles.input}
                            value={draft.badgeText}
                            onChange={(e) =>
                              onPartnerDraftChange(p._id, "badgeText", e.target.value)
                            }
                            placeholder="np. PARTNER SHOWLY"
                            disabled={loading || !draft.isPartner}
                          />
                        </td>

                        <td>
                          <div className={styles.colorField}>
                            <input
                              type="color"
                              className={styles.colorInput}
                              value={draft.color || "#59d0ff"}
                              onChange={(e) =>
                                onPartnerDraftChange(p._id, "color", e.target.value)
                              }
                              disabled={loading || !draft.isPartner}
                            />
                            <input
                              className={`${styles.input} ${styles.colorText}`}
                              value={draft.color || ""}
                              onChange={(e) =>
                                onPartnerDraftChange(p._id, "color", e.target.value)
                              }
                              placeholder="#59d0ff"
                              disabled={loading || !draft.isPartner}
                            />
                          </div>
                        </td>

                        <td className={styles.actions}>
                          <button
                            className={styles.secondaryBtn}
                            onClick={() => onToggleProfileVisible(p._id, p.isVisible !== false)}
                            disabled={loading || !canToggleVisibility}
                            title={
                              profileStatus.key === "expired"
                                ? "Nie można włączyć profilu, który wygasł czasowo. Najpierw trzeba przedłużyć ważność."
                                : profileStatus.key === "hidden"
                                  ? "Przywróć ręcznie ukryty profil"
                                  : "Ukryj profil ręcznie"
                            }
                            type="button"
                          >
                            {profileStatus.key === "hidden"
                              ? "Włącz"
                              : profileStatus.key === "expired"
                                ? "Wygasł"
                                : "Wyłącz"}
                          </button>

                          <button
                            className={styles.primaryBtnInline}
                            onClick={() => onSavePartnership(p)}
                            disabled={loading}
                            type="button"
                          >
                            Zapisz partnera
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={10} className={styles.empty}>
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
                type="button"
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
                type="button"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>Zgłoszenia</h2>
              <LoadingButton
                isLoading={loading}
                onClick={onQuickRefresh}
                className={styles.primaryBtn}
              >
                Odśwież
              </LoadingButton>
            </div>

            <div className={styles.subTabs}>
              {REPORT_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.subTabBtn} ${reportTab === t.key ? styles.subActive : ""
                    }`}
                  onClick={() => onChangeReportType(t.key)}
                  disabled={loading}
                  type="button"
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
                className={styles.secondaryBtn}
                onClick={onApplyReportFilters}
                disabled={loading}
                type="button"
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
                        <div className={styles.profileName} title={r._profileName}>
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

                          <td className={styles.reviewTextCell} title={r._reviewText || ""}>
                            {r._reviewText ? (
                              <>
                                {(r._reviewUserName || r._reviewRating != null) && (
                                  <div className={styles.reviewMeta}>
                                    {r._reviewUserName ? r._reviewUserName : "—"}
                                    {r._reviewRating != null ? ` • ★${r._reviewRating}` : ""}
                                  </div>
                                )}
                                <div className={styles.reviewBody}>{r._reviewText}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        </>
                      )}

                      <td>
                        <span
                          className={`${styles.pillState} ${r.status === "closed" ? styles.pillOn : styles.pillWarn
                            }`}
                        >
                          {r.status === "closed" ? "ZAMKNIĘTE" : "OTWARTE"}
                        </span>
                      </td>

                      <td className={styles.actions}>
                        <button
                          className={styles.secondaryBtn}
                          disabled={loading || r.status === "closed"}
                          onClick={() => onSetReportStatus(r._id, "closed")}
                          type="button"
                        >
                          Zamknij
                        </button>

                        {reportTab === "review" && (
                          <button
                            className={styles.dangerBtn}
                            disabled={loading || r.status === "closed"}
                            onClick={() => onRemoveReview(r._id)}
                            title="Usuwa opinię z profilu i zamyka zgłoszenie"
                            type="button"
                          >
                            Usuń opinię
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {pagedReports.length === 0 && (
                    <tr>
                      <td colSpan={reportTab === "review" ? 10 : 8} className={styles.empty}>
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
                type="button"
              >
                ◀
              </button>
              <span className={styles.pageInfo}>
                Strona {reportsPage} / {reportsPages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={loading || reportsPage >= reportsPages}
                onClick={() => setReportsPage((p) => Math.min(reportsPages, p + 1))}
                type="button"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}