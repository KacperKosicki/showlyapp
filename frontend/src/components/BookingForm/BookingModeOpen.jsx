// BookingModeOpen.jsx — czyste zapytanie bez kalendarza
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BookingModeOpen.module.scss";
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

  const handleServiceChange = (e) => {
    const svc = activeServices.find(
      (s) => String(s._id) === String(e.target.value)
    );

    setSelectedService(svc || null);

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

  const messagePreview = buildContent();

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.introBox}>
        <span className={styles.introNumber}>01</span>

        <div>
          <strong>Wyślij zapytanie bez wybierania terminu</strong>

          <p>
            Ten profil działa w trybie otwartym — opisz, czego potrzebujesz, a
            usługodawca odpowie Ci w konwersacji.
          </p>
        </div>
      </div>

      <div className={styles.topGrid}>
        <label className={styles.field}>
          <div className={styles.fieldHeader}>
            <div>
              <span className={styles.fieldEyebrow}>02 / Temat</span>
              <h3 className={styles.fieldTitle}>Temat wiadomości</h3>
            </div>

            <span className={styles.fieldHint}>opcjonalnie</span>
          </div>

          <input
            className={styles.input}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Np. Wycena strony internetowej"
            disabled={sending}
          />
        </label>

        <label className={styles.field}>
          <div className={styles.fieldHeader}>
            <div>
              <span className={styles.fieldEyebrow}>03 / Kontakt</span>
              <h3 className={styles.fieldTitle}>Telefon</h3>
            </div>

            <span className={styles.fieldHint}>opcjonalnie</span>
          </div>

          <input
            className={styles.input}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Np. 500 600 700"
            disabled={sending}
          />
        </label>

        {activeServices.length > 0 && (
          <label className={styles.field}>
            <div className={styles.fieldHeader}>
              <div>
                <span className={styles.fieldEyebrow}>04 / Usługa</span>
                <h3 className={styles.fieldTitle}>Wybierz usługę</h3>
              </div>

              <span className={styles.fieldHint}>opcjonalnie</span>
            </div>

            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={selectedService?._id || ""}
                onChange={handleServiceChange}
                disabled={sending}
              >
                <option value="">– bez wyboru –</option>

                {activeServices.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <span className={styles.selectChevron} aria-hidden="true">
                ▾
              </span>
            </div>
          </label>
        )}
      </div>

      <label className={`${styles.field} ${styles.messageField}`}>
        <div className={styles.fieldHeader}>
          <div>
            <span className={styles.fieldEyebrow}>05 / Treść</span>
            <h3 className={styles.fieldTitle}>Wiadomość</h3>
          </div>

          <span className={styles.fieldHint}>wymagane</span>
        </div>

        <textarea
          className={styles.textarea}
          rows="6"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Opisz krótko czego potrzebujesz, budżet, termin orientacyjny itp."
          disabled={sending}
        />
      </label>

      <div className={styles.previewBox}>
        <div className={styles.previewHead}>
          <div>
            <span className={styles.previewLabel}>Podgląd</span>
            <strong>Co zostanie wysłane?</strong>
          </div>

          <span className={styles.previewNumber}>06</span>
        </div>

        {messagePreview ? (
          <pre className={styles.previewContent}>{messagePreview}</pre>
        ) : (
          <p className={styles.previewEmpty}>
            Uzupełnij wiadomość, aby zobaczyć podgląd zapytania.
          </p>
        )}
      </div>

      <div className={styles.submitBar}>
        <LoadingButton
          type="submit"
          isLoading={sending}
          disabled={sending || !(message || "").trim()}
          className={styles.submit}
        >
          Wyślij zapytanie
        </LoadingButton>

        <div className={styles.submitHint}>
          Po wysłaniu zostaniesz przeniesiony do konwersacji z usługodawcą.
        </div>
      </div>
    </form>
  );
}