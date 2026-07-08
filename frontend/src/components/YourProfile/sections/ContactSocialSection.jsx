import styles from "./ContactSocialSection.module.scss";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaGlobe,
  FaTiktok,
} from 'react-icons/fa';

const SOCIAL_ITEMS = (socials = {}) => [
  { key: 'website', label: 'Strona www', icon: <FaGlobe />, value: socials?.website },
  { key: 'facebook', label: 'Facebook', icon: <FaFacebook />, value: socials?.facebook },
  { key: 'instagram', label: 'Instagram', icon: <FaInstagram />, value: socials?.instagram },
  { key: 'youtube', label: 'YouTube', icon: <FaYoutube />, value: socials?.youtube },
  { key: 'tiktok', label: 'TikTok', icon: <FaTiktok />, value: socials?.tiktok },
];

const ContactSocialSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  setEditData,
  canUseSocialMedia,
  socialLinkMaxLength,
  contactEmailMaxLength,
  contactPhoneMaxLength,
  contactStreetMaxLength,
  contactPostcodeMaxLength,
  prettyUrl,
}) => {
  const socialItems = SOCIAL_ITEMS(profile?.socials || {});
  const hasSocialLinks = socialItems.some((item) => item.value);

  return (
<section className={`${styles.card} ${styles.contactSocialCard}`}>
  <div className={styles.cardGlow} aria-hidden="true" />

  <div className={styles.sectionTop}>
    <div>
      <span className={styles.sectionKicker}>Dane kontaktowe</span>

      <h3 className={styles.sectionTitle}>Kontakt i social media</h3>

      <p className={styles.sectionLead}>
        Uzupełnij dane kontaktowe i miejsca, w których klienci mogą Cię znaleźć
        lub szybko się z Tobą skontaktować.
      </p>
    </div>

    <div className={styles.sectionBadge}>
      <FaEnvelope />
      <span>Kontakt</span>
    </div>
  </div>

  <div className={styles.contactSocialBody}>
    {/* KONTAKT */}
    <div className={styles.contactPanel}>
      <div className={styles.contactPanelHead}>
        <div className={styles.contactIcon}>
          <FaEnvelope />
        </div>

        <div>
          <strong>Kontakt</strong>
          <span>E-mail, telefon oraz adres widoczny na profilu publicznym.</span>
        </div>
      </div>

      {isEditing ? (
        <div className={styles.contactModernGrid}>
          <label className={styles.modernField}>
            <span>E-mail</span>

            <input
              className={`${styles.formInput} ${formErrors.contactEmail ? styles.inputError : ""
                }`}
              value={editData.contact?.email || ""}
              maxLength={contactEmailMaxLength}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  contact: {
                    ...(prev.contact || {}),
                    email: e.target.value.slice(0, contactEmailMaxLength),
                  },
                }))
              }
              placeholder="np. kontakt@twojadomena.pl"
            />

            {formErrors.contactEmail && (
              <small className={styles.error}>{formErrors.contactEmail}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>Telefon</span>

            <input
              className={`${styles.formInput} ${formErrors.contactPhone ? styles.inputError : ""
                }`}
              value={editData.contact?.phone || ""}
              maxLength={contactPhoneMaxLength}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  contact: {
                    ...(prev.contact || {}),
                    phone: e.target.value.slice(0, contactPhoneMaxLength),
                  },
                }))
              }
              placeholder="np. +48 123 456 789"
            />

            {formErrors.contactPhone && (
              <small className={styles.error}>{formErrors.contactPhone}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>Miejscowość</span>

            <input
              className={styles.formInput}
              value={editData.location || ""}
              disabled
              title="Miejscowość edytujesz w sekcji Dane podstawowe"
            />

            <small className={styles.hint}>
              Miejscowość ustawiasz w sekcji „Dane podstawowe”.
            </small>
          </label>

          <label className={styles.modernField}>
            <span>Kod pocztowy</span>

            <input
              className={`${styles.formInput} ${formErrors.contactPostcode ? styles.inputError : ""
                }`}
              value={editData.contact?.postcode || ""}
              maxLength={contactPostcodeMaxLength}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  contact: {
                    ...(prev.contact || {}),
                    postcode: e.target.value.slice(0, contactPostcodeMaxLength),
                  },
                }))
              }
              placeholder="np. 64-761"
            />

            {formErrors.contactPostcode && (
              <small className={styles.error}>{formErrors.contactPostcode}</small>
            )}
          </label>

          <label className={`${styles.modernField} ${styles.contactWideField}`}>
            <span>Ulica / adres</span>

            <input
              className={`${styles.formInput} ${formErrors.contactStreet ? styles.inputError : ""
                }`}
              value={editData.contact?.street || ""}
              maxLength={contactStreetMaxLength}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  contact: {
                    ...(prev.contact || {}),
                    street: e.target.value.slice(0, contactStreetMaxLength),
                  },
                }))
              }
              placeholder="np. ul. Kwiatowa 12"
            />

            {formErrors.contactStreet && (
              <small className={styles.error}>{formErrors.contactStreet}</small>
            )}
          </label>
        </div>
      ) : (
        <div className={styles.contactViewGrid}>
          <div className={styles.contactInfoCard}>
            <FaEnvelope />
            <span>E-mail</span>
            <strong>{profile.contact?.email || "—"}</strong>
          </div>

          <div className={styles.contactInfoCard}>
            <FaPhone />
            <span>Telefon</span>
            <strong>{profile.contact?.phone || "—"}</strong>
          </div>

          <div className={`${styles.contactInfoCard} ${styles.contactAddressCard}`}>
            <FaMapMarkerAlt />
            <span>Adres</span>
            <strong>
              {profile.contact?.addressFull ||
                [profile.location, profile.contact?.postcode, profile.contact?.street]
                  .filter(Boolean)
                  .join(", ") ||
                "—"}
            </strong>
          </div>
        </div>
      )}
    </div>

    {/* SOCIAL MEDIA */}
    <div className={styles.contactPanel}>
      <div className={styles.contactPanelHead}>
        <div className={styles.contactIcon}>
          <FaGlobe />
        </div>

        <div>
          <strong>Social media</strong>
          <span>Dodaj miejsca, w których pokazujesz swoje realizacje lub ofertę.</span>
        </div>
      </div>

      {!canUseSocialMedia && isEditing && (
        <div className={styles.upgradeNotice}>
          <strong>Social media są dostępne w planie Standard i Premium.</strong>
          <span>
            W planie Starter możesz uzupełnić podstawowy kontakt, ale linki social
            media są zablokowane.
          </span>
        </div>
      )}

      {isEditing ? (
        <div
          className={`${styles.socialEditorGrid} ${!canUseSocialMedia ? styles.disabledOption : ""
            }`}
        >
          <label className={styles.modernField}>
            <span>Strona www</span>

            <input
              className={`${styles.formInput} ${formErrors.social_website ? styles.inputError : ""
                }`}
              value={editData.socials?.website || ""}
              maxLength={socialLinkMaxLength}
              disabled={!canUseSocialMedia}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  socials: {
                    ...(prev.socials || {}),
                    website: e.target.value.slice(0, socialLinkMaxLength),
                  },
                }))
              }
              placeholder="np. twojastrona.pl"
            />

            {formErrors.social_website && (
              <small className={styles.error}>{formErrors.social_website}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>Facebook</span>

            <input
              className={`${styles.formInput} ${formErrors.social_facebook ? styles.inputError : ""
                }`}
              value={editData.socials?.facebook || ""}
              maxLength={socialLinkMaxLength}
              disabled={!canUseSocialMedia}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  socials: {
                    ...(prev.socials || {}),
                    facebook: e.target.value.slice(0, socialLinkMaxLength),
                  },
                }))
              }
              placeholder="np. facebook.com/twojprofil"
            />

            {formErrors.social_facebook && (
              <small className={styles.error}>{formErrors.social_facebook}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>Instagram</span>

            <input
              className={`${styles.formInput} ${formErrors.social_instagram ? styles.inputError : ""
                }`}
              value={editData.socials?.instagram || ""}
              maxLength={socialLinkMaxLength}
              disabled={!canUseSocialMedia}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  socials: {
                    ...(prev.socials || {}),
                    instagram: e.target.value.slice(0, socialLinkMaxLength),
                  },
                }))
              }
              placeholder="np. instagram.com/twojprofil"
            />

            {formErrors.social_instagram && (
              <small className={styles.error}>{formErrors.social_instagram}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>YouTube</span>

            <input
              className={`${styles.formInput} ${formErrors.social_youtube ? styles.inputError : ""
                }`}
              value={editData.socials?.youtube || ""}
              maxLength={socialLinkMaxLength}
              disabled={!canUseSocialMedia}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  socials: {
                    ...(prev.socials || {}),
                    youtube: e.target.value.slice(0, socialLinkMaxLength),
                  },
                }))
              }
              placeholder="np. youtube.com/@twojkanal"
            />

            {formErrors.social_youtube && (
              <small className={styles.error}>{formErrors.social_youtube}</small>
            )}
          </label>

          <label className={styles.modernField}>
            <span>TikTok</span>

            <input
              className={`${styles.formInput} ${formErrors.social_tiktok ? styles.inputError : ""
                }`}
              value={editData.socials?.tiktok || ""}
              maxLength={socialLinkMaxLength}
              disabled={!canUseSocialMedia}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  socials: {
                    ...(prev.socials || {}),
                    tiktok: e.target.value.slice(0, socialLinkMaxLength),
                  },
                }))
              }
              placeholder="np. tiktok.com/@twojprofil"
            />

            {formErrors.social_tiktok && (
              <small className={styles.error}>{formErrors.social_tiktok}</small>
            )}
          </label>
        </div>
      ) : (
        <>
          {hasSocialLinks ? (
            <div className={styles.socialLinksGrid}>
              {socialItems
                .filter((item) => item.value)
                .map((item) => (
                  <a
                    key={item.key}
                    href={
                      item.value.startsWith("http")
                        ? item.value
                        : `https://${item.value}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLinkCard}
                  >
                    <span>{item.icon}</span>

                    <div>
                      <strong>{item.label}</strong>
                      <small>{prettyUrl(item.value)}</small>
                    </div>
                  </a>
                ))}
            </div>
          ) : (
            <div className={styles.mediaEmpty}>
              <FaGlobe />
              <strong>Nie dodałeś/aś jeszcze social mediów</strong>
              <span>
                Dodaj linki do miejsc, w których pokazujesz swoje realizacje lub
                kontaktujesz się z klientami.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  </div>
</section>
  );
};

export default ContactSocialSection;
