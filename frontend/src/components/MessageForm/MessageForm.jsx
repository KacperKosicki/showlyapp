// MessageForm.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./MessageForm.module.scss";
import axios from "axios";
import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

import { FaArrowLeft, FaRegCommentDots, FaUserCircle } from "react-icons/fa";
import { FaRegPaperPlane } from "react-icons/fa";

// ✅ Firebase auth (dopasuj ścieżkę)
import { auth } from "../../firebase";

const CHANNEL = "account_to_profile"; // zawsze KONTO ➜ WIZYTÓWKA
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

const MessageForm = ({ user }) => {
  const { recipientId } = useParams(); // firebaseUid właściciela profilu
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState(null);

  const [loading, setLoading] = useState(true); // ładowanie strony (checkConversation)
  const [isSending, setIsSending] = useState(false); // wysyłanie wiadomości

  // META odbiorcy (name + avatar) jak w ThreadView
  const [receiverMeta, setReceiverMeta] = useState({ name: "", avatar: "" }); // avatar: string
  const [metaPending, setMetaPending] = useState(true);

  // =========================================================
  // ✅ AUTH HEADERS (JWT + uid fallback) — token z auth.currentUser
  // =========================================================
  const authHeaders = useCallback(async () => {
    const firebaseUser = auth.currentUser;

    // uid bierzemy z firebase (pewne), a fallback z propsa
    const uid = firebaseUser?.uid || user?.uid || "";

    // jeśli firebase user jeszcze nie gotowy, zwróć chociaż uid
    if (!firebaseUser) return uid ? { uid } : {};

    let token = "";
    try {
      token = await firebaseUser.getIdToken();
    } catch {
      token = "";
    }

    return {
      ...(uid ? { uid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [user?.uid]);

  // =========================================================
  // Płynny scroll
  // =========================================================
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
  }, [location.state, location.pathname]);

  // =========================================================
  // Meta odbiorcy (profil -> konto fallback)
  // =========================================================
  const fetchReceiverMeta = useCallback(
    async (uid) => {
      setMetaPending(true);

      // jeśli endpointy są chronione — lecimy z headers
      const headers = await authHeaders();

      // 1) próbuj PROFIL
      try {
        const res = await axios.get(`${API}/api/profiles/by-user/${uid}`, { headers });
        const prof = res.data;

        const name = String(prof?.name || "").trim();
        const avatar = normalizeAvatar(prof?.avatar) || "";

        if (name) {
          setReceiverMeta({ name, avatar });
          setMetaPending(false);
          return;
        }
      } catch {
        // ignore
      }

      // 2) fallback na KONTO
      try {
        const res = await axios.get(`${API}/api/users/by-uid/${uid}`, { headers });
        const u = res.data;

        const name =
          String(u?.displayName || "").trim() ||
          String(u?.name || "").trim() ||
          String(u?.email || "").trim() ||
          "Użytkownik";

        const avatar =
          normalizeAvatar(u?.photoURL) ||
          normalizeAvatar(u?.avatar) ||
          normalizeAvatar(u?.photo) ||
          "";

        setReceiverMeta({ name, avatar });
      } catch {
        setReceiverMeta({ name: "Użytkownik", avatar: "" });
      } finally {
        setMetaPending(false);
      }
    },
    [authHeaders]
  );

  // =========================================================
  // Jeśli istnieje MÓJ wątek KONTO➜WIZYTÓWKA (starter = user.uid) → przekieruj
  // =========================================================
  const checkConversation = useCallback(async () => {
    const myUid = auth.currentUser?.uid || user?.uid;

    if (!myUid || !recipientId) return;

    // 🔥 ważne: jeśli firebase user jeszcze nie gotowy, nie rób checka (bo wpadnie 401)
    if (!auth.currentUser) return;

    try {
      // meta odbiorcy (odpal od razu)
      fetchReceiverMeta(recipientId);

      const headers = await authHeaders();

      const res = await axios.get(
        `${API}/api/conversations/check/${myUid}/${recipientId}?channel=${CHANNEL}&starter=${myUid}`,
        { headers }
      );

      if (res.data?.exists && res.data?.id) {
        navigate(`/konwersacja/${res.data.id}`, {
          state: { scrollToId: "threadPageLayout" },
        });
        return;
      }
    } catch {
      // nawet jak check padnie, meta próbujemy pobrać
      fetchReceiverMeta(recipientId);
    } finally {
      setLoading(false);
    }
  }, [recipientId, navigate, fetchReceiverMeta, authHeaders, user?.uid]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  // =========================================================
  // Send
  // =========================================================
  const handleSend = async (e) => {
    e.preventDefault();

    const myUid = auth.currentUser?.uid || user?.uid;

    if (!message.trim()) return;
    if (isSending) return;

    if (!myUid) {
      setAlert({ type: "error", message: "Musisz być zalogowany, aby wysłać wiadomość." });
      return;
    }

    // 🔥 token jeszcze nie gotowy
    if (!auth.currentUser) {
      setAlert({
        type: "error",
        message: "Sesja jeszcze się ładuje. Odśwież stronę lub zaloguj się ponownie.",
      });
      return;
    }

    setIsSending(true);
    setAlert(null);

    try {
      const headers = await authHeaders();

      const { data } = await axios.post(
        `${API}/api/conversations/send`,
        {
          from: myUid, // piszesz jako KONTO
          to: recipientId, // do WŁAŚCICIELA PROFILU
          content: message.trim(),
          channel: CHANNEL, // KONTO ➜ WIZYTÓWKA
        },
        { headers }
      );

      setMessage("");
      setAlert({ type: "success", message: "Wiadomość wysłana!" });

      if (data?.id) {
        setTimeout(() => {
          navigate(`/konwersacja/${data.id}`, {
            state: { scrollToId: "threadPageLayout" },
          });
        }, 600);
      } else {
        setTimeout(() => navigate("/powiadomienia"), 800);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setAlert({
          type: "error",
          message: "Brak autoryzacji (401). Token nie został zaakceptowany przez backend.",
        });
      } else if (err.response?.status === 403) {
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Brak dostępu (403).",
        });
      } else if (err.response?.data?.message) {
        setAlert({ type: "error", message: err.response.data.message });
      } else {
        setAlert({ type: "error", message: "Błąd podczas wysyłania wiadomości." });
      }
    } finally {
      setIsSending(false);
    }
  };

  const receiverName = useMemo(() => receiverMeta?.name || "", [receiverMeta]);
  const receiverAvatar = useMemo(() => receiverMeta?.avatar || "", [receiverMeta]);

  const renderNameNode = (raw) =>
    raw ? <span className={styles.receiverName}>{raw}</span> : <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />;

  // =========================================================
  // SKELETON PAGE (jak ThreadView vibe)
  // =========================================================
  if (loading) {
    return (
      <div id="messageFormContainer" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <div className={styles.wrapper}>
            <div className={styles.backRow}>
              <div className={`${styles.backButton} ${styles.disabled}`}>
                <FaArrowLeft />
                Wróć
              </div>
            </div>

            <header className={styles.hero}>
              <div className={styles.heroTopBar}>
                <div className={styles.heroBadge}>
                  <div className={styles.badgeItem}>
                    <FaRegCommentDots />
                    <span>KONTO ➜ WIZYTÓWKA</span>
                  </div>
                </div>
              </div>

              <div className={styles.heroInner}>
                <div className={styles.heroLeft}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.heroTitle}>Przygotowuję rozmowę…</h2>
                    <span className={styles.titlePill}>NOWA WIADOMOŚĆ</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.roleText}>Sprawdzam wątek i dane odbiorcy</span>
                  </div>
                </div>

                <div className={styles.heroRight}>
                  <div className={styles.avatarWrap}>
                    <div className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`}>
                      <FaUserCircle />
                    </div>
                    <div className={styles.avatarRing} aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className={styles.heroFade} aria-hidden="true" />
            </header>

            <div className={styles.body}>
              <div className={styles.senderHint}>
                <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
              </div>

              <div className={`${styles.textarea} ${styles.shimmer}`} style={{ minHeight: 120 }} />
              <LoadingButton type="button" isLoading={true} disabled={true} className={styles.primaryBtn}>
                Ładowanie
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================
  return (
    <div id="messageFormContainer" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell}>
        {alert && <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <div className={styles.wrapper}>
          {/* ✅ BACK NAD HERO (jak w ThreadView) */}
          <div className={styles.backRow}>
            <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
              <FaArrowLeft />
              Wróć
            </button>
          </div>

          {/* ✅ HERO */}
          <header className={styles.hero}>
            <div className={styles.heroTopBar}>
              <div className={styles.heroBadge} title="Kanał wiadomości">
                <div className={styles.badgeItem}>
                  <FaRegCommentDots />
                  <span>KONTO ➜ WIZYTÓWKA</span>
                </div>
              </div>
            </div>

            <div className={styles.heroInner}>
              <div className={styles.heroLeft}>
                <div className={styles.titleRow}>
                  <h2 className={styles.heroTitle}>Napisz do&nbsp;{renderNameNode(receiverName)}</h2>
                  <span className={styles.titlePill}>NOWA WIADOMOŚĆ</span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.roleText}>Pierwsza wiadomość tworzy wątek</span>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.metaHint}>Po wysłaniu przejdziesz do konwersacji</span>
                </div>
              </div>

              <div className={styles.heroRight}>
                <div className={styles.avatarWrap}>
                  {!metaPending && receiverAvatar ? (
                    <img
                      src={receiverAvatar}
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

          {/* BODY */}
          <div className={styles.body}>
            <form onSubmit={handleSend} className={styles.form}>
              <div className={styles.senderHint}>Wyślesz wiadomość jako: Twoje konto</div>

              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Wpisz swoją wiadomość..."
                required
                disabled={isSending}
              />

              <LoadingButton type="submit" isLoading={isSending} disabled={isSending} className={styles.primaryBtn}>
                <FaRegPaperPlane />
                Wyślij wiadomość
              </LoadingButton>
            </form>

            <div className={styles.infoBox}>
              <span className={styles.icon}>ℹ️</span>
              <p>Jeśli wątek już istnieje, zostaniesz automatycznie przekierowany do rozmowy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageForm;