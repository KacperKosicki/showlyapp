import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  startOfDay,
  isBefore,
} from "date-fns";
import { pl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import styles from "./BookingModeDay.module.scss";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import { api } from "../../api/api";

const CHANNEL = "account_to_profile";

export default function BookingModeDay({
  user,
  provider,
  pushAlert,
  preselectedServiceId,
}) {
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [selectedService, setService] = useState(null);
  const [onlyInquiry, setOnlyInquiry] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setService(svc);
      setDate(null);
    }
  }, [preselectedServiceId, activeServices, selectedService?._id]);

  const hasServices = activeServices.length > 0;
  const serviceRequiredForBooking = hasServices && !onlyInquiry;

  useEffect(() => {
    if (!selectedService?._id) return;

    const stillExists = activeServices.some(
      (s) => String(s._id) === String(selectedService._id)
    );

    if (!stillExists) {
      setService(null);
      setDate(null);
    }
  }, [activeServices, selectedService]);

  useEffect(() => {
    const loadUnavailable = async () => {
      try {
        if (!provider?.userId) return;

        const { data } = await api.get(
          `/api/reservations/unavailable-days/${provider.userId}`
        );

        setUnavailableDays(Array.isArray(data) ? data : []);
      } catch {
        setUnavailableDays([]);
      }
    };

    loadUnavailable();
  }, [provider?.userId]);

  const isUnavailable = (yyyyMmDd) => unavailableDays.includes(yyyyMmDd);

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const startDayIndex = useMemo(
    () => getDay(startOfMonth(currentMonth)),
    [currentMonth]
  );

  const respectsWorkingDays = (day) => {
    return Array.isArray(provider?.workingDays) && provider.workingDays.length
      ? provider.workingDays.includes(getDay(day))
      : true;
  };

  const getDayState = (day) => {
    const past = isBefore(startOfDay(day), startOfDay(new Date()));
    const dateStr = format(day, "yyyy-MM-dd");
    const blocked = isUnavailable(dateStr);
    const workingOk = respectsWorkingDays(day);

    if (serviceRequiredForBooking && !selectedService) return "locked";
    if (past) return "past";
    if (!workingOk) return "locked";
    if (blocked) return "unavailable";

    return "free";
  };

  const canPickDay = (day) => getDayState(day) === "free";

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (!user?.uid) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Musisz być zalogowany.",
        });
        return;
      }

      if (!selectedDate) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Wybierz dzień.",
        });
        return;
      }

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      if (selectedService?._id) {
        const isServiceStillActive = activeServices.some(
          (s) => String(s._id) === String(selectedService._id)
        );

        if (!isServiceStillActive) {
          pushAlert?.({
            show: true,
            type: "error",
            message: "Ta usługa jest obecnie wyłączona.",
          });
          return;
        }
      }

      if (onlyInquiry) {
        const content = [
          `Zapytanie o dostępność dnia ${dateStr}`,
          selectedService ? `Usługa: ${selectedService.name}` : null,
          description?.trim() ? `Opis:\n${description.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n\n");

        try {
          const { data } = await api.post(`/api/conversations/send`, {
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
          }
        } catch (err) {
          if (err?.response?.status === 403) {
            const existingId = err?.response?.data?.conversationId || null;

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

            sessionStorage.setItem(
              "draft",
              [
                `Zapytanie o dostępność dnia ${dateStr}`,
                selectedService ? `Usługa: ${selectedService.name}` : null,
                description?.trim() ? `Opis:\n${description.trim()}` : null,
              ]
                .filter(Boolean)
                .join("\n\n")
            );

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
        }

        return;
      }

      if (serviceRequiredForBooking && !selectedService) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Wybierz usługę, aby zarezerwować dzień.",
        });
        return;
      }

      if (isUnavailable(dateStr)) {
        pushAlert?.({
          show: true,
          type: "error",
          message: 'Ten dzień jest niedostępny. Użyj "Tylko zapytanie".',
        });
        return;
      }

      const payload = {
        userId: user.uid,
        userName: user.displayName || user.email || "Użytkownik",
        providerUserId: provider.userId,
        providerName: provider.name || "Usługodawca",
        providerProfileId: provider._id,
        providerProfileName: provider.name || "",
        providerProfileRole: provider.role || "",
        date: dateStr,
        description: (description || "").trim(),
        ...(selectedService?._id
          ? {
            serviceId: selectedService._id,
            serviceName: selectedService.name,
          }
          : {}),
      };

      await api.post(`/api/reservations/day`, payload);

      sessionStorage.setItem(
        "flash",
        JSON.stringify({
          type: "success",
          message:
            "Wysłano prośbę o rezerwację dnia – oczekuje na potwierdzenie.",
          ttl: 6000,
          ts: Date.now(),
        })
      );

      navigate("/rezerwacje");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401
          ? "Brak autoryzacji (401). Zaloguj się ponownie."
          : null) ||
        "Nie udało się utworzyć rezerwacji dnia.";

      pushAlert?.({
        show: true,
        type: "error",
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDateStr = selectedDate
    ? format(selectedDate, "dd.MM.yyyy")
    : null;

  return (
    <>
      <div className={styles.topGrid}>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <div className={styles.fieldHeader}>
            <div>
              <span className={styles.fieldEyebrow}>01 / Informacje</span>
              <h3 className={styles.fieldTitle}>Opis lub uwagi</h3>
            </div>

            <span className={styles.fieldHint}>opcjonalnie</span>
          </div>

          <textarea
            className={styles.textarea}
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opisz, czego potrzebujesz w danym dniu…"
          />
        </label>

        {hasServices && (
          <label className={styles.field}>
            <div className={styles.fieldHeader}>
              <div>
                <span className={styles.fieldEyebrow}>02 / Usługa</span>
                <h3 className={styles.fieldTitle}>Wybierz usługę</h3>
              </div>

              <span className={styles.fieldHint}>
                {onlyInquiry ? "opcjonalnie" : "wymagane"}
              </span>
            </div>

            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={selectedService?._id || ""}
                onChange={(e) => {
                  const svc = activeServices.find(
                    (s) => String(s._id) === String(e.target.value)
                  );

                  setService(svc || null);
                  setDate(null);
                }}
              >
                <option value="">
                  {onlyInquiry ? "– bez wyboru –" : "— wybierz usługę —"}
                </option>

                {activeServices.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.duration?.value
                      ? ` • ${s.duration.value} ${s.duration.unit === "minutes"
                        ? "min"
                        : s.duration.unit === "hours"
                          ? "godz."
                          : s.duration.unit === "days"
                            ? "dni"
                            : s.duration.unit
                      }`
                      : ""}
                  </option>
                ))}
              </select>

              <span className={styles.selectChevron} aria-hidden="true">
                ▾
              </span>
            </div>
          </label>
        )}

        <label className={styles.toggleField}>
          <div className={styles.fieldHeader}>
            <div>
              <span className={styles.fieldEyebrow}>03 / Tryb</span>
              <h3 className={styles.fieldTitle}>Sposób kontaktu</h3>
            </div>

            <span className={styles.fieldHint}>wybór</span>
          </div>

          <div className={styles.toggleRow}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={onlyInquiry}
                onChange={() => {
                  setOnlyInquiry((v) => !v);
                  setDate(null);
                }}
              />

              <span>Tylko zapytanie bez blokowania dnia</span>
            </label>

            <p className={styles.toggleHint}>
              {onlyInquiry
                ? "Wyślesz wiadomość do usługodawcy z prośbą o potwierdzenie dostępności."
                : "Wyślesz prośbę o rezerwację całego dnia do akceptacji."}
            </p>
          </div>
        </label>
      </div>

      {serviceRequiredForBooking && !selectedService && (
        <div className={styles.warnBox}>
          <strong>Najpierw wybierz usługę</strong>
          <p>
            Dopiero po wyborze usługi możesz wskazać dzień do rezerwacji.
          </p>
        </div>
      )}

      <div className={styles.mainGrid}>
        <section className={styles.calendarCard}>
          <div className={styles.cardHead}>
            <div>
              <span className={styles.cardLabel}>Kalendarz</span>
              <h3>Wybierz dzień</h3>
            </div>
          </div>

          <div className={styles.monthNav}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="Poprzedni miesiąc"
            >
              &lt;
            </button>

            <span className={styles.monthLabel}>
              {format(currentMonth, "LLLL yyyy", { locale: pl })}
            </span>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="Następny miesiąc"
            >
              &gt;
            </button>
          </div>

          <div className={styles.calendarGrid}>
            {["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"].map((d) => (
              <div key={d} className={styles.weekday}>
                {d}
              </div>
            ))}

            {Array(startDayIndex)
              .fill(null)
              .map((_, i) => (
                <div key={i} className={styles.blankDay} />
              ))}

            {daysInMonth.map((day) => {
              const state = getDayState(day);
              const sel = selectedDate && isSameDay(day, selectedDate);
              const dateStr = format(day, "yyyy-MM-dd");

              const disabled = state !== "free" || isSubmitting;

              const title =
                state === "unavailable"
                  ? "Dzień niedostępny"
                  : state === "past"
                    ? "Dzień w przeszłości"
                    : state === "locked"
                      ? serviceRequiredForBooking && !selectedService
                        ? "Najpierw wybierz usługę"
                        : "Dzień poza harmonogramem"
                      : dateStr;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={[
                    styles.day,
                    state === "unavailable" ? styles.dayUnavailable : "",
                    state === "past" ? styles.dayPast : "",
                    state === "locked" ? styles.dayLocked : "",
                    sel ? styles.selectedDay : "",
                  ].join(" ")}
                  disabled={disabled}
                  onClick={() =>
                    !isSubmitting && canPickDay(day) && setDate(day)
                  }
                  title={title}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.infoCard}>
          {!selectedDate ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyNumber}>04</span>

              <strong>Wybierz dzień</strong>

              <p>
                Kliknij wolny dzień w kalendarzu, a następnie wyślij prośbę o
                rezerwację albo samo zapytanie.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.infoHeader}>
                <div>
                  <span className={styles.cardLabel}>
                    {onlyInquiry ? "Zapytanie" : "Rezerwacja"}
                  </span>

                  <h3 className={styles.infoTitle}>
                    {onlyInquiry ? "Zapytanie o dzień" : "Rezerwacja dnia"}
                  </h3>

                  <p className={styles.infoSub}>
                    Dzień: <b>{selectedDateStr}</b>
                  </p>
                </div>

                <div className={styles.modePill} title="Wybrany tryb">
                  <span className={styles.modeDot} />
                  <span>{onlyInquiry ? "Tylko zapytanie" : "Blokada dnia"}</span>
                </div>
              </div>

              {hasServices && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Usługa</span>

                  <span className={styles.summaryValue}>
                    {selectedService ? (
                      <b>{selectedService.name}</b>
                    ) : (
                      <span className={styles.muted}>Nie wybrano</span>
                    )}
                  </span>
                </div>
              )}

              {!!description?.trim() && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Opis</span>

                  <span className={styles.summaryValue}>
                    {description.trim()}
                  </span>
                </div>
              )}

              {selectedDate &&
                isUnavailable(format(selectedDate, "yyyy-MM-dd")) &&
                !onlyInquiry && (
                  <div className={styles.warnBox}>
                    <strong>Dzień niedostępny</strong>
                    <p>
                      Ten dzień jest już oznaczony jako niedostępny. Możesz
                      przełączyć się na tryb „Tylko zapytanie”.
                    </p>
                  </div>
                )}
            </>
          )}
        </section>
      </div>

      <div className={styles.fullLegendBar}>
        <div className={styles.legendBadges}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendFree}`} />
            wolne
          </span>

          <span className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendSelected}`} />
            wybrane
          </span>

          <span className={styles.legendItem}>
            <span
              className={`${styles.legendBox} ${styles.legendUnavailable}`}
            />
            niedostępne
          </span>

          <span className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendLocked}`} />
            nieaktywne
          </span>
        </div>

        <div className={styles.legendMetaFull}>
          {hasServices
            ? onlyInquiry
              ? "Usługa opcjonalna / zapytanie bez blokady"
              : "Usługa wymagana do rezerwacji dnia"
            : "Brak usług / wybierasz tylko dzień"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.submitBar}>
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          disabled={
            !selectedDate ||
            isSubmitting ||
            (serviceRequiredForBooking && !selectedService)
          }
          className={styles.submit}
        >
          {onlyInquiry ? "Wyślij zapytanie" : "Rezerwuj dzień"}
        </LoadingButton>

        <div className={styles.submitHint}>
          {onlyInquiry
            ? "Wyślemy wiadomość do usługodawcy — odpowiedź pojawi się w rozmowie."
            : "Po wysłaniu prośba będzie oczekiwać na potwierdzenie."}
        </div>
      </form>
    </>
  );
}