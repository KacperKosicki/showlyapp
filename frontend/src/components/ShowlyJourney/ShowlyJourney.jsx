import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiCheck, FiUser, FiLayers, FiLink, FiMessageCircle, FiImage, FiCalendar } from "react-icons/fi";
import useScrollReveal from "../../utils/useScrollReveal";
import styles from "./ShowlyJourney.module.scss";

const stages = [
  { label: "Profil", icon: FiUser, title: "Zaczyna się od Ciebie.", text: "Daj się poznać. Twoja nazwa, zdjęcie i krótki opis to początek miejsca, do którego zaprosisz swoich klientów.", items: ["Przedstaw siebie lub swoją markę", "Dodaj lokalizację i sposób kontaktu", "Wybierz wygląd, który pasuje do Ciebie"], note: "Najpierw charakter. Potem cała reszta.", preview: "Podstawa Twojej wizytówki" },
  { label: "Oferta", icon: FiLayers, title: "Pokaż, co potrafisz.", text: "Dołóż to, co pomaga zrozumieć Twoją pracę: usługi, orientacyjne ceny i zdjęcia realizacji. Klient poznaje ofertę, zanim zapyta o szczegóły.", items: ["Opisz usługi i ich zakres", "Pokaż realizacje w galerii", "Uzupełnij cennik i dostępność"], note: "Oferta mówi więcej, kiedy ma swoje miejsce.", preview: "Twoja praca nabiera kształtu" },
  { label: "Link", icon: FiLink, title: "Jeden adres. Wiele miejsc.", text: "Umieść profil w bio, dodaj do ogłoszenia lub wyślij w wiadomości. Aktualizujesz ofertę w jednym miejscu, a klient korzysta z tego samego linku.", items: ["Dodaj link do swoich social mediów", "Udostępnij go zainteresowanej osobie", "Rozwijaj ofertę pod tym samym adresem"], note: "Wysyłasz link. Wszystko inne jest już w środku.", preview: "Gotowe do udostępnienia" },
  { label: "Rozmowa", icon: FiMessageCircle, title: "Teraz kolej na kontakt.", text: "Profil prowadzi do następnego kroku: wiadomości, zapytania lub rezerwacji. Dobierz sposób kontaktu do tego, jak pracujesz.", items: ["Odpowiadaj na wiadomości od klientów", "Zbieraj szczegóły w zapytaniach", "Udostępnij terminy, gdy włączysz rezerwacje"], note: "Twoja wizytówka jest początkiem współpracy.", preview: "Od oglądania do działania" },
];

