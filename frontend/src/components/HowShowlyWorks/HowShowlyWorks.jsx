import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiArrowUpRight, FiBell, FiCalendar, FiCheck, FiChevronDown,
  FiHeart, FiImage, FiLayers, FiMapPin, FiMessageCircle, FiSearch,
  FiSliders, FiStar, FiUser, FiUsers,
} from 'react-icons/fi';
import styles from './HowShowlyWorks.module.scss';
import useScrollReveal from '../../utils/useScrollReveal';

const journeys = {
  client: {
    label: 'Szukam usługi', icon: FiSearch,
    steps: [
      {
        label: 'Znajdź osobę', icon: FiSearch, scene: 'search',
        title: 'Wpisz, czego szukasz. Dodaj miasto.',
        text: 'Otwórz „Wszystkie profile”. Wyszukaj usługę, specjalizację lub nazwę i sprawdź lokalizację. Wyniki możesz uporządkować, żeby łatwiej wybrać interesujące osoby.',
        checklist: ['Przejdź do wyszukiwarki profili.', 'Wpisz np. „fotograf” i wybierz miejscowość.', 'Otwórz wizytówkę, która Cię zainteresuje.'],
        note: 'Publiczne profile możesz przeglądać bez konta.',
        action: 'Przeglądaj profile', to: '/profile', anchor: 'profilesHub',
      },
      {
        label: 'Poznaj ofertę', icon: FiUser, scene: 'profile',
        title: 'Sprawdź pracę, ofertę i sposób kontaktu.',
        text: 'Na wizytówce znajdziesz informacje udostępnione przez autora: usługi, ceny, opis, zdjęcia, portfolio realizacji, linki i opinie. Zajrzyj do nich przed wysłaniem zapytania.',
        checklist: ['Zobacz zakres usług i informacje o cenie.', 'Sprawdź zdjęcia, realizacje i opinie, jeśli są dodane.', 'Kliknij serduszko, aby wrócić do profilu w „Ulubionych”.'],
        note: 'Do zapisywania ulubionych potrzebujesz konta. Nie musisz tworzyć własnej wizytówki.',
        action: 'Znajdź swój pierwszy profil', to: '/profile', anchor: 'profilesHub',
      },
      {
        label: 'Napisz lub zarezerwuj', icon: FiMessageCircle, scene: 'contact',
        title: 'Opisz potrzebę. Ustal termin i szczegóły.',
        text: 'Po zalogowaniu wybierz „Zadaj pytanie” lub „Napisz wiadomość”. Jeśli autor włączył rezerwacje, skorzystaj z dostępnego na profilu kalendarza albo formularza zapytania.',
        checklist: ['Podaj, czego potrzebujesz, na kiedy i gdzie.', 'W kalendarzu wybierz usługę i dostępny termin, jeśli są udostępnione.', 'Sprawdzaj odpowiedzi w powiadomieniach, a status terminu w rezerwacjach.'],
        note: 'Wysłanie zapytania nie oznacza automatycznego potwierdzenia terminu. Sposób akceptacji zależy od ustawień usługodawcy.',
        action: 'Wybierz osobę do kontaktu', to: '/profile', anchor: 'profilesHub',
      },
      {
        label: 'Masz inny pomysł?', icon: FiLayers, scene: 'announcement',
        title: 'Opublikuj ogłoszenie i daj się znaleźć.',
        text: 'Szukasz współpracy, pomocy przy projekcie albo talentu do swojego pomysłu? W „Ogłoszeniach” wybierz „Dodaj ogłoszenie” i opisz, czego potrzebujesz.',
        checklist: ['Dodaj tytuł, opis, miejsce, termin i budżet — jeśli je znasz.', 'Zarządzaj publikacją w „Twoich ogłoszeniach”.', 'Przeglądaj zgłoszenia zainteresowanych osób i ustalaj szczegóły.'],
        note: 'Do opublikowania ogłoszenia wystarczy konto. Do zgłaszania się na cudze ogłoszenia potrzebujesz profilu usługodawcy.',
        action: 'Zobacz ogłoszenia', to: '/ogloszenia', anchor: 'announcements',
      },
    ],
  },
  provider: {
    label: 'Oferuję usługi', icon: FiUsers,
    steps: [
      {
        label: 'Załóż wizytówkę', icon: FiUser, scene: 'account',
        title: 'Konto to początek. Profil pokazuje Twoją ofertę.',
        text: 'Zarejestruj się lub zaloguj, a następnie wybierz „Stwórz profil” w menu konta. Podaj swoją nazwę, specjalizację, lokalizację i tagi opisujące to, czym się zajmujesz.',
        checklist: ['Załóż konto lub skorzystaj z logowania Google.', 'Utwórz profil usługodawcy z menu swojego konta.', 'Dodaj zdjęcie i podstawowe informacje o swojej działalności.'],
        note: 'Samo założenie konta nie tworzy publicznej wizytówki usługodawcy.',
        action: 'profile',
      },
      {
        label: 'Pokaż, co robisz', icon: FiImage, scene: 'portfolio',
        title: 'Usługi i realizacje mówią więcej niż sama nazwa.',
        text: 'W edycji profilu uzupełnij opis, ofertę, informacje o cenach i zdjęcia. W portfolio możesz opowiedzieć o projekcie: co zrobiłeś i jaki był efekt.',
        checklist: ['W „Ofercie” opisz usługi, ceny i sposób realizacji.', 'W „Linkach i mediach” dodaj galerię, realizacje i linki.', 'Uzupełnij kontakt, social media i szybkie odpowiedzi na pytania klientów.'],
        note: 'Limity i dostępność części funkcji zależą od aktualnego planu profilu.',
        action: 'profile',
      },
      {
        label: 'Nadaj własny styl', icon: FiSliders, scene: 'design',
        title: 'Dopracuj wygląd. Sprawdź go przed publikacją.',
        text: 'W „Wyglądzie” wybierz dostępny motyw, kolory, czcionki i układ. Korzystaj z podglądu szerokiego i telefonu. W danych podstawowych ustaw też status dostępności.',
        checklist: ['Dopasuj wygląd i zdecyduj, które sekcje pokazać.', 'Dodaj np. „Przyjmuję nowe zlecenia” lub datę dostępności.', 'Zapisz zmiany, otwórz podgląd publiczny i udostępnij link do profilu.'],
        note: 'Status dostępności jest informacją dla odwiedzających. Rezerwacje i godziny pracy ustawiasz osobno.',
        action: 'profile',
      },
      {
        label: 'Ogarnij kontakt', icon: FiBell, scene: 'manage',
        title: 'Wracaj do rozmów, zgłoszeń i terminów.',
        text: 'Menu konta prowadzi do powiadomień, rezerwacji, ulubionych i Twoich ogłoszeń. Odpowiadaj na wiadomości, sprawdzaj zapytania i aktualizuj profil, gdy zmienia się oferta.',
        checklist: ['W powiadomieniach wracaj do rozmów i nowych zdarzeń.', 'W rezerwacjach sprawdzaj listę oraz kalendarz i obsługuj zapytania.', 'W ogłoszeniach szukaj współpracy i zarządzaj swoimi zgłoszeniami.'],
        note: 'Kalendarz, automatyczna akceptacja i funkcje zespołu zależą od planu oraz ustawień Twojego profilu.',
        action: 'manage',
      },
    ],
  },
};

