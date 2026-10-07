import { FiArrowDown, FiArrowUp, FiSliders } from 'react-icons/fi';
import { DESIGN_OPTIONS, DESIGN_PRESETS, SECTION_LABELS, VISIBILITY_LABELS, normalizeProfileDesign } from '../../../utils/profileDesign';
import ProfileDesignPreview from './ProfileDesignPreview';
import styles from './AppearanceSection.module.scss';

const AppearanceSection = ({ profile, editData, isEditing, canUsePremiumThemes, onEditDataChange, showPreview = true }) => {
  const source = isEditing ? editData?.theme : profile?.theme;
  // Keep the draft intact while typing; normalization trims text on save.
  const theme = { ...normalizeProfileDesign(source), ...(isEditing && {
    tagline: source?.tagline ?? '', ctaLabel: source?.ctaLabel ?? '',
  }) };
  const editable = isEditing && canUsePremiumThemes;
  const update = (changes) => onEditDataChange(prev => ({ ...prev, theme: { ...normalizeProfileDesign(prev.theme), tagline: prev.theme?.tagline ?? '', ctaLabel: prev.theme?.ctaLabel ?? '', ...changes } }));
  const move = (index, direction) => {
    const order = [...theme.sectionOrder];
    [order[index], order[index + direction]] = [order[index + direction], order[index]];
    update({ sectionOrder: order });
  };
  const select = (key, label) => <label className={styles.field} key={key}><span>{label}</span><select value={theme[key]} onChange={event => update({ [key]: event.target.value })}>{DESIGN_OPTIONS[key].map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>;
  return (
    <section className={styles.card} id="appearanceSection" aria-labelledby="appearance-title">
      <header className={styles.header}><div><span className={styles.kicker}>Twoja marka / Twój styl</span><h2 id="appearance-title">Zaprojektuj swoją wizytówkę.</h2><p>Wybierz kierunek, dopracuj detale i ułóż treść. Zmiany zapiszesz przyciskiem „Zapisz zmiany”.</p></div><FiSliders aria-hidden="true" /></header>
      {!editable && <p className={styles.notice}>{!canUsePremiumThemes ? 'Kreator wyglądu jest dostępny w planach Standard i Premium.' : 'Włącz edycję profilu, aby zmienić wygląd wizytówki.'}</p>}
      <div className={showPreview ? styles.workbench : styles.settingsOnly}>
        <div className={styles.settings}>
          <fieldset disabled={!editable}>
            <legend>01 / Wybierz kierunek</legend>
            <div className={styles.presets}>{DESIGN_PRESETS.map(preset => <button type="button" key={preset.name} onClick={() => update({ ...preset.theme, sections: theme.sections, sectionOrder: theme.sectionOrder, ctaLabel: theme.ctaLabel, tagline: theme.tagline })}><span style={{ background: `linear-gradient(135deg,${preset.theme.primary},${preset.theme.secondary})` }} aria-hidden="true" />{preset.name}</button>)}</div>
            <div className={styles.grid}>{select('style', 'Charakter kart')}{select('mode', 'Motyw strony')}{select('headingFont', 'Czcionka nagłówków')}{select('bodyFont', 'Czcionka tekstu')}{select('layout', 'Układ wizytówki')}{select('density', 'Odstępy')}{select('contentWidth', 'Szerokość profilu')}{select('serviceLayout', 'Prezentacja usług')}</div>
            <p className={styles.help}>Układ „Wizytówka + panel kontaktu” łączy banner i dane w jednej ramce, ze statystykami obok na desktopie. Na telefonie panel przechodzi pod banner.</p>
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>02 / Kolory i detale</legend>
            <p className={styles.help}>Gotowa paleta zmienia tylko kolory — zachowuje układ, czcionki i treść.</p>
            <div className={styles.palettes}>{DESIGN_PRESETS.map(preset => <button type="button" key={preset.name} onClick={() => update(Object.fromEntries(['primary', 'secondary', 'background', 'surface', 'text', 'muted', 'mode', 'variant'].map(key => [key, preset.theme[key]])))}><span aria-hidden="true">{['primary', 'secondary', 'background'].map(key => <i key={key} style={{ background: preset.theme[key] || '#f1eee4' }} />)}</span>Paleta {preset.name}</button>)}</div>
            <div className={styles.grid}>{[['primary', 'Akcent główny', '#6557ef'], ['secondary', 'Akcent dodatkowy', '#d8ff72'], ['background', 'Tło strony', '#f1eee4'], ['surface', 'Tło kart', '#fffdf8'], ['text', 'Tekst', '#171917'], ['muted', 'Tekst pomocniczy', '#686c65'], ['border', 'Kolor obramowań', '#171917'], ['heroText', 'Tekst na bannerze', '#ffffff']].map(([key, label, fallback]) => <label className={styles.field} key={key}><span>{label}</span><div className={styles.colorField}><input aria-label={label} type="color" value={theme[key] || fallback} onChange={event => update({ [key]: event.target.value, variant: 'custom' })} /><code>{theme[key] || 'Automatycznie'}</code><button type="button" aria-label={`Resetuj: ${label}`} onClick={() => update({ [key]: key === 'primary' ? '#6557ef' : key === 'secondary' ? '#d8ff72' : key === 'heroText' ? '#ffffff' : '' })}>↺</button></div></label>)}</div>
            <div className={styles.grid}>{select('backgroundStyle', 'Wzór tła')}{select('bannerStyle', 'Tło wizytówki')}{select('radius', 'Kształt kart')}{select('shadow', 'Cienie')}{select('motion', 'Efekty wejścia')}<label className={styles.field}><span>Kąt gradientu: {theme.gradientAngle}°</span><input type="range" min="0" max="360" step="5" value={theme.gradientAngle} onChange={event => update({ gradientAngle: Number(event.target.value) })} /></label></div>
            <label className={styles.check}><input type="checkbox" checked={theme.decorations} onChange={event => update({ decorations: event.target.checked })} />Kształty i dekoracje w tle</label>
            <div className={styles.grid}>{select('borderStyle', 'Rodzaj obramowania')}{select('buttonStyle', 'Styl przycisków')}<label className={styles.field}><span>Grubość obramowania: {theme.borderWidth} px</span><input aria-label="Grubość obramowania" type="range" min="1" max="3" value={theme.borderWidth} onChange={event => update({ borderWidth: Number(event.target.value) })} /></label></div>
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>03 / Banner i pierwsze wrażenie</legend>
            <div className={styles.grid}>{select('heroAlignment', 'Wyrównanie danych na bannerze')}{select('titleSize', 'Wielkość nazwy profilu')}{select('avatarShape', 'Kształt zdjęcia profilowego')}{select('bannerPosition', 'Kadrowanie zdjęcia w tle')}</div>
            <label className={styles.check}><input type="checkbox" checked={theme.showBanner} onChange={event => update({ showBanner: event.target.checked })} />Pokaż wgrane zdjęcie jako banner</label>
            <p className={styles.help}>Gdy wyłączysz zdjęcie, użyjemy wybranego koloru lub gradientu. Zdjęcie pozostanie zapisane. Wgraj je w sekcji zdjęć i mediów.</p>
            <label className={styles.field}><span>Przyciemnienie bannera: {theme.bannerOverlay}%</span><input aria-label="Przyciemnienie bannera" type="range" min="0" max="85" step="5" value={theme.bannerOverlay} onChange={event => update({ bannerOverlay: Number(event.target.value) })} /></label>
            <p className={styles.help}>Dopasuj przyciemnienie i kolor tekstu tak, aby nazwa była czytelna na Twoim zdjęciu.</p>
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>04 / Treść i sekcje</legend>
            <label className={styles.field}><span>Krótki tekst na wizytówce</span><input type="text" maxLength={120} aria-describedby="tagline-count" value={theme.tagline} placeholder="Np. Tworzę kadry, do których chcesz wracać." onChange={event => update({ tagline: event.target.value })} /></label>
            <p className={styles.help} id="tagline-count">{theme.tagline.length}/120 znaków · Jedno zdanie, które zapamiętają Twoi klienci.</p>
            <label className={styles.field}><span>Tekst przycisku wiadomości</span><input type="text" maxLength={40} aria-describedby="cta-count" value={theme.ctaLabel} placeholder="Napisz wiadomość" onChange={event => update({ ctaLabel: event.target.value })} /></label>
            <p className={styles.help} id="cta-count">{theme.ctaLabel.length}/40 znaków · Puste pole przywraca „Napisz wiadomość”.</p>
            <h3 className={styles.subheading}>Co pokażesz na wizytówce?</h3>
            <div className={styles.visibility}>{Object.entries(VISIBILITY_LABELS).map(([key, label]) => <label className={styles.check} key={key}><input type="checkbox" checked={theme.sections[key]} onChange={event => update({ sections: { ...theme.sections, [key]: event.target.checked } })} />{label}</label>)}</div>
            <p className={styles.help}>Ukrycie sekcji zmienia prezentację strony. Dane pozostają zapisane w profilu.</p>
            <h3 className={styles.subheading}>Kolejność opowiadania Twojej historii</h3>
            <ol className={styles.order}>{theme.sectionOrder.map((key, index) => <li key={key}><span>{SECTION_LABELS[key]}</span><button type="button" disabled={!editable || index === 0} aria-label={`Przesuń wyżej: ${SECTION_LABELS[key]}`} onClick={() => move(index, -1)}><FiArrowUp /></button><button type="button" disabled={!editable || index === theme.sectionOrder.length - 1} aria-label={`Przesuń niżej: ${SECTION_LABELS[key]}`} onClick={() => move(index, 1)}><FiArrowDown /></button></li>)}</ol>
          </fieldset>
        </div>
        {showPreview && <ProfileDesignPreview profile={profile} editData={editData} isEditing={isEditing} />}
      </div>
    </section>
  );
};
export default AppearanceSection;
