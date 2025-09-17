import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import styles from './ThreadView.module.scss';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom'; // jeśli jeszcze nie ma

const ThreadView = ({ user, setUnreadCount }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileStatus, setProfileStatus] = useState('loading');

  const location = useLocation(); // umieść u góry komponentu

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    let attempts = 0;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el && el.offsetHeight > 0) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, document.title, location.pathname);
      } else if (attempts < 60) {
        attempts++;
        setTimeout(tryScroll, 50); // ⏱️ dodaj małe opóźnienie zamiast `requestAnimationFrame`
      }
    };

    tryScroll();
  }, [location.state, messages]);

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/${threadId}`, {
        headers: { uid: user.uid }
      });


      const { messages: msgs, participants } = res.data;
      setMessages(msgs);

      const other = participants.find(p => p.uid !== user.uid);
      if (other) {
        setReceiverId(other.uid);
        setReceiverName(other.name || 'Użytkownik');
      }

      const last = msgs[msgs.length - 1];
      const isSystem = last?.isSystem;
      setCanReply(!isSystem && last?.fromUid !== user.uid);


      const unreadInThread = msgs.filter(m => !m.read && m.toUid === user.uid);
      if (unreadInThread.length > 0) {
        await axios.patch(`${process.env.REACT_APP_API_URL}/api/conversations/${threadId}/read`, null, {
          headers: { uid: user.uid }
        });

        if (setUnreadCount) {
          setUnreadCount(prev => Math.max(prev - unreadInThread.length, 0));
        }
      }
    } catch (err) {
      console.error('❌ Błąd pobierania konwersacji:', err);
      if ([401, 403].includes(err.response?.status)) navigate('/');
    }
  }, [threadId, user.uid, navigate, setUnreadCount]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    const fetchReceiverProfile = async () => {
      try {
        if (!receiverId || receiverId === 'SYSTEM') {
          setProfileStatus('missing');
          setReceiverProfile(null);
          return;
        }

        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${receiverId}`);
        const prof = res.data;
        setReceiverProfile(prof);

        // 👇 Opcjonalnie: jeśli backend zwraca visibleUntil albo isActive
        let expired = false;
        if (prof?.visibleUntil) {
          expired = new Date(prof.visibleUntil) < new Date();
        }
        if (prof?.isActive === false) {
          expired = true;
        }

        setProfileStatus(expired ? 'expired' : 'exists');
      } catch (err) {
        // 404 = brak profilu
        if (err.response?.status === 404) {
          setProfileStatus('missing');
          setReceiverProfile(null);
        } else {
          console.error('❌ Błąd pobierania profilu odbiorcy:', err);
          setProfileStatus('error');
          setReceiverProfile(null);
        }
      }
    };

    fetchReceiverProfile();
  }, [receiverId]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const lastMsg = messages[messages.length - 1];
    if (!canReply || lastMsg?.isSystem) {
      setErrorMsg('Nie można odpowiadać na wiadomości systemowe.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim()
      });


      setNewMessage('');
      setErrorMsg('');
      fetchThread();
    } catch (err) {
      console.error('❌ Błąd wysyłania odpowiedzi:', err);
      if (err.response?.status === 403) {
        setErrorMsg('Musisz poczekać na odpowiedź drugiej osoby.');
      } else {
        setErrorMsg('Wystąpił błąd podczas wysyłania wiadomości.');
      }
    }
  };


  return (
    <div id="threadPageLayout" className={styles.pageLayout}>
      <div className={`${styles.mainArea} ${!receiverProfile ? styles.centered : ''}`}>

        {/* LEWA kolumna: wiadomości */}
        <div className={styles.threadWrapper}>
          <button
            onClick={() =>
              navigate('/powiadomienia', {
                state: { scrollToId: 'scrollToId' } // ⬅️ scrollujemy do id w Notifications
              })
            }
            className={styles.backButton}
          >
            ← Wróć do powiadomień
          </button>

          <h2 className={styles.title}>Rozmowa z: {receiverName}</h2>

          <div className={styles.thread}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} 
      ${msg.fromUid === user.uid ? styles.own : styles.their} 
      ${msg.isSystem ? styles.system : ''}`}
              >
                {!msg.isSystem && (
                  <p className={styles.author}>
                    {msg.fromUid === user.uid ? user.name || 'Ty' : receiverName}
                  </p>
                )}
                <p className={styles.content}>{msg.content}</p>
                <p className={styles.time}>{new Date(msg.createdAt).toLocaleString()}</p>
              </div>
            ))}

          </div>

          {(() => {
            const last = messages[messages.length - 1];
            if (!last) return null;

            if (last.isSystem || receiverId === 'SYSTEM') {
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
                  <p>
                    Wysłałeś/aś wiadomość. Czekasz teraz na odpowiedź drugiej osoby, zanim napiszesz kolejną.
                  </p>
                </div>
              );
            }

            // ✅ tylko jeśli dozwolone jest odpisywanie
            if (canReply) {
              return (
                <form onSubmit={handleReply} className={styles.form}>
                  <textarea
                    placeholder="Napisz odpowiedź..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                  />
                  <button type="submit">Wyślij wiadomość</button>
                </form>
              );
            }

            // fallback (teoretycznie niepotrzebny, ale na wszelki wypadek)
            return (
              <div className={styles.infoBox}>
                <span className={styles.icon}>🚫</span>
                <p>Nie możesz odpowiedzieć na tę wiadomość.</p>
              </div>
            );
          })()}

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
        </div>

        {/* PRAWA kolumna: FAQ / informacja o profilu */}
        {receiverId !== 'SYSTEM' && (
          <div className={styles.faqBoxWrapper}>
            <div className={styles.faqBox}>
              <div className={styles.quickAnswers}>
                <h3>Najczęstsze pytania i odpowiedzi:</h3>

                {profileStatus === 'loading' && (
                  <p className={styles.noFaq}>Ładowanie profilu…</p>
                )}

                {profileStatus === 'missing' && (
                  <p className={styles.noFaq}>
                    Użytkownik nie posiada jeszcze profilu.
                  </p>
                )}

                {profileStatus === 'expired' && (
                  <p className={styles.noFaq}>
                    Profil użytkownika jest nieważny (wygasł).
                  </p>
                )}

                {profileStatus === 'error' && (
                  <p className={styles.noFaq}>
                    Nie udało się pobrać informacji o profilu.
                  </p>
                )}

                {profileStatus === 'exists' && (
                  <>
                    {receiverProfile?.quickAnswers?.length > 0 &&
                      receiverProfile.quickAnswers.some(
                        qa => (qa.title || '').trim() || (qa.answer || '').trim()
                      ) ? (
                      <ul>
                        {receiverProfile.quickAnswers
                          .filter(qa => (qa.title || '').trim() || (qa.answer || '').trim())
                          .map((qa, i) => (
                            <li key={i}>
                              <strong>{qa.title}</strong>{qa.answer}
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
  );
};

export default ThreadView;