export default function ShowlyJourney() {
  const sectionRef = useScrollReveal();
  const location = useLocation();
  useEffect(() => {
    if (location.state?.scrollToId !== "showlyJourney") return undefined;
    const frame = requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.state?.scrollToId, sectionRef]);
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  const Icon = stage.icon;

  return (
    <section ref={sectionRef} className={styles.section} id="showlyJourney" aria-labelledby="journey-title">
      <div className={styles.backdrop} aria-hidden="true"><span className={styles.bigWord}>TWÓJ RUCH</span><span className={styles.backdropShape} /></div>
      <div className={styles.inner}>
        <header className={styles.header} data-reveal>
          <div><h2 id="journey-title">Od pierwszego pomysłu<span>do pierwszej rozmowy.</span></h2></div>
          <p>Nie musisz mieć wszystkiego na start. Zobacz, jak z kilku informacji powstaje jedno miejsce na Twoją ofertę.</p>
        </header>

        <div className={styles.workshop} data-reveal>
          <div className={styles.workshopHead}><span><span className={styles.statusDot} aria-hidden="true" /> Tak rośnie Twoja wizytówka</span><small>Wybierz etap i zobacz zmianę</small></div>
          <div className={styles.stageNav} role="group" aria-label="Etapy tworzenia wizytówki">
            {stages.map((item, index) => {
              const StageIcon = item.icon;
              return <button type="button" key={item.label} aria-pressed={selected === index} aria-controls="journey-stage" onClick={() => setSelected(index)} className={styles.stageButton}>
                <span className={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</span><StageIcon aria-hidden="true" /><strong>{item.label}</strong><FiArrowUpRight className={styles.stageArrow} aria-hidden="true" />
              </button>;
            })}
          </div>

          <div className={styles.board} id="journey-stage">
            <div className={styles.story}>
              <div key={selected} className={styles.storyContent}>
                <span className={styles.stepLabel}><Icon aria-hidden="true" /> Etap {String(selected + 1).padStart(2, "0")} / 04</span>
                <h3>{stage.title}</h3><p>{stage.text}</p>
                <ul>{stage.items.map(item => <li key={item}><FiCheck aria-hidden="true" /><span>{item}</span></li>)}</ul>
                <div className={styles.note}>{stage.note}</div>
              </div>
              <div className={styles.navigation}>
                <button type="button" onClick={() => setSelected(value => value - 1)} disabled={selected === 0} aria-label="Poprzedni etap"><FiArrowLeft aria-hidden="true" /></button>
                {selected < stages.length - 1 ? <button type="button" className={styles.next} onClick={() => setSelected(value => value + 1)}>Następny etap <FiArrowRight aria-hidden="true" /></button> : <Link className={styles.next} to="/stworz-profil" state={{ scrollToId: "scrollToId" }}>Teraz Twój profil <FiArrowUpRight aria-hidden="true" /></Link>}
              </div>
            </div>

            <div className={styles.canvas} aria-label="Przykładowa wizytówka">
              <div className={styles.canvasHead}><span>Przykładowa wizytówka</span><span>{selected + 1} / 4</span></div>
              <div className={styles.preview}>
                <div className={styles.previewBar}><span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span><span>Twoje miejsce w Showly</span><FiArrowUpRight aria-hidden="true" /></div>
                <div className={styles.identity}><span className={styles.avatar}><FiUser aria-hidden="true" /></span><div><small>Twój pomysł / Twój styl</small><h4>Twoja marka.</h4><p>To, co robisz. Po Twojemu.</p></div></div>
                <div className={styles.previewBody}>
                  {selected >= 1 ? <div className={styles.offer}><div className={styles.offerHeader}><FiLayers aria-hidden="true" /><strong>Twoja oferta</strong><span>01</span></div><p>Usługi, ceny i szczegóły współpracy.</p><div className={styles.gallery}><span><FiImage aria-hidden="true" /> Twoje realizacje</span><span><FiImage aria-hidden="true" /> Twój styl</span></div></div> : <div className={styles.placeholder}><FiLayers aria-hidden="true" /><strong>Miejsce na Twoją ofertę</strong><p>W kolejnym etapie dodasz usługi i realizacje.</p><div aria-hidden="true"><span /><span /></div></div>}
                  {selected >= 2 && <div className={styles.address}><FiLink aria-hidden="true" /><div><small>Adres do udostępnienia</small><strong>showly.me/twoja-nazwa</strong></div><FiArrowUpRight aria-hidden="true" /></div>}
                  {selected >= 3 && <div className={styles.contact}><div><FiMessageCircle aria-hidden="true" /><strong>Zacznijmy od rozmowy</strong></div><p>Wiadomość lub zapytanie. Termin, jeśli udostępniasz rezerwacje.</p><span><FiCalendar aria-hidden="true" /> Kontakt według Twoich ustawień</span></div>}
                </div>
              </div>
              <div className={styles.canvasCaption} aria-live="polite"><FiCheck aria-hidden="true" /><span>{stage.preview}</span></div>
            </div>
          </div>
        </div>

        <footer className={styles.footer} data-reveal><div><span>Najlepszy moment na początek?</span><h3>Gdy masz coś do pokazania.</h3><p>Dopracowuj profil we własnym tempie. Dostępne funkcje i limity zależą od wybranego planu.</p></div><Link to="/stworz-profil" state={{ scrollToId: "scrollToId" }}>Stwórz swoją wizytówkę <FiArrowUpRight aria-hidden="true" /></Link></footer>
      </div>
    </section>
  );
}
