import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import styles from './ThreadView.module.scss';
import { useParams, useNavigate } from 'react-router-dom';

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

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(`/api/conversations/${threadId}`, {
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
      setCanReply(last?.fromUid !== user.uid);

      const unreadInThread = msgs.filter(m => !m.read && m.toUid === user.uid);
      if (unreadInThread.length > 0) {
        await axios.patch(`/api/conversations/${threadId}/read`, null, {
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
        if (!receiverId) return;
        const res = await axios.get(`/api/profiles/by-user/${receiverId}`);
        setReceiverProfile(res.data);
      } catch (err) {
        console.error('❌ Błąd pobierania profilu odbiorcy:', err);
      }
    };

    fetchReceiverProfile();
  }, [receiverId]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!canReply) {
      setErrorMsg('Nie możesz wysłać wiadomości przed odpowiedzią drugiej osoby.');
      return;
    }

    try {
      await axios.post('/api/conversations/send', {
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
    <div className={styles.pageLayout}>
      <div className={`${styles.mainArea} ${!receiverProfile ? styles.centered : ''}`}>

        {/* LEWA kolumna: wiadomości */}
        <div className={styles.threadWrapper}>
          <button onClick={() => navigate('/powiadomienia')} className={styles.backButton}>
            ← Wróć do powiadomień
          </button>

          <h2 className={styles.title}>Rozmowa z: {receiverName}</h2>

          <div className={styles.thread}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${msg.fromUid === user.uid ? styles.own : styles.their}`}
              >
                <p className={styles.author}>
                  {msg.fromUid === user.uid ? user.name || 'Ty' : receiverName}
                </p>
                <p className={styles.content}>{msg.content}</p>
                <p className={styles.time}>{new Date(msg.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {canReply ? (
            <form onSubmit={handleReply} className={styles.form}>
              <textarea
                placeholder="Napisz odpowiedź..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
              />
              <button type="submit">Wyślij</button>
            </form>
          ) : (
            <div className={styles.infoBox}>
              <span className={styles.icon}>⏳</span>
              <p>
                Wysłałeś wiadomość. Czekasz teraz na odpowiedź drugiej osoby, zanim napiszesz kolejną.
              </p>
            </div>
          )}

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
        </div>

        {/* PRAWA kolumna: FAQ */}
        {receiverProfile && (
          <div className={styles.faqBox}>
            <div className={styles.quickAnswers}>
              <h3>Najczęstsze pytania i odpowiedzi:</h3>
              {receiverProfile.quickAnswers?.length > 0 &&
                receiverProfile.quickAnswers.some(qa => qa.title.trim() || qa.answer.trim()) ? (
                <ul>
                  {receiverProfile.quickAnswers
                    .filter(qa => qa.title.trim() || qa.answer.trim())
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadView;
