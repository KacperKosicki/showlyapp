import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCheck, FiFileText, FiImage, FiMessageCircle, FiSliders, FiCalendar, FiLink, FiSearch } from "react-icons/fi";
import styles from "./WhyUs.module.scss";
import useScrollReveal from "../../utils/useScrollReveal";

const perspectives = {
  looking: {
    label: "Szukam usług", action: "Znajdź swój profil", to: "/profile",
    intro: "Najpierw poznajesz ofertę. Potem decydujesz, z kim chcesz porozmawiać. Wszystko w jednym miejscu, w tempie, które pasuje Tobie.",
    features: [
      { icon: FiFileText, label: "Oferta bez domysłów", title: "Wiesz, o co zapytać.", text: "Usługi, opis i orientacyjne ceny pomagają sprawdzić, czy oferta pasuje do Twojego pomysłu.", preview: "Konkrety przed kontaktem.", rows: [["Usługi", "Co możesz zamówić"], ["Cennik", "Orientacyjne koszty"], ["Opis", "Zakres i sposób współpracy"]], note: "Poznaj ofertę, zanim napiszesz pierwszą wiadomość." },
      { icon: FiImage, label: "Ludzie i ich praca", title: "Poznajesz styl, nie tylko nazwę.", text: "Zdjęcia realizacji i opublikowane opinie pozwalają zobaczyć więcej niż samo ogłoszenie.", preview: "Zobacz, kto za tym stoi.", rows: [["Realizacje", "Zdjęcia, które pokazują styl"], ["Opinie", "Doświadczenia klientów"], ["O mnie", "Osoba stojąca za ofertą"]], note: "Każdy profil pokazuje materiały, które udostępnił jego twórca." },
      { icon: FiMessageCircle, label: "Kontakt w zasięgu ręki", title: "Dobry profil prowadzi dalej.", text: "Napisz wiadomość, wyślij zapytanie lub wybierz termin, jeśli usługodawca udostępnia rezerwacje.", preview: "Od pomysłu do rozmowy.", rows: [["Wiadomość", "Dopytaj o swój pomysł"], ["Zapytanie", "Przekaż szczegóły współpracy"], ["Termin", "Sprawdź udostępnioną dostępność"]], note: "Dostępne sposoby kontaktu zależą od ustawień danego profilu." },
    ],
  },
  creating: {
    label: "Tworzę swój profil", action: "Zaprojektuj swój profil", to: "/stworz-profil",
    intro: "Twoja praca ma własny charakter. Daj jej miejsce, które pokazuje Twój styl, zbiera ofertę i ułatwia klientom kolejny krok.",
    features: [
      { icon: FiSliders, label: "Wygląd po Twojemu", title: "Twoja marka ma swój głos.", text: "Dopasuj kolory, czcionki i układ wizytówki. Sprawdzaj zmiany w podglądzie i wybierz wygląd, który pasuje do Ciebie.", preview: "Ten profil jest Twój.", rows: [["Kolory", "Własny motyw i akcenty"], ["Typografia", "Nagłówki i tekst w Twoim stylu"], ["Układ", "Sposób prezentacji oferty"]], note: "Dostępne opcje wyglądu znajdziesz w edytorze swojego profilu." },
      { icon: FiLink, label: "Oferta pod jednym linkiem", title: "Wysyłasz adres. Nie całą historię.", text: "Zbierz usługi, ceny, zdjęcia i kontakt na jednym profilu. Udostępnij go w bio, ogłoszeniu lub wiadomości.", preview: "Jedno miejsce na Twoją pracę.", rows: [["Twoja oferta", "Usługi i orientacyjne ceny"], ["Twoje realizacje", "Galeria i opis działalności"], ["Twój adres", "Link gotowy do udostępnienia"]], note: "Aktualizujesz profil, a klienci nadal korzystają z tego samego adresu." },
      { icon: FiCalendar, label: "Współpraca pod kontrolą", title: "Kontakt ma swój dalszy ciąg.", text: "Rozmawiaj z klientami i zarządzaj zapytaniami. Gdy włączysz rezerwacje, pokaż dostępność i uporządkuj terminy.", preview: "Miejsce na następny krok.", rows: [["Rozmowy", "Wiadomości przy Twoim profilu"], ["Zapytania", "Szczegóły od zainteresowanych"], ["Rezerwacje", "Terminy i dostępność"]], note: "Funkcje rezerwacji i limity zależą od wybranego planu." },
    ],
  },
};

