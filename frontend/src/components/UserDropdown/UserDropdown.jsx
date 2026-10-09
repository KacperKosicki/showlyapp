import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiChevronDown,
  FiHeart,
  FiLogOut,
  FiSettings,
  FiShield,
  FiUser,
} from "react-icons/fi";
import axios from "axios";
import { signOut } from "firebase/auth";

import { auth } from "../../firebase";
import styles from "./UserDropdown.module.scss";

const API = process.env.REACT_APP_API_URL;

const normalizeAvatar = (value = "") => {
  const avatar = String(value || "").trim();

  if (!avatar) return "";
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith("/uploads/")) return `${API}${avatar}`;
  if (avatar.startsWith("uploads/")) return `${API}/${avatar}`;

  return "";
};

const pickAvatar = ({ dbAvatar, firebasePhotoURL }) =>
  normalizeAvatar(dbAvatar) || normalizeAvatar(firebasePhotoURL) || "";

const getAuthHeader = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) return {};

  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
};

const UserDropdown = ({
  user,
  loadingUser,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount,
  setAlert,
  menuOpen,
  onMenuOpenChange,
}) => {
  const [localOpen, setLocalOpen] = useState(false);
  const open = menuOpen ?? localOpen;
  const setOpen = useCallback(value => {
    setLocalOpen(value);
    onMenuOpenChange?.(value);
  }, [onMenuOpenChange]);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [remainingDays, setRemainingDays] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [betaPremium, setBetaPremium] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [providerReservationsCount, setProviderReservationsCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

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
    const fetchUserData = async () => {
      if (!user?.uid) {
        setPhotoURL("");
        setUserRole("user");
        return;
      }

      try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API}/api/users/${user.uid}`, {
          headers: {
            Accept: "application/json",
            ...authHeader,
          },
        });

        let dbAvatar = "";
        let dbRole = "user";

        if (response.ok) {
          const data = await response.json();
          dbAvatar = data?.avatar || "";
          dbRole = data?.role || "user";
        }

        setPhotoURL(
          pickAvatar({
            dbAvatar,
            firebasePhotoURL: auth.currentUser?.photoURL || "",
          })
        );
        setUserRole(dbRole);
      } catch {
        setPhotoURL(
          pickAvatar({
            dbAvatar: "",
            firebasePhotoURL: auth.currentUser?.photoURL || "",
          })
        );
        setUserRole("user");
      }
    };

    fetchUserData();
  }, [user?.uid, refreshTrigger]);

  useEffect(() => {
    if (!user?.uid) {
      setProfileStatus("none");
      setRemainingDays(null);
      setProfileVisible(false);
      return undefined;
    }

    const controller = new AbortController();

    const countDaysLeft = (dateValue) => {
      if (!dateValue) return null;

      const now = new Date();
      const visibleUntil = new Date(dateValue);
      const days = Math.ceil(
        (visibleUntil - now) / (1000 * 60 * 60 * 24)
      );

      return days > 0 ? days : 0;
    };

    const fetchProfileStatus = async () => {
      try {
        setProfileStatus("loading");

        const authHeader = await getAuthHeader();
        const response = await fetch(
          `${API}/api/profiles/by-user/${user.uid}`,
          {
            headers: {
              Accept: "application/json",
              ...authHeader,
            },
            signal: controller.signal,
          }
        );

        if (response.status === 404) {
          setProfileStatus("none");
          setRemainingDays(null);
          setProfileVisible(false);
          return;
        }

        if (!response.ok) {
          setProfileStatus("error");
          setRemainingDays(null);
          setProfileVisible(false);
          return;
        }

        const profile = await response.json();
        let billingData = null;

        try {
          const billingResponse = await fetch(`${API}/api/billing/status`, {
            headers: {
              Accept: "application/json",
              ...authHeader,
            },
            signal: controller.signal,
          });

          if (billingResponse.ok) {
            billingData = await billingResponse.json();
          }
        } catch (error) {
          if (error?.name === "AbortError") throw error;
        }

        const billingVisibility = billingData?.visibility || null;
        setBetaPremium(billingData?.billing?.betaPremiumEnabled === true || profile?.billingPublic?.betaPremiumEnabled === true);
        const visibleUntil =
          billingVisibility?.visibleUntil || profile?.visibleUntil || null;
        const daysLeft = countDaysLeft(visibleUntil);
        const isVisible =
          typeof billingVisibility?.isVisible === "boolean"
            ? billingVisibility.isVisible
            : profile?.isVisible !== false &&
            daysLeft !== null &&
            daysLeft > 0;

        setRemainingDays(daysLeft);
        setProfileVisible(isVisible);
        setProfileStatus("has");
      } catch (error) {
        if (error?.name !== "AbortError") {
          setProfileStatus("error");
          setRemainingDays(null);
          setProfileVisible(false);
          console.error("❌ Błąd pobierania statusu profilu:", error);
        }
      }
    };

    fetchProfileStatus();

    return () => controller.abort();
  }, [user?.uid, refreshTrigger]);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.uid || !setUnreadCount) return;

      try {
        const authHeader = await getAuthHeader();
        const response = await axios.get(
          `${API}/api/conversations/by-uid/${user.uid}`,
          { headers: authHeader }
        );

        const totalUnread = Array.isArray(response.data)
          ? response.data.reduce(
            (total, conversation) =>
              total + Number(conversation.unreadCount || 0),
            0
          )
          : 0;

        setUnreadCount(totalUnread);
      } catch (error) {
        console.error("❌ Błąd pobierania liczby wiadomości:", error);
      }
    };

    fetchUnread();
  }, [user?.uid, refreshTrigger, location.pathname, setUnreadCount]);

  useEffect(() => {
    const fetchProviderReservationsCount = async () => {
      if (!user?.uid) {
        setProviderReservationsCount(0);
        return;
      }

      try {
        const authHeader = await getAuthHeader();
        const response = await axios.get(
          `${API}/api/reservations/by-provider/${user.uid}`,
          { headers: authHeader }
        );

        const reservations = Array.isArray(response.data) ? response.data : [];
        const count = reservations.filter((reservation) => {
          const status = String(reservation.status || "").toLowerCase();
          const isRelevant =
            status === "oczekująca" || status === "zaakceptowana";

          return isRelevant && reservation.providerSeen === false;
        }).length;

        setProviderReservationsCount(count);
      } catch (error) {
        console.error(
          "❌ Błąd pobierania liczby rezerwacji usługodawcy:",
          error
        );
        setProviderReservationsCount(0);
      }
    };

    fetchProviderReservationsCount();
  }, [user?.uid, refreshTrigger, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [setOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (open && event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) dropdownRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  const handleMenuKeys = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(dropdownRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index].focus();
  };

  const handleNavigate = (path, scrollToId = null) => {
    setOpen(false);

    if (location.pathname === path && scrollToId) {
      const element = document.getElementById(scrollToId);

      if (element) {
        window.setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }

      return;
    }

    navigate(path, { state: { scrollToId } });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("showlyUser");
      navigate("/");
    } catch (error) {
      console.error("❌ Błąd wylogowania:", error);
      showAlert("error", "Nie udało się wylogować.");
    }
  };

  const avatarSrc = photoURL || "/images/other/no-image.png";
  const reservationBadgeCount =
    Number(pendingReservationsCount || 0) +
    Number(providerReservationsCount || 0);
  const hasAnyBadge =
    Number(unreadCount || 0) > 0 || reservationBadgeCount > 0;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Zamknij menu użytkownika" : "Otwórz menu użytkownika"}
      >
        <span className={styles.avatarWrap} aria-hidden="true">
          <img
            src={avatarSrc}
            alt=""
            className={styles.miniAvatar}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.src = "/images/other/no-image.png";
            }}
          />

          {roleLabel && <span className={styles.rolePill}>{roleLabel}</span>}
        </span>

        <span className={styles.triggerCopy}>
          <small>Konto</small>
          <span className={styles.email}>{displayEmail}</span>
        </span>

        {hasAnyBadge && <span className={styles.dot} aria-hidden="true" />}

        <span className={styles.triggerEnd} aria-hidden="true">
          <FiChevronDown
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          />
        </span>
      </button>

      <div
        className={`${styles.menu} ${open ? styles.menuVisible : ""}`}
        role="menu"
        aria-label="Moje konto"
        aria-hidden={!open}
        onKeyDown={handleMenuKeys}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <header className={styles.accountHeader}>
          <span className={styles.largeAvatarWrap} aria-hidden="true">
            <img
              src={avatarSrc}
              alt=""
              className={styles.largeAvatar}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.src = "/images/other/no-image.png";
              }}
            />
          </span>

          <div className={styles.accountCopy}>
            <small>Twoje konto</small>
            <strong>{displayEmail}</strong>
          </div>

          {roleLabel && <span className={styles.headerRole}>{roleLabel}</span>}
        </header>

        <div className={styles.menuList}>
          {showProfileActions && profileStatus === "none" && (
            <button
              type="button"
              className={`${styles.item} ${styles.itemPrimary}`}
              role="menuitem"
              onClick={() => handleNavigate("/stworz-profil", "scrollToId")}
            >
              <span className={styles.itemLeft}>
                <FiUser className={styles.itemIcon} aria-hidden="true" />
                <span>Stwórz profil</span>
              </span>
              <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
            </button>
          )}

          {showProfileActions && profileStatus === "has" && (
            <button
              type="button"
              className={`${styles.item} ${styles.itemPrimary}`}
              role="menuitem"
              onClick={() => handleNavigate("/profil", "scrollToId")}
            >
              <span className={styles.itemLeft}>
                <FiUser className={styles.itemIcon} aria-hidden="true" />
                <span className={styles.profileCopy}>
                  <span>Twój profil</span>
                  <small
                    className={
                      profileVisible
                        ? styles.profileStatus
                        : styles.profileExpired
                    }
                  >
                    {profileVisible
                      ? betaPremium ? 'Premium · bezpłatne testy' : remainingDays !== null
                        ? `Aktywny jeszcze ${remainingDays} ${remainingDays === 1 ? "dzień" : "dni"
                        }`
                        : "Profil aktywny"
                      : "Profil wygasł"}
                  </small>
                </span>
              </span>
              <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/konto", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiSettings className={styles.itemIcon} aria-hidden="true" />
              <span>Ustawienia konta</span>
            </span>
            <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
          </button>

          {canSeeAdminPanel && (
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => handleNavigate("/admin", "adminPanel")}
            >
              <span className={styles.itemLeft}>
                <FiShield className={styles.itemIcon} aria-hidden="true" />
                <span>Panel admina</span>
              </span>
              <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
            </button>
          )}

          <span className={styles.divider} aria-hidden="true" />

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/powiadomienia", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiBell className={styles.itemIcon} aria-hidden="true" />
              <span>Powiadomienia</span>
            </span>

            <span className={styles.itemRight}>
              {Number(unreadCount || 0) > 0 && (
                <span className={styles.countBadge}>{unreadCount}</span>
              )}
              <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/rezerwacje", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiCalendar className={styles.itemIcon} aria-hidden="true" />
              <span>Rezerwacje</span>
            </span>

            <span className={styles.itemRight}>
              {reservationBadgeCount > 0 && (
                <span className={styles.countBadge}>
                  {reservationBadgeCount}
                </span>
              )}
              <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => handleNavigate("/ulubione", "scrollToId")}
          >
            <span className={styles.itemLeft}>
              <FiHeart className={styles.itemIcon} aria-hidden="true" />
              <span>Ulubione profile</span>
            </span>
            <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
          </button>
          <button type="button" className={styles.item} role="menuitem" onClick={() => handleNavigate('/twoje-ogloszenia', 'announcements')}>
            <span className={styles.itemLeft}><FiClipboard className={styles.itemIcon} aria-hidden="true" /><span>Twoje ogłoszenia i zgłoszenia</span></span>
            <FiArrowUpRight className={styles.itemArrow} aria-hidden="true" />
          </button>
        </div>

        <footer className={styles.menuFooter}>
          <button
            type="button"
            className={`${styles.item} ${styles.logoutItem}`}
            role="menuitem"
            onClick={handleLogout}
          >
            <span className={styles.itemLeft}>
              <FiLogOut className={styles.itemIcon} aria-hidden="true" />
              <span>Wyloguj się</span>
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UserDropdown;
