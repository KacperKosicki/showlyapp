import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiArrowUpRight, FiCalendar, FiCheck, FiCheckCircle,
  FiImage, FiLayers, FiLink, FiMessageCircle, FiSliders, FiZap,
  FiHeart, FiClock, FiBriefcase, FiArrowLeft,
} from 'react-icons/fi';
import styles from './WhyUs.module.scss';
import useScrollReveal from '../../utils/useScrollReveal';

const benefits = [
  { icon: FiLayers, title: 'Oferta gotowa do sprawdzenia.', text: 'Usługi, ceny i realizacje pomagają klientowi ocenić, czy jesteś właściwą osobą.' },
  { icon: FiSliders, title: 'Twoja marka, Twój charakter.', text: 'Dopasuj wygląd wizytówki i udostępnij jej link w bio, ogłoszeniu lub wiadomości.' },
  { icon: FiMessageCircle, title: 'Od oferty do konkretów.', text: 'Klient może od razu napisać, wysłać zapytanie lub skorzystać z udostępnionych rezerwacji.' },
];

const comparison = [
  { id: 'offer', icon: FiLayers, label: 'Zakres i cena', contact: 'Klient dopytuje w wiadomości.', showly: 'Usługi i ceny przy Twoim profilu.' },
  { id: 'work', icon: FiImage, label: 'Efekty Twojej pracy', contact: 'Przesyłasz materiały osobno.', showly: 'Galeria i opisane realizacje w portfolio.' },
  { id: 'identity', icon: FiSliders, label: 'Twoja marka', contact: 'Sam adres do kontaktu.', showly: 'Własne kolory, czcionki i układ.*' },
  { id: 'contact', icon: FiCalendar, label: 'Następny krok', contact: 'Rozmowa i ręczne ustalenia.', showly: 'Wiadomość, zapytanie lub rezerwacja.*' },
  { id: 'return', icon: FiLink, label: 'Powrót do oferty', contact: 'Kontakt w historii wiadomości.', showly: 'Profil pod linkiem, który można zapisać w ulubionych.' },
];

const showcases = [
  {
    label: 'Pokaż swój styl', icon: FiImage, number: '01', eyebrow: 'Zainteresowanie zaczyna się od konkretu',
    title: 'Niech Twoje prace mówią za Ciebie.',
    text: 'Zdjęcie przyciąga uwagę. Opis realizacji pozwala zrozumieć, co dokładnie robisz. Zbierz je w portfolio, do którego klient może wrócić przed podjęciem decyzji.',
    points: ['Galeria zdjęć i opisane projekty w jednym miejscu.', 'Własny wygląd profilu: kolory, czcionki i układ zależnie od planu.', 'Linki do Twoich stron i kanałów, jeśli chcesz pokazać więcej.'],
    takeaway: 'Klient widzi Twój styl, zanim zapyta o współpracę.',
    previewTitle: 'Prace, które pokazują Twój charakter', previewLabel: 'Portfolio / przykładowa prezentacja',
    items: [{ icon: FiImage, title: 'Wybrana realizacja', text: 'Pokaż efekt swojej pracy', tag: 'Galeria' }, { icon: FiLayers, title: 'Historia projektu', text: 'Opisz zakres i rezultat', tag: 'Portfolio' }, { icon: FiLink, title: 'Więcej od Ciebie', text: 'Dodaj link do swojej strony', tag: 'Twoje linki' }],
  },
  {
    label: 'Ułatw wybór', icon: FiLayers, number: '02', eyebrow: 'Mniej niewiadomych przed rozmową',
    title: 'Dobra oferta odpowiada na pytania.',
    text: 'Co oferujesz? Ile to kosztuje? Czy pasujesz do tego zlecenia? Uzupełniony profil daje klientowi punkt wyjścia do konkretnej rozmowy o jego potrzebach.',
    points: ['Usługi z opisem, ceną i czasem trwania, jeśli je określisz.', 'Informacje o Tobie, lokalizacji i sposobach kontaktu.', 'Opinie oraz odpowiedzi na częste pytania pomagające poznać ofertę.'],
    takeaway: 'Rozmowę można zacząć od potrzeb, zamiast od podstaw.',
    previewTitle: 'Wszystko, czego potrzeba do pierwszej decyzji', previewLabel: 'Oferta / przykładowa prezentacja',
    items: [{ icon: FiBriefcase, title: 'Zakres usługi', text: 'Co obejmuje współpraca?', tag: 'Oferta' }, { icon: FiClock, title: 'Cena i czas', text: 'Podaj warunki swojej usługi', tag: 'Konkrety' }, { icon: FiMessageCircle, title: 'Częste pytania', text: 'Wyjaśnij, jak pracujesz', tag: 'Odpowiedzi' }],
  },
  {
    label: 'Uporządkuj kontakt', icon: FiMessageCircle, number: '03', eyebrow: 'Zainteresowanie ma swój następny krok',
    title: 'Od „podoba mi się” do „porozmawiajmy”.',
    text: 'Daj klientowi możliwość zrobienia kolejnego kroku przy Twojej ofercie. Wiadomości i dostępne w planie rezerwacje pozwalają przejść od oglądania profilu do ustaleń.',
    points: ['Wiadomości i zapytania powiązane z Twoim profilem.', 'Rezerwacje oraz lista i kalendarz terminów w odpowiednim planie.', 'Powiadomienia pomagające wrócić do rozmów i zgłoszeń.'],
    takeaway: 'Klient wie, gdzie napisać. Ty wiesz, gdzie wrócić do ustaleń.',
    previewTitle: 'Zostaw otwarte drzwi do współpracy', previewLabel: 'Kontakt / przykładowa prezentacja',
    items: [{ icon: FiMessageCircle, title: 'Porozmawiajmy', text: 'Wiadomość o Twojej ofercie', tag: 'Kontakt' }, { icon: FiCalendar, title: 'Ustalmy termin', text: 'Rezerwacje zależnie od planu', tag: 'Terminy' }, { icon: FiCheckCircle, title: 'Wróć do ustaleń', text: 'Rozmowy i powiadomienia', tag: 'Twoje konto' }],
  },
];