const MiniPerson = ({ initials = 'AK', name = 'Anna Kowalska', detail = 'Fotografia · Poznań' }) => <div className={styles.person}><span className={styles.avatar}>{initials}</span><div><strong>{name}</strong><small>{detail}</small></div><FiArrowUpRight aria-hidden="true" /></div>;

const GuideScene = ({ scene }) => {
  if (scene === 'search') return <div className={styles.scene}>
    <span className={styles.sceneKicker}>Wszystkie profile</span><h4>Kogo dziś szukasz?</h4>
    <div className={styles.searchMock}><FiSearch /><span>Fotograf</span><span><FiMapPin /> Poznań</span></div>
    <MiniPerson /><MiniPerson initials="MK" name="Michał Kadr" detail="Sesje portretowe · Poznań" />
    <div className={styles.mockFoot}><FiSliders /> Wyszukiwanie, lokalizacja i sortowanie</div>
  </div>;
  if (scene === 'profile') return <div className={styles.scene}>
    <div className={styles.profileCover}><span className={styles.avatar}>AK</span><span className={styles.coverTag}><FiHeart /> Zapisz na później</span></div>
    <MiniPerson detail="Fotografia portretowa" />
    <div className={styles.profileSections}><span>Oferta</span><span>Realizacje</span><span>Opinie</span></div>
    <div className={styles.offerRow}><span>Sesja portretowa</span><strong>od 250 zł</strong></div>
    <div className={styles.mockFoot}><FiStar /> Poznaj styl, zakres pracy i opinie.</div>
  </div>;
  if (scene === 'contact') return <div className={styles.scene}>
    <MiniPerson detail="Rozmowa o Twoim zapytaniu" />
    <div className={styles.bubble}>Cześć! Szukam fotografa na sesję w plenerze. Możemy porozmawiać o terminie?</div>
    <div className={styles.bubbleReply}>Jasne. Napisz, jakie miejsce i datę masz na myśli.</div>
    <div className={styles.bookingMock}><FiCalendar /><div><strong>Zapytanie o termin</strong><small>Oczekuje na odpowiedź</small></div><span className={styles.statusDot} /></div>
  </div>;
  if (scene === 'announcement') return <div className={styles.scene}>
    <span className={styles.sceneKicker}>Showly / Ogłoszenia</span><div className={styles.profileSections}><span>Zdalnie</span><span>Współpraca</span></div>
    <h4>Pomysł jest.<br />Szukam człowieka.</h4><p>Opisz projekt i umiejętności, których potrzebujesz.</p>
    <div className={styles.offerRow}><span>Termin i budżet</span><strong>Do ustalenia</strong></div>
    <div className={styles.mockFoot}><FiMessageCircle /> Zgłoszenia znajdziesz przy swoim ogłoszeniu.</div>
  </div>;
  if (scene === 'account') return <div className={styles.scene}>
    <span className={styles.sceneKicker}>Twoje konto → Twój profil</span><h4>Pokaż się<br />z dobrej strony.</h4>
    <div className={styles.fieldMock}><small>Nazwa profilu</small><strong>Twoja marka</strong></div>
    <div className={styles.fieldMock}><small>Specjalizacja i lokalizacja</small><strong>Fotografia · Poznań</strong></div>
    <div className={styles.mockFoot}><FiUser /> Konto i wizytówka to dwa różne kroki.</div>
  </div>;
  if (scene === 'portfolio') return <div className={styles.scene}>
    <span className={styles.sceneKicker}>Twój profil / Oferta i realizacje</span><h4>Nie tylko obietnica.<br />Pokaż efekt.</h4>
    <div className={styles.portfolioArt}><span><FiImage /> Sesja dla marki</span><span><FiLayers /> Projekt od A do Z</span></div>
    <div className={styles.offerRow}><span>Co zrobiłem?</span><strong>Zakres pracy</strong></div>
    <div className={styles.offerRow}><span>Co z tego wyszło?</span><strong>Rezultat projektu</strong></div>
  </div>;
  if (scene === 'design') return <div className={styles.scene}>
    <span className={styles.sceneKicker}>Wygląd / Podgląd na żywo</span><div className={styles.designMock}><div className={styles.swatches}><i /><i /><i /></div><span>Aa</span><small>Kolory · czcionki · układ</small></div>
    <div className={styles.bookingMock}><FiCheck /><div><strong>Przyjmuję nowe zlecenia</strong><small>Twój status dostępności</small></div></div>
    <div className={styles.mockFoot}><FiCheck /> Zapisz zmiany i sprawdź profil publiczny.</div>
  </div>;
  return <div className={styles.scene}>
    <span className={styles.sceneKicker}>W menu Twojego konta</span><h4>Każda sprawa<br />ma swoje miejsce.</h4>
    {[[FiBell, 'Powiadomienia', 'Rozmowy i nowe zdarzenia'], [FiCalendar, 'Rezerwacje', 'Lista, kalendarz i statusy'], [FiLayers, 'Twoje ogłoszenia', 'Publikacje i zgłoszenia']].map(([Icon, title, text]) => <div className={styles.bookingMock} key={title}><Icon /><div><strong>{title}</strong><small>{text}</small></div><FiArrowUpRight /></div>)}
  </div>;
};

