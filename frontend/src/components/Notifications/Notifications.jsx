import { useEffect, useState, useMemo, useCallback } from "react";
import styles from "./Notifications.module.scss";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { FiInbox, FiSend, FiMail } from "react-icons/fi";

import { auth } from "../../firebase"; // ✅ DOPASUJ ŚCIEŻKĘ jeśli masz inną

const API = process.env.REACT_APP_API_URL;
const DEFAULT_AVATAR = "/images/other/no-image.png";

// ✅ avatar może być string albo { url }
const pickUrl = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.url === "string") return val.url;
  return "";
};

const normalizeAvatar = (val) => {
  const raw = pickUrl(val);
  const v = String(raw || "").trim();
  if (!v) return "";

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("blob:")) return v;
  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) return `https://${v}`;

  return v;
};

const Notifications = ({ user, setUnreadCount }) => {
  const [conversations, setConversations] = useState([]);
  const [profileMetaMap, setProfileMetaMap] = useState({}); // uid -> undefined | {name,avatar}
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // =========================================================
  // ✅ AUTH HEADERS – token zawsze z Firebase auth.currentUser
  // =========================================================
  const authHeaders = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || user?.uid || "";

    if (!firebaseUser) {
      // firebase jeszcze nie gotowy -> brak tokena -> backend da 401
      // lepiej tu zwrócić pusty obiekt i poczekać aż auth.currentUser będzie dostępny
      return uid ? { uid } : {};
    }

    let token = "";
    try {
      token = await firebaseUser.getIdToken(); // możesz dać getIdToken(true) do "force refresh"
    } catch {
      token = "";
    }

    return {
      ...(uid ? { uid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [user?.uid]);

  // 0) Moja wizytówka (nazwa do nagłówka)
  useEffect(() => {
    const fetchMyProfile = async () => {
      const firebaseUid = auth.currentUser?.uid || user?.uid;
      if (!firebaseUid) return;

      try {
        const headers = await authHeaders();
        const r = await axios.get(`${API}/api/profiles/by-user/${firebaseUid}`, { headers });
        if (r?.data?.name) setMyProfile(r.data);
        else setMyProfile(null);
      } catch {
        setMyProfile(null);
      }
    };

    fetchMyProfile();
  }, [user?.uid, authHeaders]);

  // 1) Konwersacje
  useEffect(() => {
    const fetchConversations = async () => {
      const firebaseUid = auth.currentUser?.uid || user?.uid;
      if (!firebaseUid) return;

      // jeśli firebase user jeszcze nie jest gotowy, nie strzelaj do backendu
      if (!auth.currentUser) return;

      setLoading(true);

      try {
        const headers = await authHeaders();

        const res = await axios.get(`${API}/api/conversations/by-uid/${firebaseUid}`, { headers });

        const list = Array.isArray(res.data) ? res.data : [];
        setConversations(list);

        const unread = list.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(unread);
      } catch (err) {
        console.error("❌ Błąd pobierania konwersacji:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.uid, setUnreadCount, authHeaders]);

  // 2) Unikalne „drugie” uid-y
  const otherUids = useMemo(
    () =>
      conversations
        .map((c) => c.withUid)
        .filter(Boolean)
        .filter((uid) => uid !== "SYSTEM")
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [conversations]
  );

  const isProfileResolved = (uid) => profileMetaMap[uid] !== undefined;

  // 3) Meta PROFILI drugiej strony
  useEffect(() => {
    const fetchProfiles = async () => {
      if (otherUids.length === 0) return;

      setProfileMetaMap((prev) => {
        const draft = { ...prev };
        otherUids.forEach((uid) => {
          if (!Object.prototype.hasOwnProperty.call(draft, uid)) {
            draft[uid] = undefined;
          }
        });
        return draft;
      });

      try {
        const entries = await Promise.all(
          otherUids.map(async (uid) => {
            try {
              // jeśli ten endpoint u Ciebie też jest chroniony -> dodaj headers:
              // const headers = await authHeaders();
              // const r = await axios.get(`${API}/api/profiles/by-user/${uid}`, { headers });

              const r = await axios.get(`${API}/api/profiles/by-user/${uid}`);
              const name = (r?.data?.name || "").trim() || null;
              const avatar = normalizeAvatar(r?.data?.avatar) || null;
              return [uid, { name, avatar }];
            } catch {
              return [uid, { name: null, avatar: null }];
            }
          })
        );

        setProfileMetaMap((prev) => {
          const next = { ...prev };
          entries.forEach(([uid, meta]) => {
            next[uid] = meta;
          });
          return next;
        });
      } catch (e) {
        console.error("❌ Błąd pobierania profili:", e);
      }
    };

    fetchProfiles();
  }, [otherUids]);

  const getName = (otherUid, fallback, prefer = "profile") => {
    const account = (fallback || "").trim();
    const profileMeta = profileMetaMap[otherUid];

    if (prefer === "account") {
      return (
        account ||
        (typeof profileMeta?.name === "string" ? profileMeta.name.trim() : "") ||
        "Użytkownik"
      );
    }

    if (!isProfileResolved(otherUid)) return "";
    if (typeof profileMeta?.name === "string" && profileMeta.name.trim()) return profileMeta.name.trim();

    return account || "Użytkownik";
  };

  const getAvatarSrc = (convo, variant) => {
    const otherUid = convo.withUid;
    if (variant === "system") return "";

    if (variant === "inbox") {
      return normalizeAvatar(convo.withAvatar) || "";
    }

    const meta = profileMetaMap[otherUid];
    if (!isProfileResolved(otherUid)) return "";
    return normalizeAvatar(meta?.avatar) || "";
  };

  const accountToProfile = useMemo(
    () => conversations.filter((c) => c.channel === "account_to_profile"),
    [conversations]
  );

  const inboxToMyProfile = useMemo(() => {
    const myUid = auth.currentUser?.uid || user?.uid;
    return accountToProfile.filter((c) => c.firstFromUid && c.firstFromUid !== myUid);
  }, [accountToProfile, user?.uid]);

  const myAccountToOtherProfiles = useMemo(() => {
    const myUid = auth.currentUser?.uid || user?.uid;
    return accountToProfile.filter((c) => c.firstFromUid && c.firstFromUid === myUid);
  }, [accountToProfile, user?.uid]);

  const systemConversations = useMemo(
    () => conversations.filter((c) => c.channel === "system"),
    [conversations]
  );

  const systemUnread = systemConversations.reduce((a, c) => a + (c.unreadCount || 0), 0);
  const inboxUnread = inboxToMyProfile.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const outboxUnread = myAccountToOtherProfiles.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.name}>{rawName}</span>
    ) : (
      <span className={`${styles.name} ${styles.nameSkeleton} ${styles.shimmer}`} />
    );

  const AvatarNode = ({ src, variant }) => {
    if (variant === "system") {
      return (
        <div className={`${styles.avatar} ${styles.avatarSystem}`} aria-hidden="true">
          <FiMail />
        </div>
      );
    }

    if (!src) {
      return <div className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`} aria-hidden="true" />;
    }

    return (
      <img
        src={src}
        alt=""
        className={styles.avatar}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
    );
  };

  const renderItem = (convo, variant) => {
    const lastMsg = convo.lastMessage;
    if (!lastMsg) return null;

    const isUnread = (convo.unreadCount || 0) > 0;
    const otherUid = convo.withUid;
    const avatarSrc = getAvatarSrc(convo, variant);

    let header;
    if (variant === "inbox") {
      const rawName = getName(otherUid, convo.withDisplayName, "account");
      header = (
        <>
          <FiInbox className={styles.icon} />
          <span className={styles.metaText}>
            Otrzymałeś/aś wiadomość do Twojego <b>profilu</b> od {renderNameNode(rawName)}
          </span>
        </>
      );
    } else if (variant === "outbox") {
      const rawName = getName(otherUid, convo.withDisplayName, "profile");
      header = (
        <>
          <FiSend className={styles.icon} />
          <span className={styles.metaText}>
            Rozmowa Twojego <b>konta</b> z profilem {renderNameNode(rawName)}
          </span>
        </>
      );
    } else {
      const sysName = (convo.withDisplayName || "Showly.app").trim();
      header = (
        <>
          <FiMail className={styles.icon} />
          <span className={styles.metaText}>
            Wiadomość systemowa od <span className={styles.name}>{sysName}</span>
          </span>
        </>
      );
    }

    return (
      <li
        key={convo._id}
        className={`${styles.item} ${isUnread ? styles.unread : styles.read} ${variant === "system" ? styles.itemSystem : ""
          }`}
      >
        <Link to={`/konwersacja/${convo._id}`} className={styles.link} state={{ scrollToId: "threadPageLayout" }}>
          <div className={styles.row}>
            <div className={styles.avatarWrap}>
              <AvatarNode src={avatarSrc || DEFAULT_AVATAR} variant={variant} />
              {isUnread && <span className={styles.badgeDot} aria-hidden="true" />}
            </div>

            <div className={styles.head}>
              <div className={styles.meta}>{header}</div>
              <div className={styles.date}>{new Date(lastMsg.createdAt).toLocaleString()}</div>
            </div>

            <p className={styles.content}>{lastMsg.content}</p>

            <div className={styles.bottomRow}>
              {isUnread ? (
                <span className={styles.unreadPill}>
                  Nieprzeczytane: <strong>{convo.unreadCount}</strong>
                </span>
              ) : (
                <span className={styles.readPill}>Przeczytane</span>
              )}

              <span className={styles.openPill}>Otwórz wątek →</span>
            </div>
          </div>
        </Link>
      </li>
    );
  };

  const SkeletonItem = () => (
    <li className={`${styles.item} ${styles.skeletonItem}`}>
      <div className={styles.link}>
        <div className={styles.row}>
          <div className={styles.avatarWrap}>
            <div className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`} />
          </div>

          <div className={styles.head}>
            <span className={`${styles.metaSkel} ${styles.shimmer}`} />
            <span className={`${styles.dateSkel} ${styles.shimmer}`} />
          </div>

          <p className={`${styles.content} ${styles.skeleton} ${styles.shimmer}`} />

          <div className={styles.bottomRow}>
            <span className={`${styles.pillSkel} ${styles.shimmer}`} />
            <span className={`${styles.pillSkel} ${styles.shimmer}`} />
          </div>
        </div>
      </div>
    </li>
  );

  // Scroll po powrocie
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

  return (
    <div id="scrollToId" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje powiadomienia</h2>
            <p className={styles.subTitle}>
              Zebraliśmy wiadomości do Twojego profilu
              {myProfile?.name ? (
                <>
                  {" "}
                  <strong className={styles.subStrong}>{myProfile.name}</strong>
                </>
              ) : (
                ""
              )}{" "}
              oraz wątki wysłane z <strong className={styles.subStrong}>Twojego konta</strong>.
            </p>
          </div>

          <div className={styles.headerPills}>
            <span className={styles.headerPill}>
              Do profilu (nowe): <strong>{inboxUnread}</strong>
            </span>
            <span className={styles.headerPill}>
              Z konta (nowe): <strong>{outboxUnread}</strong>
            </span>
            <span className={styles.headerPill}>
              System (nowe): <strong>{systemUnread}</strong>
            </span>
          </div>
        </div>

        {loading ? (
          <ul className={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </ul>
        ) : (
          <>
            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>
                  Otrzymane wiadomości do Twojego profilu{myProfile?.name ? ` „${myProfile.name}”` : ""}
                </h3>
                <span className={styles.badge}>
                  {inboxUnread > 0 ? `${inboxUnread} nieprze.` : `${inboxToMyProfile.length}`}
                </span>
              </div>

              {inboxToMyProfile.length === 0 ? (
                <p className={styles.emptyGroup}>Brak wiadomości do Twojego profilu.</p>
              ) : (
                <ul className={styles.list}>{inboxToMyProfile.map((c) => renderItem(c, "inbox"))}</ul>
              )}
            </div>

            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>Rozmowy z innymi profilami (Twoje konto → inne profile)</h3>
                <span className={styles.badge}>
                  {outboxUnread > 0 ? `${outboxUnread} nieprze.` : `${myAccountToOtherProfiles.length}`}
                </span>
              </div>

              {myAccountToOtherProfiles.length === 0 ? (
                <p className={styles.emptyGroup}>Brak rozmów z innymi profilami.</p>
              ) : (
                <ul className={styles.list}>{myAccountToOtherProfiles.map((c) => renderItem(c, "outbox"))}</ul>
              )}
            </div>

            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>Wiadomości systemowe</h3>
                <span className={styles.badge}>
                  {systemUnread > 0 ? `${systemUnread} nieprze.` : `${systemConversations.length}`}
                </span>
              </div>

              {systemConversations.length === 0 ? (
                <p className={styles.emptyGroup}>Brak wiadomości systemowych.</p>
              ) : (
                <ul className={`${styles.list} ${styles.systemList}`}>
                  {systemConversations.map((c) => renderItem(c, "system"))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;