export default function WhyUs({ user, hasProfile = false }) {
  const sectionRef = useScrollReveal();
  const [betaEnabled, setBetaEnabled] = useState(null);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const showcaseTabs = useRef([]);
  const showcase = showcases[showcaseIndex];
  const selectShowcase = (index, focus = false) => {
    setShowcaseIndex(index);
    if (focus) showcaseTabs.current[index]?.focus();
  };
  const handleShowcaseKey = (event) => {
    const target = { ArrowRight: (showcaseIndex + 1) % showcases.length, ArrowLeft: (showcaseIndex + showcases.length - 1) % showcases.length, Home: 0, End: showcases.length - 1 }[event.key];
    if (target !== undefined) { event.preventDefault(); selectShowcase(target, true); }
  };

  useEffect(() => {
    let active = true;
    let controller;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/platform/status', { signal: request.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Platform status unavailable');
        const data = await response.json();
        if (active && !request.signal.aborted) setBetaEnabled(data.betaPremiumEnabled === true);
      } catch {
        if (active && !request.signal.aborted) setBetaEnabled(null);
      }
    };
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    refresh();
    const interval = window.setInterval(refreshVisible, 60000);
    window.addEventListener('focus', refreshVisible);
    window.addEventListener('showly:beta-premium-changed', refresh);
    return () => {
      active = false; controller?.abort(); window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener('showly:beta-premium-changed', refresh);
    };
  }, []);

  const ctaTo = !user ? '/register' : hasProfile ? '/profil' : '/stworz-profil';
  const ctaLabel = !user ? 'Stwórz swoją wizytówkę' : hasProfile ? betaEnabled ? 'Dopracuj swój profil' : 'Sprawdź dostępne plany' : 'Stwórz swój profil';
  const ctaAnchor = hasProfile ? betaEnabled ? 'appearanceSection' : 'billingSection' : undefined;

  return <section ref={sectionRef} className={styles.section} id="whyus" aria-labelledby="whyus-title">
    <div className={styles.background} aria-hidden="true"><span>POKAŻ SIĘ.</span><FiArrowUpRight /><span className={styles.backgroundCaption}>DOBRA PRACA ZASŁUGUJE NA WIDOCZNOŚĆ</span></div>
    <div className={styles.inner}>
      <header className={styles.header} data-reveal>
        <div className={styles.intro}>
          <h2 id="whyus-title">Robisz swoje.<br />Pokaż to<span>po swojemu.</span></h2>
          <p>Pokaż, co robisz, jak pracujesz i jak można się z Tobą umówić. Daj klientowi konkrety, zanim napisze pierwszą wiadomość.</p>
          <a className={styles.textLink} href="#why-comparison">Zobacz różnicę <FiArrowRight aria-hidden="true" /></a>
        </div>
        <figure className={styles.cover}>
          <img className={styles.coverImage} src="/images/why-us/creative-work.jpg" alt="Kolaż przedstawiający pracę z aparatem, mikserem muzycznym i szkicownikiem" loading="lazy" width="1254" height="1254" />
          <span className={styles.coverIndex} aria-hidden="true">SHOW YOUR WORK ↗</span>
          <div className={styles.coverStamp}><FiArrowUpRight aria-hidden="true" /><strong>Twoja praca.<br />Pierwszy plan.</strong></div>
          <figcaption>Różne talenty. Jedno miejsce na Twoją ofertę.<small>Kolaż ilustracyjny</small></figcaption>
        </figure>
      </header>

      <div className={styles.factStrip} data-reveal><div><strong>01</strong><span>link do udostępnienia<small>Oferta, prace i kontakt przy Twoim profilu.</small></span></div><FiArrowUpRight aria-hidden="true" /><div><strong>03</strong><span>kroki klienta<small>Poznaje ofertę. Sprawdza prace. Może napisać.</small></span></div><FiArrowUpRight aria-hidden="true" /><div><FiSliders aria-hidden="true" /><span>Twój charakter<small>Wygląd dopasowany do Ciebie i Twojej pracy.*</small></span></div></div>

      <div className={styles.benefits} data-reveal>{benefits.map(({ icon: Icon, title, text }) => <article key={title}><span className={styles.benefitIcon}><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>

      <div className={styles.showcase} data-reveal>
        <div className={styles.showcaseHeading}><div><span className={styles.kicker}>Zobacz, co zyskuje Twoja oferta</span><h3>Jeden profil. Więcej możliwości.</h3></div><p>Wybierz, co jest dla Ciebie najważniejsze, i zobacz, jak możesz to pokazać w Showly.</p></div>
        <div className={styles.showcaseTabs} role="tablist" aria-label="Możliwości profilu Showly">
          {showcases.map(({ label, icon: Icon, number }, index) => <button key={label} ref={element => { showcaseTabs.current[index] = element; }} type="button" role="tab" id={`why-tab-${index}`} aria-controls="why-showcase-panel" aria-selected={index === showcaseIndex} tabIndex={index === showcaseIndex ? 0 : -1} onClick={() => selectShowcase(index)} onKeyDown={handleShowcaseKey}><span>{number}</span><Icon aria-hidden="true" />{label}<FiArrowUpRight aria-hidden="true" /></button>)}
        </div>
        <div className={styles.showcasePanel} role="tabpanel" id="why-showcase-panel" aria-labelledby={`why-tab-${showcaseIndex}`} tabIndex={0}>
          <div className={styles.showcaseCopy} key={`copy-${showcaseIndex}`}><span className={styles.kicker}>{showcase.eyebrow}</span><h4>{showcase.title}</h4><p>{showcase.text}</p><ul>{showcase.points.map(point => <li key={point}><FiCheck aria-hidden="true" />{point}</li>)}</ul><div className={styles.takeaway}><FiArrowUpRight aria-hidden="true" /><strong>{showcase.takeaway}</strong></div></div>
          <div className={styles.previewStage} key={`preview-${showcaseIndex}`}>
            <span className={styles.stageNumber} aria-hidden="true">{showcase.number}</span>
            <img className={styles.stagePhoto} src="/images/why-us/creative-work.jpg" alt="" loading="lazy" width="1254" height="1254" />
            <div className={styles.previewWindow}><div className={styles.previewBar}><img src="/images/other/logo-showly.png" alt="" /><span>{showcase.previewLabel}</span><span aria-hidden="true">•••</span></div><h4>{showcase.previewTitle}</h4><div className={styles.previewItems}>{showcase.items.map(({ icon: Icon, title, text, tag }) => <div key={title}><span className={styles.previewIcon}><Icon aria-hidden="true" /></span><div><strong>{title}</strong><p>{text}</p></div><small>{tag}</small></div>)}</div><div className={styles.previewBottom}><FiCheckCircle aria-hidden="true" /><span>Twoje treści. Twój sposób prezentacji.</span></div></div>
            <div className={styles.previewSticker}><FiLink aria-hidden="true" />Wysyłasz link. Pokazujesz więcej.</div>
          </div>
          <div className={styles.showcaseNavigation}><span>{showcase.number} / 03 <span>Sprawdź kolejną możliwość</span></span><div><button type="button" aria-label="Poprzednia możliwość" onClick={() => selectShowcase((showcaseIndex + showcases.length - 1) % showcases.length)}><FiArrowLeft aria-hidden="true" /></button><button type="button" aria-label="Następna możliwość" onClick={() => selectShowcase((showcaseIndex + 1) % showcases.length)}><FiArrowRight aria-hidden="true" /></button></div></div>
        </div>
        <div className={styles.morePossibilities}>
          <article><FiClock aria-hidden="true" /><h4>Powiedz, czy przyjmujesz zlecenia.</h4><p>Ustaw status dostępności i dodaj krótką informację. Klient zobaczy, czy warto pytać o współpracę.</p></article>
          <article><FiZap aria-hidden="true" /><h4>Wyjdź poza własną wizytówkę.</h4><p>Przeglądaj ogłoszenia i zgłaszaj się ze swoim profilem. Własny pomysł możesz opublikować także z konta bez wizytówki.</p></article>
          <article><FiHeart aria-hidden="true" /><h4>Daj się zapisać na później.</h4><p>Zalogowany klient może dodać Twój profil do ulubionych i wrócić do oferty, kiedy będzie jej potrzebować.</p></article>
        </div>
      </div>

      <div className={styles.comparison} id="why-comparison" data-reveal>
        <div className={styles.comparisonIntro}><h3>Klient może wiedzieć więcej.<br />Jeszcze przed rozmową.</h3><p>Porównaj udostępnienie samego kontaktu z uzupełnioną ofertą w Showly.</p></div>
        <table className={styles.table} role="table">
          <caption className={styles.srOnly}>Sam kontakt w bio a uzupełniony profil Showly — porównanie prezentacji oferty</caption>
          <thead><tr role="row"><th scope="col" id="why-col-feature">Co pokazujesz</th><th scope="col" id="why-col-contact"><FiLink aria-hidden="true" /> Sam kontakt w bio</th><th scope="col" id="why-col-showly"><img src="/images/other/logo-showly.png" alt="" /> Twój profil Showly</th></tr></thead>
          <tbody>{comparison.map(({ id, icon: Icon, label, contact, showly }) => <tr key={id} role="row">
            <th scope="row" role="rowheader" id={'why-row-' + id}><Icon aria-hidden="true" /><span>{label}</span></th>
            <td role="cell" headers={'why-row-' + id + ' why-col-contact'}><span className={styles.cellLabel} aria-hidden="true">Sam kontakt</span><span>{contact}</span></td>
            <td role="cell" headers={'why-row-' + id + ' why-col-showly'} className={styles.showlyCell}><span className={styles.cellLabel} aria-hidden="true">Showly</span><span><FiCheckCircle aria-hidden="true" />{showly}</span></td>
          </tr>)}</tbody>
        </table>
        <p className={styles.planNote}>* Opcje wyglądu, rezerwacje i limity zależą od planu. Profil pokazuje materiały dodane przez autora, a sposoby kontaktu zależą od jego ustawień.</p>
      </div>

      <footer className={styles.closing} data-reveal>
        <div className={styles.closingCopy}><span className={styles.offerLabel}><FiCheck aria-hidden="true" /> {betaEnabled === true ? 'Trwają bezpłatne testy' : 'Zrób miejsce na swoją ofertę'}</span><h3>{betaEnabled === true ? <>Testuj Premium.<br /><span>Na czas testów: 0 zł.</span></> : <>Pokaż swoją pracę.<br /><span>Daj się poznać.</span></>}</h3><p>{betaEnabled === true ? 'Najwyższy plan dla Twojego profilu na czas testów. Bez karty i bez automatycznego uruchamiania płatnej subskrypcji.' : 'Zacznij od własnej wizytówki. Zbierz ofertę, pokaż realizacje i wybierz możliwości dopasowane do tego, jak pracujesz.'}</p></div>
        <div className={styles.closingActions}><Link className={styles.primary} to={ctaTo} state={ctaAnchor ? { scrollToId: ctaAnchor } : undefined}>{ctaLabel}<FiArrowUpRight aria-hidden="true" /></Link><Link className={styles.secondary} to="/profile" state={{ scrollToId: 'profilesHub' }}>Najpierw zobacz profile <FiArrowRight aria-hidden="true" /></Link><span>{betaEnabled === true ? 'Dostęp testowy nie oznacza zakupu płatnego planu.' : 'Dostępne plany i limity sprawdzisz w edycji profilu.'}</span></div>
      </footer>
    </div>
  </section>;
}