const shortcuts = [
  [FiHeart, 'Ulubione', 'Wracaj do zapisanych profili.', '/ulubione'],
  [FiCalendar, 'Rezerwacje', 'Sprawdzaj terminy i ich status.', '/rezerwacje'],
  [FiBell, 'Powiadomienia', 'Nie przegap odpowiedzi.', '/powiadomienia'],
  [FiLayers, 'Twoje ogłoszenia', 'Ogarniaj pomysły i zgłoszenia.', '/twoje-ogloszenia'],
];

export default function HowShowlyWorks({ user, hasProfile = false }) {
  const sectionRef = useScrollReveal();
  const [journey, setJourney] = useState('client');
  const [activeStep, setActiveStep] = useState(0);
  const routeRefs = useRef([]);
  const stepRefs = useRef([]);
  const route = journeys[journey];
  const step = route.steps[activeStep];
  const profileTo = !user ? '/register' : hasProfile ? '/profil' : '/stworz-profil';
  const profileAction = !user ? 'Załóż konto i zacznij' : hasProfile ? 'Edytuj swój profil' : 'Stwórz swój profil';
  const actionTo = step.action === 'profile' ? profileTo : step.action === 'manage' ? user ? '/powiadomienia' : '/register' : step.to;
  const actionLabel = step.action === 'profile' ? profileAction : step.action === 'manage' ? user ? 'Otwórz powiadomienia' : 'Załóż konto i zacznij' : step.action;
  const selectJourney = key => { setJourney(key); setActiveStep(0); };
  const arrowTarget = (key, index, count) => {
    if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
    if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return undefined;
  };

  return <section ref={sectionRef} className={styles.section} id="how-showly-works" aria-labelledby="how-showly-works-title">
    <div className={styles.background} aria-hidden="true"><span>JAK TO DZIAŁA</span></div>
    <div className={styles.inner}>
      <header className={styles.header} data-reveal>
        <div><span className={styles.kicker}><FiArrowUpRight aria-hidden="true" /> Showly krok po kroku</span><h2 id="how-showly-works-title">Mniej zgadywania.<span>Więcej działania.</span></h2></div>
        <p>Znajdź usługę, umów kontakt albo pokaż światu, co robisz. Wybierz swoją ścieżkę i zobacz, od czego zacząć.</p>
      </header>
      <div className={styles.guide} data-reveal>
        <div className={styles.routeBar}><span>Co chcesz zrobić?</span><div className={styles.routeTabs} role="tablist" aria-label="Wybierz sposób korzystania z Showly">
          {Object.entries(journeys).map(([key, { label, icon: Icon }], index) => <button key={key} type="button" role="tab" id={'works-route-' + key} aria-controls="works-route-panel" aria-selected={journey === key} tabIndex={journey === key ? 0 : -1} ref={element => { routeRefs.current[index] = element; }} onClick={() => selectJourney(key)} onKeyDown={event => {
            const next = arrowTarget(event.key, index, 2);
            if (next === undefined) return;
            event.preventDefault(); selectJourney(Object.keys(journeys)[next]); routeRefs.current[next]?.focus();
          }}><Icon aria-hidden="true" />{label}</button>)}
        </div></div>
        <div id="works-route-panel" role="tabpanel" aria-labelledby={'works-route-' + journey}>
          <ol className={styles.steps} aria-label="Cztery kroki wybranej ścieżki">{route.steps.map(({ label, icon: Icon }, index) => <li key={label}><button type="button" ref={element => { stepRefs.current[index] = element; }} aria-current={activeStep === index ? 'step' : undefined} tabIndex={activeStep === index ? 0 : -1} onClick={() => setActiveStep(index)} onKeyDown={event => {
            const next = arrowTarget(event.key, index, 4);
            if (next === undefined) return;
            event.preventDefault(); setActiveStep(next); stepRefs.current[next]?.focus();
          }}><span className={styles.stepNumber}>0{index + 1}</span><span><Icon aria-hidden="true" />{label}</span><FiArrowRight className={styles.stepArrow} aria-hidden="true" /></button></li>)}</ol>
          <div className={styles.panel}>
            <div className={styles.copy} key={journey + activeStep + '-copy'}>
              <span className={styles.stepCount}>Krok 0{activeStep + 1} / 04</span><h3>{step.title}</h3><p>{step.text}</p>
              <ul className={styles.checklist}>{step.checklist.map(text => <li key={text}><FiCheck aria-hidden="true" /><span>{text}</span></li>)}</ul>
              <p className={styles.note}>{step.note}</p>
              <div className={styles.actions}><Link className={styles.primary} to={actionTo} state={step.anchor ? { scrollToId: step.anchor } : undefined}>{actionLabel}<FiArrowUpRight aria-hidden="true" /></Link>{activeStep < 3 && <button type="button" className={styles.next} onClick={() => { setActiveStep(activeStep + 1); stepRefs.current[activeStep + 1]?.focus(); }}>Dalej <FiArrowRight aria-hidden="true" /></button>}</div>
            </div>
            <div className={styles.preview}><div className={styles.windowBar}><span><img src="/images/other/showly-mark.png" alt="" /> Showly.me</span><span>Przykładowy widok</span></div><div className={styles.previewBody} key={journey + activeStep + '-scene'}><GuideScene scene={step.scene} /></div><span className={styles.disclaimer}>Ilustracja funkcji · dane przykładowe</span></div>
          </div>
        </div>
      </div>
      <div className={styles.accountTools} data-reveal><div><span className={styles.kicker}>Po zalogowaniu</span><h3>Wszystko znajdziesz<br />w menu konta.</h3></div><div className={styles.toolLinks}>{shortcuts.map(([Icon, title, text, to]) => <Link key={to} to={user ? to : '/login'} state={!user ? { scrollToId: 'loginBox' } : undefined}><Icon aria-hidden="true" /><div><strong>{title}</strong><span>{text}</span></div><FiArrowUpRight aria-hidden="true" /></Link>)}</div></div>
      <div className={styles.faq} data-reveal>
        <details><summary>Czy potrzebuję własnego profilu usługodawcy?<FiChevronDown aria-hidden="true" /></summary><p>Nie, jeśli szukasz usług. Publiczne wizytówki i ogłoszenia możesz przeglądać bez logowania. Konto pozwala korzystać z ulubionych, wiadomości i rezerwacji oraz publikować własne ogłoszenia. Własna wizytówka jest potrzebna, gdy chcesz prezentować ofertę lub zgłaszać się do cudzych ogłoszeń.</p></details>
        <details><summary>Czy wybrany termin jest od razu potwierdzony?<FiChevronDown aria-hidden="true" /></summary><p>Nie zawsze. Usługodawca wybiera sposób obsługi rezerwacji i może włączyć automatyczną akceptację. Sprawdzaj status w swoich rezerwacjach. Jeśli profil nie udostępnia kalendarza lub formularza zapytania, ustal termin bezpośrednio z jego autorem.</p></details>
        <details><summary>Dlaczego nie każdy profil ma te same możliwości?<FiChevronDown aria-hidden="true" /></summary><p>Autor wybiera, co udostępnia: ofertę, zdjęcia, kontakt, status dostępności czy rezerwacje. Część ustawień i limitów zależy również od aktualnego planu. Własną wizytówkę dostosujesz w edycji profilu, a jej plan sprawdzisz w sekcji „Aktualny plan i wykorzystanie”.</p></details>
      </div>
    </div>
  </section>;
}
