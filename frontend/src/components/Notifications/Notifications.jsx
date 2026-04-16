import { useEffect, useState, useMemo, useCallback } from "react";
import styles from "./Notifications.module.scss";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { FiInbox, FiSend, FiMail } from "react-icons/fi";
import { auth } from "../../firebase";

const API = process.env.REACT_APP_API_URL;
const DEFAULT_AVATAR = "/images/other/no-image.png";

// avatar może być string albo { url }
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
  const [profileMetaMap, setProfileMetaMap] = useState({});
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const authHeaders = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    const uid = user?.uid || firebaseUser?.uid || "";

    let token = "";
    if (firebaseUser) {
      try {
        token = await firebaseUser.getIdToken();
      } catch {
        token = "";
      }
    }

    return {
      ...(uid ? { uid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [user?.uid]);

  // moja wizytówka
  useEffect(() => {
    const fetchMyProfile = async () => {
      const firebaseUid = user?.uid || auth.currentUser?.uid;
      if (!firebaseUid) {
        setMyProfile(null);
        return;
      }

      try {
        const headers = await authHeaders();
        const r = await axios.get(`${API}/api/profiles/by-user/${firebaseUid}`, {
          headers,
        });

        setMyProfile(r?.data || null);
      } catch (err) {
        console.error("❌ Błąd pobierania mojego profilu:", err);
        setMyProfile(null);
      }
    };

    fetchMyProfile();
  }, [user?.uid, authHeaders]);

  // konwersacje
  useEffect(() => {
    const fetchConversations = async () => {
      const firebaseUid = user?.uid || auth.currentUser?.uid;

      if (!firebaseUid) {
        setConversations([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const headers = await authHeaders();
        const res = await axios.get(`${API}/api/conversations/by-uid/${firebaseUid}`, {
          headers,
        });

        const list = Array.isArray(res.data) ? res.data : [];
        setConversations(list);

        const unread = list.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(unread);
      } catch (err) {
        console.error("❌ Błąd pobierania konwersacji:", err);
        setConversations([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.uid, setUnreadCount, authHeaders]);

  // unikalne uid drugiej strony
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

  // meta profili drugiej strony
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
    if (typeof profileMeta?.name === "string" && profileMeta.name.trim()) {
      return profileMeta.name.trim();
    }

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
      return (
        <div
          className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`}
          aria-hidden="true"
        />
      );
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
      const sysName = (convo.withDisplayName || "Showly.me").trim();
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
        <Link
          to={`/konwersacja/${convo._id}`}
          className={styles.link}
          state={{ scrollToId: "threadPageLayout" }}
        >
          <div className={styles.row}>
            <div className={styles.avatarWrap}>
              <AvatarNode src={avatarSrc} variant={variant} />
              {isUnread && <span className={styles.badgeDot} aria-hidden="true" />}
            </div>

            <div className={styles.itemHead}>
              <div className={styles.meta}>{header}</div>
              <div className={styles.date}>
                {new Date(lastMsg.createdAt).toLocaleString()}
              </div>
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

          <div className={styles.itemHead}>
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

  const hasMyProfile = !!(myProfile && myProfile._id);

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Notifications</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Twoje konwersacje i wiadomości</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Inbox • Wątki • System</span>
          </div>

          <h2 className={styles.heading}>
            Twoje <span className={styles.headingAccent}>powiadomienia</span> i wiadomości
            ✉️
          </h2>

          <p className={styles.description}>
            {hasMyProfile ? (
              <>
                Zebraliśmy wiadomości do Twojego profilu
                {myProfile?.name ? (
                  <>
                    {" "}
                    <strong className={styles.inlineStrong}>{myProfile.name}</strong>
                  </>
                ) : null}{" "}
                oraz wątki wysłane z{" "}
                <strong className={styles.inlineStrong}>Twojego konta</strong>.
              </>
            ) : (
              <>
                Wątki wysłane z <strong className={styles.inlineStrong}>Twojego konta</strong>{" "}
                są dostępne poniżej. Wiadomości do profilu pojawią się, gdy utworzysz swoją
                wizytówkę.
              </>
            )}
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{hasMyProfile ? inboxUnread : "—"}</strong>
              <span>
                {hasMyProfile ? "nowych do Twojego profilu" : "profil jeszcze nieutworzony"}
              </span>
            </div>

            <div className={styles.metaCard}>
              <strong>{outboxUnread}</strong>
              <span>nowych z Twojego konta</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{systemUnread}</strong>
              <span>wiadomości systemowych</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>Ładowanie powiadomień</h3>
              <span className={styles.badge}>—</span>
            </div>

            <ul className={styles.list}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className={styles.contentBox}>
              <div className={styles.contentHeader}>
                <h3 className={styles.contentTitle}>
                  Otrzymane wiadomości do Twojego profilu
                  {myProfile?.name ? ` „${myProfile.name}”` : ""}
                </h3>
                <span className={styles.badge}>
                  {hasMyProfile
                    ? inboxUnread > 0
                      ? `${inboxUnread} nieprze.`
                      : `${inboxToMyProfile.length}`
                    : "—"}
                </span>
              </div>

              {!hasMyProfile ? (
                <div className={styles.emptyBox}>
                  <div className={styles.emptyIconWrap}>
                    <FiInbox className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyTitle}>Nie masz jeszcze utworzonego profilu</p>
                  <p className={styles.emptyText}>
                    Wiadomości do profilu będą dostępne dopiero po utworzeniu wizytówki usługodawcy.
                  </p>
                </div>
              ) : inboxToMyProfile.length === 0 ? (
                <div className={styles.emptyBox}>
                  <div className={styles.emptyIconWrap}>
                    <FiInbox className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyTitle}>Brak wiadomości do Twojego profilu</p>
                  <p className={styles.emptyText}>
                    Gdy ktoś napisze do Twojej wizytówki, konwersacje pojawią się właśnie tutaj.
                  </p>
                </div>
              ) : (
                <ul className={styles.list}>
                  {inboxToMyProfile.map((c) => renderItem(c, "inbox"))}
                </ul>
              )}
            </div>

            <div className={styles.contentBox}>
              <div className={styles.contentHeader}>
                <h3 className={styles.contentTitle}>
                  Rozmowy z innymi profilami (Twoje konto → inne profile)
                </h3>
                <span className={styles.badge}>
                  {outboxUnread > 0
                    ? `${outboxUnread} nieprze.`
                    : `${myAccountToOtherProfiles.length}`}
                </span>
              </div>

              {myAccountToOtherProfiles.length === 0 ? (
                <div className={styles.emptyBox}>
                  <div className={styles.emptyIconWrap}>
                    <FiSend className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyTitle}>Brak rozmów z innymi profilami</p>
                  <p className={styles.emptyText}>
                    Gdy rozpoczniesz rozmowę z inną wizytówką, pojawi się ona w tej sekcji.
                  </p>
                </div>
              ) : (
                <ul className={styles.list}>
                  {myAccountToOtherProfiles.map((c) => renderItem(c, "outbox"))}
                </ul>
              )}
            </div>

            <div className={styles.contentBox}>
              <div className={styles.contentHeader}>
                <h3 className={styles.contentTitle}>Wiadomości systemowe</h3>
                <span className={styles.badge}>
                  {systemUnread > 0
                    ? `${systemUnread} nieprze.`
                    : `${systemConversations.length}`}
                </span>
              </div>

              {systemConversations.length === 0 ? (
                <div className={styles.emptyBox}>
                  <div className={styles.emptyIconWrap}>
                    <FiMail className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyTitle}>Brak wiadomości systemowych</p>
                  <p className={styles.emptyText}>
                    Komunikaty systemowe od Showly pojawią się tutaj, gdy będą dostępne.
                  </p>
                </div>
              ) : (
                <ul className={`${styles.list} ${styles.systemList}`}>
                  {systemConversations.map((c) => renderItem(c, "system"))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Notifications;