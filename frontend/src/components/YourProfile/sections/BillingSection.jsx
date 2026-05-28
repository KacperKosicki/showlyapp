import styles from "../YourProfile.module.scss";

const BillingSection = ({
  billingLoading,
  billingLabel,
  billingCurrentStatus,
  billingLimits,
  billingPlan,
  billingActionLoading,
  isPaidActive,
  onStartSubscription,
  onOpenBillingPortal,
}) => {
  return (
<section className={styles.billingPanel} id="billingSection">
  <div className={styles.billingGlowOne} aria-hidden="true" />
  <div className={styles.billingGlowTwo} aria-hidden="true" />
  <div className={styles.billingNoise} aria-hidden="true" />

  <div className={styles.billingHeader}>
    <div>
      <p className={styles.billingEyebrow}>
        <span>Showly.me</span>
        Plan i widoczność profilu
      </p>

      <h2>Twój plan i limity</h2>

      <p>
        Zarządzaj widocznością profilu, zdjęciami, usługami i funkcjami rezerwacji.
        Wybierz plan dopasowany do tego, jak chcesz pokazywać swoją ofertę klientom.
      </p>
    </div>

    <div className={styles.currentPlanBadge}>
      <span>Aktualnie</span>
      <strong>{billingLoading ? "Ładowanie..." : billingLabel}</strong>
    </div>
  </div>

  <div className={styles.billingStatusBox}>
    <div>
      <span>Aktualny plan</span>
      <strong>{billingLabel}</strong>
    </div>

    <div>
      <span>Status</span>
      <strong>{billingCurrentStatus}</strong>
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
  </div>

  <div className={styles.planCards}>
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

      <ul>
        <li>Widoczność przez 30 dni</li>
        <li>Losowy link do profilu</li>
        <li>Do 3 zdjęć profilu</li>
        <li>Do 3 usług</li>
        <li>1 link</li>
        <li>Wiadomości od klientów</li>
        <li>Podstawowy wygląd profilu</li>
        <li>1 szybka odpowiedź profilu</li>
        <li>Opis profilu do 200 znaków</li>
      </ul>

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

      <ul>
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
      </ul>

      {billingPlan === "standard" ? (
        <button type="button" disabled className={styles.planButtonGhost}>
          Aktywny plan
        </button>
      ) : (
        <button
          type="button"
          className={styles.planButton}
          onClick={() => onStartSubscription("standard")}
          disabled={billingActionLoading === "standard"}
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

      <ul>
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
      </ul>

      {billingPlan === "premium" ? (
        <button type="button" disabled className={styles.planButtonGhost}>
          Aktywny plan
        </button>
      ) : (
        <button
          type="button"
          className={styles.planButton}
          onClick={() => onStartSubscription("premium")}
          disabled={billingActionLoading === "premium"}
        >
          {billingActionLoading === "premium" ? "Przekierowanie..." : "Wybierz Premium"}
        </button>
      )}
    </article>
  </div>

  {isPaidActive && (
    <div className={styles.billingFooter}>
      <p>
        Subskrypcją możesz zarządzać w bezpiecznym panelu Stripe — anulowanie,
        zmiana karty i historia płatności.
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
</section>
  );
};

export default BillingSection;
