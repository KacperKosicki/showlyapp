import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import styles from "./ThreadView.module.scss";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AlertBox from "../AlertBox/AlertBox";

import { FaArrowLeft, FaRegCommentDots, FaUserCircle } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa";

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

const ThreadView = ({ user, setUnreadCount }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [receiverId, setReceiverId] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);

  // nazwy konta/profilu odbiorcy
  const [accountName, setAccountName] = useState("");

  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // status profilu odbiorcy (dla FAQ)
  const [profileStatus, setProfileStatus] = useState("loading");

  // moja nazwa profilu (dla labela "wyślesz jako...")
  const [myProfileName, setMyProfileName] = useState("");

  const [channel, setChannel] = useState(null);
  const [firstFromUid, setFirstFromUid] = useState(null);

  // ✅ AVATARY kont (z participants)
  const [accountAvatarMap, setAccountAvatarMap] = useState({}); // uid -> string|null

  // ✅ META profili (pending): uid -> undefined | { name, avatar }
  const [profileMetaMap, setProfileMetaMap] = useState({});

  // FLASH
  const [flash, setFlash] = useState(null);

  // FULL PAGE LOADING
  const [loading, setLoading] = useState(true);

  // ----------------------------
  // Helpers skeleton
  // ----------------------------
  const isProfileResolved = useCallback(
    (uid) =>
      Object.prototype.hasOwnProperty.call(profileMetaMap, uid) &&
      profileMetaMap[uid] !== undefined,
    [profileMetaMap]
  );

  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.receiverName}>{rawName}</span>
    ) : (
      <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
    );

  // scroll to anchor (np. 'threadPageLayout')
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el && el.offsetHeight > 0) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else if (attempts < 60) {
        attempts++;
        setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
  }, [location.state, messages, location.pathname]);

  const fetchProfileMeta = useCallback(async (uid) => {
    try {
      const r = await axios.get(`${API}/api/profiles/by-user/${uid}`);
      const name = (r?.data?.name || "").trim() || null;
      const avatar = normalizeAvatar(r?.data?.avatar) || null;
      return { name, avatar };
    } catch (err) {
      if (err.response?.status === 404) return { name: null, avatar: null };
      console.error("❌ Błąd pobierania profilu:", err);
      return { name: null, avatar: null };
    }
  }, []);

  // moja nazwa profilu (do senderHint)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.uid) return;
      const meta = await fetchProfileMeta(user.uid);
      if (mounted) setMyProfileName(meta?.name || "");
    })();
    return () => (mounted = false);
  }, [user?.uid, fetchProfileMeta]);

  // FLASH z location.state lub sessionStorage
  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
      const clean = { ...(location.state || {}) };
      delete clean.flash;
      window.history.replaceState({ ...window.history.state, usr: clean }, "");
    } else {
      const raw = sessionStorage.getItem("flash");
      if (raw) {
        try {
          const f = JSON.parse(raw);
          setFlash(f);
        } catch {
          /* ignore */
        }
      }
    }
  }, [location.key, location.state]);

  // Auto-close FLASH
  useEffect(() => {
    if (!flash) return;
    const ttl = Number(flash.ttl || 4000);
    const id = setTimeout(() => {
      setFlash(null);
      sessionStorage.removeItem("flash");
    }, ttl);
    return () => clearTimeout(id);
  }, [flash]);

  const closeFlash = () => {
    setFlash(null);
    sessionStorage.removeItem("flash");
  };

  // Dorysowanie optimisticMessage + draft
  useEffect(() => {
    const rawOpt =
      location.state?.optimisticMessage ||
      sessionStorage.getItem("optimisticMessage");
    if (rawOpt) {
      try {
        const optimistic = typeof rawOpt === "string" ? JSON.parse(rawOpt) : rawOpt;
        if (optimistic && optimistic.content) {
          setMessages((prev) => [...prev, optimistic]);
        }
      } catch {
        /* ignore */
      }
    }

    const rawDraft = location.state?.draft || sessionStorage.getItem("draft");
    if (rawDraft) {
      try {
        const draft = typeof rawDraft === "string" ? rawDraft : String(rawDraft);
        setNewMessage(draft);
      } catch {
        /* ignore */
      }
    }
  }, [location.state]);

  // ----------------------------
  // FETCH THREAD
  // ----------------------------
  const fetchThread = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/api/conversations/${threadId}`, {
        headers: { uid: user.uid },
      });

      const { messages: msgs, participants, channel: ch, firstFromUid: ff } =
        res.data;

      setMessages((prev) => {
        const withoutPending = prev.filter((m) => !m?.pending);
        return msgs && msgs.length ? msgs : withoutPending;
      });

      setChannel(ch);
      setFirstFromUid(ff || (msgs?.[0]?.fromUid ?? null));

      // ✅ mapka avatarów KONT z participants
      const amap = {};
      (participants || []).forEach((p) => {
        if (!p?.uid) return;
        const a = normalizeAvatar(p.avatar) || null;
        amap[p.uid] = a;
      });
      setAccountAvatarMap(amap);

      const other = (participants || []).find((p) => p.uid !== user.uid);
      if (other) {
        setReceiverId(other.uid);
        setAccountName(other.displayName || "Użytkownik");
      }

      // BLOKADA: można odpisać tylko jeśli ostatnia od drugiej strony
      const last = (msgs && msgs.length ? msgs : []).slice(-1)[0];
      setCanReply(!!last && !last.isSystem && last.fromUid !== user.uid);

      // mark read + update counter
      const unreadInThread = (msgs || []).filter(
        (m) => !m.read && m.toUid === user.uid
      );
      if (unreadInThread.length > 0) {
        await axios.patch(`${API}/api/conversations/${threadId}/read`, null, {
          headers: { uid: user.uid },
        });
        if (setUnreadCount)
          setUnreadCount((prev) => Math.max(prev - unreadInThread.length, 0));
      }

      sessionStorage.removeItem("optimisticMessage");
      sessionStorage.removeItem("draft");
    } catch (err) {
      console.error("❌ Błąd pobierania konwersacji:", err);
      if ([401, 403].includes(err.response?.status)) navigate("/");
    } finally {
      setLoading(false);
    }
  }, [threadId, user.uid, navigate, setUnreadCount]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // ----------------------------
  // ✅ Rozstrzyganie META profilu drugiej strony (receiverId)
  // ----------------------------
  useEffect(() => {
    const uid = receiverId;
    if (!uid || uid === "SYSTEM") return;

    setProfileMetaMap((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, uid)) return prev;
      return { ...prev, [uid]: undefined };
    });

    (async () => {
      const meta = await fetchProfileMeta(uid);
      setProfileMetaMap((prev) => ({ ...prev, [uid]: meta }));
    })();
  }, [receiverId, fetchProfileMeta]);

  // ----------------------------
  // RECEIVER PROFILE (FAQ)
  // ----------------------------
  useEffect(() => {
    const fetchReceiverProfile = async () => {
      try {
        if (!receiverId || receiverId === "SYSTEM") {
          setProfileStatus("missing");
          setReceiverProfile(null);
          return;
        }

        const res = await axios.get(`${API}/api/profiles/by-user/${receiverId}`);
        const prof = res.data;
        setReceiverProfile(prof);

        let expired = false;
        if (prof?.visibleUntil) expired = new Date(prof.visibleUntil) < new Date();
        if (prof?.isActive === false) expired = true;
        setProfileStatus(expired ? "expired" : "exists");
      } catch (err) {
        if (err.response?.status === 404) {
          setProfileStatus("missing");
          setReceiverProfile(null);
        } else {
          console.error("❌ Błąd pobierania profilu odbiorcy:", err);
          setProfileStatus("error");
          setReceiverProfile(null);
        }
      }
    };
    fetchReceiverProfile();
  }, [receiverId, channel, firstFromUid]);

  // ----------------------------
  // Kto jest po której stronie?
  // ----------------------------
  const amProfileSide = useMemo(() => {
    if (!channel || !firstFromUid || !user?.uid) return false;
    if (channel === "account_to_profile") return user.uid !== firstFromUid;
    if (channel === "profile_to_account") return user.uid === firstFromUid;
    return false;
  }, [channel, firstFromUid, user?.uid]);

  // label nad textarea
  const mySenderLabel = useMemo(() => {
    return amProfileSide
      ? myProfileName
        ? `Wyślesz wiadomość jako: ${myProfileName}`
        : "Wyślesz wiadomość jako: Twoja wizytówka"
      : "Wyślesz wiadomość jako: Twoje konto";
  }, [amProfileSide, myProfileName]);

  // ✅ FAQ tylko klient
  const showFaq =
    receiverId !== "SYSTEM" && channel === "account_to_profile" && !amProfileSide;

  // ----------------------------
  // Nazwa odbiorcy (z skeletonem)
  // ----------------------------
  const receiverName = useMemo(() => {
    if (receiverId === "SYSTEM" || channel === "system") return "Showly.app";

    const meta = receiverId ? profileMetaMap[receiverId] : undefined; // undefined pending | {name,avatar}
    const profResolved = receiverId ? isProfileResolved(receiverId) : false;
    const profName = meta?.name;

    if (channel === "account_to_profile") {
      if (firstFromUid === user.uid) {
        // Twoje konto -> ich profil: najpierw profil
        if (!profResolved) return "";
        if (typeof profName === "string" && profName.trim()) return profName.trim();
        return accountName || "Użytkownik";
      }
      // oni -> Twój profil: pokazuj konto
      return accountName || (typeof profName === "string" ? profName : "") || "Użytkownik";
    }

    if (channel === "profile_to_account") {
      // preferuj profil
      if (!profResolved) return "";
      if (typeof profName === "string" && profName.trim()) return profName.trim();
      return accountName || "Użytkownik";
    }

    return accountName || (typeof profName === "string" ? profName : "") || "Użytkownik";
  }, [
    receiverId,
    channel,
    firstFromUid,
    user.uid,
    accountName,
    profileMetaMap,
    isProfileResolved,
  ]);

  // ----------------------------
  // ✅ Avatar per wiadomość: konto vs profil
  // ----------------------------
  const senderKindFor = useCallback(
    (msg) => {
      if (!msg || msg.isSystem || receiverId === "SYSTEM" || channel === "system")
        return "system";
      if (!channel || !firstFromUid) return "account"; // fallback

      // account_to_profile: firstFromUid = konto, druga strona = profil
      if (channel === "account_to_profile") {
        return msg.fromUid === firstFromUid ? "account" : "profile";
      }

      // profile_to_account: firstFromUid = profil, druga strona = konto
      if (channel === "profile_to_account") {
        return msg.fromUid === firstFromUid ? "profile" : "account";
      }

      return "account";
    },
    [channel, firstFromUid, receiverId]
  );

  const avatarForMsg = useCallback(
    (msg) => {
      const kind = senderKindFor(msg);
      if (kind === "system") return "";

      if (kind === "account") {
        const a = normalizeAvatar(accountAvatarMap[msg.fromUid]) || "";
        return a;
      }

      // profile
      const meta = profileMetaMap[msg.fromUid];
      if (!meta) return ""; // pending albo brak
      return normalizeAvatar(meta.avatar) || "";
    },
    [senderKindFor, accountAvatarMap, profileMetaMap]
  );

  // ✅ dociągnij META profilu dla uid-ów pojawiających się w wiadomościach (1 request per uid)
  useEffect(() => {
    if (!channel || !messages?.length) return;

    const uids = Array.from(
      new Set(
        messages
          .filter((m) => m && !m.isSystem && m.fromUid && m.fromUid !== "SYSTEM")
          .map((m) => m.fromUid)
      )
    );

    if (uids.length === 0) return;

    // oznacz pending dla brakujących
    setProfileMetaMap((prev) => {
      const next = { ...prev };
      let changed = false;
      uids.forEach((uid) => {
        if (!Object.prototype.hasOwnProperty.call(next, uid)) {
          next[uid] = undefined;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    (async () => {
      const missing = uids.filter((uid) => profileMetaMap[uid] === undefined);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (uid) => {
          const meta = await fetchProfileMeta(uid);
          return [uid, meta];
        })
      );

      setProfileMetaMap((prev) => {
        const next = { ...prev };
        entries.forEach(([uid, meta]) => {
          next[uid] = meta;
        });
        return next;
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, channel, fetchProfileMeta]);

  // ----------------------------
  // HERO avatar/name (jak PublicProfile)
  // ----------------------------
  const receiverHeroAvatar = useMemo(() => {
    if (!receiverId || receiverId === "SYSTEM") return "";
    const profA = normalizeAvatar(profileMetaMap?.[receiverId]?.avatar) || "";
    const accA = normalizeAvatar(accountAvatarMap?.[receiverId]) || "";
    return profA || accA || "";
  }, [receiverId, profileMetaMap, accountAvatarMap]);

  const statusLabel = useMemo(() => {
    if (!showFaq) return "";
    if (profileStatus === "loading") return "Ładowanie profilu…";
    if (profileStatus === "missing") return "Brak wizytówki";
    if (profileStatus === "expired") return "Wizytówka wygasła";
    if (profileStatus === "error") return "Błąd profilu";
    return "Wizytówka aktywna";
  }, [profileStatus, showFaq]);

  // ----------------------------
  // FULL PAGE SKELETON
  // ----------------------------
  const ThreadSkeleton = () => (
    <div className={styles.loadingBox}>
      <div className={styles.skeletonTop}>
        <div className={`${styles.skeletonBtn} ${styles.shimmer}`} />
        <div className={`${styles.skeletonTitle} ${styles.shimmer}`} />
      </div>

      <div className={styles.skeletonThread}>
        <div className={`${styles.skeletonBubble} ${styles.left} ${styles.shimmer}`}>
          <div className={`${styles.skeletonMeta} ${styles.shimmer}`} />
          <div className={`${styles.skeletonText} ${styles.shimmer}`} />
          <div className={`${styles.skeletonTextShort} ${styles.shimmer}`} />
        </div>

        <div className={`${styles.skeletonBubble} ${styles.right} ${styles.shimmer}`}>
          <div className={`${styles.skeletonMeta} ${styles.shimmer}`} />
          <div className={`${styles.skeletonText} ${styles.shimmer}`} />
          <div className={`${styles.skeletonTextShort} ${styles.shimmer}`} />
        </div>

        <div className={`${styles.skeletonBubble} ${styles.left} ${styles.shimmer}`}>
          <div className={`${styles.skeletonMeta} ${styles.shimmer}`} />
          <div className={`${styles.skeletonText} ${styles.shimmer}`} />
          <div className={`${styles.skeletonTextShort} ${styles.shimmer}`} />
        </div>
      </div>

      <div className={styles.skeletonReplyBar}>
        <div className={`${styles.skeletonInput} ${styles.shimmer}`} />
        <div className={`${styles.skeletonSend} ${styles.shimmer}`} />
      </div>
    </div>
  );

  // ----------------------------
  // Wysyłanie odpowiedzi
  // ----------------------------
  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const last = messages[messages.length - 1];
    if (!canReply || last?.isSystem) {
      setErrorMsg("Nie można odpowiadać na wiadomości systemowe.");
      return;
    }

    try {
      await axios.post(`${API}/api/conversations/send`, {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim(),
        channel,
        conversationId: threadId,
      });

      setNewMessage("");
      setErrorMsg("");
      fetchThread();
    } catch (err) {
      console.error("❌ Błąd wysyłania odpowiedzi:", err);
      if (err.response?.status === 403) {
        setErrorMsg(
          err.response.data?.message || "Musisz poczekać na odpowiedź drugiej osoby."
        );
      } else if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg("Wystąpił błąd podczas wysyłania wiadomości.");
      }
    }
  };

  return (
    <div id="threadPageLayout" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell}>
        {flash && (
          <AlertBox type={flash.type} message={flash.message} onClose={closeFlash} />
        )}

        <div className={`${styles.mainArea} ${!showFaq ? styles.centered : ""}`}>
          <div className={styles.threadWrapper}>
            {/* ===== HERO (jak PublicProfile) ===== */}
            <header className={styles.hero}>
              <div className={styles.heroInner}>
                {/* top-left: back */}
                <div className={styles.heroTopLeft}>
                  <button
                    onClick={() =>
                      navigate("/powiadomienia", { state: { scrollToId: "threadPageLayout" } })
                    }
                    className={styles.backButton}
                    type="button"
                  >
                    <FaArrowLeft />
                    Wróć do powiadomień
                  </button>
                </div>

                {/* top-right: badge */}
                <div className={styles.heroBadge} title={statusLabel || ""}>
                  <div className={styles.badgeItem}>
                    <FaRegCommentDots />
                    <span>
                      <strong>{messages.filter((m) => !m?.isSystem).length}</strong>&nbsp;wiadomości
                    </span>
                  </div>

                  {showFaq && (
                    <div className={styles.badgeItem}>
                      <FaRegEye />
                      <span>{statusLabel || "Profil"}</span>
                    </div>
                  )}
                </div>

                <div className={styles.heroLeft}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.heroTitle}>
                      Rozmowa z&nbsp;{renderNameNode(receiverName)}
                    </h2>

                    <span className={styles.titlePill}>
                      {channel === "account_to_profile"
                        ? "KONTO ↔ PROFIL"
                        : channel === "profile_to_account"
                        ? "PROFIL ↔ KONTO"
                        : "ROZMOWA"}
                    </span>
                  </div>

                  <div className={styles.metaRow}>
                    <span className={styles.roleText}>
                      {canReply ? "Możesz odpowiedzieć" : "Czekasz na odpowiedź"}
                    </span>
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.metaHint}>
                      {amProfileSide ? "Piszesz jako wizytówka" : "Piszesz jako konto"}
                    </span>
                  </div>
                </div>

                <div className={styles.heroRight}>
                  <div className={styles.avatarWrap}>
                    {receiverHeroAvatar ? (
                      <img
                        src={receiverHeroAvatar}
                        alt=""
                        className={styles.avatar}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    ) : (
                      <div className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`}>
                        <FaUserCircle />
                      </div>
                    )}
                    <div className={styles.avatarRing} aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className={styles.heroFade} aria-hidden="true" />
            </header>

            {loading ? (
              <ThreadSkeleton />
            ) : (
              <>
                <div className={styles.thread}>
                  {messages.map((msg, i) => {
                    const displayContent = msg.isSystem
                      ? String(msg.content).replace(/\\n/g, "\n")
                      : msg.content;

                    const isMe = msg.fromUid === user.uid;
                    const kind = senderKindFor(msg);
                    const avatarSrc = avatarForMsg(msg);

                    const nameForBubble = (() => {
                      if (msg.isSystem) return "";
                      if (isMe) return "Ty";
                      if (kind === "account") return accountName || "Użytkownik";
                      const meta = profileMetaMap[msg.fromUid];
                      if (!meta) return "";
                      return meta?.name || accountName || "Użytkownik";
                    })();

                    return (
                      <div
                        key={i}
                        className={`${styles.messageRow} ${isMe ? styles.me : styles.other} ${
                          msg.isSystem ? styles.systemRow : ""
                        }`}
                      >
                        {!msg.isSystem && (
                          <div className={styles.msgAvatarWrap}>
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt=""
                                className={styles.msgAvatar}
                                referrerPolicy="no-referrer"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_AVATAR;
                                }}
                              />
                            ) : (
                              <div
                                className={`${styles.msgAvatar} ${styles.avatarSkeleton} ${styles.shimmer}`}
                              />
                            )}
                          </div>
                        )}

                        <div
                          className={`${styles.message} ${isMe ? styles.own : styles.their} ${
                            msg.isSystem ? styles.system : ""
                          }`}
                        >
                          {!msg.isSystem && (
                            <p className={styles.author}>
                              {nameForBubble ? (
                                nameForBubble
                              ) : (
                                <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
                              )}

                              <span className={styles.senderTag}>
                                {kind === "profile" ? "PROFIL" : "KONTO"}
                              </span>
                            </p>
                          )}

                          <p
                            className={`${styles.content} ${
                              msg.isSystem ? styles.systemContent : ""
                            }`}
                          >
                            {displayContent}
                            {msg.pending && <em className={styles.pending}> (wysyłanie…)</em>}
                          </p>

                          <p className={styles.time}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ===== STOPKA panel (info/form) ===== */}
                <div className={styles.replyArea}>
                  {(() => {
                    const last = messages[messages.length - 1];
                    if (!last) return null;

                    if (last.isSystem || receiverId === "SYSTEM") {
                      return (
                        <div className={styles.infoBox}>
                          <span className={styles.icon}>🔒</span>
                          <p>Nie możesz odpowiadać na wiadomości systemowe.</p>
                        </div>
                      );
                    }

                    if (last.fromUid === user.uid) {
                      return (
                        <div className={styles.infoBox}>
                          <span className={styles.icon}>⏳</span>
                          <p>Wysłałeś/aś wiadomość. Czekasz teraz na odpowiedź drugiej osoby.</p>
                        </div>
                      );
                    }

                    if (canReply) {
                      return (
                        <form onSubmit={handleReply} className={styles.form}>
                          <div className={styles.senderHint}>{mySenderLabel}</div>

                          <textarea
                            className={styles.textarea}
                            placeholder="Napisz odpowiedź..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            required
                          />

                          <button className={styles.primaryBtn} type="submit">
                            Wyślij wiadomość
                          </button>
                        </form>
                      );
                    }

                    return (
                      <div className={styles.infoBox}>
                        <span className={styles.icon}>🚫</span>
                        <p>Nie możesz odpowiedzieć na tę wiadomość.</p>
                      </div>
                    );
                  })()}

                  {errorMsg && <p className={styles.error}>{errorMsg}</p>}
                </div>
              </>
            )}
          </div>

          {/* ===== FAQ ===== */}
          {!loading && showFaq && (
            <div className={styles.faqBoxWrapper}>
              <div className={styles.faqBox}>
                <div className={styles.quickAnswers}>
                  <h3>
                    Najczęstsze pytania i odpowiedzi&nbsp;
                    <span className={styles.faqReceiverName}>{receiverName || ""}</span>
                  </h3>

                  {profileStatus === "loading" && (
                    <p className={styles.noFaq}>Ładowanie profilu…</p>
                  )}
                  {profileStatus === "missing" && (
                    <p className={styles.noFaq}>Użytkownik nie posiada jeszcze profilu.</p>
                  )}
                  {profileStatus === "expired" && (
                    <p className={styles.noFaq}>Profil użytkownika jest nieważny (wygasł).</p>
                  )}
                  {profileStatus === "error" && (
                    <p className={styles.noFaq}>Nie udało się pobrać informacji o profilu.</p>
                  )}

                  {profileStatus === "exists" && (
                    <>
                      {receiverProfile?.quickAnswers?.length > 0 &&
                      receiverProfile.quickAnswers.some(
                        (qa) => (qa.title || "").trim() || (qa.answer || "").trim()
                      ) ? (
                        <ul>
                          {receiverProfile.quickAnswers
                            .filter(
                              (qa) => (qa.title || "").trim() || (qa.answer || "").trim()
                            )
                            .map((qa, i) => (
                              <li key={i}>
                                <strong>{qa.title}</strong> {qa.answer}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className={styles.noFaq}>
                          Użytkownik nie dodał jeszcze żadnych pytań i odpowiedzi.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreadView;
