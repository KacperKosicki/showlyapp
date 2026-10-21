import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiArrowRight, FiCheck, FiMinus, FiZap, FiChevronDown, FiLayout, FiImage, FiCalendar, FiLayers } from 'react-icons/fi';
import useScrollReveal from '../../utils/useScrollReveal';
import styles from './Pricing.module.scss';

// Regular prices and limits mirror backend/config/plans.js and BillingSection.
const plans = [
  { key: 'free', name: 'Starter', price: '0', suffix: 'zł / pierwsze 30 dni', label: 'Na dobry początek', description: 'Prosta wizytówka, gdy chcesz zebrać ofertę i kontakt pod jednym adresem.', features: ['3 zdjęcia i 3 usługi', '1 link do Twoich stron', 'Wiadomości od klientów', 'Podstawowy wygląd profilu'], note: 'Po 30 dniach przedłużenie widoczności: 14,99 zł za kolejne 30 dni.' },
  { key: 'standard', name: 'Standard', price: '29,99', suffix: 'zł / miesiąc', label: 'Więcej miejsca na Twoją ofertę', description: 'Rozbudowana prezentacja dla freelancerów i usługodawców, którzy chcą pokazać więcej.', features: ['6 zdjęć i 10 usług', '2 linki oraz social media', 'Rozszerzone motywy i własny banner', 'Widoczność w cenie subskrypcji'], note: 'Dla osób, które potrzebują bogatszej wizytówki i kontaktu przez wiadomości.' },
  { key: 'premium', name: 'Premium', price: '59,99', suffix: 'zł / miesiąc', label: 'Oferta, terminy i zespół', description: 'Dla osób i firm, które chcą także przyjmować rezerwacje i zarządzać dostępnością.', features: ['15 zdjęć i 20 usług', '3 linki i własny adres profilu', 'Rezerwacje godzinowe, zapytania i całe dni', 'Zespół do 3 pracowników'], note: 'Rozszerzone motywy, własny banner i widoczność w cenie subskrypcji.' },
];

const comparison = [
  ['Zdjęcia profilu', '3', '6', '15'],
  ['Usługi w ofercie', '3', '10', '20'],
  ['Zdjęcia w galerii jednej usługi', '2', '4', '10'],
  ['Linki', '1', '2', '3'],
  ['Szybkie odpowiedzi profilu', '1', '3', '5'],
  ['Długość opisu', '200 znaków', '500 znaków', '1000 znaków'],
  ['Wiadomości od klientów', true, true, true],
  ['Rozszerzone motywy i social media', false, true, true],
  ['Rezerwacje i kalendarz dostępności', false, false, true],
  ['Zespół i pracownicy', false, false, 'Do 3'],
];

function FeatureValue({ value }) {
  if (typeof value !== 'boolean') return value;
  return <><span className={styles.srOnly}>{value ? 'Tak' : 'Nie'}</span>{value ? <FiCheck aria-hidden="true" /> : <FiMinus aria-hidden="true" />}</>;
}

