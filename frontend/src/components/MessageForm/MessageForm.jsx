import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';

const MessageForm = ({ user }) => {
    const { recipientId } = useParams();
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            await axios.post('/api/messages/send', {
                from: user.uid,
                to: recipientId,
                content: message.trim(),
            });
            alert('✅ Wiadomość wysłana!');
            navigate('/powiadomienia');
        } catch (err) {
            alert('❌ Błąd wysyłania wiadomości.');
        }
    };

    return (
        <div className={styles.wrapper}>
            <h2>Napisz wiadomość</h2>
            <form onSubmit={handleSend}>
                <textarea
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Wpisz swoją wiadomość..."
                    required
                />
                <button type="submit" className={styles.button}>
                    Wyślij
                </button>
            </form>
        </div>
    );
};

export default MessageForm;
