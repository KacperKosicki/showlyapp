import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight, FiArrowUpRight, FiCalendar, FiCheck, FiImage,
  FiMapPin, FiMessageCircle, FiSearch, FiSliders, FiStar,
} from "react-icons/fi";
import styles from "./HowShowlyWorks.module.scss";

const steps = [
  {
    icon: FiSearch, label: "Znajdź", title: "Zacznij od tego, czego potrzebujesz.",
    text: "Fotograf, DJ, a może ktoś do nowego projektu? Wpisz usługę, nazwę lub miejscowość i poznaj pasujące profile.",
    tip: "Nie musisz znać nazwy firmy. Wystarczy pomysł na to, czego szukasz.",
    tags: ["Usługa", "Osoba", "Lokalizacja"],
  },
  {
    icon: FiStar, label: "Poznaj", title: "Zobacz więcej niż samą nazwę.",
    text: "Sprawdź ofertę, zdjęcia realizacji, ceny i opinie dostępne na profilu. Porównaj to, co jest dla Ciebie ważne.",
    tip: "Każdy profil ma swój charakter. Wybierz osobę, której praca do Ciebie pasuje.",
    tags: ["Oferta", "Realizacje", "Opinie"],
  },
  {
    icon: FiMessageCircle, label: "Porozmawiaj", title: "Dobry kontakt to dobry początek.",
    text: "Zapytaj o szczegóły przez wiadomość lub skorzystaj z kontaktu udostępnionego na profilu. Opisz, czego potrzebujesz.",
    tip: "Podaj zakres usługi i planowany termin — łatwiej będzie ustalić konkrety.",
    tags: ["Wiadomość", "Szczegóły", "Ustalenia"],
  },
  {
    icon: FiCalendar, label: "Umów się", title: "Od pierwszego pomysłu do planu.",
    text: "Jeśli usługodawca udostępnia rezerwacje, wybierz dostępny termin. W pozostałych przypadkach ustal go bezpośrednio w rozmowie.",
    tip: "Dostępność i sposób potwierdzenia terminu zależą od usługodawcy.",
    tags: ["Termin", "Rezerwacja lub kontakt", "Twój plan"],
  },
];

const StepPreview = ({ index }) => {
  if (index === 0) return (
    <div className={styles.mockSearch}>
      <div className={styles.searchLine}><FiSearch /><span>Fotograf, Poznań</span><FiSliders /></div>
      <div className={styles.previewCaption}>Twój pomysł. Pasujące osoby.</div>
      {[['SK', 'Studio Kadr', 'Fotografia portretowa'], ['ML', 'Między światłem', 'Sesje plenerowe']].map(([initials, name, service], i) => (
        <div className={styles.profileRow} key={name}>
          <span className={`${styles.avatar} ${i ? styles.avatarPeach : ''}`}>{initials}</span>
          <div><strong>{name}</strong><small>{service}</small></div><FiArrowUpRight />
        </div>
      ))}
      <span className={styles.location}><FiMapPin /> Poznań i okolice</span>
    </div>
  );
  if (index === 1) return (
    <div className={styles.mockProfile}>
      <div className={styles.gallery} aria-hidden="true"><FiImage /><span>Twoje spojrzenie.<br />Mój obiektyw.</span><span className={styles.galleryCircle} /></div>
      <div className={styles.profileHeading}><div><small>Fotografia portretowa</small><strong>Studio Kadr</strong></div><span className={styles.roundIcon}><FiStar /></span></div>
      <div className={styles.profileFacts}><span>Oferta</span><span>Realizacje</span><span>Opinie</span></div>
      <p>Sprawdź styl, poznaj ofertę.<br />Zdecyduj, czy to Twój klimat.</p>
    </div>
  );
  if (index === 2) return (
    <div className={styles.mockChat}>
      <div className={styles.chatHeader}><span className={styles.avatar}>SK</span><div><strong>Studio Kadr</strong><small>Rozmowa o Twoim pomyśle</small></div></div>
      <div className={styles.bubbleOutgoing}>Cześć! Szukam fotografa na sesję w plenerze. Czy możemy ustalić szczegóły?</div>
      <div className={styles.bubbleIncoming}>Jasne! Jaki termin i miejsce masz na myśli?</div>
      <div className={styles.chatNote}><FiMessageCircle /><span>Wszystkie ustalenia w jednej rozmowie.</span></div>
    </div>
  );
  return (
    <div className={styles.mockCalendar}>
      <div className={styles.calendarHeading}><span className={styles.roundIcon}><FiCalendar /></span><div><small>Kolejny krok</small><strong>Znajdź swój termin</strong></div></div>
      <div className={styles.week} aria-label="Ilustracja wyboru dnia">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt'].map((day, i) => <span key={day} className={i === 2 ? styles.selectedDay : ''}><small>{day}</small><strong>{12 + i}</strong>{i === 2 && <FiCheck />}</span>)}
      </div>
      <div className={styles.timeSlots}><span>10:00</span><span>12:30</span><span>16:00</span></div>
      <p>Wybierz dostępny termin<br />lub ustal go w wiadomości.</p>
    </div>
  );
};

const HowShowlyWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const tabRefs = useRef([]);
  const step = steps[activeStep];

  const handleTabKey = (event, index) => {
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % steps.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + steps.length) % steps.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = steps.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setActiveStep(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section className={styles.section} id="how-showly-works" aria-labelledby="how-showly-works-title">
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>JAK DZIAŁA SHOWLY</span>
        <span className={styles.gridDot} />
        <span className={styles.scribble}>↗</span>
      </div>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <h2 id="how-showly-works-title">Od „szukam”<br />do <span>„to jest to”.<svg viewBox="0 0 360 20" fill="none" aria-hidden="true"><path d="M4 14C95 2 217 2 355 9" /></svg></span></h2>
          </div>
          <div className={styles.lead}><span className={styles.routeBadge}>4 kroki <FiArrowUpRight aria-hidden="true" /></span><p>Poznaj kogoś, kto zrobi to dobrze.<br />Zobacz, jak przejść od potrzeby do kontaktu.</p><span className={styles.instruction}>Wybierz krok i zajrzyj do środka.</span></div>
        </header>

        <div className={styles.explorer}>
          <div className={styles.tabs} role="tablist" aria-label="Jak korzystać z Showly — cztery kroki">
            {steps.map(({ icon: Icon, label }, index) => (
              <button key={label} ref={(element) => { tabRefs.current[index] = element; }}
                type="button" role="tab" id={`works-tab-${index}`} aria-controls="works-panel"
                aria-selected={activeStep === index} tabIndex={activeStep === index ? 0 : -1}
                className={`${styles.tab} ${activeStep === index ? styles.activeTab : ''}`}
                onClick={() => setActiveStep(index)} onKeyDown={(event) => handleTabKey(event, index)}>
                <Icon aria-hidden="true" /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className={styles.panel} id="works-panel" role="tabpanel" aria-labelledby={`works-tab-${activeStep}`} tabIndex={0}>
            <div className={styles.copy}>
              <div className={styles.stepMeta}><span>Krok 0{activeStep + 1} / 04</span><div className={styles.progress} aria-hidden="true">{steps.map((_, i) => <span key={i} className={i <= activeStep ? styles.progressDone : ''} />)}</div></div>
              <div className={styles.copyBody} key={activeStep}>
                <h3>{step.title}</h3><p>{step.text}</p>
                <div className={styles.tags}>{step.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                <p className={styles.tip}><FiCheck aria-hidden="true" /><span>{step.tip}</span></p>
              </div>
              <div className={styles.panelActions}>
                {activeStep < steps.length - 1 ? (
                  <button type="button" className={styles.nextButton} onClick={() => { setActiveStep(activeStep + 1); tabRefs.current[activeStep + 1]?.focus(); }}>Dalej: {steps[activeStep + 1].label.toLowerCase()} <FiArrowRight aria-hidden="true" /></button>
                ) : (
                  <Link to="/profile" state={{ scrollToId: "profilesHub" }} className={styles.nextButton}>Odkrywaj profile <FiArrowUpRight aria-hidden="true" /></Link>
                )}
              </div>
            </div>
            <div className={`${styles.preview} ${styles[`scene${activeStep}`]}`}>
              <span className={styles.orbit} aria-hidden="true" /><span className={styles.spark} aria-hidden="true">✳</span>
              <div className={styles.previewLabel}><span className={styles.previewDot} /> Tak to może wyglądać</div>
              <div className={styles.previewCard} key={activeStep}><StepPreview index={activeStep} /></div>
              <span className={styles.previewDisclaimer}>Przykładowy widok · dane ilustracyjne</span>
            </div>
          </div>
        </div>
        <footer className={styles.footer}><span><FiCheck aria-hidden="true" /> Ty wybierasz. Showly ułatwia kontakt.</span><Link to="/profile" state={{ scrollToId: "profilesHub" }}>Sprawdź dostępne profile <FiArrowUpRight aria-hidden="true" /></Link></footer>
      </div>
    </section>
  );
};

export default HowShowlyWorks;
