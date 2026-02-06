import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./MessageForm.module.scss";
import axios from "axios";
import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

import { FaArrowLeft, FaRegCommentDots, FaUserCircle } from "react-icons/fa";
import { FaRegPaperPlane } from "react-icons/fa";

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

  // płynny scroll
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    const t = setTimeout(() => {
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
    }, 100);

    return () => clearTimeout(t);
  }, [location.state, location.pathname]);

  const fetchReceiverMeta = useCallback(async (uid) => {
    setMetaPending(true);

    // 1) próbuj PROFIL
    try {
      const res = await axios.get(`${API}/api/profiles/by-user/${uid}`);
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
      const res = await axios.get(`${API}/api/users/by-uid/${uid}`);
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
  }, []);

  // jeśli istnieje MÓJ wątek KONTO➜WIZYTÓWKA (starter = user.uid) → przekieruj
  const checkConversation = useCallback(async () => {
    if (!user?.uid || !recipientId) return;

    try {
      // meta odbiorcy (odpal od razu, niezależnie od istniejącego wątku)
      fetchReceiverMeta(recipientId);

      const res = await axios.get(
        `${API}/api/conversations/check/${user.uid}/${recipientId}?channel=${CHANNEL}&starter=${user.uid}`
      );

      if (res.data.exists && res.data.id) {
        navigate(`/konwersacja/${res.data.id}`, { state: { scrollToId: "threadPageLayout" } });
        return; // nie pokazuj formularza
      }
    } catch (_) {
      // brak wątku lub błąd – pokaż formularz (meta i tak dociągamy)
      fetchReceiverMeta(recipientId);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, recipientId, navigate, fetchReceiverMeta]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (isSending) return;

    setIsSending(true);
    setAlert(null);

    try {
      const { data } = await axios.post(`${API}/api/conversations/send`, {
        from: user.uid, // piszesz jako KONTO
        to: recipientId, // do WŁAŚCICIELA PROFILU
        content: message.trim(),
        channel: CHANNEL, // KONTO ➜ WIZYTÓWKA
      });

      setMessage("");
      setAlert({ type: "success", message: "Wiadomość wysłana!" });

      // po wysłaniu wejdź w świeży/odświeżony wątek
      if (data?.id) {
        setTimeout(() => {
          navigate(`/konwersacja/${data.id}`, { state: { scrollToId: "threadPageLayout" } });
        }, 600);
      } else {
        setTimeout(() => navigate("/powiadomienia"), 800);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAlert({ type: "error", message: "Musisz poczekać na odpowiedź w tym wątku." });
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
    raw ? (
      <span className={styles.receiverName}>{raw}</span>
    ) : (
      <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
    );

  if (loading) {
    return (
      <div id="messageFormContainer" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <div className={styles.wrapper}>
            <header className={styles.hero}>
              <div className={styles.heroInner}>
                <div className={styles.heroLeft}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.heroTitle}>Przygotowuję rozmowę…</h2>
                    <span className={styles.titlePill}>KONTO ➜ PROFIL</span>
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
              <LoadingButton type="button" isLoading={true} disabled={true} className={styles.primaryBtn}>
                Ładowanie
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="messageFormContainer" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell}>
        {alert && (
          <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        <div className={styles.wrapper}>
          {/* HERO jak ThreadView */}
          <header className={styles.hero}>
            <div className={styles.heroTopLeft}>
              <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
                <FaArrowLeft />
                Wróć
              </button>
            </div>

            <div className={styles.heroBadge} title="Kanał wiadomości">
              <div className={styles.badgeItem}>
                <FaRegCommentDots />
                <span>KONTO ➜ WIZYTÓWKA</span>
              </div>
            </div>

            <div className={styles.heroInner}>
              <div className={styles.heroLeft}>
                <div className={styles.titleRow}>
                  <h2 className={styles.heroTitle}>
                    Napisz do&nbsp;{renderNameNode(receiverName)}
                  </h2>
                  <span className={styles.titlePill}>NOWA WIADOMOŚĆ</span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.roleText}>Pierwsza wiadomość tworzy wątek</span>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.metaHint}>
                    Po wysłaniu przejdziesz do konwersacji
                  </span>
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

              <LoadingButton
                type="submit"
                isLoading={isSending}
                disabled={isSending}
                className={styles.primaryBtn}
              >
                <FaRegPaperPlane />
                Wyślij wiadomość
              </LoadingButton>
            </form>

            <div className={styles.infoBox}>
              <span className={styles.icon}>ℹ️</span>
              <p>
                Jeśli wątek już istnieje, zostaniesz automatycznie przekierowany do rozmowy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageForm;
