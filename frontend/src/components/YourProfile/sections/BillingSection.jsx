import EditorGroup, { EditorSectionHeader } from './EditorGroup';
import { FiCreditCard } from 'react-icons/fi';
import styles from "./BillingSection.module.scss";

const BillingSection = ({
  betaPremiumEnabled = false,
  paymentsEnabled = false,
  canManageSubscription = false,
  billingLoading,
  billingLabel,
  billingCurrentStatus,
  billingLimits,
  billingPlan,
  billingActionLoading,
  onStartSubscription,
  onOpenBillingPortal,
  onReconcile,
  billingError,
}) => {
  return (
    <section className={styles.billingPanel} id="billingSection">

      <div className={styles.billingGlowOne} aria-hidden="true" />
      <div className={styles.billingGlowTwo} aria-hidden="true" />
      <div className={styles.billingNoise} aria-hidden="true" />

      <EditorSectionHeader kicker="Plan i widoczność profilu" title="Twój plan i limity" description={betaPremiumEnabled ? "Testuj wszystkie możliwości Showly — Premium jest teraz dostępne bezpłatnie dla każdego profilu." : "Zarządzaj widocznością profilu, zdjęciami, usługami i rezerwacjami. Wybierz plan dopasowany do swojej oferty."} icon={<FiCreditCard />} />

      {betaPremiumEnabled && <div className={styles.betaNotice} role="status">
        <span>SHOWLY BETA / 0 ZŁ</span><h3>Premium dla każdego. Na czas testów.</h3>
        <p>Twój profil ma najwyższy plan, pełne limity i widoczność przez cały czas trwania testów. Bez karty i bez aktywowania subskrypcji w Stripe.</p>
        <p>Po zakończeniu testów wróci Twój dotychczasowy plan. Dostęp testowy nie uruchomi płatnej subskrypcji ani automatycznego obciążenia.</p>
      </div>}
      <EditorGroup unshadedPreview title="01 / Aktualny plan i wykorzystanie"><div className={styles.billingStatusBox}>
        <div>
          <span>Aktualny plan</span>
          <strong>{billingLabel}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong>{betaPremiumEnabled ? "Bezpłatny dostęp testowy" : billingCurrentStatus}</strong>
        </div>

        <div>
          <span>Zdjęcia profilu</span>
          <strong>{billingLimits.photos || 3}</strong>
        </div>

        <div>
          <span>Usługi</span>
          <strong>{billingLimits.services || 3}</strong>
        </div>

        <div>
          <span>Pracownicy</span>
          <strong>{billingLimits.staff || 0}</strong>
        </div>
      </div></EditorGroup>

      {!betaPremiumEnabled && <>
      {!paymentsEnabled && <p role="status">Zakup planów jest obecnie niedostępny.</p>}
      <EditorGroup unshadedPreview title="02 / Wybierz plan dla siebie"><div className={styles.planCards}>
        <article
          className={`${styles.planCard} ${styles.starterPlan} ${billingPlan === "free" ? styles.activePlan : ""
            }`}
        >
          <div className={styles.planBadge}>Na start</div>

          <div className={styles.planTop}>
            <div>
              <h3>Starter</h3>
              <p>Podstawowa wizytówka</p>
            </div>

            <strong>0 zł</strong>
          </div>

          <p className={styles.planDesc}>
            Podstawowa wizytówka na start. Po 30 dniach możesz przedłużyć widoczność za
            <b> 14,99 zł / kolejne 30 dni</b>.
          </p>

          <details className={styles.planDetails}><summary>Wszystkie funkcje planu</summary><ul>
            <li>Widoczność przez 30 dni</li>
            <li>Losowy link do profilu</li>
            <li>Do 3 zdjęć profilu</li>
            <li>Do 3 usług</li>
            <li>1 link</li>
            <li>Wiadomości od klientów</li>
            <li>Podstawowy wygląd profilu</li>
            <li>1 szybka odpowiedź profilu</li>
            <li>Opis profilu do 200 znaków</li>
          </ul></details>

          <button type="button" disabled className={styles.planButtonGhost}>
            {billingPlan === "free" ? "Aktywny plan" : "Plan podstawowy"}
          </button>
        </article>

        <article
          className={`${styles.planCard} ${styles.standardPlan} ${billingPlan === "standard" ? styles.activePlan : ""
            }`}
        >
          <div className={styles.planBadge}>Najlepszy wybór</div>

          <div className={styles.planTop}>
            <div>
              <h3>Standard</h3>
              <p>Dla twórców i usługodawców</p>
            </div>

            <strong>29,99 zł <span>/ mies.</span></strong>
          </div>

          <p className={styles.planDesc}>
            Profesjonalny profil z lepszym wyglądem, social mediami i ładnym linkiem.
            <b> Tylko 15 zł więcej niż zwykłe przedłużenie profilu.</b>
          </p>

          <details className={styles.planDetails}><summary>Wszystkie funkcje planu</summary><ul>
            <li>Widoczność profilu w cenie subskrypcji</li>
            <li>Własny link po nazwie i roli</li>
            <li>Własny banner w tle profilu</li>
            <li>Do 6 zdjęć profilu</li>
            <li>Do 10 usług</li>
            <li>2 linki</li>
            <li>Wiadomości od klientów</li>
            <li>Rozszerzone motywy profilu</li>
            <li>Social media profilu</li>
            <li>3 szybkie odpowiedzi profilu</li>
            <li>Opis profilu do 500 znaków</li>
            <li>Promowanie i lepsza widoczność w Showly</li>
          </ul></details>

          {billingPlan === "standard" ? (
            <button type="button" disabled className={styles.planButtonGhost}>
              Aktywny plan
            </button>
          ) : (
            <button
              type="button"
              className={styles.planButton}
              onClick={() => onStartSubscription("standard")}
              disabled={!paymentsEnabled || billingLoading || billingActionLoading === "standard"}
            >
              {billingActionLoading === "standard" ? "Przekierowanie..." : "Wybierz Standard"}
            </button>
          )}
        </article>

        <article
          className={`${styles.planCard} ${styles.premiumPlan} ${billingPlan === "premium" ? styles.activePlan : ""
            }`}
        >
          <div className={styles.planBadge}>Dla profesjonalistów</div>

          <div className={styles.planTop}>
            <div>
              <h3>Premium</h3>
              <p>Rezerwacje i zespół</p>
            </div>

            <strong>59,99 zł <span>/ mies.</span></strong>
          </div>

          <p className={styles.planDesc}>
            Pełny pakiet dla profili, które obsługują klientów, terminy, rezerwacje
            i pracowników.
          </p>

          <details className={styles.planDetails}><summary>Wszystkie funkcje planu</summary><ul>
            <li>Widoczność profilu w cenie subskrypcji</li>
            <li>Własny link po nazwie i roli</li>
            <li>Własny banner w tle profilu</li>
            <li>Do 15 zdjęć profilu</li>
            <li>Do 20 usług</li>
            <li>3 linki</li>
            <li>Wiadomości od klientów</li>
            <li>Rozszerzone motywy profilu</li>
            <li>Social media profilu</li>
            <li>5 szybkich odpowiedzi profilu</li>
            <li>Opis profilu do 1000 znaków</li>
            <li>Promowanie i lepsza widoczność w Showly</li>
            <li>Zaawansowany kalendarz rezerwacji</li>
            <li>Tryby rezerwacji: kalendarz, zapytania i blokowanie dni</li>
            <li>Automatyczna akceptacja rezerwacji</li>
            <li>Bufor (przerwa) między rezerwacjami</li>
            <li>Zespół i do 3 pracowników</li>
            <li>Wyjątki dostępności</li>
          </ul></details>

          {billingPlan === "premium" ? (
            <button type="button" disabled className={styles.planButtonGhost}>
              Aktywny plan
            </button>
          ) : (
            <button
              type="button"
              className={styles.planButton}
              onClick={() => onStartSubscription("premium")}
              disabled={!paymentsEnabled || billingLoading || billingActionLoading === "premium"}
            >
              {billingActionLoading === "premium" ? "Przekierowanie..." : "Wybierz Premium"}
            </button>
          )}
        </article>
      </div></EditorGroup>

      </>}
      {!betaPremiumEnabled && canManageSubscription && (
        <div className={styles.billingFooter}>
          <p>
            Subskrypcją możesz zarządzać w bezpiecznym panelu Stripe — anulowanie, zmiana karty i historia płatności.
          </p>

          <button
            type="button"
            className={styles.portalButton}
            onClick={onOpenBillingPortal}
            disabled={billingActionLoading === "portal"}
          >
            {billingActionLoading === "portal" ? "Otwieranie..." : "Zarządzaj subskrypcją"}
          </button>
        </div>
      )}
      {!betaPremiumEnabled && <EditorGroup unshadedPreview title="03 / Pomoc z płatnością"><div className={styles.recovery} role="status">
        <p>{billingError ? 'Nie udało się pobrać statusu płatności. Brak połączenia nie oznacza utraty opłaconego planu.' : 'Płatność została pobrana, a wizytówka nie działa? Sprawdź subskrypcję — odzyskasz opłaconą widoczność po przerwie w działaniu serwera.'}</p>
        <button type="button" disabled={!!billingActionLoading || billingLoading} onClick={onReconcile}>
          {billingActionLoading === 'reconcile' ? 'Sprawdzanie płatności…' : 'Sprawdź płatność i przywróć profil'}
        </button>
      </div></EditorGroup>}
    </section>
  );
};

export default BillingSection;
