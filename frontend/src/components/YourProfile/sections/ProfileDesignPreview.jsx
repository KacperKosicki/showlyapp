import { useState } from 'react';
import PortfolioProjects from '../../PublicProfile/PortfolioProjects';
import { FiArrowUpRight, FiEye, FiImage, FiList, FiMapPin } from 'react-icons/fi';
import { SECTION_LABELS, normalizeProfileDesign, getProfileDesignVars, getProfileDesignAttributes, profileImageUrl, getProfileBookingPresentation } from '../../../utils/profileDesign';
import styles from './AppearanceSection.module.scss';

const ProfileDesignPreview = ({ profile, editData, isEditing }) => {
  const [device, setDevice] = useState('wide');
  const data = isEditing ? editData : profile;
  const theme = normalizeProfileDesign(data?.theme);
  const booking = getProfileBookingPresentation({ ...profile, ...data });
  const billing = profile?.billingPublic || profile?.billing || {};
  const plan = String(billing.effectivePlan || billing.plan || '').toLowerCase();
  const banner = theme.showBanner && ['standard', 'premium'].includes(plan) && profileImageUrl(data?.banner ?? profile?.banner);
  const services = (data?.services || []).filter(service => service.isActive !== false);
  const photos = data?.photos || [];
  const stats = [
    { key: 'visits', icon: FiEye, value: profile?.visits || 0, label: 'odwiedzin' },
    { key: 'price', icon: FiArrowUpRight, value: Number(data?.priceFrom) > 0 ? `od ${data.priceFrom} zł` : 'brak danych', label: 'cena' },
    { key: 'services', icon: FiList, value: services.length, label: 'usług' },
    { key: 'gallery', icon: FiImage, value: photos.length, label: 'zdjęć' },
  ].filter(stat => theme.sections[stat.key] !== false);
  return (
    <aside id="profileDesignPreview" className={styles.previewColumn} aria-label="Podgląd wyglądu wizytówki">
      <span className={styles.previewLabel}><FiEye aria-hidden="true" /> Podgląd na żywo</span>
      <div className={styles.previewModes} role="group" aria-label="Szerokość podglądu">
        <button type="button" aria-pressed={device === 'wide'} onClick={() => setDevice('wide')}>Szeroki</button>
        <button type="button" aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}>Telefon</button>
      </div>
      <div className={styles.previewViewport} data-device={device}>
        <div className={styles.preview} style={getProfileDesignVars(theme)} {...getProfileDesignAttributes(theme)}>
          <div className={styles.previewIdentity}>
            <div className={styles.previewHero}>
              <div className={styles.previewMedia} aria-hidden="true" style={{ backgroundImage: banner ? `url("${banner.replace(/"/g, '%22')}")` : 'var(--pp-banner)' }} />
              <div className={styles.previewShade} aria-hidden="true" />
              {theme.decorations && !banner && <span className={styles.previewDecoration} aria-hidden="true" />}
              <span className={styles.previewBadge}>Twój profil</span>
              {profileImageUrl(data?.avatar) ? <img className={styles.previewAvatar} src={profileImageUrl(data.avatar)} alt="" /> : <span className={styles.previewAvatar}>{(data?.name || 'S').slice(0, 1)}</span>}
              <p>{data?.role || 'Twój sposób działania'}</p>
              <h3>{data?.name || 'Twoja marka'}</h3>
              {theme.tagline && <p>{theme.tagline}</p>}
              {theme.availabilityLabel && <span className={styles.previewAvailability}>{theme.availabilityLabel}</span>}
              <span className={styles.previewLocation}><FiMapPin aria-hidden="true" />{data?.location || 'Twoja lokalizacja'}</span>
            </div>
            <div className={styles.previewPanel}>
              <span className={styles.previewAddress}>showly.me/{data?.slug || profile?.slug || 'twoja-marka'}</span>
              <div className={styles.previewStats}>{stats.map(({ key, icon: Icon, value, label }) => <div key={key}><Icon aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>)}</div>
              {booking.allowBookingUI && <span className={`${styles.previewButton} ${styles.previewPrimary}`}>{booking.bookBtnLabel}<FiArrowUpRight aria-hidden="true" /></span>}
              <span className={styles.previewButton}>{theme.ctaLabel || 'Napisz wiadomość'}<FiArrowUpRight aria-hidden="true" /></span>
            </div>
          </div>
          {theme.showSectionNav && <div className={styles.previewSectionNav} aria-label="Podgląd skrótów do sekcji">{theme.sectionOrder.filter(key => key === 'overview' ? ['description', 'contact', 'price', 'links'].some(section => theme.sections[section]) : theme.sections[key] && (key !== 'gallery' || photos.length > 0 || data?.projects?.length > 0) && (key !== 'services' || services.length > 0)).map(key => <span key={key}>{SECTION_LABELS[key]}</span>)}</div>}
          <div className={styles.previewContent}>{theme.sectionOrder.map(key => {
            const visible = key === 'overview' ? ['description', 'contact', 'price', 'links'].some(section => theme.sections[section]) : theme.sections[key];
            if (!visible) return null;
            return <div className={styles.previewSection} key={key}><strong>{SECTION_LABELS[key]}</strong>
              {key === 'overview' ? <>
                {theme.sections.description && <p>{(data?.description || 'Kilka słów o Twojej pracy i tym, co Cię wyróżnia.').slice(0, 140)}</p>}
                {theme.sections.contact && <p>{data?.contact?.email || data?.contact?.phone || 'Dane kontaktowe i social media'}</p>}
                {theme.sections.price && Number(data?.priceFrom) > 0 && <p>Od {data.priceFrom} zł</p>}
                {theme.sections.links && !!data?.links?.length && <p>{data.links.length} linków do Twojej pracy</p>}
              </> : key === 'services' ? <div className={styles.previewServices}>{services.length ? services.slice(0, 3).map((service, index) => <p key={service._id || index}>{service.name || service.title || 'Twoja usługa'}</p>) : <p>Twoja oferta. Konkretne możliwości.</p>}</div>
                : key === 'gallery' ? <><PortfolioProjects projects={data?.projects || []} photos={photos} compact /><div className={styles.previewPhotos}>{photos.length ? photos.slice(0, 3).map((photo, index) => <img key={index} src={profileImageUrl(photo)} alt="" />) : !data?.projects?.length && <p>Miejsce na Twoje realizacje.</p>}</div></>
                  : <p>Głos Twoich klientów.</p>}
            </div>;
          })}</div>
        </div>
      </div>
      <p className={styles.help}>Pomniejszony podgląd używa tych samych ustawień co publiczny profil. Pełną stronę zobaczysz po zapisaniu zmian.</p>
      <a className={styles.openProfile} href="#appearanceSection">Wróć do ustawień wyglądu ↑</a>
      {profile?.slug && <a className={styles.openProfile} href={`/${profile.slug}`} target="_blank" rel="noreferrer">Otwórz zapisany profil <FiArrowUpRight aria-hidden="true" /></a>}
    </aside>
  );
};
export default ProfileDesignPreview;
