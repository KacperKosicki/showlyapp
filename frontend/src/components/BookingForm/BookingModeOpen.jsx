// BookingModeOpen.jsx — czyste zapytanie bez kalendarza
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BookingControls.module.scss";
import BookingServicePicker from "./BookingServicePicker";
import { FiSend } from "react-icons/fi";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import { api } from "../../api/api";

const CHANNEL = "account_to_profile";

export default function BookingModeOpen({
  user,
  provider,
  pushAlert,
  preselectedServiceId,
  preselectedServiceName,
}) {
  const [subject, setSubject] = useState("Zapytanie o usługę");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const navigate = useNavigate();

  const activeServices = useMemo(() => {
    return (provider?.services || []).filter((s) => s?.isActive !== false);
  }, [provider?.services]);

  useEffect(() => {
    if (!preselectedServiceId) return;
    if (!activeServices.length) return;
    if (selectedService?._id) return;

    const svc = activeServices.find(
      (s) => String(s._id) === String(preselectedServiceId)
    );

    if (svc) {
      setSelectedService(svc);
      setSubject(`Zapytanie o usługę: ${svc.name}`);
    } else if (preselectedServiceName) {
      setSubject(`Zapytanie o usługę: ${preselectedServiceName}`);
    }
  }, [
    preselectedServiceId,
    preselectedServiceName,
    activeServices,
    selectedService?._id,
  ]);

  const handleServiceChange = (svc) => {
    setSelectedService(svc);

    if (svc) {
      setSubject(`Zapytanie o usługę: ${svc.name}`);
    } else {
      setSubject("Zapytanie o usługę");
    }
  };

  const buildContent = () => {
    const body = (message || "").trim();

    return [
      subject?.trim() ? `Temat: ${subject.trim()}` : null,
      selectedService?.name ? `Usługa: ${selectedService.name}` : null,
      phone?.trim() ? `Telefon: ${phone.trim()}` : null,
      body ? `Wiadomość:\n${body}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (sending) return;

    setSending(true);

    try {
      if (!user?.uid) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Musisz być zalogowany.",
        });
        return;
      }

      if (!provider?.userId) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Brak danych usługodawcy.",
        });
        return;
      }

      const body = (message || "").trim();

      if (!body) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Napisz krótką wiadomość.",
        });
        return;
      }

      const content = buildContent();

      const { data } = await api.post("/api/conversations/send", {
        from: user.uid,
        to: provider.userId,
        channel: CHANNEL,
        content,
      });

      if (data?.id) {
        sessionStorage.setItem(
          "flash",
          JSON.stringify({
            type: "success",
            message: "Twoje zapytanie zostało wysłane.",
            ttl: 6000,
            ts: Date.now(),
          })
        );

        sessionStorage.setItem(
          "optimisticMessage",
          JSON.stringify({
            _id: `temp-${Date.now()}`,
            from: user.uid,
            to: provider.userId,
            channel: CHANNEL,
            content,
            createdAt: new Date().toISOString(),
            pending: true,
          })
        );

        navigate(`/konwersacja/${data.id}`, {
          state: { scrollToId: "threadPageLayout" },
        });

        return;
      }

      pushAlert?.({
        show: true,
        type: "success",
        message: "Zapytanie wysłane.",
      });

      setMessage("");
      setPhone("");
    } catch (err) {
      if (err?.response?.status === 403) {
        const existingId = err?.response?.data?.conversationId || null;
        const draftContent = buildContent();

        sessionStorage.setItem(
          "flash",
          JSON.stringify({
            type: "info",
            message:
              "Masz już otwartą rozmowę z tym użytkownikiem. Kontynuuj w istniejącym wątku.",
            ttl: 6000,
            ts: Date.now(),
          })
        );

        sessionStorage.setItem("draft", draftContent);

        navigate(
          existingId
            ? `/konwersacja/${existingId}`
            : `/wiadomosc/${provider.userId}`,
          {
            state: { scrollToId: "threadPageLayout" },
          }
        );

        return;
      }

      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401
          ? "Brak autoryzacji (401). Zaloguj się ponownie."
          : null) ||
        "Nie udało się wysłać zapytania.";

      pushAlert?.({
        show: true,
        type: "error",
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  return <form className={styles.form} onSubmit={handleSubmit}>
    {activeServices.length > 0 && <BookingServicePicker services={activeServices} value={selectedService} onChange={handleServiceChange} disabled={sending} optional />}
    <label className={styles.field}>Wiadomość<textarea rows="5" required value={message} onChange={event => setMessage(event.target.value)} placeholder="Czego potrzebujesz i jaki termin Ci odpowiada?" disabled={sending} /></label>
    <details className={styles.details}><summary>Dodatkowe dane (opcjonalnie)</summary>
      <div className={styles.topGrid}>
        <label className={styles.field}>Temat wiadomości<input type="text" value={subject} onChange={event => setSubject(event.target.value)} disabled={sending} /></label>
        <label className={styles.field}>Telefon<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="500 600 700" disabled={sending} /></label>
      </div>
    </details>
    <details className={styles.details}><summary>Co zostanie wysłane?</summary><pre className={styles.preview}>{buildContent()}</pre></details>
    <LoadingButton type="submit" isLoading={sending} disabled={sending || !message.trim()} className={styles.submit}><FiSend aria-hidden="true" />Wyślij zapytanie</LoadingButton>
    <p className={styles.hint}>Po wysłaniu przejdziesz do rozmowy z usługodawcą.</p>
  </form>;
}