export default function Pricing({ user, hasProfile = false }) {
  const revealRef = useScrollReveal();
  const [previewIndex, setPreviewIndex] = useState(1);
  const preview = plans[previewIndex];
  const [status, setStatus] = useState({ state: 'loading', beta: false });
  useEffect(() => {
    let active = true;
    let request;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/platform/status`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Status unavailable');
        const data = await response.json();
        if (active && !controller.signal.aborted) setStatus({ state: 'ready', beta: data.betaPremiumEnabled === true });
      } catch {
        if (active && !controller.signal.aborted) setStatus({ state: 'error', beta: false });
      }
    };
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    refresh();
    const interval = setInterval(refreshVisible, 60000);
    window.addEventListener('focus', refreshVisible);
    window.addEventListener('showly:beta-premium-changed', refresh);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false;
      request?.abort();
      clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener('showly:beta-premium-changed', refresh);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, []);

  const actionPath = user ? (hasProfile ? '/profil' : '/stworz-profil') : '/register';
  const actionLabel = user ? (hasProfile ? 'Przejdź do swojego profilu' : 'Stwórz swoją wizytówkę') : 'Załóż konto';

  return <section ref={revealRef} className={styles.page} aria-labelledby="pricing-title">
    <div className={styles.backdrop} aria-hidden="true"><span className={styles.backdropWord}>TWÓJ PLAN.</span><span className={styles.backdropDots} /></div>
    <div className={styles.inner}>
      <header className={styles.hero}>
        <div className={styles.heroCopy} data-reveal><h1 id="pricing-title">Twoja oferta.<br /><span>Plan na jej rozwój.</span></h1><p>Zacznij od wizytówki. Dodaj więcej miejsca na realizacje, a gdy potrzebujesz — także rezerwacje i zespół. Tutaj porównasz, co daje każdy plan.</p>
          <a className={styles.heroLink} href="#plany-showly">Poznaj plany<FiArrowRight aria-hidden="true" /></a>
          <div className={styles.needPicker} role="group" aria-label="Co chcesz robić ze swoim profilem?">
            <span>Co chcesz robić?</span>
            {['Pokazać ofertę', 'Wyróżnić markę', 'Przyjmować rezerwacje'].map((label, index) => <button key={label} type="button" aria-pressed={previewIndex === index} onClick={() => setPreviewIndex(index)}>{label}<FiArrowUpRight aria-hidden="true" /></button>)}
          </div>
        </div>
        <div className={styles.previewStage} data-reveal style={{ '--reveal-delay': '120ms' }}>
          <span className={styles.previewSticker} aria-hidden="true">Twój styl.<br />Twój adres.<FiArrowUpRight /></span>
          <div className={styles.heroNote}>
            <div className={styles.previewBar}><img src="/images/other/showly-mark.png" width="30" height="30" alt="" /><span>showly.me / Twoja oferta</span><FiArrowUpRight aria-hidden="true" /></div>
            <div className={styles.previewCover}><img src="/images/about-app/your-work.jpg" width="1536" height="1024" alt="Ilustracja pracowni florystycznej jako przykładowa prezentacja oferty" /><span>Twoja praca na pierwszym planie.</span></div>
            <div className={styles.previewBody} key={preview.key}>
              <div className={styles.previewTitle}><div><small>Przykładowy zakres planu</small><strong>{preview.name}</strong></div><span>0{previewIndex + 1} / 03</span></div>
              <div className={styles.previewRows}><div><FiImage aria-hidden="true" /><span>Miejsce na realizacje</span><b>{['3 zdjęcia', '6 zdjęć', '15 zdjęć'][previewIndex]}</b></div><div><FiLayers aria-hidden="true" /><span>Twoja oferta</span><b>{['3 usługi', '10 usług', '20 usług'][previewIndex]}</b></div><div>{previewIndex === 2 ? <FiCalendar aria-hidden="true" /> : <FiLayout aria-hidden="true" />}<span>{previewIndex === 2 ? 'Kontakt i terminy' : 'Wygląd profilu'}</span><b>{['Podstawowy', 'Rozszerzony', 'Rezerwacje'][previewIndex]}</b></div></div>
            </div>
            <a className={styles.previewLink} href="#porownanie-planow">Porównaj wszystkie funkcje <FiArrowUpRight aria-hidden="true" /></a>
          </div>
          <span className={styles.previewCaption}>Jedna wizytówka. Miejsce na kolejne kroki.<span aria-hidden="true">↗</span></span>
        </div>
      </header>

      <div className={styles.benefitStrip} data-reveal><span><FiLayout aria-hidden="true" />Pokaż swoją ofertę</span><FiArrowRight aria-hidden="true" /><span><FiImage aria-hidden="true" />Daj się poznać</span><FiArrowRight aria-hidden="true" /><span><FiCalendar aria-hidden="true" />Ułatw pierwszy kontakt</span></div>

      <div className={`${styles.status} ${status.beta ? styles.beta : ''}`} role="status" aria-live="polite">
        <FiZap aria-hidden="true" />
        <div>{status.beta ? <><span>Teraz / bezpłatne testy</span><h2>Premium dla każdego. Za 0 zł.</h2><p>Na czas testów każdy profil otrzymuje funkcje i limity Premium oraz widoczność przez cały okres testów. Bez karty i bez uruchamiania płatnej subskrypcji.</p><p>Po testach wraca dotychczasowy plan. Dostęp testowy nie powoduje automatycznego obciążenia.</p></> : <><h2>{status.state === 'loading' ? 'Sprawdzamy aktualne warunki dostępu…' : status.state === 'error' ? 'Porównaj plany. Aktualny dostęp sprawdzisz w profilu.' : 'Wybierz możliwości dopasowane do swojej oferty.'}</h2><p>{status.state === 'error' ? 'Nie udało się potwierdzić statusu bezpłatnych testów. Poniżej znajdziesz ceny regularne i zakres planów.' : 'Poniżej znajdziesz ceny regularne. Aktualny plan oraz dostępność zakupu zobaczysz po zalogowaniu w swoim profilu.'}</p></>}</div>
        <Link to={actionPath} className={styles.action}>{status.beta ? 'Korzystaj z testowego Premium' : actionLabel}<FiArrowUpRight aria-hidden="true" /></Link>
      </div>

      <div className={styles.sectionHeading} id="plany-showly" data-reveal><div><h2>Trzy plany.<br /><span>Jasne różnice.</span></h2></div><p>{status.beta ? 'Ceny regularne poniżej. Podczas aktywnych testów korzystasz z Premium za 0 zł.' : 'Ceny regularne. Szczegóły dostępu sprawdzisz w panelu profilu.'}</p></div>
      <div className={styles.plans}>
        {plans.map((plan, index) => <article key={plan.key} data-plan={plan.key} data-preview={previewIndex === index ? 'selected' : undefined} data-reveal style={{ '--reveal-delay': `${index * 90}ms` }} className={`${styles.plan} ${plan.key === 'premium' ? styles.premium : ''}`} aria-labelledby={`plan-${plan.key}`}>
          <div className={styles.planVisual} aria-hidden="true"><span>0{index + 1}</span>{index === 0 ? <FiLayout /> : index === 1 ? <FiLayers /> : <FiCalendar />}<i /></div>
          <div className={styles.planLabel}><span>{plan.label}</span>{plan.key === 'premium' && <FiZap aria-hidden="true" />}</div>
          <h3 id={`plan-${plan.key}`}>{plan.name}</h3><p className={styles.description}>{plan.description}</p>
          <div className={styles.price}><strong>{plan.price}</strong><span>{plan.suffix}</span></div>
          <ul>{plan.features.map(feature => <li key={feature}><FiCheck aria-hidden="true" /><span>{feature}</span></li>)}</ul>
          <p className={styles.planNote}>{plan.note}</p>
          <a className={styles.planLink} href="#porownanie-planow">Sprawdź zakres {plan.name}<FiArrowUpRight aria-hidden="true" /></a>
        </article>)}
      </div>

      <section className={styles.comparison} id="porownanie-planow" aria-labelledby="comparison-title" data-reveal>
        <div className={styles.sectionHeading}><div><h2 id="comparison-title">Sprawdź szczegóły.</h2></div><p>Limity dla poszczególnych planów.{status.beta && ' W trakcie testów obowiązują limity Premium.'}</p></div>
        <div className={styles.tableScroll} role="region" aria-label="Porównanie planów — przewijana tabela" tabIndex={0}><table><caption className={styles.srOnly}>Porównanie funkcji i limitów planów Showly</caption><thead><tr><th scope="col">Co dostajesz</th>{plans.map(plan => <th scope="col" key={plan.key}>{plan.name}</th>)}</tr></thead><tbody>{comparison.map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}><FeatureValue value={value} /></td>)}</tr>)}</tbody></table></div>
        <p className={styles.tableHint}>Na małym ekranie przesuń tabelę w bok, aby zobaczyć wszystkie plany.</p>
      </section>

      <section className={styles.faq} aria-labelledby="pricing-faq" data-reveal><div><h2 id="pricing-faq">Zanim zaczniesz.</h2><p>Masz inne pytanie? <Link to="/kontakt">Napisz do nas <FiArrowUpRight aria-hidden="true" /></Link></p><span className={styles.faqSketch} aria-hidden="true">?<FiArrowUpRight /></span></div><div>
        <details><summary>Czy potrzebuję płatnego planu, żeby szukać usług?<FiChevronDown aria-hidden="true" /></summary><p>Nie. Publiczne profile i ogłoszenia możesz przeglądać bez konta. Konto pozwala korzystać m.in. z ulubionych, wiadomości i rezerwacji. Plany dotyczą Twojej własnej wizytówki usługodawcy.</p></details>
        <details><summary>Jak działa widoczność w planie Starter?<FiChevronDown aria-hidden="true" /></summary><p>Poza testami Starter zapewnia pierwsze 30 dni widoczności bez opłat. Potem przedłużenie kosztuje 14,99 zł za kolejne 30 dni. W Standard i Premium widoczność jest w cenie aktywnej subskrypcji.</p></details>
        <details><summary>Co dają rezerwacje w Premium?<FiChevronDown aria-hidden="true" /></summary><p>Możesz udostępnić kalendarz godzinowy, przyjmować zapytania lub rezerwacje całodniowe. Ustawiasz dostępność, wyjątki, przerwy między rezerwacjami i sposób akceptacji. Plan obejmuje również zespół do 3 pracowników.</p></details>
        <details><summary>Gdzie mogę wybrać lub zmienić plan?<FiChevronDown aria-hidden="true" /></summary><p>W swoim profilu, w sekcji planu i widoczności. Tam sprawdzisz aktualny dostęp i dostępność zakupu. Ta strona służy porównaniu oferty; nie uruchamia płatności.</p></details>
      </div></section>
      <div className={styles.bottomCta} data-reveal><span className={styles.ctaArrow} aria-hidden="true">↗</span><div><span className={styles.eyebrow}>Teraz Twój ruch</span><h2>{status.beta ? 'Sprawdź, co potrafi Twój profil.' : 'Daj swojej ofercie dobry adres.'}</h2><p>{status.beta ? 'Pełne możliwości Premium na czas testów. Bez karty.' : 'Zbierz ofertę, realizacje i kontakt w jednej wizytówce.'}</p></div><Link className={styles.action} to={actionPath}>{actionLabel}<FiArrowUpRight aria-hidden="true" /></Link></div>
    </div>
  </section>;
}
