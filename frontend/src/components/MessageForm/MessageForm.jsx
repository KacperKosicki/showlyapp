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

  const renderMessageLayout = ({ isLoading = false }) => (
    <div id="messageFormContainer" className={styles.section}>
      <div className={styles.inner}>
        {alert && !isLoading && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className={styles.backRow}>
          {isLoading ? (
            <div className={`${styles.backButton} ${styles.disabled}`}>
              <FaArrowLeft />
              Wróć
            </div>
          ) : (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
              Wróć
            </button>
          )}
        </div>

        <div className={styles.layout}>
          <aside className={styles.side}>

            <h1 className={styles.heading}>
              {isLoading ? (
                <>Przygotowuję <span>rozmowę.</span></>
              ) : (
                <>Napisz do <span>{renderNameNode(receiverName)}</span></>
              )}
            </h1>

            <p className={styles.description}>
              {isLoading
                ? "Sprawdzam, czy istnieje już wątek oraz pobieram dane odbiorcy."
                : "Wyślij pierwszą wiadomość. Po wysłaniu automatycznie przejdziesz do utworzonej konwersacji."}
            </p>

            <div className={styles.receiverCard}>
              <div className={styles.avatarWrap}>
                {!isLoading && !metaPending && receiverAvatar ? (
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
                  <div
                    className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`}
                  >
                    <FaUserCircle />
                  </div>
                )}
              </div>

              <div className={styles.receiverDetails}>
                <span>Odbiorca</span>
                <strong>
                  {isLoading ? (
                    <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
                  ) : (
                    renderNameNode(receiverName)
                  )}
                </strong>
                <p>Właściciel wizytówki Showly</p>
              </div>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>1</strong>
                <span>wiadomość tworzy nowy wątek</span>
              </div>

              <div className={styles.metaCard}>
                <strong>800</strong>
                <span>maksymalna liczba znaków</span>
              </div>

              <div className={styles.metaCard}>
                <strong>konto</strong>
                <span>nadawca wiadomości</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>
                <FaShieldAlt />
                Bezpieczny wątek
              </span>

              <p>
                Jeśli rozmowa już istnieje, zostaniesz automatycznie
                przekierowany do aktualnej konwersacji.
              </p>
            </div>
          </aside>

          <main className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>
                  {isLoading ? "Ładowanie formularza" : "Nowa wiadomość"}
                </span>

                <h2>
                  {isLoading
                    ? "Przygotowuję formularz wiadomości."
                    : "Napisz pierwszą wiadomość do profilu."}
                </h2>
              </div>

              <span className={styles.chapterNumber}>01</span>
            </div>

            <section className={styles.messagePanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelBadge}>
                  <FaRegCommentDots />
                  Konto ➜ Wizytówka
                </span>

                <span className={styles.panelBadgeSoft}>
                  <FaBolt />
                  Nowa rozmowa
                </span>
              </div>

              {isLoading ? (
                <div className={styles.form}>
                  <div className={`${styles.senderHint} ${styles.shimmer}`}>
                    <span className={styles.nameSkeleton} />
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
                </div>
              ) : (
                <>
                  <form onSubmit={handleSend} className={styles.form}>
                    <div className={styles.formHeader}>
                      <div>
                        <span className={styles.sectionKicker}>
                          <FaPaperPlane />
                          Wiadomość
                        </span>

                        <h3 className={styles.formTitle}>Napisz wiadomość</h3>

                        <p className={styles.formSub}>
                          Krótko opisz, o co chcesz zapytać. Odbiorca zobaczy
                          wiadomość w swoim panelu.
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
                      <span>
                        Wiadomość trafi bezpośrednio do właściciela wizytówki.
                      </span>
                      <strong>
                        {message.length} / {maxChars}
                      </strong>
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

                  <div className={styles.bottomInfo}>
                    <span className={styles.infoIcon}>
                      <FaInfoCircle />
                    </span>

                    <p>
                      Pierwsza wiadomość utworzy nowy wątek. Jeśli rozmowa już
                      istnieje, nastąpi automatyczne przekierowanie.
                    </p>
                  </div>
                </>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderMessageLayout({ isLoading: true });
  }

  return renderMessageLayout({ isLoading: false });
};

export default MessageForm;
