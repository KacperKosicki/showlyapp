import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import styles from './ThreadView.module.scss';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const ThreadView = ({ user, setUnreadCount }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [receiverId, setReceiverId] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);

  const [accountName, setAccountName] = useState('');
  const [profileName, setProfileName] = useState('');

  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileStatus, setProfileStatus] = useState('loading');

  const [myProfileName, setMyProfileName] = useState('');
  const [channel, setChannel] = useState(null);
  const [firstFromUid, setFirstFromUid] = useState(null);

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
        setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
  }, [location.state, messages, location.pathname]);

  const fetchProfileName = useCallback(async (uid) => {
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${uid}`);
      const name = r?.data?.name?.trim();
      return name || null;
    } catch (err) {
      if (err.response?.status === 404) {
        return null; // brak profilu to normalny przypadek
      }
      console.error("❌ Błąd pobierania nazwy profilu:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.uid) return;
      const name = await fetchProfileName(user.uid);
      if (mounted) setMyProfileName(name || '');
    })();
    return () => (mounted = false);
  }, [user?.uid, fetchProfileName]);

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/conversations/${threadId}`,
        { headers: { uid: user.uid } }
      );

      const { messages: msgs, participants, channel: ch, firstFromUid: ff } = res.data;
      setMessages(msgs);
      setChannel(ch);
      setFirstFromUid(ff || (msgs[0]?.fromUid ?? null));

      const other = participants.find(p => p.uid !== user.uid);
      if (other) {
        setReceiverId(other.uid);
        setAccountName(other.displayName || 'Użytkownik');
      }

      const last = msgs[msgs.length - 1];
      setCanReply(!!last && !last.isSystem && last.fromUid !== user.uid);

      const unreadInThread = msgs.filter(m => !m.read && m.toUid === user.uid);
      if (unreadInThread.length > 0) {
        await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/conversations/${threadId}/read`,
          null,
          { headers: { uid: user.uid } }
        );
        if (setUnreadCount) setUnreadCount(prev => Math.max(prev - unreadInThread.length, 0));
      }
    } catch (err) {
      console.error('❌ Błąd pobierania konwersacji:', err);
      if ([401, 403].includes(err.response?.status)) navigate('/');
    }
  }, [threadId, user.uid, navigate, setUnreadCount, fetchProfileName]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

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

        if (prof?.name?.trim()) {
          setProfileName(prof.name.trim());
        }

        let expired = false;
        if (prof?.visibleUntil) expired = new Date(prof.visibleUntil) < new Date();
        if (prof?.isActive === false) expired = true;
        setProfileStatus(expired ? 'expired' : 'exists');

      } catch (err) {
        if (err.response?.status === 404) {
          setProfileStatus('missing'); // 👈 poprawnie oznaczamy brak profilu
          setReceiverProfile(null);
        } else {
          console.error('❌ Błąd pobierania profilu odbiorcy:', err);
          setProfileStatus('error');
          setReceiverProfile(null);
        }
      }
    };
    fetchReceiverProfile();
  }, [receiverId, channel, firstFromUid]);

  const receiverName = useMemo(() => {
    if (receiverId === 'SYSTEM' || channel === 'system') {
      return 'Showly.app';
    }
    if (channel === 'account_to_profile') {
      // Jeśli Ty zacząłeś -> patrzysz na profil odbiorcy
      if (firstFromUid === user.uid) return profileName || accountName;
      // Jeśli ktoś pisał do Ciebie -> patrzysz na jego konto
      return accountName || profileName;
    }
    if (channel === 'profile_to_account') {
      // Możesz dopasować podobną logikę dla innych typów
      return profileName || accountName;
    }
    return accountName || profileName || 'Użytkownik';
  }, [channel, firstFromUid, user.uid, profileName, accountName]);


  const amProfileSide = useMemo(() => {
    if (!channel || !firstFromUid || !user?.uid) return false;
    if (channel === 'account_to_profile') return user.uid !== firstFromUid;
    if (channel === 'profile_to_account') return user.uid === firstFromUid;
    return false;
  }, [channel, firstFromUid, user?.uid]);

  const mySenderLabel = useMemo(() => {
    return amProfileSide
      ? (myProfileName ? `Wyślesz wiadomość jako: ${myProfileName}` : 'Wyślesz wiadomość jako: Twoja wizytówka')
      : 'Wyślesz wiadomość jako: Twoje konto';
  }, [amProfileSide, myProfileName]);

  const showFaq = receiverId !== 'SYSTEM'
    && channel === 'account_to_profile'
    && !amProfileSide;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const last = messages[messages.length - 1];
    if (!canReply || last?.isSystem) {
      setErrorMsg('Nie można odpowiadać na wiadomości systemowe.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim(),
        channel,                 // kanał wątku
        conversationId: threadId // 👈 KLUCZOWE: dopinamy do TEGO wątku
      });

      setNewMessage('');
      setErrorMsg('');
      fetchThread();
    } catch (err) {
      console.error('❌ Błąd wysyłania odpowiedzi:', err);
      if (err.response?.status === 403) {
        setErrorMsg(err.response.data?.message || 'Musisz poczekać na odpowiedź drugiej osoby.');
      } else if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Wystąpił błąd podczas wysyłania wiadomości.');
      }
    }
  };

  return (
    <div id="threadPageLayout" className={styles.pageLayout}>
      <div className={`${styles.mainArea} ${!showFaq ? styles.centered : ''}`}>
        <div className={styles.threadWrapper}>
          <button
            onClick={() => navigate('/powiadomienia', { state: { scrollToId: 'scrollToId' } })}
            className={styles.backButton}
          >
            ← Wróć do powiadomień
          </button>

          <h2 className={styles.title}>
            Rozmowa z&nbsp;<span className={styles.receiverName}>{receiverName}</span>
          </h2>

          <div className={styles.thread}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${msg.fromUid === user.uid ? styles.own : styles.their} ${msg.isSystem ? styles.system : ''}`}
              >
                {!msg.isSystem && (
                  <p className={styles.author}>
                    {msg.fromUid === user.uid ? 'Ty' : receiverName}
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
                  <p>Wysłałeś/aś wiadomość. Czekasz teraz na odpowiedź drugiej osoby.</p>
                </div>
              );
            }

            if (canReply) {
              return (
                <form onSubmit={handleReply} className={styles.form}>
                  <div className={styles.senderHint}>{mySenderLabel}</div>
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

            return (
              <div className={styles.infoBox}>
                <span className={styles.icon}>🚫</span>
                <p>Nie możesz odpowiedzieć na tę wiadomość.</p>
              </div>
            );
          })()}

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
        </div>

        {/* ✅ używamy showFaq */}
        {showFaq && (
          <div className={styles.faqBoxWrapper}>
            <div className={styles.faqBox}>
              <div className={styles.quickAnswers}>
                <h3>
                  Najczęstsze pytania i odpowiedzi&nbsp;
                  <span className={styles.receiverName}>{receiverName}</span>
                </h3>
                {profileStatus === 'loading' && <p className={styles.noFaq}>Ładowanie profilu…</p>}
                {profileStatus === 'missing' && <p className={styles.noFaq}>Użytkownik nie posiada jeszcze profilu.</p>}
                {profileStatus === 'expired' && <p className={styles.noFaq}>Profil użytkownika jest nieważny (wygasł).</p>}
                {profileStatus === 'error' && <p className={styles.noFaq}>Nie udało się pobrać informacji o profilu.</p>}
                {profileStatus === 'exists' && (
                  <>
                    {receiverProfile?.quickAnswers?.length > 0 &&
                      receiverProfile.quickAnswers.some(qa => (qa.title || '').trim() || (qa.answer || '').trim()) ? (
                      <ul>
                        {receiverProfile.quickAnswers
                          .filter(qa => (qa.title || '').trim() || (qa.answer || '').trim())
                          .map((qa, i) => (
                            <li key={i}>
                              <strong>{qa.title}</strong> {qa.answer}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className={styles.noFaq}>Użytkownik nie dodał jeszcze żadnych pytań i odpowiedzi.</p>
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
