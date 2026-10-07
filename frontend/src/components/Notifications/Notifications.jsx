import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBell,
  FiInbox,
  FiMail,
  FiSend,
} from "react-icons/fi";

import { auth } from "../../firebase";

import styles from "./Notifications.module.scss";
import EditorGroup from "../YourProfile/sections/EditorGroup";

const API = process.env.REACT_APP_API_URL;
const DEFAULT_AVATAR = "/images/other/no-image.png";

const formatCount = (count, singular, few, many) => {
  const ending = count % 10;
  const lastTwo = count % 100;
  const word = count === 1
    ? singular
    : ending >= 2 && ending <= 4 && (lastTwo < 12 || lastTwo > 14)
      ? few
      : many;
  return `${count} ${word}`;
};

const pickUrl = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && typeof value.url === "string") {
    return value.url;
  }

  return "";
};

const normalizeAvatar = (value) => {
  const raw = pickUrl(value);
  const avatar = String(raw || "").trim();

  if (!avatar) {
    return "";
  }

  if (avatar.startsWith("data:image/")) {
    return avatar;
  }

  if (avatar.startsWith("blob:")) {
    return avatar;
  }

  if (/^https?:\/\//i.test(avatar)) {
    return avatar;
  }

  if (avatar.startsWith("/uploads/")) {
    return `${API}${avatar}`;
  }

  if (avatar.startsWith("uploads/")) {
    return `${API}/${avatar}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(avatar)) {
    return `https://${avatar}`;
  }

  return avatar;
};

const formatMessageDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  useEffect(() => {
    const fetchMyProfile = async () => {
      const firebaseUid = user?.uid || auth.currentUser?.uid;

      if (!firebaseUid) {
        setMyProfile(null);
        return;
      }

      try {
        const headers = await authHeaders();
        const response = await axios.get(
          `${API}/api/profiles/by-user/${firebaseUid}`,
          { headers }
        );

        setMyProfile(response?.data || null);
      } catch (error) {
        console.error("Błąd pobierania mojego profilu:", error);
        setMyProfile(null);
      }
    };

    fetchMyProfile();
  }, [user?.uid, authHeaders]);

  useEffect(() => {
    const fetchConversations = async () => {
      const firebaseUid = user?.uid || auth.currentUser?.uid;

      if (!firebaseUid) {
        setConversations([]);

        if (typeof setUnreadCount === "function") {
          setUnreadCount(0);
        }

        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const headers = await authHeaders();
        const response = await axios.get(
          `${API}/api/conversations/by-uid/${firebaseUid}`,
          { headers }
        );
        const list = Array.isArray(response.data) ? response.data : [];

        setConversations(list);

        const unread = list.reduce(
          (total, conversation) =>
            total + (conversation.unreadCount || 0),
          0
        );

        if (typeof setUnreadCount === "function") {
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Błąd pobierania konwersacji:", error);
        setConversations([]);

        if (typeof setUnreadCount === "function") {
          setUnreadCount(0);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.uid, setUnreadCount, authHeaders]);

  const otherUids = useMemo(
    () =>
      conversations
        .map((conversation) => conversation.withUid)
        .filter(Boolean)
        .filter((uid) => uid !== "SYSTEM")
        .filter((uid, index, values) => values.indexOf(uid) === index),
    [conversations]
  );

  const isProfileResolved = (uid) =>
    profileMetaMap[uid] !== undefined;

  useEffect(() => {
    const fetchProfiles = async () => {
      if (otherUids.length === 0) {
        return;
      }

      setProfileMetaMap((currentMap) => {
        const nextMap = { ...currentMap };

        otherUids.forEach((uid) => {
          if (!Object.prototype.hasOwnProperty.call(nextMap, uid)) {
            nextMap[uid] = undefined;
          }
        });

        return nextMap;
      });

      try {
        const entries = await Promise.all(
          otherUids.map(async (uid) => {
            try {
              const response = await axios.get(
                `${API}/api/profiles/by-user/${uid}`
              );
              const name = (response?.data?.name || "").trim() || null;
              const avatar =
                normalizeAvatar(response?.data?.avatar) || null;

              return [uid, { name, avatar }];
            } catch {
              return [uid, { name: null, avatar: null }];
            }
          })
        );

        setProfileMetaMap((currentMap) => {
          const nextMap = { ...currentMap };

          entries.forEach(([uid, meta]) => {
            nextMap[uid] = meta;
          });

          return nextMap;
        });
      } catch (error) {
        console.error("Błąd pobierania profili:", error);
      }
    };

    fetchProfiles();
  }, [otherUids]);

  useEffect(() => {
    const scrollToId = location.state?.scrollToId;

    if (!scrollToId || loading) {
      return;
    }

    const tryScroll = () => {
      const element = document.getElementById(scrollToId);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        window.history.replaceState(
          {},
          document.title,
          location.pathname
        );
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

  const getName = (otherUid, fallback, prefer = "profile") => {
    const account = (fallback || "").trim();
    const profileMeta = profileMetaMap[otherUid];

    if (prefer === "account") {
      return (
        account ||
        (typeof profileMeta?.name === "string"
          ? profileMeta.name.trim()
          : "") ||
        "Użytkownik"
      );
    }

    if (!isProfileResolved(otherUid)) {
      return "";
    }

    if (
      typeof profileMeta?.name === "string" &&
      profileMeta.name.trim()
    ) {
      return profileMeta.name.trim();
    }

    return account || "Użytkownik";
  };

  const getAvatarSrc = (conversation, variant) => {
    const otherUid = conversation.withUid;

    if (variant === "system") {
      return "";
    }

    if (variant === "inbox") {
      return normalizeAvatar(conversation.withAvatar) || "";
    }

    const profileMeta = profileMetaMap[otherUid];

    if (!isProfileResolved(otherUid)) {
      return "";
    }

    return normalizeAvatar(profileMeta?.avatar) || "";
  };

  const accountToProfile = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.channel === "account_to_profile"
      ),
    [conversations]
  );

  const inboxToMyProfile = useMemo(() => {
    const myUid = auth.currentUser?.uid || user?.uid;

    return accountToProfile.filter(
      (conversation) =>
        conversation.firstFromUid &&
        conversation.firstFromUid !== myUid
    );
  }, [accountToProfile, user?.uid]);

  const myAccountToOtherProfiles = useMemo(() => {
    const myUid = auth.currentUser?.uid || user?.uid;

    return accountToProfile.filter(
      (conversation) =>
        conversation.firstFromUid &&
        conversation.firstFromUid === myUid
    );
  }, [accountToProfile, user?.uid]);

  const systemConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => conversation.channel === "system"
      ),
    [conversations]
  );

  const hasMyProfile = Boolean(myProfile?._id);

  const systemUnread = systemConversations.reduce(
    (total, conversation) =>
      total + (conversation.unreadCount || 0),
    0
  );
  const inboxUnread = inboxToMyProfile.reduce(
    (total, conversation) =>
      total + (conversation.unreadCount || 0),
    0
  );
  const outboxUnread = myAccountToOtherProfiles.reduce(
    (total, conversation) =>
      total + (conversation.unreadCount || 0),
    0
  );

  const totalUnread = inboxUnread + outboxUnread + systemUnread;
  const totalThreads = conversations.length;

  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.name}>{rawName}</span>
    ) : (
      <span
        className={`${styles.name} ${styles.nameSkeleton} ${styles.shimmer}`}
      />
    );

  const AvatarNode = ({ src, variant }) => {
    if (variant === "system") {
      return (
        <div
          className={`${styles.avatar} ${styles.avatarSystem}`}
          aria-hidden="true"
        >
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
        onError={(event) => {
          event.currentTarget.src = DEFAULT_AVATAR;
        }}
      />
    );
  };

  const renderItem = (conversation, variant) => {
    const lastMessage = conversation.lastMessage;

    if (!lastMessage) {
      return null;
    }

    const isUnread = (conversation.unreadCount || 0) > 0;
    const otherUid = conversation.withUid;
    const avatarSrc = getAvatarSrc(conversation, variant);

    let header;

    if (variant === "inbox") {
      const rawName = getName(
        otherUid,
        conversation.withDisplayName,
        "account"
      );

      header = (
        <>
          <FiInbox className={styles.icon} />
          <span className={styles.metaText}>
            Wiadomość od {renderNameNode(rawName)}
          </span>
        </>
      );
    } else if (variant === "outbox") {
      const rawName = getName(
        otherUid,
        conversation.withDisplayName,
        "profile"
      );

      header = (
        <>
          <FiSend className={styles.icon} />
          <span className={styles.metaText}>
            Rozmowa Twojego <b>konta</b> z profilem{" "}
            {renderNameNode(rawName)}
          </span>
        </>
      );
    } else {
      const systemName = (
        conversation.withDisplayName || "Showly.me"
      ).trim();

      header = (
        <>
          <FiMail className={styles.icon} />
          <span className={styles.metaText}>
            Wiadomość od{" "}
            <span className={styles.name}>{systemName}</span>
          </span>
        </>
      );
    }

    return (
      <li
        key={conversation._id}
        className={`${styles.item} ${
          isUnread ? styles.unread : styles.read
        } ${variant === "system" ? styles.itemSystem : ""}`}
      >
        <Link
          to={`/konwersacja/${conversation._id}`}
          className={styles.link}
          state={{ scrollToId: "threadPageLayout" }}
        >
          <div className={styles.row}>
            <div className={styles.avatarWrap}>
              <AvatarNode src={avatarSrc} variant={variant} />

              {isUnread && (
                <span className={styles.badgeDot} aria-hidden="true" />
              )}
            </div>

            <div className={styles.itemBody}>
              <div className={styles.itemHead}>
                <div className={styles.meta}>{header}</div>

                <time
                  className={styles.date}
                  dateTime={lastMessage.createdAt}
                >
                  {formatMessageDate(lastMessage.createdAt)}
                </time>
              </div>

              <p className={styles.message}>{lastMessage.content}</p>

              <div className={styles.bottomRow}>
                {isUnread ? (
                  <span className={styles.unreadLabel}>
                    {formatCount(conversation.unreadCount, "nieprzeczytana", "nieprzeczytane", "nieprzeczytanych")}
                  </span>
                ) : (
                  <span className={styles.readLabel}>Przeczytane</span>
                )}

                <span className={styles.openLink}>
                  Otwórz rozmowę
                  <FiArrowUpRight aria-hidden="true" />
                </span>
              </div>
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
            <div
              className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`}
            />
          </div>

          <div className={styles.itemBody}>
            <div className={styles.itemHead}>
              <span className={`${styles.metaSkel} ${styles.shimmer}`} />
              <span className={`${styles.dateSkel} ${styles.shimmer}`} />
            </div>

            <span
              className={`${styles.messageSkel} ${styles.shimmer}`}
            />

            <div className={styles.bottomRow}>
              <span className={`${styles.labelSkel} ${styles.shimmer}`} />
              <span className={`${styles.openSkel} ${styles.shimmer}`} />
            </div>
          </div>
        </div>
      </div>
    </li>
  );

  const EmptyState = ({ icon, title, text }) => (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );

  const renderGroup = ({
    number,
    title,
    label,
    badge,
    Icon,
    items,
    variant,
    emptyTitle,
    emptyText,
    disabled = false,
  }) => (
    <EditorGroup title={`${number} / ${title}`} className={styles.messageGroup}>
      <header className={styles.groupHeader}>
        <span className={styles.groupIcon}>
          <Icon aria-hidden="true" />
        </span>

        <div className={styles.groupHeading}>
          <span className={styles.groupLabel}>{label}</span>
          <p>{formatCount(items.length, "rozmowa", "rozmowy", "rozmów")} w tej sekcji</p>
        </div>

        <span className={styles.groupBadge}>{badge}</span>
      </header>

      {disabled || items.length === 0 ? (
        <EmptyState
          icon={<Icon aria-hidden="true" />}
          title={emptyTitle}
          text={emptyText}
        />
      ) : (
        <ul className={styles.list}>
          {items.map((conversation) =>
            renderItem(conversation, variant)
          )}
        </ul>
      )}
    </EditorGroup>
  );

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            <div className={styles.titleBlock}>
              <span className={styles.kicker}>Showly / Wiadomości</span>
              <h1>Centrum wiadomości</h1>
              <p>Rozmowy z klientami, kontakt z innymi profilami i komunikaty Showly w jednym miejscu.</p>

              {hasMyProfile && myProfile?.name ? (
                <p>
                  Profil: <strong>{myProfile.name}</strong>
                </p>
              ) : null}
            </div>

            <FiBell className={styles.headerIcon} aria-hidden="true" />
          </header>

          <EditorGroup title="01 / Twoja skrzynka w liczbach" className={styles.summaryGroup}>
            <div className={styles.headerStats} aria-live="polite">
              <div className={styles.headerStat}>
                <span>Nieprzeczytane</span>
                <strong>{loading ? "—" : totalUnread}</strong>
              </div>

              <div className={styles.headerStat}>
                <span>Wszystkie wątki</span>
                <strong>{loading ? "—" : totalThreads}</strong>
              </div>
            </div>
          </EditorGroup>

          <div className={styles.content}>
            {loading ? (
              <EditorGroup title="02 / Twoje wiadomości" className={styles.messageGroup}>
                <header className={styles.groupHeader}>
                  <span className={styles.groupIcon}>
                    <FiMail aria-hidden="true" />
                  </span>

                  <div className={styles.groupHeading}>
                    <span className={styles.groupLabel}>Ładowanie</span>
                    <p role="status">Pobieramy Twoje wiadomości…</p>
                  </div>

                  <span className={styles.groupBadge}>—</span>
                </header>

                <ul className={styles.list} aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonItem key={index} />
                  ))}
                </ul>
              </EditorGroup>
            ) : (
              <div className={styles.messages}>
                {renderGroup({
                  number: "02",
                  title: `Wiadomości do profilu${
                    myProfile?.name ? ` „${myProfile.name}”` : ""
                  }`,
                  label: "Odebrane przez profil",
                  badge: hasMyProfile
                    ? inboxUnread > 0
                      ? formatCount(inboxUnread, "nowa", "nowe", "nowych")
                      : inboxToMyProfile.length
                    : "—",
                  Icon: FiInbox,
                  items: inboxToMyProfile,
                  variant: "inbox",
                  disabled: !hasMyProfile,
                  emptyTitle: hasMyProfile
                    ? "Brak wiadomości do Twojego profilu"
                    : "Nie masz jeszcze utworzonego profilu",
                  emptyText: hasMyProfile
                    ? "Gdy ktoś napisze do Twojej wizytówki, rozmowa pojawi się właśnie tutaj."
                    : "Wiadomości do profilu będą dostępne po utworzeniu wizytówki usługodawcy.",
                })}

                {renderGroup({
                  number: "03",
                  title: "Rozmowy z innymi profilami",
                  label: "Wysłane z Twojego konta",
                  badge:
                    outboxUnread > 0
                      ? formatCount(outboxUnread, "nowa", "nowe", "nowych")
                      : myAccountToOtherProfiles.length,
                  Icon: FiSend,
                  items: myAccountToOtherProfiles,
                  variant: "outbox",
                  emptyTitle: "Brak rozmów z innymi profilami",
                  emptyText:
                    "Gdy rozpoczniesz rozmowę z inną wizytówką, pojawi się ona w tej sekcji.",
                })}

                {renderGroup({
                  number: "04",
                  title: "Wiadomości systemowe",
                  label: "Komunikaty Showly",
                  badge:
                    systemUnread > 0
                      ? formatCount(systemUnread, "nowa", "nowe", "nowych")
                      : systemConversations.length,
                  Icon: FiMail,
                  items: systemConversations,
                  variant: "system",
                  emptyTitle: "Brak wiadomości systemowych",
                  emptyText:
                    "Komunikaty od Showly pojawią się tutaj, gdy będą dostępne.",
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Notifications;
