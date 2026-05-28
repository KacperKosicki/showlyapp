import styles from '../YourProfile.module.scss';
import LoadingButton from '../../ui/LoadingButton/LoadingButton';
import {
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTools,
  FaUsers,
  FaTrash,
  FaPlus,
  FaTimes,
  FaClock,
} from 'react-icons/fa';
import {
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_SHORT_DESCRIPTION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_DURATION_LIMITS,
} from '../../constants/validationLimits';

const STAFF_NAME_MAX_LENGTH = 60;

const formatDateLabel = (date = "") => {
  if (!date) return "—";

  const [year, month, day] = String(date).split("-");

  if (!year || !month || !day) return date;

  return `${day}.${month}.${year}`;
};

const addDaysToDateString = (dateStr, days = 1) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const groupAvailabilityOverrides = (items = []) => {
  if (!Array.isArray(items)) return [];

  const normalized = items
    .map((item, index) => ({
      ...item,
      originalIndex: index,
    }))
    .filter((item) => item?.date)
    .sort((a, b) => {
      if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      if ((a.fromTime || "") !== (b.fromTime || "")) {
        return String(a.fromTime || "").localeCompare(String(b.fromTime || ""));
      }
      return String(a.toTime || "").localeCompare(String(b.toTime || ""));
    });

  const groups = [];

  normalized.forEach((item) => {
    if (item.type === "slot") {
      groups.push({
        kind: "slot",
        from: item.date,
        to: item.date,
        fromTime: item.fromTime || "",
        toTime: item.toTime || "",
        reason: item.reason || "",
        indices: [item.originalIndex],
      });

      return;
    }

    const last = groups[groups.length - 1];

    const canJoin =
      last &&
      last.kind === "day" &&
      last.reason === (item.reason || "") &&
      addDaysToDateString(last.to, 1) === item.date;

    if (canJoin) {
      last.to = item.date;
      last.indices.push(item.originalIndex);
      return;
    }

    groups.push({
      kind: "day",
      from: item.date,
      to: item.date,
      reason: item.reason || "",
      indices: [item.originalIndex],
    });
  });

  return groups;
};

const getAvailabilityGroupTitle = (group) => {
  if (group.kind === "slot") {
    return `${formatDateLabel(group.from)}, ${group.fromTime}–${group.toTime}`;
  }

  if (group.from === group.to) {
    return `${formatDateLabel(group.from)} — cały dzień`;
  }

  return `${formatDateLabel(group.from)} – ${formatDateLabel(group.to)} — cały dzień`;
};

const OfferSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  setEditData,
  newAvailabilityBlock,
  setNewAvailabilityBlock,
  handleAddAvailabilityBlock,
  handleRemoveAvailabilityBlock,
  maxServices,
  newService,
  setNewService,
  handleAddEditableService,
  cleanServiceText,
  cleanIntegerInput,
  getDurationLimitText,
  mapServiceCategory,
  mapUnit,
  formatServicePrice,
  getServiceImageUrl,
  handleServiceImageChange,
  handleRemoveServiceImage,
  serviceImageUploadingIds,
  canUseBooking,
  canUseTeam,
  maxStaff,
  canUseAutoAccept,
  billingActionLoading,
  handleStartSubscription,
  staff,
  staffLoading,
  staffEdits,
  setStaffEdits,
  deleteStaff,
  deletingStaffIds,
  newStaff,
  setNewStaff,
  createStaff,
  isCreatingStaff,
  showAlert,
}) => {
  const MAX_SERVICES = maxServices;
  const MAX_STAFF = Number(maxStaff || 0);
  const currentStaffCount = staff?.length || 0;
  const hasReachedStaffLimit = canUseTeam && currentStaffCount >= MAX_STAFF;

  const groupedEditAvailability = groupAvailabilityOverrides(
    editData.availabilityOverrides
  );

  const groupedProfileAvailability = groupAvailabilityOverrides(
    profile.availabilityOverrides
  );

  const handleRemoveAvailabilityGroup = (indices = []) => {
    const toRemove = new Set(indices);

    setEditData((prev) => ({
      ...prev,
      availabilityOverrides: Array.isArray(prev.availabilityOverrides)
        ? prev.availabilityOverrides.filter((_, index) => !toRemove.has(index))
        : [],
    }));
  };

  const cleanStaffName = (value) => {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trimStart()
      .slice(0, STAFF_NAME_MAX_LENGTH);
  };

  return (
    <>
      {/* =========================
  Dostępność i usługi
========================= */}
      <section className={`${styles.card} ${styles.offerCard}`}>
        <div className={styles.cardGlow} aria-hidden="true" />

        <div className={styles.sectionTop}>
          <div>
            <span className={styles.sectionKicker}>Oferta i dostępność</span>

            <h3 className={styles.sectionTitle}>Dostępność i usługi</h3>

            <p className={styles.sectionLead}>
              Ustaw cennik, dodaj usługi, wybierz tryb rezerwacji oraz określ dni i godziny,
              w których klienci mogą się z Tobą kontaktować.
            </p>
          </div>

          <div className={styles.sectionBadge}>
            <FaCalendarAlt />
            <span>Oferta</span>
          </div>
        </div>

        <div className={styles.offerBody}>
          {/* CENNIK */}
          <div className={`${styles.offerPanel} ${styles.pricePanel}`}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaMoneyBillWave />
              </div>

              <div>
                <strong>Cennik</strong>
                <span>Zakres cen widoczny na Twojej wizytówce.</span>
              </div>
            </div>

            {isEditing ? (
              <div className={styles.priceModernGrid}>
                <label className={styles.modernField}>
                  <span>Cena od</span>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editData.priceFrom || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, priceFrom: e.target.value })
                    }
                    placeholder="Np. 100"
                  />
                  {formErrors.priceFrom && (
                    <small className={styles.error}>{formErrors.priceFrom}</small>
                  )}
                </label>

                <label className={styles.modernField}>
                  <span>Cena do</span>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editData.priceTo || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, priceTo: e.target.value })
                    }
                    placeholder="Np. 1000"
                  />
                  {formErrors.priceTo && (
                    <small className={styles.error}>{formErrors.priceTo}</small>
                  )}
                </label>
              </div>
            ) : (
              <div className={styles.priceShowcase}>
                <div>
                  <span>od</span>
                  <strong>{profile.priceFrom || "—"} zł</strong>
                </div>

                <div>
                  <span>do</span>
                  <strong>{profile.priceTo || "—"} zł</strong>
                </div>
              </div>
            )}
          </div>

          {/* TRYB REZERWACJI */}
          <div className={styles.offerPanel}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaClock />
              </div>

              <div>
                <strong>Tryb rezerwacji</strong>
                <span>Określ, jak klienci mają umawiać usługi.</span>
              </div>
            </div>

            {isEditing ? (
              <div className={styles.bookingModeGrid}>
                {[
                  {
                    value: "request-open",
                    title: "Zapytania",
                    text: "Klient wysyła wiadomość bez wyboru konkretnego terminu.",
                  },
                  {
                    value: "request-blocking",
                    title: "Zapytania + blokowanie dni",
                    text: "Dobre dla DJ-ów, cukierników i usług realizowanych w wybrane dni.",
                    premium: true,
                  },
                  {
                    value: "calendar",
                    title: "Kalendarz godzinowy",
                    text: "Klient wybiera konkretną godzinę i usługę.",
                    premium: true,
                  },
                ].map((mode) => {
                  const checked = editData.bookingMode === mode.value;
                  const locked = mode.premium && !canUseBooking;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      className={`${styles.bookingModeCard} ${checked ? styles.bookingModeActive : ""
                        } ${locked ? styles.bookingModeLocked : ""}`}
                      onClick={() => {
                        if (locked) {
                          showAlert(
                            "Ten tryb rezerwacji jest dostępny w planie Premium.",
                            "warning"
                          );
                          return;
                        }

                        setEditData((prev) => ({
                          ...prev,
                          bookingMode: mode.value,
                        }));
                      }}
                    >
                      <strong>{mode.title}</strong>
                      <span>{mode.text}</span>

                      {locked && <small>Premium</small>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.modeView}>
                <strong>
                  {profile.bookingMode === "calendar"
                    ? "Kalendarz godzinowy"
                    : profile.bookingMode === "request-blocking"
                      ? "Zapytania + blokowanie dni"
                      : "Zapytania"}
                </strong>

                <span>
                  {profile.bookingMode === "calendar"
                    ? "Klienci mogą wybierać konkretne godziny."
                    : profile.bookingMode === "request-blocking"
                      ? "Możesz blokować dni i obsługiwać zapytania."
                      : "Klienci kontaktują się przez formularz wiadomości."}
                </span>
              </div>
            )}
          </div>

          {/* USTAWIENIA REZERWACJI */}
          <div className={`${styles.offerPanel} ${styles.bookingSettingsPanel}`}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaClock />
              </div>

              <div>
                <strong>Ustawienia rezerwacji</strong>
                <span>
                  Skonfiguruj przerwę między usługami, automatyczne potwierdzanie oraz działanie zespołu.
                </span>
              </div>
            </div>

            <div className={styles.bookingSettingsGrid}>
              {/* BUFFER */}
              <div className={styles.bookingSettingCard}>
                <div className={styles.bookingSettingTop}>
                  <strong>Przerwa między usługami</strong>
                  <span>Buffer po zakończonej rezerwacji.</span>
                </div>

                {isEditing ? (
                  <>
                    <select
                      className={styles.formInput}
                      value={Number(editData.bookingBufferMin ?? 0)}
                      disabled={!canUseBooking}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          bookingBufferMin: Number(e.target.value),
                        }))
                      }
                    >
                      <option value={0}>Brak dodatkowej przerwy</option>
                      <option value={5}>5 minut</option>
                      <option value={10}>10 minut</option>
                      <option value={15}>15 minut</option>
                    </select>

                    {!canUseBooking && (
                      <div className={styles.infoMuted}>
                        Przerwa między usługami jest dostępna w planie Premium.
                      </div>
                    )}

                    {formErrors.bookingBufferMin && (
                      <small className={styles.error}>{formErrors.bookingBufferMin}</small>
                    )}
                  </>
                ) : (
                  <div className={styles.settingViewBox}>
                    <strong>
                      {canUseBooking ? `${profile.bookingBufferMin || 0} min` : "Niedostępne"}
                    </strong>
                    <span>
                      {canUseBooking
                        ? "Dodatkowa przerwa doliczana po rezerwacji."
                        : "Funkcja dostępna w planie Premium."}
                    </span>
                  </div>
                )}
              </div>

              {/* AUTO ACCEPT */}
              <div className={styles.bookingSettingCard}>
                <div className={styles.bookingSettingTop}>
                  <strong>Automatyczne potwierdzanie</strong>
                  <span>Nowe rezerwacje mogą od razu dostać status zaakceptowane.</span>
                </div>

                {isEditing ? (
                  <>
                    <label
                      className={`${styles.featuredSwitch} ${!canUseAutoAccept ? styles.disabledOption : ""
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={canUseAutoAccept ? !!editData.autoAcceptReservations : false}
                        disabled={!canUseAutoAccept}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            autoAcceptReservations: e.target.checked,
                          }))
                        }
                      />

                      <span>
                        <strong>Automatycznie akceptuj rezerwacje</strong>
                        <small>
                          Usługodawca nie będzie musiał ręcznie potwierdzać terminu.
                        </small>
                      </span>
                    </label>

                    {!canUseAutoAccept && (
                      <div className={styles.infoMuted}>
                        W obecnym planie rezerwacje wymagają ręcznego potwierdzenia.
                      </div>
                    )}

                    {formErrors.autoAcceptReservations && (
                      <small className={styles.error}>
                        {formErrors.autoAcceptReservations}
                      </small>
                    )}
                  </>
                ) : (
                  <div className={styles.settingViewBox}>
                    <strong>
                      {canUseAutoAccept && profile?.autoAcceptReservations
                        ? "Włączone"
                        : "Wyłączone"}
                    </strong>
                    <span>
                      {canUseAutoAccept && profile?.autoAcceptReservations
                        ? "Nowe rezerwacje będą automatycznie potwierdzane."
                        : "Nowe rezerwacje będą wymagały ręcznej akceptacji."}
                    </span>
                  </div>
                )}
              </div>

              {/* TEAM SETTINGS */}
              <div className={`${styles.bookingSettingCard} ${styles.teamBookingCard}`}>
                <div className={styles.bookingSettingTop}>
                  <strong>Zespół — ustawienia rezerwacji</strong>
                  <span>Włącz wybór pracownika albo automatyczny przydział.</span>
                </div>

                {isEditing ? (
                  <>
                    <label
                      className={`${styles.featuredSwitch} ${!canUseTeam ? styles.disabledOption : ""
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={canUseTeam ? !!editData.team?.enabled : false}
                        disabled={!canUseTeam}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            team: {
                              ...(prev.team || {}),
                              enabled: e.target.checked,
                              assignmentMode: prev.team?.assignmentMode || "user-pick",
                            },
                          }))
                        }
                      />

                      <span>
                        <strong>Włącz obsługę zespołu</strong>
                        <small>Klient będzie mógł wybrać pracownika albo system przydzieli go automatycznie.</small>
                      </span>
                    </label>

                    {!canUseTeam && (
                      <div className={styles.upgradeNotice}>
                        <strong>Zespół jest dostępny tylko w planie Premium.</strong>
                        <span>
                          W planie Starter i Standard nie możesz włączyć obsługi pracowników ani przydziału do rezerwacji.
                        </span>
                      </div>
                    )}

                    <label className={styles.modernField}>
                      <span>Tryb przydziału</span>

                      <select
                        className={styles.formInput}
                        disabled={!canUseTeam || !editData.team?.enabled}
                        value={editData.team?.assignmentMode || "user-pick"}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            team: {
                              ...(prev.team || {}),
                              assignmentMode: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="user-pick">Klient wybiera pracownika</option>
                        <option value="auto-assign">Automatyczny przydział</option>
                      </select>
                    </label>

                    {canUseTeam && !editData.team?.enabled && (
                      <div className={styles.infoMuted}>
                        Wyłączone — wybór pracownika nie będzie pokazywany w rezerwacji.
                      </div>
                    )}

                    {formErrors.team && (
                      <small className={styles.error}>{formErrors.team}</small>
                    )}
                  </>
                ) : (
                  <div className={styles.settingViewBox}>
                    <strong>
                      {canUseTeam && profile.team?.enabled ? "Włączony" : "Wyłączony"}
                    </strong>

                    <span>
                      {canUseTeam && profile.team?.enabled
                        ? profile.team?.assignmentMode === "user-pick"
                          ? "Klient wybiera pracownika podczas rezerwacji."
                          : "System automatycznie przydziela pracownika."
                        : "Obsługa zespołu nie jest aktywna."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GODZINY PRACY */}
          <div className={styles.offerPanel}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaClock />
              </div>

              <div>
                <strong>Godziny pracy</strong>
                <span>Zakres godzin wykorzystywany przy dostępności.</span>
              </div>
            </div>

            {isEditing ? (
              <div className={styles.timeGrid}>
                <label className={styles.modernField}>
                  <span>Od</span>
                  <input
                    type="time"
                    className={styles.formInput}
                    value={editData.workingHours?.from || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        workingHours: {
                          ...(prev.workingHours || {}),
                          from: e.target.value,
                        },
                      }))
                    }
                  />
                </label>

                <label className={styles.modernField}>
                  <span>Do</span>
                  <input
                    type="time"
                    className={styles.formInput}
                    value={editData.workingHours?.to || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        workingHours: {
                          ...(prev.workingHours || {}),
                          to: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </div>
            ) : (
              <div className={styles.timeView}>
                <div>
                  <span>od</span>
                  <strong>{profile.workingHours?.from || "—"}</strong>
                </div>

                <div>
                  <span>do</span>
                  <strong>{profile.workingHours?.to || "—"}</strong>
                </div>
              </div>
            )}
          </div>

          {/* DNI PRACY */}
          <div className={styles.offerPanel}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaCalendarAlt />
              </div>

              <div>
                <strong>Dni pracy</strong>
                <span>Wybierz dni, w których zwykle przyjmujesz klientów.</span>
              </div>
            </div>

            {isEditing ? (
              <div className={styles.daysModernGrid}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const checked = editData.workingDays?.includes(d) ?? false;
                  const label = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d];

                  return (
                    <button
                      type="button"
                      key={d}
                      className={`${styles.dayModernBtn} ${checked ? styles.dayModernActive : ""
                        }`}
                      onClick={() =>
                        setEditData((prev) => {
                          const current = prev.workingDays || [];
                          const days = current.includes(d)
                            ? current.filter((x) => x !== d)
                            : [...current, d];

                          return {
                            ...prev,
                            workingDays: days,
                          };
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.daysModernView}>
                {profile.workingDays?.length ? (
                  profile.workingDays
                    .slice()
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <span key={d}>
                        {["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d]}
                      </span>
                    ))
                ) : (
                  <p>Brak danych</p>
                )}
              </div>
            )}
          </div>

          {/* USŁUGI */}
          <div className={`${styles.offerPanel} ${styles.servicesPanel}`}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaTools />
              </div>

              <div>
                <strong>Usługi</strong>
                <span>
                  Dodaj konkretne usługi, ich czas trwania i sposób wyceny.
                </span>
              </div>
            </div>

            {isEditing ? (
              <>
                <div className={styles.servicesEditList}>
                  {(editData.services || []).length ? (
                    (editData.services || []).map((s, i) => (
                      <div key={s._id || i} className={styles.serviceModernEdit}>
                        <div className={styles.serviceModernTop}>
                          <div>
                            <span>Usługa #{i + 1}</span>
                            <strong>{s.name || "Nowa usługa"}</strong>
                          </div>

                          <button
                            type="button"
                            className={styles.serviceRemoveBtn}
                            onClick={() =>
                              setEditData((prev) => ({
                                ...prev,
                                services: (prev.services || []).filter(
                                  (_, idx) => idx !== i
                                ),
                              }))
                            }
                          >
                            <FaTrash />
                          </button>
                        </div>

                        <div className={styles.serviceImageEditor}>
                          <div className={styles.serviceImagePreview}>
                            {getServiceImageUrl(s) ? (
                              <img src={getServiceImageUrl(s)} alt={s.name || "Zdjęcie usługi"} />
                            ) : (
                              <div className={styles.serviceImageEmpty}>
                                <FaTools />
                                <span>Brak zdjęcia</span>
                              </div>
                            )}

                            {s.featured && (
                              <span className={styles.serviceImageBadge}>Wyróżniona</span>
                            )}
                          </div>

                          <div className={styles.serviceImageActions}>
                            {s._id ? (
                              <>
                                <label className={styles.fileBtn}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={serviceImageUploadingIds.includes(s._id)}
                                    onChange={(e) => handleServiceImageChange(e, s._id)}
                                  />

                                  {serviceImageUploadingIds.includes(s._id)
                                    ? "Wgrywanie..."
                                    : getServiceImageUrl(s)
                                      ? "Zmień zdjęcie"
                                      : "Dodaj zdjęcie"}
                                </label>

                                {getServiceImageUrl(s) && (
                                  <button
                                    type="button"
                                    className={styles.danger}
                                    disabled={serviceImageUploadingIds.includes(s._id)}
                                    onClick={() => handleRemoveServiceImage(s._id)}
                                  >
                                    Usuń zdjęcie
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className={styles.infoMuted}>
                                Zdjęcie będzie można dodać po zapisaniu tej nowej usługi.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.serviceEditGrid}>
                          <label className={styles.modernField}>
                            <span>Nazwa usługi</span>

                            <input
                              type="text"
                              className={styles.formInput}
                              value={s.name || ""}
                              maxLength={SERVICE_NAME_MAX_LENGTH}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? {
                                        ...item,
                                        name: cleanServiceText(e.target.value, SERVICE_NAME_MAX_LENGTH),
                                      }
                                      : item
                                  ),
                                }))
                              }
                              placeholder="Np. Strzyżenie męskie"
                            />

                            <small className={styles.fieldCounter}>
                              {(s.name || "").length}/{SERVICE_NAME_MAX_LENGTH}
                            </small>
                          </label>

                          <label className={styles.modernField}>
                            <span>Krótki opis</span>

                            <textarea
                              className={styles.formTextarea}
                              value={s.shortDescription || ""}
                              maxLength={SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? {
                                        ...item,
                                        shortDescription: cleanServiceText(
                                          e.target.value,
                                          SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
                                        ),
                                      }
                                      : item
                                  ),
                                }))
                              }
                              placeholder="Np. szybka rozmowa i wycena"
                            />

                            <small className={styles.fieldCounter}>
                              {(s.shortDescription || "").length}/{SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                            </small>
                          </label>

                          <label className={styles.modernField}>
                            <span>Kategoria</span>
                            <select
                              className={styles.formInput}
                              value={s.category || "service"}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? { ...item, category: e.target.value }
                                      : item
                                  ),
                                }))
                              }
                            >
                              <option value="service">Usługa</option>
                              <option value="product">Produkt</option>
                              <option value="project">Projekt</option>
                              <option value="artwork">Obraz / dzieło</option>
                              <option value="handmade">Rękodzieło</option>
                              <option value="lesson">Lekcja</option>
                              <option value="consultation">Konsultacja</option>
                              <option value="event">Event</option>
                              <option value="custom">Inne</option>
                            </select>
                          </label>

                          <label className={styles.featuredSwitch}>
                            <input
                              type="checkbox"
                              checked={!!s.featured}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? { ...item, featured: e.target.checked }
                                      : item
                                  ),
                                }))
                              }
                            />

                            <span>
                              <strong>Wyróżniona</strong>
                              <small>Mocniej pokazana na profilu.</small>
                            </span>
                          </label>

                          <label className={styles.featuredSwitch}>
                            <input
                              type="checkbox"
                              checked={s.isActive !== false}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? { ...item, isActive: e.target.checked }
                                      : item
                                  ),
                                }))
                              }
                            />

                            <span>
                              <strong>Aktywna</strong>
                              <small>Widoczna publicznie.</small>
                            </span>
                          </label>

                          <label className={styles.modernField}>
                            <span>Czas</span>

                            <input
                              type="number"
                              className={styles.formInput}
                              value={s.duration?.value ?? ""}
                              inputMode="numeric"
                              min={SERVICE_DURATION_LIMITS[s.duration?.unit || "minutes"]?.min || 1}
                              max={SERVICE_DURATION_LIMITS[s.duration?.unit || "minutes"]?.max || 999}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? {
                                        ...item,
                                        duration: {
                                          ...(item.duration || {}),
                                          value: cleanIntegerInput(e.target.value, 4),
                                        },
                                      }
                                      : item
                                  ),
                                }))
                              }
                              placeholder="Np. 60"
                            />

                            <small className={styles.fieldCounter}>
                              Dostępny zakres: {getDurationLimitText(s.duration?.unit || "minutes")}
                            </small>
                          </label>

                          <label className={styles.modernField}>
                            <span>Jednostka</span>
                            <select
                              className={styles.formInput}
                              value={s.duration?.unit || "minutes"}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? {
                                        ...item,
                                        duration: {
                                          ...(item.duration || {}),
                                          unit: e.target.value,
                                        },
                                      }
                                      : item
                                  ),
                                }))
                              }
                            >
                              <option value="minutes">minuty</option>
                              <option value="hours">godziny</option>
                              <option value="days">dni</option>
                              <option value="weeks">tygodnie</option>
                            </select>
                          </label>

                          <label className={styles.modernField}>
                            <span>Typ ceny</span>
                            <select
                              className={styles.formInput}
                              value={s.price?.mode || "contact"}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).map((item, idx) =>
                                    idx === i
                                      ? {
                                        ...item,
                                        price: {
                                          ...(item.price || {}),
                                          mode: e.target.value,
                                        },
                                      }
                                      : item
                                  ),
                                }))
                              }
                            >
                              <option value="contact">Wycena indywidualna</option>
                              <option value="fixed">Cena stała</option>
                              <option value="from">Cena od</option>
                              <option value="range">Zakres cen</option>
                              <option value="free">Darmowe</option>
                            </select>
                          </label>

                          {s.price?.mode === "fixed" && (
                            <label className={styles.modernField}>
                              <span>Kwota</span>
                              <input
                                type="number"
                                className={styles.formInput}
                                value={s.price?.amount ?? ""}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          price: {
                                            ...(item.price || {}),
                                            amount: e.target.value,
                                          },
                                        }
                                        : item
                                    ),
                                  }))
                                }
                                placeholder="Np. 200"
                              />
                            </label>
                          )}

                          {s.price?.mode === "from" && (
                            <label className={styles.modernField}>
                              <span>Cena od</span>
                              <input
                                type="number"
                                className={styles.formInput}
                                value={s.price?.from ?? ""}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          price: {
                                            ...(item.price || {}),
                                            from: e.target.value,
                                          },
                                        }
                                        : item
                                    ),
                                  }))
                                }
                                placeholder="Np. 150"
                              />
                            </label>
                          )}

                          {s.price?.mode === "range" && (
                            <>
                              <label className={styles.modernField}>
                                <span>Cena od</span>
                                <input
                                  type="number"
                                  className={styles.formInput}
                                  value={s.price?.from ?? ""}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      services: (prev.services || []).map((item, idx) =>
                                        idx === i
                                          ? {
                                            ...item,
                                            price: {
                                              ...(item.price || {}),
                                              from: e.target.value,
                                            },
                                          }
                                          : item
                                      ),
                                    }))
                                  }
                                  placeholder="Np. 150"
                                />
                              </label>

                              <label className={styles.modernField}>
                                <span>Cena do</span>
                                <input
                                  type="number"
                                  className={styles.formInput}
                                  value={s.price?.to ?? ""}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      services: (prev.services || []).map((item, idx) =>
                                        idx === i
                                          ? {
                                            ...item,
                                            price: {
                                              ...(item.price || {}),
                                              to: e.target.value,
                                            },
                                          }
                                          : item
                                      ),
                                    }))
                                  }
                                  placeholder="Np. 500"
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.offerEmpty}>
                      <FaTools />
                      <strong>Nie masz jeszcze dodanych usług</strong>
                      <span>
                        Dodaj pierwszą usługę, żeby klient od razu widział, co oferujesz.
                      </span>
                    </div>
                  )}
                </div>

                {formErrors.services && (
                  <small className={styles.error}>{formErrors.services}</small>
                )}

                <div className={styles.addServicePanel}>
                  <div className={styles.addServiceHead}>
                    <strong>Dodaj nową usługę</strong>
                    <span>
                      {editData.services?.length || 0}/{MAX_SERVICES} usług w obecnym planie
                    </span>
                  </div>

                  <div className={styles.addServiceGrid}>
                    <label className={styles.modernField}>
                      <span>Nazwa usługi</span>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={newService.name}
                        maxLength={SERVICE_NAME_MAX_LENGTH}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            name: cleanServiceText(e.target.value, SERVICE_NAME_MAX_LENGTH),
                          }))
                        }
                        placeholder="Np. Strzyżenie męskie"
                      />

                      <small className={styles.counter}>
                        {newService.name.length}/{SERVICE_NAME_MAX_LENGTH}
                      </small>
                    </label>

                    <label className={styles.modernField}>
                      <span>Krótki opis</span>
                      <textarea
                        className={styles.formTextarea}
                        value={newService.shortDescription}
                        maxLength={SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            shortDescription: cleanServiceText(
                              e.target.value,
                              SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
                            ),
                          }))
                        }
                        placeholder="Np. szybka rozmowa i wycena"
                      />

                      <small className={styles.counter}>
                        {newService.shortDescription.length}/{SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                      </small>
                    </label>

                    <label className={styles.modernField}>
                      <span>Kategoria</span>
                      <select
                        className={styles.formInput}
                        value={newService.category}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                      >
                        <option value="service">Usługa</option>
                        <option value="product">Produkt</option>
                        <option value="project">Projekt</option>
                        <option value="artwork">Obraz / dzieło</option>
                        <option value="handmade">Rękodzieło</option>
                        <option value="lesson">Lekcja</option>
                        <option value="consultation">Konsultacja</option>
                        <option value="event">Event</option>
                        <option value="custom">Inne</option>
                      </select>
                    </label>

                    <label className={styles.modernField}>
                      <span>Czas</span>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={newService.durationValue}
                        inputMode="numeric"
                        min={SERVICE_DURATION_LIMITS[newService.durationUnit]?.min || 1}
                        max={SERVICE_DURATION_LIMITS[newService.durationUnit]?.max || 999}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            durationValue: cleanIntegerInput(e.target.value, 4),
                          }))
                        }
                        placeholder="Np. 60"
                      />
                    </label>

                    <label className={styles.modernField}>
                      <span>Jednostka czasu</span>
                      <select
                        className={styles.formInput}
                        value={newService.durationUnit}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            durationUnit: e.target.value,
                          }))
                        }
                      >
                        <option value="minutes">minuty</option>
                        <option value="hours">godziny</option>
                        <option value="days">dni</option>
                        <option value="weeks">tygodnie</option>
                      </select>
                    </label>

                    <label className={styles.modernField}>
                      <span>Typ ceny</span>
                      <select
                        className={styles.formInput}
                        value={newService.priceMode}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            priceMode: e.target.value,
                            priceValue: '',
                            priceFrom: '',
                            priceTo: '',
                          }))
                        }
                      >
                        <option value="contact">Wycena indywidualna</option>
                        <option value="fixed">Cena stała</option>
                        <option value="from">Cena od</option>
                        <option value="range">Zakres cen</option>
                        <option value="free">Darmowe</option>
                      </select>
                    </label>

                    {['fixed', 'from'].includes(newService.priceMode) && (
                      <label className={styles.modernField}>
                        <span>
                          {newService.priceMode === 'fixed' ? 'Cena stała' : 'Cena od'}
                        </span>

                        <input
                          type="number"
                          className={styles.formInput}
                          value={newService.priceValue}
                          inputMode="numeric"
                          min="0"
                          max={SERVICE_PRICE_MAX}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              priceValue: cleanIntegerInput(e.target.value, 7),
                            }))
                          }
                          placeholder="Np. 150"
                        />

                        <small className={styles.fieldCounter}>
                          Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                        </small>
                      </label>
                    )}
                    {newService.priceMode === 'range' && (
                      <>
                        <label className={styles.modernField}>
                          <span>Cena od</span>

                          <input
                            type="number"
                            className={styles.formInput}
                            value={newService.priceFrom}
                            inputMode="numeric"
                            min="0"
                            max={SERVICE_PRICE_MAX}
                            onChange={(e) =>
                              setNewService((prev) => ({
                                ...prev,
                                priceFrom: cleanIntegerInput(e.target.value, 7),
                              }))
                            }
                            placeholder="Od"
                          />

                          <small className={styles.fieldCounter}>
                            Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                          </small>
                        </label>

                        <label className={styles.modernField}>
                          <span>Cena do</span>

                          <input
                            type="number"
                            className={styles.formInput}
                            value={newService.priceTo}
                            inputMode="numeric"
                            min="0"
                            max={SERVICE_PRICE_MAX}
                            onChange={(e) =>
                              setNewService((prev) => ({
                                ...prev,
                                priceTo: cleanIntegerInput(e.target.value, 7),
                              }))
                            }
                            placeholder="Do"
                          />

                          <small className={styles.fieldCounter}>
                            Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                          </small>
                        </label>
                      </>
                    )}

                    <label className={styles.featuredSwitch}>
                      <input
                        type="checkbox"
                        checked={!!newService.featured}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            featured: e.target.checked,
                          }))
                        }
                      />

                      <span>
                        <strong>Wyróżniona usługa</strong>
                        <small>Będzie mocniej zaakcentowana na profilu.</small>
                      </span>
                    </label>

                    <label className={styles.featuredSwitch}>
                      <input
                        type="checkbox"
                        checked={!!newService.isActive}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                      />

                      <span>
                        <strong>Aktywna</strong>
                        <small>Usługa będzie widoczna publicznie.</small>
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className={styles.primary}
                    onClick={handleAddEditableService}
                    disabled={(editData.services || []).length >= MAX_SERVICES}
                  >
                    <FaPlus /> Dodaj usługę
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.servicesViewGrid}>
                {profile.services?.length ? (
                  profile.services.map((service, index) => (
                    <article
                      key={service._id || index}
                      className={`${styles.serviceModernView} ${service.featured ? styles.serviceModernFeatured : ""
                        }`}
                    >
                      <div className={styles.serviceModernMedia}>
                        {getServiceImageUrl(service) ? (
                          <img src={getServiceImageUrl(service)} alt={service.name || "Usługa"} />
                        ) : (
                          <FaTools />
                        )}
                      </div>

                      <div>
                        <div className={styles.serviceBadges}>
                          <span>{mapServiceCategory(service.category)}</span>

                          {service.featured && (
                            <span className={styles.featuredBadge}>Wyróżniona</span>
                          )}

                          {service.isActive === false && (
                            <span className={styles.inactiveBadge}>Ukryta</span>
                          )}
                        </div>

                        <strong>{service.name}</strong>

                        {service.shortDescription && (
                          <p>{service.shortDescription}</p>
                        )}

                        <div className={styles.serviceMetaRow}>
                          <span>
                            {service.duration?.value
                              ? `${service.duration.value} ${mapUnit(service.duration.unit)}`
                              : "czas do ustalenia"}
                          </span>

                          <span>{formatServicePrice(service)}</span>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.offerEmpty}>
                    <FaTools />
                    <strong>Brak usług</strong>
                    <span>Nie dodano jeszcze usług do profilu.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WYJĄTKI DOSTĘPNOŚCI */}
          <div className={`${styles.offerPanel} ${styles.datesPanel}`}>
            <div className={styles.offerPanelHead}>
              <div className={styles.offerIcon}>
                <FaCalendarAlt />
              </div>

              <div>
                <strong>Wyjątki dostępności</strong>
                <span>
                  Dodaj urlop, wyjazd, prywatną blokadę dnia albo konkretny zakres godzin,
                  którego nie chcesz udostępniać klientom.
                </span>
              </div>
            </div>

            {isEditing ? (
              <>
                {!canUseBooking ? (
                  <div className={styles.upgradeNotice}>
                    <strong>Wyjątki dostępności są dostępne w planie Premium.</strong>
                    <span>
                      Po włączeniu rezerwacji możesz blokować całe dni lub konkretne godziny.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className={styles.availabilityEditor}>
                      <label className={styles.modernField}>
                        <span>Typ blokady</span>

                        <select
                          className={styles.formInput}
                          value={newAvailabilityBlock.type}
                          onChange={(e) =>
                            setNewAvailabilityBlock((prev) => ({
                              ...prev,
                              type: e.target.value,
                              date: "",
                              dateFrom: "",
                              dateTo: "",
                              fromTime: e.target.value === "slot" ? prev.fromTime : "",
                              toTime: e.target.value === "slot" ? prev.toTime : "",
                            }))
                          }
                        >
                          <option value="day">Cały dzień</option>
                          <option value="dayRange">Zakres dni</option>
                          <option value="slot">Konkretne godziny</option>
                        </select>
                      </label>

                      {newAvailabilityBlock.type !== "dayRange" ? (
                        <label className={styles.modernField}>
                          <span>Data</span>

                          <input
                            type="date"
                            className={styles.formInput}
                            value={newAvailabilityBlock.date}
                            onChange={(e) =>
                              setNewAvailabilityBlock((prev) => ({
                                ...prev,
                                date: e.target.value,
                              }))
                            }
                          />
                        </label>
                      ) : (
                        <>
                          <label className={styles.modernField}>
                            <span>Data od</span>

                            <input
                              type="date"
                              className={styles.formInput}
                              value={newAvailabilityBlock.dateFrom}
                              onChange={(e) =>
                                setNewAvailabilityBlock((prev) => ({
                                  ...prev,
                                  dateFrom: e.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className={styles.modernField}>
                            <span>Data do</span>

                            <input
                              type="date"
                              className={styles.formInput}
                              value={newAvailabilityBlock.dateTo}
                              onChange={(e) =>
                                setNewAvailabilityBlock((prev) => ({
                                  ...prev,
                                  dateTo: e.target.value,
                                }))
                              }
                            />
                          </label>
                        </>
                      )}

                      {newAvailabilityBlock.type === "slot" && (
                        <>
                          <label className={styles.modernField}>
                            <span>Od</span>

                            <input
                              type="time"
                              className={styles.formInput}
                              value={newAvailabilityBlock.fromTime}
                              onChange={(e) =>
                                setNewAvailabilityBlock((prev) => ({
                                  ...prev,
                                  fromTime: e.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className={styles.modernField}>
                            <span>Do</span>

                            <input
                              type="time"
                              className={styles.formInput}
                              value={newAvailabilityBlock.toTime}
                              onChange={(e) =>
                                setNewAvailabilityBlock((prev) => ({
                                  ...prev,
                                  toTime: e.target.value,
                                }))
                              }
                            />
                          </label>
                        </>
                      )}

                      <label className={styles.modernField}>
                        <span>Powód</span>

                        <input
                          type="text"
                          className={styles.formInput}
                          maxLength={120}
                          placeholder="Np. urlop, wyjazd, sprawy prywatne"
                          value={newAvailabilityBlock.reason}
                          onChange={(e) =>
                            setNewAvailabilityBlock((prev) => ({
                              ...prev,
                              reason: e.target.value,
                            }))
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className={styles.primary}
                        onClick={handleAddAvailabilityBlock}
                      >
                        <FaPlus />
                        {newAvailabilityBlock.type === "dayRange" ? "Dodaj zakres" : "Dodaj blokadę"}
                      </button>
                    </div>

                    <div className={styles.availabilityList}>
                      {groupedEditAvailability.length > 0 ? (
                        groupedEditAvailability.map((group, index) => (
                          <div
                            key={`${group.kind}-${group.from}-${group.to}-${group.fromTime}-${group.toTime}-${index}`}
                            className={styles.availabilityItem}
                          >
                            <div>
                              <strong>{getAvailabilityGroupTitle(group)}</strong>

                              {group.reason && <span>{group.reason}</span>}

                              {group.kind === "day" && group.indices.length > 1 && (
                                <span>
                                  Zakres obejmuje {group.indices.length} dni.
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() => handleRemoveAvailabilityGroup(group.indices)}
                            >
                              <FaTrash /> Usuń
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className={styles.infoMuted}>
                          Nie dodano jeszcze żadnych wyjątków dostępności.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={styles.availabilityList}>
                {groupedProfileAvailability.length > 0 ? (
                  groupedProfileAvailability.map((group, index) => (
                    <div
                      key={`${group.kind}-${group.from}-${group.to}-${group.fromTime}-${group.toTime}-${index}`}
                      className={styles.availabilityItem}
                    >
                      <div>
                        <strong>{getAvailabilityGroupTitle(group)}</strong>

                        {group.reason && <span>{group.reason}</span>}

                        {group.kind === "day" && group.indices.length > 1 && (
                          <span>
                            Zakres obejmuje {group.indices.length} dni.
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.infoMuted}>
                    Brak dodatkowych blokad dostępności.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================
  PRACOWNICY
========================= */}
      <section className={`${styles.card} ${styles.staffCard}`} id="staffSection">
        <div className={styles.cardGlow} aria-hidden="true" />

        <div className={styles.sectionTop}>
          <div>
            <span className={styles.sectionKicker}>Zespół</span>

            <h3 className={styles.sectionTitle}>Pracownicy</h3>

            <p className={styles.sectionLead}>
              Dodawaj członków zespołu, przypisuj im usługi i zarządzaj ich dostępnością w rezerwacjach.
            </p>
          </div>

          <div className={styles.sectionBadge}>
            <FaUsers />
            <span>{canUseTeam ? `Premium · max ${MAX_STAFF}` : "Zablokowane"}</span>
          </div>
        </div>

        <div className={styles.staffBody}>
          {!canUseTeam && (
            <div className={styles.upgradeNotice}>
              <strong>Pracownicy są dostępni tylko w planie Premium.</strong>
              <span>
                W planie Starter i Standard możesz prowadzić profil jako jedna osoba.
                Po przejściu na Premium odblokujesz dodawanie pracowników, przypisywanie usług,
                pojemność rezerwacji i wybór pracownika przez klienta.
              </span>

              {isEditing && (
                <button
                  type="button"
                  className={styles.planButton}
                  onClick={() => handleStartSubscription("premium")}
                  disabled={billingActionLoading === "premium"}
                >
                  {billingActionLoading === "premium"
                    ? "Przekierowanie..."
                    : "Odblokuj w Premium"}
                </button>
              )}
            </div>
          )}

          <div className={styles.staffStatsGrid}>
            <div className={styles.staffStatCard}>
              <strong>{canUseTeam ? `${currentStaffCount}/${MAX_STAFF}` : currentStaffCount}</strong>
              <span>pracowników</span>
            </div>

            <div className={styles.staffStatCard}>
              <strong>
                {(staff || []).filter((person) => person.active !== false).length}
              </strong>
              <span>aktywnych</span>
            </div>

            <div className={styles.staffStatCard}>
              <strong>
                {(staff || []).reduce(
                  (sum, person) => sum + Number(person.capacity || 1),
                  0
                )}
              </strong>
              <span>łączna pojemność</span>
            </div>
          </div>

          {/* Lista pracowników */}
          {staffLoading ? (
            <div className={styles.staffLoadingBox}>
              Ładowanie pracowników…
            </div>
          ) : staff.length ? (
            <div className={`${styles.staffGrid} ${!canUseTeam ? styles.lockedSection : ""}`}>
              {staff.map((st) => {
                const edit = staffEdits[st._id] || st;
                const services = editData.services || [];
                const selected = new Set((edit?.serviceIds || []).map(String));
                const initials = String(edit.name || st.name || "P")
                  .trim()
                  .slice(0, 1)
                  .toUpperCase();

                return (
                  <article key={st._id} className={styles.staffPersonCard}>
                    <div className={styles.staffPersonTop}>
                      <div className={styles.staffAvatar}>
                        <span>{initials}</span>
                      </div>

                      <div className={styles.staffPersonMain}>
                        <span className={styles.staffId}>#{String(st._id).slice(-5)}</span>

                        {isEditing && canUseTeam ? (
                          <>
                            <input
                              className={styles.formInput}
                              value={edit.name ?? ""}
                              maxLength={STAFF_NAME_MAX_LENGTH}
                              onChange={(e) =>
                                setStaffEdits((prev) => ({
                                  ...prev,
                                  [st._id]: {
                                    ...edit,
                                    name: cleanStaffName(e.target.value),
                                  },
                                }))
                              }
                              placeholder="Imię i nazwisko"
                            />

                            <small className={styles.fieldCounter}>
                              {(edit.name || "").length}/{STAFF_NAME_MAX_LENGTH}
                            </small>
                          </>
                        ) : (
                          <strong>{st.name}</strong>
                        )}
                      </div>

                      {!isEditing && (
                        <span
                          className={`${styles.statusPill} ${st.active ? styles.statusActive : styles.statusInactive
                            }`}
                        >
                          {st.active ? "Aktywny" : "Nieaktywny"}
                        </span>
                      )}
                    </div>

                    <div className={styles.staffDetailsGrid}>
                      <div className={styles.staffDetailBox}>
                        <span>Status</span>

                        {isEditing && canUseTeam ? (
                          <label className={styles.staffSwitch}>
                            <input
                              type="checkbox"
                              checked={!!(edit.active ?? true)}
                              onChange={(e) =>
                                setStaffEdits((prev) => ({
                                  ...prev,
                                  [st._id]: { ...edit, active: e.target.checked },
                                }))
                              }
                            />
                            <strong>{edit.active !== false ? "Aktywny" : "Nieaktywny"}</strong>
                          </label>
                        ) : (
                          <strong>{st.active ? "Aktywny" : "Nieaktywny"}</strong>
                        )}
                      </div>

                      <div className={styles.staffDetailBox}>
                        <span>Pojemność</span>

                        {isEditing && canUseTeam ? (
                          <input
                            type="number"
                            min={1}
                            className={styles.formInput}
                            value={edit.capacity ?? 1}
                            onChange={(e) =>
                              setStaffEdits((prev) => ({
                                ...prev,
                                [st._id]: {
                                  ...edit,
                                  capacity: Math.max(
                                    1,
                                    parseInt(e.target.value || "1", 10)
                                  ),
                                },
                              }))
                            }
                          />
                        ) : (
                          <strong>{st.capacity || 1}</strong>
                        )}
                      </div>
                    </div>

                    <div className={styles.staffServicesBox}>
                      <div className={styles.staffMiniTitle}>
                        <FaTools />
                        <span>Przypisane usługi</span>
                      </div>

                      {isEditing && canUseTeam ? (
                        services.length ? (
                          <div className={styles.staffServicePicker}>
                            {services.map((service) => {
                              const serviceId = String(service._id);
                              const checked = selected.has(serviceId);

                              return (
                                <label
                                  key={service._id}
                                  className={`${styles.staffServiceChip} ${checked ? styles.staffServiceChipActive : ""
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = new Set(selected);

                                      if (e.target.checked) {
                                        next.add(serviceId);
                                      } else {
                                        next.delete(serviceId);
                                      }

                                      setStaffEdits((prev) => ({
                                        ...prev,
                                        [st._id]: {
                                          ...edit,
                                          serviceIds: Array.from(next),
                                        },
                                      }));
                                    }}
                                  />

                                  <span>{service.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={styles.infoMuted}>
                            Najpierw dodaj usługi w sekcji wyżej.
                          </div>
                        )
                      ) : (st.serviceIds || []).length ? (
                        <div className={styles.staffServiceTags}>
                          {(st.serviceIds || []).map((id) => {
                            const service = services.find(
                              (s) => String(s._id) === String(id)
                            );

                            return service ? (
                              <span key={id}>{service.name}</span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <div className={styles.infoMuted}>
                          Brak przypisanych usług.
                        </div>
                      )}
                    </div>

                    {isEditing && canUseTeam && (
                      <div className={styles.staffActions}>
                        <LoadingButton
                          type="button"
                          isLoading={deletingStaffIds.includes(st._id)}
                          disabled={deletingStaffIds.includes(st._id)}
                          className={styles.danger}
                          onClick={() => deleteStaff(st._id)}
                        >
                          <FaTrash /> Usuń
                        </LoadingButton>

                        {staffEdits[st._id] && (
                          <button
                            type="button"
                            className={styles.secondary}
                            onClick={() =>
                              setStaffEdits((prev) => {
                                const copy = { ...prev };
                                delete copy[st._id];
                                return copy;
                              })
                            }
                          >
                            <FaTimes /> Cofnij zmiany
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.staffEmpty}>
              <div className={styles.emptyIcon}>
                <FaUsers />
              </div>

              <strong>
                {canUseTeam
                  ? "Nie dodałeś/aś jeszcze żadnych pracowników"
                  : "Pracownicy są zablokowani w obecnym planie"}
              </strong>

              <p>
                {canUseTeam
                  ? "Dodaj pierwszą osobę do zespołu i przypisz jej usługi, które może obsługiwać."
                  : "Przejdź na Premium, aby zarządzać zespołem i rezerwacjami dla wielu osób."}
              </p>
            </div>
          )}

          {/* Dodawanie pracownika */}
          {isEditing ? (
            canUseTeam ? (
              <div className={styles.addStaffPanel}>
                <div className={styles.addStaffHead}>
                  <div>
                    <strong>Dodaj pracownika</strong>
                    <span>
                      {hasReachedStaffLimit
                        ? `Osiągnięto limit ${MAX_STAFF} pracowników w planie Premium.`
                        : "Nowa osoba będzie mogła obsługiwać wybrane usługi w systemie rezerwacji."}
                    </span>
                  </div>

                  <FaPlus />
                </div>

                <div className={styles.addStaffGrid}>
                  <label className={styles.modernField}>
                    <span>Imię i nazwisko</span>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Np. Anna Kowalska"
                      value={newStaff.name}
                      maxLength={STAFF_NAME_MAX_LENGTH}
                      onChange={(e) =>
                        setNewStaff((prev) => ({
                          ...prev,
                          name: cleanStaffName(e.target.value),
                        }))
                      }
                    />

                    <small className={styles.fieldCounter}>
                      {(newStaff.name || "").length}/{STAFF_NAME_MAX_LENGTH}
                    </small>
                  </label>

                  <label className={styles.modernField}>
                    <span>Pojemność</span>
                    <input
                      type="number"
                      className={styles.formInput}
                      min={1}
                      placeholder="Ile rezerwacji równolegle"
                      value={newStaff.capacity}
                      onChange={(e) =>
                        setNewStaff((prev) => ({
                          ...prev,
                          capacity: Math.max(
                            1,
                            parseInt(e.target.value || "1", 10)
                          ),
                        }))
                      }
                    />
                  </label>

                  <label className={styles.featuredSwitch}>
                    <input
                      type="checkbox"
                      checked={newStaff.active}
                      onChange={(e) =>
                        setNewStaff((prev) => ({
                          ...prev,
                          active: e.target.checked,
                        }))
                      }
                    />

                    <span>
                      <strong>Aktywny</strong>
                      <small>Pracownik będzie dostępny w rezerwacjach.</small>
                    </span>
                  </label>
                </div>

                <div className={styles.staffServicesBox}>
                  <div className={styles.staffMiniTitle}>
                    <FaTools />
                    <span>Usługi dla nowego pracownika</span>
                  </div>

                  {(editData.services || []).length ? (
                    <div className={styles.staffServicePicker}>
                      {(editData.services || []).map((service) => {
                        const serviceId = String(service._id);
                        const checked = (newStaff.serviceIds || [])
                          .map(String)
                          .includes(serviceId);

                        return (
                          <label
                            key={service._id}
                            className={`${styles.staffServiceChip} ${checked ? styles.staffServiceChipActive : ""
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setNewStaff((prev) => {
                                  const current = (prev.serviceIds || []).map(String);

                                  return {
                                    ...prev,
                                    serviceIds: e.target.checked
                                      ? [...new Set([...current, serviceId])]
                                      : current.filter((id) => id !== serviceId),
                                  };
                                })
                              }
                            />

                            <span>{service.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.infoMuted}>
                      Najpierw dodaj usługi w sekcji wyżej.
                    </div>
                  )}
                </div>

                <LoadingButton
                  type="button"
                  isLoading={isCreatingStaff}
                  disabled={isCreatingStaff || hasReachedStaffLimit}
                  className={styles.primary}
                  onClick={createStaff}
                >
                  <FaPlus /> {hasReachedStaffLimit ? "Limit pracowników" : "Dodaj pracownika"}
                </LoadingButton>
              </div>
            ) : (
              <div className={styles.lockedFeatureBox}>
                <div>
                  <strong>Dodawanie pracowników jest zablokowane.</strong>
                  <span>
                    Ta funkcja wymaga planu Premium, ponieważ działa razem z kalendarzem,
                    przypisywaniem usług i obsługą rezerwacji zespołowych.
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.planButton}
                  onClick={() => handleStartSubscription("premium")}
                  disabled={billingActionLoading === "premium"}
                >
                  {billingActionLoading === "premium"
                    ? "Przekierowanie..."
                    : "Odblokuj w Premium"}
                </button>
              </div>
            )
          ) : (
            <div className={styles.infoMuted}>
              {canUseTeam ? (
                <>
                  Aby dodać lub edytować pracownika, kliknij <strong>Edytuj profil</strong>.
                </>
              ) : (
                <>
                  Sekcja pracowników jest dostępna w planie <strong>Premium</strong>.
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default OfferSection;
