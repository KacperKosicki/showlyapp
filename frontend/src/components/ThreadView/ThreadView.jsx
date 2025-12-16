import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import styles from './ThreadView.module.scss';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AlertBox from '../AlertBox/AlertBox';

const ThreadView = ({ user, setUnreadCount }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [receiverId, setReceiverId] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);

  // nazwy konta/profilu odbiorcy (kontrolowane + skeleton)
  const [accountName, setAccountName] = useState('');
  const [profileName, setProfileName] = useState('');

  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // status profilu odbiorcy (dla FAQ)
  const [profileStatus, setProfileStatus] = useState('loading');

  // moja nazwa profilu (dla labela "wyślesz jako...")
  const [myProfileName, setMyProfileName] = useState('');

  const [channel, setChannel] = useState(null);
  const [firstFromUid, setFirstFromUid] = useState(null);

  // SKELETON / pending: mapka rozstrzygnięć nazw profili (jak w Notifications)
  // value: undefined (pending), null (brak profilu), string (nazwa profilu)
  const [profileNameMap, setProfileNameMap] = useState({});

  // FLASH (alert przenoszony między ekranami)
  const [flash, setFlash] = useState(null);

  // FULL PAGE LOADING (jak w Notifications)
  const [loading, setLoading] = useState(true);

  // ----------------------------
  // Helpers skeleton
  // ----------------------------
  const isResolved = (uid) =>
    Object.prototype.hasOwnProperty.call(profileNameMap, uid) && profileNameMap[uid] !== undefined;

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
      console.error('❌ Błąd pobierania nazwy profilu:', err);
      return null;
    }
  }, []);

  // moja nazwa profilu (do senderHint)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.uid) return;
      const name = await fetchProfileName(user.uid);
      if (mounted) setMyProfileName(name || '');
    })();
    return () => (mounted = false);
  }, [user?.uid, fetchProfileName]);

  // Odczyt FLASH z location.state lub z sessionStorage (backup)
  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
      const clean = { ...(location.state || {}) };
      delete clean.flash;
      window.history.replaceState({ ...window.history.state, usr: clean }, '');
    } else {
      const raw = sessionStorage.getItem('flash');
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

  // Auto-zamknięcie FLASH po TTL
  useEffect(() => {
    if (!flash) return;
    const ttl = Number(flash.ttl || 4000);
    const id = setTimeout(() => {
      setFlash(null);
      sessionStorage.removeItem('flash');
    }, ttl);
    return () => clearTimeout(id);
  }, [flash]);

  const closeFlash = () => {
    setFlash(null);
    sessionStorage.removeItem('flash');
  };

  // Dorysowanie optimisticMessage + wklejenie draft (z state albo sessionStorage)
  useEffect(() => {
    const rawOpt = location.state?.optimisticMessage || sessionStorage.getItem('optimisticMessage');
    if (rawOpt) {
      try {
        const optimistic = typeof rawOpt === 'string' ? JSON.parse(rawOpt) : rawOpt;
        if (optimistic && optimistic.content) {
          setMessages((prev) => [...prev, optimistic]);
        }
      } catch {
        /* ignore */
      }
    }

    const rawDraft = location.state?.draft || sessionStorage.getItem('draft');
    if (rawDraft) {
      try {
        const draft = typeof rawDraft === 'string' ? rawDraft : String(rawDraft);
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

      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/${threadId}`, {
        headers: { uid: user.uid }
      });

      const { messages: msgs, participants, channel: ch, firstFromUid: ff } = res.data;

      // scal z ewentualnymi pending (optimistic)
      setMessages((prev) => {
        const withoutPending = prev.filter((m) => !m?.pending);
        return msgs && msgs.length ? msgs : withoutPending;
      });

      setChannel(ch);
      setFirstFromUid(ff || (msgs?.[0]?.fromUid ?? null));

      const other = participants.find((p) => p.uid !== user.uid);
      if (other) {
        setReceiverId(other.uid);
        setAccountName(other.displayName || 'Użytkownik');
      }

      // BLOKADA ODPOWIEDZI: można odpowiedzieć tylko jeśli ostatnia wiadomość jest od drugiej strony
      const last = (msgs && msgs.length ? msgs : []).slice(-1)[0];
      setCanReply(!!last && !last.isSystem && last.fromUid !== user.uid);

      // mark read + update counter
      const unreadInThread = (msgs || []).filter((m) => !m.read && m.toUid === user.uid);
      if (unreadInThread.length > 0) {
        await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/conversations/${threadId}/read`,
          null,
          { headers: { uid: user.uid } }
        );
        if (setUnreadCount) setUnreadCount((prev) => Math.max(prev - unreadInThread.length, 0));
      }

      sessionStorage.removeItem('optimisticMessage');
      sessionStorage.removeItem('draft');
    } catch (err) {
      console.error('❌ Błąd pobierania konwersacji:', err);
      if ([401, 403].includes(err.response?.status)) navigate('/');
    } finally {
      setLoading(false);
    }
  }, [threadId, user.uid, navigate, setUnreadCount]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // ----------------------------
  // SKELETON: rozstrzyganie profilu drugiej strony (tylko kiedy znamy receiverId)
  // ----------------------------
  useEffect(() => {
    const uid = receiverId;
    if (!uid || uid === 'SYSTEM') return;

    // oznacz pending jeśli nie było
    setProfileNameMap((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, uid)) return prev;
      return { ...prev, [uid]: undefined };
    });

    (async () => {
      const name = await fetchProfileName(uid);
      setProfileNameMap((prev) => ({ ...prev, [uid]: name })); // string | null
      if (typeof name === 'string' && name.trim()) setProfileName(name.trim());
    })();
  }, [receiverId, fetchProfileName]);

  // ----------------------------
  // RECEIVER PROFILE (FAQ)
  // ----------------------------
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
  }, [receiverId, channel, firstFromUid]);

  // ----------------------------
  // Kto jest po której stronie?
  // ----------------------------
  const amProfileSide = useMemo(() => {
    if (!channel || !firstFromUid || !user?.uid) return false;
    if (channel === 'account_to_profile') return user.uid !== firstFromUid;
    if (channel === 'profile_to_account') return user.uid === firstFromUid;
    return false;
  }, [channel, firstFromUid, user?.uid]);

  // label nad textarea
  const mySenderLabel = useMemo(() => {
    return amProfileSide
      ? (myProfileName ? `Wyślesz wiadomość jako: ${myProfileName}` : 'Wyślesz wiadomość jako: Twoja wizytówka')
      : 'Wyślesz wiadomość jako: Twoje konto';
  }, [amProfileSide, myProfileName]);

  // ✅ FAQ tylko klient
  const showFaq =
    receiverId !== 'SYSTEM' &&
    channel === 'account_to_profile' &&
    !amProfileSide;

  // ----------------------------
  // Nazwa odbiorcy z “utajnieniem”
  // - prefer="profile" => dopóki pending, NIE pokazuj konta (skeleton)
  // - prefer="account" => konto może się pokazać od razu
  // ----------------------------
  const receiverName = useMemo(() => {
    if (receiverId === 'SYSTEM' || channel === 'system') return 'Showly.app';

    const profResolved = receiverId ? isResolved(receiverId) : false;
    const prof = receiverId ? profileNameMap[receiverId] : undefined; // undefined pending | null | string

    if (channel === 'account_to_profile') {
      if (firstFromUid === user.uid) {
        // Twoje konto -> ich profil: NAJPIERW profil, a dopóki pending: skeleton
        if (!profResolved) return ''; // pending -> skeleton
        if (typeof prof === 'string' && prof.trim()) return prof.trim();
        return accountName || 'Użytkownik';
      }

      // oni -> Twój profil: pokazuj konto (może być od razu)
      return accountName || (typeof prof === 'string' ? prof : '') || 'Użytkownik';
    }

    if (channel === 'profile_to_account') {
      // tu preferuj profil
      if (!profResolved) return ''; // pending
      if (typeof prof === 'string' && prof.trim()) return prof.trim();
      return accountName || 'Użytkownik';
    }

    return accountName || (typeof prof === 'string' ? prof : '') || 'Użytkownik';
  }, [receiverId, channel, firstFromUid, user.uid, accountName, profileNameMap]);

  // ----------------------------
  // FULL PAGE SKELETON (jak w Notifications)
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
      setErrorMsg('Nie można odpowiadać na wiadomości systemowe.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim(),
        channel,
        conversationId: threadId
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
      {flash && <AlertBox type={flash.type} message={flash.message} onClose={closeFlash} />}

      {/* ✅ centrowanie gdy FAQ nie ma */}
      <div className={`${styles.mainArea} ${!showFaq ? styles.centered : ''}`}>
        <div className={styles.threadWrapper}>
          <button
            onClick={() => navigate('/powiadomienia', { state: { scrollToId: 'scrollToId' } })}
            className={styles.backButton}
          >
            ← Wróć do powiadomień
          </button>

          <h2 className={styles.title}>
            Rozmowa z&nbsp;{renderNameNode(receiverName)}
          </h2>

          {/* ✅ FULL SKELETON zamiast samego “pola” */}
          {loading ? (
            <ThreadSkeleton />
          ) : (
            <>
              <div className={styles.thread}>
                {messages.map((msg, i) => {
                  const displayContent = msg.isSystem
                    ? String(msg.content).replace(/\\n/g, '\n')
                    : msg.content;

                  const isMe = msg.fromUid === user.uid;

                  return (
                    <div
                      key={i}
                      className={`${styles.message} ${isMe ? styles.own : styles.their} ${
                        msg.isSystem ? styles.system : ''
                      }`}
                    >
                      {!msg.isSystem && (
                        <p className={styles.author}>
                          {isMe ? 'Ty' : (receiverName ? receiverName : '')}
                          {!isMe && !receiverName && (
                            <span className={`${styles.nameSkeleton} ${styles.shimmer}`} />
                          )}
                        </p>
                      )}

                      <p className={`${styles.content} ${msg.isSystem ? styles.systemContent : ''}`}>
                        {displayContent}
                        {msg.pending && <em className={styles.pending}> (wysyłanie…)</em>}
                      </p>

                      <p className={styles.time}>{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>

              {/* ✅ BLOKADA / INFOboxy (dopiero po załadowaniu) */}
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

                // jeśli ostatnia jest od Ciebie → blokada i brak formy
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
            </>
          )}
        </div>

        {/* ✅ FAQ tylko klient */}
        {!loading && showFaq && (
          <div className={styles.faqBoxWrapper}>
            <div className={styles.faqBox}>
              <div className={styles.quickAnswers}>
                <h3>
                  Najczęstsze pytania i odpowiedzi&nbsp;
                  <span className={styles.receiverName}>{receiverName || ''}</span>
                </h3>

                {profileStatus === 'loading' && <p className={styles.noFaq}>Ładowanie profilu…</p>}
                {profileStatus === 'missing' && <p className={styles.noFaq}>Użytkownik nie posiada jeszcze profilu.</p>}
                {profileStatus === 'expired' && <p className={styles.noFaq}>Profil użytkownika jest nieważny (wygasł).</p>}
                {profileStatus === 'error' && <p className={styles.noFaq}>Nie udało się pobrać informacji o profilu.</p>}

                {profileStatus === 'exists' && (
                  <>
                    {receiverProfile?.quickAnswers?.length > 0 &&
                    receiverProfile.quickAnswers.some(
                      (qa) => (qa.title || '').trim() || (qa.answer || '').trim()
                    ) ? (
                      <ul>
                        {receiverProfile.quickAnswers
                          .filter((qa) => (qa.title || '').trim() || (qa.answer || '').trim())
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
