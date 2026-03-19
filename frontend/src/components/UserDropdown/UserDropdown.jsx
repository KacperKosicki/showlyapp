import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./UserDropdown.module.scss";
import { FaChevronDown } from "react-icons/fa";
import {
  FiUser,
  FiSettings,
  FiBell,
  FiCalendar,
  FiHeart,
  FiLogOut,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import {
  enablePushNotifications,
  disablePushNotifications,
  getBrowserNotificationState,
} from "../../services/pushNotifications";

const API = process.env.REACT_APP_API_URL;

/** =========================
 * helpers
 * ========================= */
const normalizeAvatar = (val = "") => {
  const v = String(val || "").trim();
  if (!v) return "";

  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

  return "";
};

const pickAvatar = ({ dbAvatar, firebasePhotoURL }) =>
  normalizeAvatar(dbAvatar) || normalizeAvatar(firebasePhotoURL) || "";

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** =========================
 * component
 * ========================= */
const UserDropdown = ({
  user,
  loadingUser,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount,
  setAlert, // 👈 NOWE
}) => {
  const [open, setOpen] = useState(false);

  const [profileStatus, setProfileStatus] = useState("loading"); // loading | has | none | error
  const [remainingDays, setRemainingDays] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const [photoURL, setPhotoURL] = useState("");
  const [userRole, setUserRole] = useState("user"); // user | mod | admin

  const [pushState, setPushState] = useState("default"); // default | granted | denied | unsupported
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSaved, setPushSaved] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const location = useLocation();

  const displayEmail = user?.email || auth.currentUser?.email || "Konto";

  const showProfileActions = !loadingUser;
  const canSeeAdminPanel = userRole === "admin" || userRole === "mod";

  const roleLabel = useMemo(() => {
    if (userRole === "admin") return "ADMIN";
    if (userRole === "mod") return "MOD";
    return "";
  }, [userRole]);

  const showAlert = (type, message) => {
    if (typeof setAlert === "function") {
      setAlert({ type, message });
    }
  };

  useEffect(() => {
    setPushState(getBrowserNotificationState());
  }, []);

  // Avatar + rola + stan push
  useEffect(() => {
    const run = async () => {
      if (!user?.uid) {
        setPhotoURL("");
        setUserRole("user");
        setPushSaved(false);
        setPushState(getBrowserNotificationState());
        return;
      }

      try {
        let dbAvatar = "";
        let dbRole = "user";

        try {
          const authHeader = await getAuthHeader();

          const r = await fetch(`${API}/api/users/${user.uid}`, {
            headers: {
              Accept: "application/json",
              ...authHeader,
            },
          });

          if (r.ok) {
            const db = await r.json();

            dbAvatar = db?.avatar || "";
            dbRole = db?.role || "user";

            const hasSavedPush =
              Array.isArray(db?.pushTokens) && db.pushTokens.length > 0;

            setPushSaved(hasSavedPush);

            if (hasSavedPush && getBrowserNotificationState() === "granted") {
              setPushState("granted");
            }
          }
        } catch {}

        const firebasePhotoURL = auth.currentUser?.photoURL || "";

        setPhotoURL(
          pickAvatar({
            dbAvatar,
            firebasePhotoURL,
          })
        );

        setUserRole(dbRole);
      } catch {
        setPhotoURL("");
        setUserRole("user");
      }
    };

    run();
  }, [user?.uid]);

  // Status wizytówki
  useEffect(() => {
    if (!user?.uid) {
      setProfileStatus("none");
      setIsVisible(false);
      setRemainingDays(null);
      return;
    }

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setProfileStatus("loading");

        const authHeader = await getAuthHeader();

        const res = await fetch(`${API}/api/profiles/by-user/${user.uid}`, {
          headers: {
            Accept: "application/json",
            ...authHeader,
          },
          signal: controller.signal,
        });

        if (res.status === 404) {
          setProfileStatus("none");
          setIsVisible(false);
          setRemainingDays(null);
          return;
        }

        if (!res.ok) {
          setProfileStatus("error");
          return;
        }

        const profile = await res.json();

        if (profile?.visibleUntil) {
          const now = new Date();
          const until = new Date(profile.visibleUntil);
          const diff = Math.ceil((until - now) / (1000 * 60 * 60 * 24));

          setIsVisible(profile.isVisible !== false && until > now);
          setRemainingDays(diff > 0 ? diff : 0);
        } else {
          setIsVisible(!!profile);
          setRemainingDays(!!profile ? 0 : null);
        }

        setProfileStatus(profile ? "has" : "none");
      } catch (err) {
        if (err?.name === "AbortError") return;
        setProfileStatus("error");
        console.error("❌ Błąd pobierania profilu:", err);
      }
    };

    fetchProfile();

    return () => controller.abort();
  }, [user?.uid, refreshTrigger]);

  // Unread
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.uid || !setUnreadCount) return;

      try {
        const authHeader = await getAuthHeader();

        const res = await axios.get(`${API}/api/conversations/by-uid/${user.uid}`, {
          headers: {
            ...authHeader,
          },
        });

        const totalUnread = Array.isArray(res.data)
          ? res.data.reduce((acc, c) => acc + Number(c.unreadCount || 0), 0)
          : 0;

        setUnreadCount(totalUnread);
      } catch (err) {
        console.error("❌ Błąd pobierania liczby wiadomości:", err);
      }
    };

    fetchUnread();
  }, [user?.uid, refreshTrigger, location.pathname, setUnreadCount]);

  // Zamknięcie dropdown po kliknięciu poza
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleNavigate = (path, scrollToId = null) => {
    setOpen(false);

    if (location.pathname === path && scrollToId) {
      const el = document.getElementById(scrollToId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      navigate(path, { state: { scrollToId } });
    }
  };

  const handleEnablePush = async () => {
    if (!user?.uid || pushLoading || pushState === "unsupported" || pushSaved) return;

    try {
      setPushLoading(true);

      const result = await enablePushNotifications(user.uid);

      if (result?.success) {
        setPushState("granted");
        setPushSaved(true);
        showAlert("success", "Powiadomienia zostały włączone na tym urządzeniu.");
      } else {
        const currentState = getBrowserNotificationState();
        setPushState(currentState);

        if (result?.reason === "denied") {
          showAlert("error", "Powiadomienia są zablokowane w przeglądarce.");
        } else if (result?.reason === "unsupported") {
          showAlert("error", "Ta przeglądarka nie obsługuje powiadomień.");
        } else {
          showAlert("error", "Nie udało się włączyć powiadomień.");
        }
      }
    } catch (err) {
      console.error("❌ Błąd aktywacji push:", err);
      setPushState(getBrowserNotificationState());
      showAlert("error", "Wystąpił błąd podczas włączania powiadomień.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    if (!user?.uid || pushLoading || pushState === "unsupported" || !pushSaved) return;

    try {
      setPushLoading(true);

      const result = await disablePushNotifications(user.uid);

      if (result?.success) {
        setPushSaved(false);
        setPushState(getBrowserNotificationState());
        showAlert("success", "Powiadomienia zostały wyłączone na tym urządzeniu.");
      } else {
        showAlert("error", "Nie udało się wyłączyć powiadomień.");
      }
    } catch (err) {
      console.error("❌ Błąd wyłączania push:", err);
      showAlert("error", "Wystąpił błąd podczas wyłączania powiadomień.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("showlyUser");
      navigate("/");
    } catch (err) {
      console.error("❌ Błąd wylogowania:", err);
      showAlert("error", "Nie udało się wylogować.");
    }
  };

  const avatarSrc = photoURL || "/images/other/no-image.png";

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.avatarWrap} aria-hidden="true">
          <img
            src={avatarSrc}
            alt=""
            className={styles.miniAvatar}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/images/other/no-image.png";
            }}
          />
          {roleLabel && <span className={styles.rolePill}>{roleLabel}</span>}
        </span>

        <span className={styles.email}>{displayEmail}</span>

        {(Number(unreadCount) > 0 || Number(pendingReservationsCount) > 0) && (
          <span className={styles.dotPulse} aria-hidden="true" />
        )}

        <FaChevronDown
          className={`${styles.icon} ${open ? styles.iconOpen : ""}`}
          aria-hidden="true"
        />
      </button>

      <div className={`${styles.menu} ${open ? styles.visible : ""}`} role="menu">
        <div className={styles.menuTop}>
          <div className={styles.menuTitle}>Twoje menu</div>
          <div className={styles.menuSub}>Szybki dostęp do profilu i akcji</div>
        </div>

        <div className={styles.group}>
          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/konto", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiSettings className={styles.itemIcon} aria-hidden="true" />
              <span className={styles.itemText}>Twoje konto</span>
            </span>
          </button>

          {canSeeAdminPanel && (
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => handleNavigate("/admin", "scrollToId")}
            >
              <span className={styles.itemLeft}>
                <FiShield className={styles.itemIcon} aria-hidden="true" />
                <span className={styles.itemText}>Panel admina</span>
              </span>
              <span className={styles.rightPill}>uprawnienia</span>
            </button>
          )}
        </div>

        <div className={styles.sep} role="separator" />

        <div className={styles.group}>
          {showProfileActions && profileStatus === "none" && (
            <button
              type="button"
              className={`${styles.item} ${styles.itemPrimary}`}
              role="menuitem"
              onClick={() => handleNavigate("/stworz-profil", "scrollToId")}
            >
              <span className={styles.itemLeft}>
                <FiUser className={styles.itemIcon} aria-hidden="true" />
                <span className={styles.itemText}>Stwórz profil</span>
              </span>
              <span className={styles.rightPill}>start</span>
            </button>
          )}

          {showProfileActions && profileStatus === "has" && (
            <button
              type="button"
              className={`${styles.item} ${styles.itemTwoLine}`}
              role="menuitem"
              onClick={() => handleNavigate("/profil", "scrollToId")}
            >
              <span className={styles.itemLeft}>
                <FiUser className={styles.itemIcon} aria-hidden="true" />
                <span className={styles.twoLine}>
                  <span className={styles.itemText}>Twój profil</span>

                  {isVisible ? (
                    <span className={`${styles.itemSub} ${styles.statusActive}`}>
                      Pozostało <b>{remainingDays}</b> dni
                    </span>
                  ) : (
                    <span className={`${styles.itemSub} ${styles.statusExpired}`}>
                      Wygasła
                    </span>
                  )}
                </span>
              </span>
            </button>
          )}

          {showProfileActions && profileStatus === "error" && (
            <div className={styles.netBanner} role="status" aria-live="polite">
              <FiAlertTriangle className={styles.netIcon} aria-hidden="true" />
              <span className={styles.netText}>
                Problem z połączeniem… Spróbuj odświeżyć.
              </span>
            </div>
          )}
        </div>

        <div className={styles.sep} role="separator" />

        <div className={styles.group}>
          <button
            type="button"
            className={`${styles.item} ${styles.itemNotify}`}
            role="menuitem"
            onClick={pushSaved ? handleDisablePush : handleEnablePush}
            disabled={pushLoading || pushState === "unsupported"}
          >
            <span className={styles.itemLeft}>
              <FiBell className={styles.itemIcon} aria-hidden="true" />
              <span className={styles.twoLine}>
                <span className={styles.itemText}>
                  {pushLoading
                    ? "Zapisywanie..."
                    : pushSaved
                    ? "Wyłącz powiadomienia"
                    : pushState === "granted"
                    ? "Aktywuj na tym koncie"
                    : "Włącz powiadomienia"}
                </span>

                <span
                  className={`${styles.itemSub} ${
                    pushSaved || pushState === "granted"
                      ? styles.statusActive
                      : pushState === "denied"
                      ? styles.statusExpired
                      : ""
                  }`}
                >
                  {pushSaved &&
                    "Kliknij, aby wyłączyć powiadomienia na tym urządzeniu"}
                  {!pushSaved &&
                    pushState === "granted" &&
                    "Przeglądarka ma zgodę — kliknij, aby zapisać dla tego konta"}
                  {pushState === "default" &&
                    "Kliknij, aby otrzymywać powiadomienia na urządzeniu"}
                  {pushState === "denied" &&
                    "Powiadomienia są zablokowane w przeglądarce"}
                  {pushState === "unsupported" &&
                    "Ta przeglądarka nie obsługuje powiadomień"}
                </span>
              </span>
            </span>

            <span className={styles.rightPill}>
              {pushSaved ? "włączone" : pushState === "granted" ? "ready" : "push"}
            </span>
          </button>

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/powiadomienia", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiBell className={styles.itemIcon} aria-hidden="true" />
              <span className={styles.itemText}>Powiadomienia</span>
            </span>

            {Number(unreadCount) > 0 && (
              <span className={styles.countBadge}>{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/rezerwacje", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiCalendar className={styles.itemIcon} aria-hidden="true" />
              <span className={styles.itemText}>Rezerwacje</span>
            </span>

            {Number(pendingReservationsCount) > 0 && (
              <span className={styles.countBadge}>{pendingReservationsCount}</span>
            )}
          </button>

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/ulubione", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiHeart className={styles.itemIcon} aria-hidden="true" />
              <span className={styles.itemText}>Ulubione</span>
            </span>
          </button>
        </div>

        <div className={styles.sep} role="separator" />

        <button
          type="button"
          className={`${styles.item} ${styles.itemDanger}`}
          role="menuitem"
          onClick={handleLogout}
        >
          <span className={styles.itemLeft}>
            <FiLogOut className={styles.itemIcon} aria-hidden="true" />
            <span className={styles.itemText}>Wyloguj</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;