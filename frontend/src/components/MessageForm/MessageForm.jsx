// MessageForm.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./MessageForm.module.scss";
import axios from "axios";
import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

import {
  FaArrowLeft,
  FaRegCommentDots,
  FaUserCircle,
  FaShieldAlt,
  FaInfoCircle,
  FaPaperPlane,
  FaComments,
  FaBolt,
} from "react-icons/fa";

import { auth } from "../../firebase";

const CHANNEL = "account_to_profile";
const API = process.env.REACT_APP_API_URL;
const DEFAULT_AVATAR = "/images/other/no-image.png";

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
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [receiverMeta, setReceiverMeta] = useState({ name: "", avatar: "" });
  const [metaPending, setMetaPending] = useState(true);

  const maxChars = 800;

  const authHeaders = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || user?.uid || "";

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

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    let attempts = 0;

    const scrollWithOffset = () => {
      const el = document.getElementById(scrollTo);

      if (!el && attempts < 30) {
        attempts++;
        requestAnimationFrame(scrollWithOffset);
        return;
      }

      if (!el) return;

      const offset = 90;

      window.scrollTo({
        top: el.offsetTop - offset,
        behavior: "smooth",
      });

      window.history.replaceState({}, document.title, location.pathname);
    };

    setTimeout(scrollWithOffset, 120);
  }, [location.state, location.pathname, loading]);

  const fetchReceiverMeta = useCallback(
    async (uid) => {
      setMetaPending(true);

      const headers = await authHeaders();

      try {
        const res = await axios.get(`${API}/api/profiles/by-user/${uid}`, {
          headers,
        });

        const prof = res.data;

        const name = String(prof?.name || "").trim();
        const avatar = normalizeAvatar(prof?.avatar) || "";

        if (name) {
          setReceiverMeta({ name, avatar });
          setMetaPending(false);
          return;
        }
      } catch {
        // fallback below
      }

      try {
        const res = await axios.get(`${API}/api/users/by-uid/${uid}`, {
          headers,
        });

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

  const checkConversation = useCallback(async () => {
    const myUid = auth.currentUser?.uid || user?.uid;

    if (!myUid || !recipientId) return;
    if (!auth.currentUser) return;

    try {
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
      fetchReceiverMeta(recipientId);
    } finally {
      setLoading(false);
    }
  }, [recipientId, navigate, fetchReceiverMeta, authHeaders, user?.uid]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();

    const myUid = auth.currentUser?.uid || user?.uid;
    const cleanMessage = message.trim();

    if (!cleanMessage) return;
    if (isSending) return;

    if (!myUid) {
      setAlert({
        type: "error",
        message: "Musisz być zalogowany, aby wysłać wiadomość.",
      });
      return;
    }

    if (!auth.currentUser) {
      setAlert({
        type: "error",
        message: "Sesja jeszcze się ładuje. Odśwież stronę lub zaloguj się ponownie.",
      });
      return;
    }

    if (cleanMessage.length > maxChars) {
      setAlert({
        type: "warning",
        message: `Wiadomość może mieć maksymalnie ${maxChars} znaków.`,
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
          from: myUid,
          to: recipientId,
          content: cleanMessage,
          channel: CHANNEL,
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
        setAlert({
          type: "error",
          message: "Błąd podczas wysyłania wiadomości.",
        });
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
        <div className={styles.noiseLayer} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.wrapper}>
            <div className={styles.backRow}>
              <div className={`${styles.backButton} ${styles.disabled}`}>
                <FaArrowLeft />
                Wróć
              </div>
            </div>

            <header className={styles.hero}>
              <div className={styles.heroDecor} aria-hidden="true">
                <span className={styles.heroGlowA} />
                <span className={styles.heroGlowB} />
                <span className={styles.heroGrid} />
              </div>

              <div className={styles.heroTopBar}>
                <div className={styles.heroBadge}>
                  <FaRegCommentDots />
                  <span>Konto ➜ Wizytówka</span>
                </div>
              </div>

              <div className={styles.heroInner}>
                <div className={styles.heroLeft}>
                  <span className={styles.kicker}>
                    <FaBolt />
                    Nowa wiadomość
                  </span>

                  <h2 className={styles.heroTitle}>Przygotowuję rozmowę…</h2>

                  <p className={styles.heroText}>
                    Sprawdzam, czy istnieje już wątek oraz pobieram dane odbiorcy.
                  </p>
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
            </header>

            <section className={styles.formCard}>
              <div className={styles.senderHint}>
                <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
              </div>

              <div className={`${styles.textarea} ${styles.shimmer}`} />

              <LoadingButton
                type="button"
                isLoading={true}
                disabled={true}
                className={styles.primaryBtn}
              >
                Ładowanie
              </LoadingButton>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="messageFormContainer" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className={styles.noiseLayer} aria-hidden="true" />

      <div className={styles.shell}>
        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className={styles.wrapper}>
          <div className={styles.backRow}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
              Wróć
            </button>
          </div>

          <header className={styles.hero}>
            <div className={styles.heroDecor} aria-hidden="true">
              <span className={styles.heroGlowA} />
              <span className={styles.heroGlowB} />
              <span className={styles.heroGrid} />
            </div>

            <div className={styles.heroTopBar}>
              <div className={styles.heroBadge} title="Kanał wiadomości">
                <FaRegCommentDots />
                <span>Konto ➜ Wizytówka</span>
              </div>

              <div className={styles.heroBadgeSoft}>
                <FaShieldAlt />
                <span>Bezpieczny wątek</span>
              </div>
            </div>

            <div className={styles.heroInner}>
              <div className={styles.heroLeft}>
                <span className={styles.kicker}>
                  <FaComments />
                  Nowa rozmowa
                </span>

                <h2 className={styles.heroTitle}>
                  Napisz do {renderNameNode(receiverName)}
                </h2>

                <p className={styles.heroText}>
                  Wyślij pierwszą wiadomość — po wysłaniu automatycznie przejdziesz
                  do konwersacji.
                </p>

                <div className={styles.metaRow}>
                  <span>Pierwsza wiadomość tworzy wątek</span>
                  <span className={styles.dot} />
                  <span>Konto ➜ właściciel wizytówki</span>
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
          </header>

          <section className={styles.formCard}>
            <form onSubmit={handleSend} className={styles.form}>
              <div className={styles.formHeader}>
                <div>
                  <span className={styles.sectionKicker}>
                    <FaPaperPlane />
                    Wiadomość
                  </span>

                  <h3 className={styles.formTitle}>Napisz wiadomość</h3>

                  <p className={styles.formSub}>
                    Krótko opisz, o co chcesz zapytać. Odbiorca zobaczy wiadomość w
                    swoim panelu.
                  </p>
                </div>
              </div>

              <div className={styles.senderHint}>
                Wyślesz wiadomość jako: <strong>Twoje konto</strong>
              </div>

              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => {
                  const text = e.target.value;
                  if (text.length <= maxChars) setMessage(text);
                }}
                placeholder="Np. Cześć, chciałbym zapytać o dostępny termin, cenę lub szczegóły usługi..."
                required
                disabled={isSending}
              />

              <div className={styles.textareaMeta}>
                <span>Wiadomość trafi bezpośrednio do właściciela wizytówki.</span>
                <strong>{message.length} / {maxChars}</strong>
              </div>

              <LoadingButton
                type="submit"
                isLoading={isSending}
                disabled={isSending || !message.trim()}
                className={styles.primaryBtn}
              >
                <FaPaperPlane />
                Wyślij wiadomość
              </LoadingButton>
            </form>

            <div className={styles.infoBox}>
              <span className={styles.infoIcon}>
                <FaInfoCircle />
              </span>

              <p>
                Jeśli wątek już istnieje, zostaniesz automatycznie przekierowany do
                aktualnej rozmowy.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MessageForm;