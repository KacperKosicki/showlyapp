import { createPortal } from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import {
  FiAlertCircle,
  FiCalendar,
  FiEdit3,
  FiFileText,
  FiGrid,
  FiInfo,
  FiInbox,
  FiPlus,
  FiSend,
  FiTag,
  FiUser,
  FiX,
} from "react-icons/fi";

import styles from "./ReservationCalendar.module.scss";

const toISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const minToTime = (minutes) => {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalizedMinutes / 60)).padStart(2, "0");
  const mins = String(normalizedMinutes % 60).padStart(2, "0");

  return `${hours}:${mins}`;
};

const ReservationCalendar = ({
  selectedDay,
  onSelectedDayChange,

  selectedIso,
  formatDatePL,

  dayMap,
  getDayAvailabilityInfo,
  providerMeta,
  selectedDayAvailabilityInfo,

  visibleTimelineBlocks,
  selectedReservations,

  hasProviderProfile,
  isSlotMode,
  isDayBlockingMode,

  renderReservationItem,
  statusIcon,

  onOpenOfflineForSlot,
  onOpenOfflineForDay,

  offlineOpen,
  setOfflineOpen,
  metaLoading,
  offlineForm,
  setOfflineForm,
  conflicts,
  durationLabel,
  filteredStaff,
  disabledIds,
  submitOffline,
  getServiceDurationMinutes,
  teamEnabled,
  isUserPickTeam,
  isAutoAssignTeam,
  offlineSlots,
  offlineBufferMin,
  baseBreakMin,
  bookingBufferMin,
}) => {
  const dayMeta = dayMap?.get(selectedIso);

  const getTimelineStatusClass = (status) => {
    if (status === "zaakceptowana") {
      return styles.timelineStatusAccepted;
    }

    if (status === "odrzucona" || status === "anulowana") {
      return styles.timelineStatusRejected;
    }

    if (status === "oczekująca") {
      return styles.timelineStatusPending;
    }

    if (status === "wolne") {
      return styles.timelineStatusFree;
    }

    return "";
  };

  const getTimelineDotClass = (status) => {
    if (status === "zaakceptowana") {
      return styles.timelineDotAccepted;
    }

    if (status === "odrzucona" || status === "anulowana") {
      return styles.timelineDotRejected;
    }

    if (status === "oczekująca") {
      return styles.timelineDotPending;
    }

    if (status === "wolne") {
      return styles.timelineDotFree;
    }

    return "";
  };

  const renderTileContent = ({ date, view }) => {
    if (view !== "month") {
      return null;
    }

    const isoDate = toISODate(date);
    const meta = dayMap?.get(isoDate);
    const availabilityInfo = getDayAvailabilityInfo?.(
      providerMeta,
      isoDate
    );

    const total = meta?.total || 0;
    const unavailable = meta?.unavailable || 0;
    const pending = meta?.pending || 0;
    const accepted = meta?.accepted || 0;
    const rejected = meta?.rejected || 0;

    const hasUnavailableState =
      Boolean(availabilityInfo) || unavailable > 0;

    const hasAnyData =
      total > 0 ||
      pending > 0 ||
      accepted > 0 ||
      rejected > 0 ||
      hasUnavailableState;

    if (!hasAnyData) {
      return null;
    }

    return (
      <div className={styles.tileIndicators} aria-hidden="true">
        <div className={styles.tileDots}>
          {hasUnavailableState && (
            <span
              className={`${styles.tileDot} ${styles.tileDotUnavailable}`}
            />
          )}

          {pending > 0 && (
            <span
              className={`${styles.tileDot} ${styles.tileDotPending}`}
            />
          )}

          {accepted > 0 && (
            <span
              className={`${styles.tileDot} ${styles.tileDotAccepted}`}
            />
          )}

          {rejected > 0 && (
            <span
              className={`${styles.tileDot} ${styles.tileDotRejected}`}
            />
          )}
        </div>

        {total > 0 && (
          <span className={styles.tileCount}>{total}</span>
        )}
      </div>
    );
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== "month") {
      return null;
    }

    const isoDate = toISODate(date);
    const availabilityInfo = getDayAvailabilityInfo?.(
      providerMeta,
      isoDate
    );

    return availabilityInfo
      ? styles.calendarUnavailableDay
      : null;
  };

  const renderTimelineBlock = (block) => {
    const status = block.isFree ? "wolne" : block.status;

    return (
      <div key={block.id} className={styles.timelineRow}>
        <div className={styles.timelineTimeColumn}>
          <span className={styles.timelineTime}>
            {minToTime(block.startMin)}–{minToTime(block.endMin)}
          </span>

          <span
            className={`${styles.timelineDot} ${getTimelineDotClass(
              status
            )}`}
          />
        </div>

        <article
          className={`${styles.timelineCard} ${block.isFree ? styles.timelineCardFree : ""
            }`}
        >
          <div className={styles.timelineCardHeader}>
            {block.isFree ? (
              <span
                className={`${styles.timelineKind} ${styles.timelineKindFree}`}
              >
                <FiGrid aria-hidden="true" />
                Wolne
              </span>
            ) : (
              <span
                className={`${styles.timelineKind} ${block.kind === "recv"
                  ? styles.timelineKindReceived
                  : styles.timelineKindSent
                  }`}
              >
                {block.kind === "recv" ? (
                  <>
                    <FiInbox aria-hidden="true" />
                    Otrzymana
                  </>
                ) : (
                  <>
                    <FiSend aria-hidden="true" />
                    Wysłana
                  </>
                )}
              </span>
            )}

            <div className={styles.timelineStatusArea}>
              {!block.isFree && block.offline && (
                <span className={styles.offlineBadge}>Offline</span>
              )}

              <span
                className={`${styles.timelineStatus} ${getTimelineStatusClass(
                  status
                )}`}
              >
                {!block.isFree && statusIcon?.(block.status)}

                <span>{status}</span>
              </span>
            </div>
          </div>

          <strong className={styles.timelineTitle}>
            {block.title}
          </strong>

          {!block.isFree && (
            <div className={styles.timelineMeta}>
              {block.serviceName && (
                <span className={styles.timelineChip}>
                  <FiTag aria-hidden="true" />
                  {block.serviceName}
                </span>
              )}

              {block.staffName && (
                <span className={styles.timelineChip}>
                  <FiUser aria-hidden="true" />
                  {block.staffName}
                </span>
              )}
            </div>
          )}

          {!block.isFree && block.desc && (
            <div className={styles.timelineDescription}>
              <FiFileText aria-hidden="true" />
              <span>{block.desc}</span>
            </div>
          )}

          {block.isFree && !selectedDayAvailabilityInfo && (
            <div className={styles.timelineActions}>
              <button
                type="button"
                className={styles.addSlotButton}
                onClick={() =>
                  onOpenOfflineForSlot?.(
                    selectedIso,
                    block.startMin,
                    block.endMin
                  )
                }
              >
                <FiPlus aria-hidden="true" />
                Dodaj offline w tym slocie
              </button>
            </div>
          )}
        </article>
      </div>
    );
  };

  const servicesLocal = providerMeta?.services || [];

  const offlineModalEl =
    offlineOpen && typeof document !== "undefined"
      ? createPortal(

        <div className={styles.modalOverlay} onClick={() => setOfflineOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiPlus /> Dodaj rezerwację offline
              </div>

              <button
                className={styles.modalClose}
                onClick={() => setOfflineOpen(false)}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              {metaLoading && <div className={styles.modalHint}>Ładowanie danych profilu…</div>}

              <div className={styles.modalInfo}>
                <FiInfo />
                <div>
                  <b>System dolicza przerwę {offlineBufferMin} min</b> po każdej rezerwacji
                  (także offline).
                  <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                    (bazowe {baseBreakMin} min + bufor z profilu {bookingBufferMin} min)
                  </div>
                </div>
              </div>

              {conflicts.length > 0 && (
                <div className={styles.modalWarn}>
                  <div className={styles.modalWarnTitle}>
                    <FiAlertCircle /> Uwaga: możliwy konflikt terminów (z buforem{" "}
                    {offlineBufferMin} min)
                  </div>
                  <div className={styles.modalWarnText}>
                    W tym dniu/godzinach są już rezerwacje. Terminy mogą się nałożyć:
                  </div>
                  <ul className={styles.conflictList}>
                    {conflicts.slice(0, 6).map((c) => (
                      <li key={c.id}>{c.label}</li>
                    ))}
                  </ul>
                  {conflicts.length > 6 && (
                    <div className={styles.conflictMore}>+ {conflicts.length - 6} więcej</div>
                  )}
                </div>
              )}

              <div className={styles.modalGrid}>
                <label className={styles.field}>
                  <span>Data</span>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={offlineForm.date}
                    onChange={(e) =>
                      setOfflineForm((p) => ({ ...p, date: e.target.value, slotStart: "" }))
                    }
                  />
                </label>

                {!isDayBlockingMode && (
                  <label className={styles.fieldToggle}>
                    <input
                      type="checkbox"
                      checked={offlineForm.dateOnly}
                      onChange={(e) =>
                        setOfflineForm((p) => ({
                          ...p,
                          dateOnly: e.target.checked,
                          slotStart: "",
                        }))
                      }
                    />
                    <span>Cały dzień</span>
                  </label>
                )}

                <label className={styles.fieldWide}>
                  <span>Klient (offline)</span>
                  <input
                    className={styles.formInput}
                    value={offlineForm.offlineClientName}
                    onChange={(e) =>
                      setOfflineForm((p) => ({ ...p, offlineClientName: e.target.value }))
                    }
                    placeholder="Np. Kasia / Firma X"
                  />
                </label>

                <label className={styles.fieldWide}>
                  <span>Opis (wyświetlany w rezerwacji)</span>
                  <textarea
                    className={styles.formTextarea}
                    rows={3}
                    value={offlineForm.description}
                    onChange={(e) =>
                      setOfflineForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Opcjonalnie"
                  />
                </label>

                <label className={styles.fieldWide}>
                  <span>Usługa (wymagane)</span>
                  <select
                    className={styles.formInput}
                    value={offlineForm.serviceId}
                    onChange={(e) =>
                      setOfflineForm((p) => ({
                        ...p,
                        serviceId: e.target.value,
                        staffId: "",
                        slotStart: "",
                      }))
                    }
                  >
                    <option value="">— wybierz usługę —</option>
                    {servicesLocal.map((s) => {
                      const mins = getServiceDurationMinutes(s);
                      const label = mins
                        ? `${s.name} (${mins % 60 === 0 && mins >= 60
                          ? `${mins / 60} godz.`
                          : `${mins} min`
                        })`
                        : s.name;

                      return (
                        <option key={String(s._id)} value={String(s._id)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>

                  {!!durationLabel && (
                    <div className={styles.durationPill}>
                      ⏱ Czas usługi: <b>{durationLabel}</b>
                      <span className={styles.durationMini}>
                        + {offlineBufferMin} min przerwy
                      </span>
                    </div>
                  )}
                </label>

                <label className={styles.fieldWide}>
                  <span>Pracownik</span>
                  <select
                    className={styles.formInput}
                    value={offlineForm.staffId}
                    onChange={(e) =>
                      setOfflineForm((p) => ({
                        ...p,
                        staffId: e.target.value,
                        slotStart: "",
                      }))
                    }
                    disabled={!teamEnabled || isAutoAssignTeam}
                    title={
                      !teamEnabled
                        ? "Zespół wyłączony w profilu"
                        : isAutoAssignTeam
                          ? "Auto-assign: pracownik dobierany automatycznie"
                          : ""
                    }
                  >
                    <option value="">
                      {isUserPickTeam
                        ? "— wybierz pracownika (wymagane) —"
                        : "— opcjonalnie —"}
                    </option>
                    {filteredStaff.map((s) => (
                      <option key={String(s._id)} value={String(s._id)}>
                        {s.name} (cap: {s.capacity || 1})
                      </option>
                    ))}
                  </select>
                </label>

                {!isDayBlockingMode && isSlotMode && !offlineForm.dateOnly && (
                  <div className={styles.slotBox}>
                    <div className={styles.slotHead}>
                      Wybierz godzinę startu (slot)
                      <span className={styles.slotHint}>+ {offlineBufferMin} min przerwy</span>
                    </div>

                    {!offlineForm.serviceId ? (
                      <div className={styles.slotInfo}>
                        Najpierw wybierz <b>usługę</b> — wtedy pokażę dopasowane sloty.
                      </div>
                    ) : isUserPickTeam && !offlineForm.staffId ? (
                      <div className={styles.slotInfo}>
                        Wybierz <b>pracownika</b>, żeby pokazać sloty (tryb user-pick).
                      </div>
                    ) : (
                      <>
                        <div className={styles.slotGrid}>
                          {offlineSlots.map((s, i) => (
                            <button
                              key={`${s.label}-${i}`}
                              type="button"
                              className={`
                              ${styles.slotBtn}
                              ${s.status === "disabled" ? styles.slotDisabled : ""}
                              ${s.status === "reserved" ? styles.slotReserved : ""}
                              ${s.status === "pending" ? styles.slotPending : ""}
                              ${offlineForm.slotStart === s.label ? styles.slotSelected : ""}
                            `}
                              disabled={s.status !== "free"}
                              onClick={() =>
                                setOfflineForm((p) => ({ ...p, slotStart: s.label }))
                              }
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>

                        <div className={styles.slotLegend}>
                          <span>
                            <span className={`${styles.legBox} ${styles.legReserved}`} />
                            zajęte
                          </span>
                          <span>
                            <span className={`${styles.legBox} ${styles.legPending}`} />
                            oczekujące
                          </span>
                          <span>
                            <span className={`${styles.legBox} ${styles.legDisabled}`} />
                            niedostępne
                          </span>
                          <span>
                            <span className={`${styles.legBox} ${styles.legFree}`} />
                            wolne
                          </span>
                        </div>

                        {!!offlineForm.slotStart && (
                          <div className={styles.slotSummary}>
                            Start: <b>{offlineForm.fromTime}</b> • Koniec:{" "}
                            <b>{offlineForm.toTime}</b>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.modalSecondary}
                  onClick={() => setOfflineOpen(false)}
                  type="button"
                >
                  Anuluj
                </button>

                <button
                  className={styles.modalPrimary}
                  onClick={submitOffline}
                  type="button"
                  disabled={disabledIds.has("offline-submit")}
                >
                  <FiEdit3 /> Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
      : null;

  return (
    <>
      <section className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <div className={styles.calendarHeading}>
            <span className={styles.chapterLabel}>
              Widok kalendarza
            </span>

            <h3>
              Kalendarz <span>rezerwacji</span>
            </h3>

            <p>
              Wybierz dzień, aby sprawdzić rezerwacje, dostępność oraz
              wolne godziny.
            </p>
          </div>

          <div className={styles.selectedDate}>
            <FiCalendar aria-hidden="true" />

            <div>
              <span>Wybrany dzień</span>
              <strong>{formatDatePL(selectedIso)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <strong>{dayMeta?.total ?? 0}</strong>
            <span>Wszystkie rezerwacje</span>
          </div>

          <div className={styles.summaryCard}>
            <strong>{dayMeta?.recvTotal ?? 0}</strong>
            <span>Otrzymane</span>
          </div>

          <div className={styles.summaryCard}>
            <strong>{dayMeta?.sentTotal ?? 0}</strong>
            <span>Wysłane</span>
          </div>

          <div className={styles.summaryCard}>
            <strong>{dayMeta?.pending ?? 0}</strong>
            <span>Oczekujące</span>
          </div>
        </div>

        <div className={styles.calendarLayout}>
          <div className={styles.calendarColumn}>
            <div className={styles.calendarBox}>
              <Calendar
                value={selectedDay}
                onChange={onSelectedDayChange}
                locale="pl-PL"
                tileClassName={getTileClassName}
                tileContent={renderTileContent}
              />
            </div>

            <div className={styles.legend}>
              <span>
                <i className={styles.legendPending} />
                Oczekujące
              </span>

              <span>
                <i className={styles.legendAccepted} />
                Zaakceptowane
              </span>

              <span>
                <i className={styles.legendRejected} />
                Odrzucone
              </span>

              <span>
                <i className={styles.legendUnavailable} />
                Niedostępne
              </span>
            </div>
          </div>

          <div className={styles.dayColumn}>
            <div className={styles.dayHeader}>
              <div className={styles.dayHeaderIcon}>
                <FiCalendar aria-hidden="true" />
              </div>

              <div>
                <span>Plan wybranego dnia</span>
                <h4>{formatDatePL(selectedIso)}</h4>
              </div>
            </div>

            {selectedDayAvailabilityInfo && (
              <div className={styles.unavailableNotice}>
                <FiAlertCircle aria-hidden="true" />

                <div>
                  <strong>
                    {selectedDayAvailabilityInfo.title}
                  </strong>

                  {selectedDayAvailabilityInfo.reason && (
                    <span>
                      {selectedDayAvailabilityInfo.reason}
                    </span>
                  )}
                </div>
              </div>
            )}

            {isSlotMode && (
              <div className={styles.daySection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.sectionLabel}>
                      Harmonogram
                    </span>

                    <h5>Plan dnia</h5>
                  </div>

                  <span className={styles.sectionCount}>
                    {visibleTimelineBlocks.length}
                  </span>
                </div>

                {visibleTimelineBlocks.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FiCalendar aria-hidden="true" />

                    <strong>Brak danych dla tego dnia</strong>

                    <p>
                      Nie znaleziono rezerwacji ani dostępnych
                      przedziałów godzinowych.
                    </p>
                  </div>
                ) : (
                  <div className={styles.timeline}>
                    {visibleTimelineBlocks.map(renderTimelineBlock)}
                  </div>
                )}
              </div>
            )}

            {isDayBlockingMode && (
              <div className={styles.daySection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.sectionLabel}>
                      Dostępność
                    </span>

                    <h5>Blokowanie dnia</h5>
                  </div>
                </div>

                <div className={styles.infoState}>
                  W tym trybie możesz dodać rezerwację offline
                  obejmującą cały wybrany dzień.
                </div>
              </div>
            )}

            {hasProviderProfile && (
              <div className={styles.daySection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.sectionLabel}>
                      Skrzynka usługodawcy
                    </span>

                    <h5>Otrzymane</h5>
                  </div>

                  <span className={styles.sectionCount}>
                    {selectedReservations.recv.length}
                  </span>
                </div>

                {selectedReservations.recv.length === 0 ? (
                  <div className={styles.smallEmptyState}>
                    Brak otrzymanych rezerwacji w tym dniu.
                  </div>
                ) : (
                  <ul className={styles.reservationList}>
                    {selectedReservations.recv.map((reservation) =>
                      renderReservationItem(
                        reservation,
                        "received"
                      )
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className={styles.daySection}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionLabel}>
                    Twoje zapytania
                  </span>

                  <h5>Wysłane</h5>
                </div>

                <span className={styles.sectionCount}>
                  {selectedReservations.sent.length}
                </span>
              </div>

              {selectedReservations.sent.length === 0 ? (
                <div className={styles.smallEmptyState}>
                  Brak wysłanych rezerwacji w tym dniu.
                </div>
              ) : (
                <ul className={styles.reservationList}>
                  {selectedReservations.sent.map((reservation) =>
                    renderReservationItem(reservation, "sent")
                  )}
                </ul>
              )}
            </div>

            {hasProviderProfile &&
              (isSlotMode || isDayBlockingMode) && (
                <div className={styles.dayActions}>
                  <button
                    type="button"
                    className={styles.addDayButton}
                    disabled={Boolean(
                      selectedDayAvailabilityInfo
                    )}
                    title={
                      selectedDayAvailabilityInfo?.reason || ""
                    }
                    onClick={() =>
                      onOpenOfflineForDay?.(selectedIso)
                    }
                  >
                    <FiPlus aria-hidden="true" />

                    {selectedDayAvailabilityInfo
                      ? "Termin niedostępny"
                      : isDayBlockingMode
                        ? "Zablokuj dzień offline"
                        : "Dodaj rezerwację offline"}
                  </button>
                </div>
              )}
          </div>
        </div>
      </section>

      {offlineModalEl}
    </>
  );
};

export default ReservationCalendar;