const WhyUs = () => {
  const sectionRef = useScrollReveal();
  const audienceRefs = useRef([]);
  const [perspective, setPerspective] = useState("looking");
  const [selected, setSelected] = useState(0);
  const view = perspectives[perspective];
  const feature = view.features[selected];
  const Icon = feature.icon;
  const selectPerspective = value => { setPerspective(value); setSelected(0); };

  return (
    <section ref={sectionRef} className={styles.section} id="whyus" aria-labelledby="whyus-title">
      <div className={styles.background} aria-hidden="true"><span className={styles.bigWord}>PO TWOJEMU</span><span className={styles.dotField} /></div>
      <div className={styles.inner}>
        <header className={styles.header} data-reveal>
          <div><h2 id="whyus-title">Nie tylko wizytówka.<span>Twój kolejny krok.</span></h2></div>
          <p>Własny styl, konkretna oferta i kontakt pod ręką. Showly łączy to, co pomaga pokazać swoją pracę i znaleźć właściwą osobę.</p>
        </header>

        <div className={styles.perspective} data-reveal>
          <div className={styles.audienceTabs} role="tablist" aria-label="Dla kogo jest Showly?">
            {Object.entries(perspectives).map(([id, item], index) => <button key={id} ref={element => { audienceRefs.current[index] = element; }} type="button" role="tab" id={"why-tab-" + id} aria-selected={perspective === id} aria-controls="why-benefits" tabIndex={perspective === id ? 0 : -1} onClick={() => selectPerspective(id)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              selectPerspective(Object.keys(perspectives)[next]); audienceRefs.current[next]?.focus();
            }}>{id === "looking" ? <FiSearch aria-hidden="true" /> : <FiSliders aria-hidden="true" />}{item.label}</button>)}
          </div>
          <p>{view.intro}</p>
        </div>

        <div id="why-benefits" role="tabpanel" aria-labelledby={"why-tab-" + perspective} className={styles.board}>
          <div className={styles.features} data-reveal>
            <span className={styles.sectionLabel}>Wybierz i zobacz, co zyskujesz</span>
            {view.features.map((item, index) => {
              const FeatureIcon = item.icon;
              return <button type="button" key={item.label} className={styles.feature} aria-pressed={selected === index} aria-controls="why-preview" onClick={() => setSelected(index)}>
                <span className={styles.featureIcon}><FeatureIcon aria-hidden="true" /></span>
                <span className={styles.featureCopy}><span>{"0" + (index + 1)} / {item.label}</span><strong>{item.title}</strong><span>{item.text}</span></span>
                <FiArrowUpRight className={styles.featureArrow} aria-hidden="true" />
              </button>;
            })}
          </div>

          <aside className={styles.previewFrame} data-reveal id="why-preview" aria-label="Co daje Ci Showly">
            <div className={styles.previewBar}><span className={styles.logoMark}>s.</span><span>Twój profil. Twoje możliwości.</span><span className={styles.liveDot} aria-hidden="true" /></div>
            <div className={styles.preview} key={perspective + selected}>
              <span className={styles.previewLabel}><Icon aria-hidden="true" /> {feature.label}</span>
              <h3>{feature.preview}</h3>
              {perspective === "creating" && selected === 0 && <div className={styles.palette} aria-hidden="true"><span /><span /><span /><span>Aa</span></div>}
              <div className={styles.previewRows}>{feature.rows.map(([title, text]) => <div key={title}><span className={styles.check}><FiCheck aria-hidden="true" /></span><div><strong>{title}</strong><span>{text}</span></div></div>)}</div>
              <p className={styles.previewNote}>{feature.note}</p>
            </div>
            <div className={styles.previewFooter}><span>To Ty wybierasz następny krok.</span><FiArrowUpRight aria-hidden="true" /></div>
          </aside>
        </div>

        <footer className={styles.closing} data-reveal><div><span className={styles.sectionLabel}>Dobre rzeczy zaczynają się od ludzi</span><h3>{perspective === "looking" ? "Masz pomysł? Znajdź kogoś do współpracy." : "Masz coś do pokazania? Daj temu dobry adres."}</h3></div><Link to={view.to} state={perspective === "looking" ? { scrollToId: "profilesHub" } : undefined}>{view.action}<FiArrowUpRight aria-hidden="true" /></Link></footer>
      </div>
    </section>
  );
};
export default WhyUs;
