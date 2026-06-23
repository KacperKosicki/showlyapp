import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import styles from "./Regulations.module.scss";
import {
  FiFileText,
  FiShield,
  FiCreditCard,
  FiUsers,
  FiAlertCircle,
  FiCheckCircle,
  FiMail,
  FiClock,
  FiLock,
  FiBriefcase,
} from "react-icons/fi";

const Regulations = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;

    if (!scrollTo) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });

        window.history.replaceState(
          {},
          document.title,
          location.pathname
        );

        return;
      }

      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname]);

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.bg}>
        <div className={styles.blur1}></div>
        <div className={styles.blur2}></div>
        <div className={styles.vignette}></div>
      </div>

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Legal</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Zasady korzystania z platformy</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Regulamin • Konto • Profile • Rezerwacje</span>
          </div>

          <h2 className={styles.heading}>
            Regulamin <span className={styles.headingAccent}>Showly.me</span>
          </h2>

          <p className={styles.description}>
            Niniejszy regulamin określa zasady korzystania z platformy Showly.me,
            w tym zakładania konta, tworzenia publicznych profili, publikowania treści,
            korzystania z systemu wiadomości, rezerwacji, opinii oraz płatnych funkcji
            dostępnych w Serwisie.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>Konta</strong>
              <span>rejestracja, logowanie i bezpieczeństwo użytkownika</span>
            </div>

            <div className={styles.metaCard}>
              <strong>Profile</strong>
              <span>publikacja wizytówek, usług, galerii i cenników</span>
            </div>

            <div className={styles.metaCard}>
              <strong>Płatności</strong>
              <span>subskrypcje, plany premium i rozliczenia</span>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiFileText />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 1. Postanowienia ogólne</h3>
                  <p className={styles.sectionLead}>
                    Podstawowe informacje o platformie i operatorze.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Niniejszy regulamin określa zasady korzystania z platformy internetowej
                  dostępnej pod adresem <strong>Showly.me</strong>, zwanej dalej
                  „Serwisem”, „Platformą” lub „Showly”.
                </p>

                <p>
                  2. Showly jest platformą umożliwiającą użytkownikom tworzenie publicznych
                  profili internetowych, prezentowanie usług, publikowanie opisów, zdjęć,
                  cenników, dostępności, linków oraz korzystanie z funkcji kontaktu,
                  wiadomości i rezerwacji.
                </p>

                <p>
                  3. Kontakt z administratorem Serwisu jest możliwy pod adresem e-mail:
                  <strong> kontakt@showly.me</strong>.
                </p>

                <p>
                  4. Regulamin jest udostępniany użytkownikom nieodpłatnie w sposób
                  umożliwiający jego pozyskanie, odtworzenie, utrwalenie i zapoznanie się
                  z jego treścią przed rozpoczęciem korzystania z Serwisu.
                </p>

                <p>
                  5. Korzystanie z Serwisu oznacza akceptację Regulaminu w zakresie funkcji,
                  z których użytkownik faktycznie korzysta.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiUsers />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 2. Definicje</h3>
                  <p className={styles.sectionLead}>
                    Najważniejsze pojęcia użyte w regulaminie.
                  </p>
                </div>
              </div>

              <div className={styles.listBlock}>
                <div className={styles.definitionItem}>
                  <strong>Serwis / Platforma / Showly</strong>
                  <p>
                    platforma internetowa dostępna pod adresem Showly.me, umożliwiająca
                    tworzenie profili, prezentowanie usług oraz korzystanie z funkcji
                    komunikacyjnych i rezerwacyjnych.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Użytkownik</strong>
                  <p>
                    każda osoba korzystająca z Serwisu, niezależnie od tego, czy posiada
                    zarejestrowane konto.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Konto</strong>
                  <p>
                    indywidualny panel użytkownika utworzony w Serwisie, umożliwiający
                    korzystanie z funkcji dostępnych po zalogowaniu.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Profil / Wizytówka</strong>
                  <p>
                    publiczna strona użytkownika utworzona w Serwisie, zawierająca m.in.
                    opis działalności, zdjęcia, usługi, cennik, dostępność, opinie oraz dane
                    kontaktowe lub linki.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Twórca profilu</strong>
                  <p>
                    użytkownik, który tworzy i publikuje własny profil w Serwisie w celu
                    prezentacji siebie, swojej działalności, usług, portfolio lub oferty.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Odwiedzający / Klient</strong>
                  <p>
                    osoba korzystająca z Serwisu w celu przeglądania profili, kontaktu
                    z twórcą profilu, wysłania wiadomości, zapytania lub rezerwacji.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiShield />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 3. Konto użytkownika i bezpieczeństwo</h3>
                  <p className={styles.sectionLead}>
                    Rejestracja, odpowiedzialność za dane i dostęp do konta.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Założenie konta w Serwisie może wymagać podania adresu e-mail, hasła
                  lub skorzystania z zewnętrznej metody logowania, jeżeli taka funkcja jest
                  dostępna.
                </p>

                <p>
                  2. Użytkownik zobowiązuje się do podawania danych prawdziwych, aktualnych
                  i niewprowadzających w błąd.
                </p>

                <p>
                  3. Użytkownik odpowiada za zachowanie poufności danych logowania oraz za
                  działania podejmowane z użyciem jego konta, chyba że naruszenie nastąpiło
                  z przyczyn leżących po stronie Serwisu.
                </p>

                <p>
                  4. Zabronione jest udostępnianie konta osobom trzecim, korzystanie z konta
                  w sposób sprzeczny z prawem, naruszający bezpieczeństwo Serwisu albo prawa
                  innych użytkowników.
                </p>

                <p>
                  5. Administrator może czasowo ograniczyć dostęp do konta lub wybranych
                  funkcji, jeżeli zachodzi uzasadnione podejrzenie naruszenia Regulaminu,
                  prawa, bezpieczeństwa Serwisu lub praw innych osób.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiBriefcase />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 4. Profile, treści i odpowiedzialność użytkownika</h3>
                  <p className={styles.sectionLead}>
                    Zasady publikowania wizytówek, opisów, zdjęć i ofert.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Użytkownik tworzący profil odpowiada za wszystkie treści publikowane
                  w ramach swojego profilu, w szczególności za opisy, zdjęcia, grafiki,
                  nazwy, logo, cenniki, terminy, linki, dane kontaktowe oraz informacje
                  o oferowanych usługach.
                </p>

                <p>
                  2. Publikując treści w Serwisie, użytkownik oświadcza, że posiada prawo
                  do ich wykorzystania oraz że ich publikacja nie narusza praw osób trzecich,
                  w tym praw autorskich, dóbr osobistych, praw do wizerunku ani znaków
                  towarowych.
                </p>

                <p>
                  3. Zabronione jest publikowanie treści bezprawnych, obraźliwych,
                  wulgarnych, dyskryminujących, erotycznych, nawołujących do przemocy,
                  wprowadzających w błąd, naruszających dobre obyczaje lub godzących
                  w dobre imię innych osób.
                </p>

                <p>
                  4. Użytkownik zobowiązuje się, aby informacje prezentowane na profilu były
                  rzetelne, aktualne i zgodne z rzeczywistym zakresem oferowanych usług.
                </p>

                <p>
                  5. Administrator może usunąć, ukryć lub ograniczyć widoczność profilu albo
                  jego części, jeżeli treści naruszają Regulamin, obowiązujące przepisy,
                  prawa osób trzecich lub bezpieczeństwo Platformy.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiMail />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 5. Wiadomości, kontakt i rezerwacje</h3>
                  <p className={styles.sectionLead}>
                    Jak działa komunikacja i kiedy dochodzi do ustaleń.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Serwis może umożliwiać użytkownikom wysyłanie wiadomości, zadawanie
                  pytań, składanie zapytań ofertowych oraz dokonywanie rezerwacji terminów
                  u twórców profili.
                </p>

                <p>
                  2. Wysłanie wiadomości, zapytania lub rezerwacji nie oznacza automatycznego
                  zawarcia umowy pomiędzy odwiedzającym a twórcą profilu, chyba że strony
                  wyraźnie ustalą inaczej poza Serwisem lub za pomocą dostępnych funkcji
                  Platformy.
                </p>

                <p>
                  3. Za kontakt z klientem, realizację usługi, dostępność terminów, jakość
                  wykonania, cenę oraz zgodność oferty z rzeczywistością odpowiada twórca
                  profilu.
                </p>

                <p>
                  4. Showly nie jest stroną umów zawieranych pomiędzy użytkownikami, chyba że
                  w konkretnym przypadku wyraźnie wskazano inaczej.
                </p>

                <p>
                  5. Zabronione jest wykorzystywanie systemu wiadomości do spamu, nękania,
                  phishingu, wysyłania treści bezprawnych, reklam niezwiązanych z celem
                  Serwisu lub działań naruszających bezpieczeństwo innych użytkowników.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiCreditCard />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 6. Płatności, plany i subskrypcje</h3>
                  <p className={styles.sectionLead}>
                    Warunki rozliczeń za płatne funkcje Showly.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Korzystanie z podstawowych funkcji Serwisu może być bezpłatne, natomiast
                  wybrane funkcje, plany, wyróżnienia, rozszerzenia lub usługi dodatkowe mogą
                  być odpłatne.
                </p>

                <p>
                  2. Informacje o cenie, zakresie płatnej funkcji, okresie jej obowiązywania
                  oraz warunkach korzystania są prezentowane użytkownikowi przed dokonaniem
                  płatności.
                </p>

                <p>
                  3. Płatności mogą być obsługiwane przez zewnętrznych operatorów płatności.
                  W takim przypadku realizacja płatności odbywa się zgodnie z zasadami
                  danego operatora.
                </p>

                <p>
                  4. Brak płatności, cofnięcie płatności lub zakończenie okresu ważności
                  płatnej funkcji może skutkować ograniczeniem dostępu do funkcji premium,
                  wygaśnięciem wyróżnienia albo zmianą widoczności profilu.
                </p>

                <p>
                  5. Jeżeli użytkownik jest konsumentem, przysługują mu prawa wynikające
                  z powszechnie obowiązujących przepisów prawa, w tym dotyczące reklamacji
                  oraz odstąpienia od umowy zawartej na odległość, o ile przepisy nie
                  przewidują wyjątku.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiCheckCircle />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 7. Opinie, oceny i moderacja</h3>
                  <p className={styles.sectionLead}>
                    Zasady publikacji recenzji i ochrony przed nadużyciami.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Serwis może umożliwiać dodawanie ocen, opinii lub komentarzy dotyczących
                  profili, kontaktu z twórcą profilu albo wykonanych usług.
                </p>

                <p>
                  2. Opinie powinny być rzetelne, zgodne z prawdą i związane z rzeczywistym
                  kontaktem, zapytaniem, rezerwacją lub współpracą.
                </p>

                <p>
                  3. Zabronione jest publikowanie opinii fikcyjnych, obraźliwych,
                  wulgarnych, naruszających dobra osobiste, wystawianych na własną rzecz
                  albo mających na celu sztuczne zawyżenie lub zaniżenie oceny profilu.
                </p>

                <p>
                  4. Administrator może moderować, ukrywać lub usuwać opinie, które naruszają
                  Regulamin, prawo, dobre obyczaje albo zasady rzetelności systemu ocen.
                </p>

                <p>
                  5. Sam fakt niezadowolenia jednej ze stron ze współpracy nie jest podstawą
                  do usunięcia opinii, jeżeli opinia jest zgodna z prawem, rzeczowa
                  i nie narusza Regulaminu.
                </p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <div className={styles.sectionIcon}>
                  <FiLock />
                </div>
                <div>
                  <h3 className={styles.sectionTitle}>§ 8. Reklamacje, blokady i postanowienia końcowe</h3>
                  <p className={styles.sectionLead}>
                    Procedura zgłoszeń i końcowe zasady działania platformy.
                  </p>
                </div>
              </div>

              <div className={styles.textBlock}>
                <p>
                  1. Reklamacje dotyczące działania Serwisu można zgłaszać drogą mailową na
                  adres: <strong>kontakt@showly.me</strong>.
                </p>

                <p>
                  2. Zgłoszenie reklamacyjne powinno zawierać opis problemu, adres e-mail
                  użytkownika oraz, jeżeli to możliwe, informacje pozwalające zidentyfikować
                  konto, profil lub funkcję, której dotyczy zgłoszenie.
                </p>

                <p>
                  3. Reklamacje dotyczące działania Serwisu rozpatrywane są w terminie do
                  14 dni od dnia otrzymania kompletnego zgłoszenia.
                </p>

                <p>
                  4. Administrator może wprowadzać zmiany w Regulaminie, w szczególności
                  w przypadku rozwoju Serwisu, dodania nowych funkcji, zmiany modelu
                  płatności, zmiany przepisów prawa lub konieczności doprecyzowania zasad
                  bezpieczeństwa.
                </p>

                <p>
                  5. O istotnych zmianach Regulaminu użytkownicy mogą zostać poinformowani
                  poprzez komunikat w Serwisie, wiadomość e-mail lub inną dostępną formę
                  kontaktu.
                </p>

                <p>
                  6. W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa
                  polskiego.
                </p>

                <p>
                  7. Regulamin obowiązuje od dnia <strong>23 czerwca 2026 r.</strong>.
                </p>
              </div>
            </div>
          </div>

          <aside className={styles.sideColumn}>
            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Najważniejsze zasady</h3>

              <div className={styles.sideList}>
                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiShield />
                  </span>
                  <div>
                    <strong>Publikuj rzetelne dane</strong>
                    <p>Profil i oferta muszą być zgodne z rzeczywistością.</p>
                  </div>
                </div>

                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiUsers />
                  </span>
                  <div>
                    <strong>Szanuj innych użytkowników</strong>
                    <p>Zakazane są spam, nękanie i treści naruszające prawo.</p>
                  </div>
                </div>

                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiCreditCard />
                  </span>
                  <div>
                    <strong>Sprawdzaj warunki planu</strong>
                    <p>Przed zakupem premium zapoznaj się z ceną i okresem rozliczeń.</p>
                  </div>
                </div>

                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiClock />
                  </span>
                  <div>
                    <strong>Reaguj na wiadomości i rezerwacje</strong>
                    <p>Dbaj o sprawną komunikację z klientami i terminowość.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Dane operatora</h3>

              <div className={styles.companyBox}>
                <p><strong>Showly.me</strong></p>
                <p>Platforma do tworzenia profili i wizytówek online</p>
                <p>E-mail: kontakt@showly.me</p>
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Status dokumentu</h3>

              <div className={styles.statusPill}>
                <FiFileText />
                <span>Regulamin obowiązuje od 23 czerwca 2026 r.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Regulations;