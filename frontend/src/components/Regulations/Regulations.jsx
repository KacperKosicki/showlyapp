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
  return (
    <section className={styles.regulationsSection}>
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.blur1} />
        <span className={styles.blur2} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
      </div>

      <div className={styles.container}>
        <div className={styles.heading}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Legal</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Zasady korzystania z platformy</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Regulamin • Konto • Profile • Rezerwacje</span>
          </div>

          <h2 className={styles.title}>
            Regulamin <span className={styles.titleAccent}>Showly.app</span>
          </h2>

          <p className={styles.subtitle}>
            Ten regulamin określa zasady korzystania z platformy Showly.app,
            w tym zasady zakładania kont, publikowania profili, kontaktu między
            użytkownikami, rezerwacji, opinii, płatności oraz odpowiedzialności
            za treści i usługi prezentowane w serwisie.
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

        <div className={styles.noticeBox}>
          <div className={styles.noticeIcon}>
            <FiAlertCircle />
          </div>
          <div>
            <p className={styles.noticeTitle}>Uzupełnij dane przed publikacją</p>
            <p className={styles.noticeText}>
              Przed wrzuceniem regulaminu na produkcję podmień pola:
              <strong> [Nazwa firmy]</strong>, <strong>[adres]</strong>,{" "}
              <strong>[NIP]</strong>, <strong>[e-mail]</strong>,{" "}
              <strong>[telefon]</strong>, <strong>[data wejścia w życie]</strong>.
            </p>
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
                  1. Niniejszy Regulamin określa zasady korzystania z platformy
                  internetowej działającej pod adresem <strong>Showly.app</strong>,
                  zwanej dalej „Serwisem”, „Platformą” lub „Showly”.
                </p>
                <p>
                  2. Operatorem Serwisu jest <strong>[Nazwa firmy]</strong> z
                  siedzibą pod adresem <strong>[adres]</strong>, NIP:
                  <strong> [NIP]</strong>, e-mail: <strong>[e-mail]</strong>,
                  telefon: <strong>[telefon]</strong>, dalej jako „Usługodawca”.
                </p>
                <p>
                  3. Serwis służy do tworzenia i prowadzenia wizytówek online,
                  prezentacji usług, publikacji galerii, cenników, dostępności,
                  przyjmowania wiadomości, rezerwacji oraz obsługi dodatkowych
                  funkcji konta.
                </p>
                <p>
                  4. Regulamin jest udostępniany nieodpłatnie w sposób
                  umożliwiający jego pozyskanie, odtworzenie i utrwalenie.
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
                  <strong>Serwis / Platforma</strong>
                  <p>platforma internetowa dostępna pod adresem Showly.app.</p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Użytkownik</strong>
                  <p>każda osoba korzystająca z Serwisu, zalogowana lub nie.</p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Konto</strong>
                  <p>
                    indywidualne konto użytkownika umożliwiające korzystanie z
                    funkcji dostępnych po zalogowaniu.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Profil / Wizytówka</strong>
                  <p>
                    publiczna prezentacja użytkownika, jego usług, danych,
                    galerii, cennika, opinii i dostępności.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Klient</strong>
                  <p>
                    użytkownik korzystający z platformy w celu kontaktu,
                    złożenia zapytania lub rezerwacji usługi.
                  </p>
                </div>

                <div className={styles.definitionItem}>
                  <strong>Usługodawca Profilowy</strong>
                  <p>
                    użytkownik publikujący swój profil i oferujący usługi za
                    pośrednictwem Showly.
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
                  1. Założenie konta w Serwisie może wymagać podania adresu
                  e-mail, hasła oraz innych danych niezbędnych do korzystania z
                  funkcji Platformy.
                </p>
                <p>
                  2. Użytkownik zobowiązuje się do podawania danych zgodnych z
                  prawdą, aktualnych i niewprowadzających w błąd.
                </p>
                <p>
                  3. Użytkownik ponosi odpowiedzialność za zabezpieczenie danych
                  logowania i za działania wykonane z użyciem jego konta, chyba
                  że doszło do naruszenia z przyczyn leżących po stronie
                  Usługodawcy.
                </p>
                <p>
                  4. Usługodawca może czasowo ograniczyć dostęp do konta lub
                  wybranych funkcji w przypadku naruszenia Regulaminu, prawa lub
                  bezpieczeństwa Serwisu.
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
                  1. Użytkownik publikujący profil oświadcza, że ma prawo do
                  zamieszczanych treści, zdjęć, grafik, logo, nazw, opisów,
                  cenników i innych materiałów.
                </p>
                <p>
                  2. Użytkownik ponosi pełną odpowiedzialność za treści
                  opublikowane na swoim profilu, w szczególności za ich
                  prawdziwość, zgodność z prawem i nienaruszanie praw osób
                  trzecich.
                </p>
                <p>
                  3. Zabrania się publikowania treści bezprawnych, obraźliwych,
                  wulgarnych, dyskryminujących, wprowadzających klientów w błąd
                  lub naruszających dobre obyczaje.
                </p>
                <p>
                  4. Usługodawca może ukryć, ograniczyć widoczność albo usunąć
                  profil lub jego część, jeżeli treści naruszają Regulamin,
                  obowiązujące przepisy albo bezpieczeństwo Platformy.
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
                  1. Serwis może umożliwiać wysyłanie wiadomości, zadawanie
                  pytań, składanie zapytań ofertowych oraz rezerwowanie
                  terminów.
                </p>
                <p>
                  2. Wysłanie wiadomości, zapytania lub rezerwacji przez
                  użytkownika nie oznacza automatycznego zawarcia umowy o
                  wykonanie usługi, chyba że konkretna funkcja wyraźnie stanowi
                  inaczej.
                </p>
                <p>
                  3. Za sposób realizacji usługi, kontakt z klientem, terminy,
                  jakość wykonania oraz zgodność oferty z rzeczywistością
                  odpowiada usługodawca prowadzący swój profil.
                </p>
                <p>
                  4. Zabrania się wykorzystywania systemu wiadomości do spamu,
                  phishingu, nękania, treści nielegalnych lub działań
                  niezgodnych z celem platformy.
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
                  1. Korzystanie z Serwisu może być w całości lub częściowo
                  odpłatne. Informacje o cenach, planach, funkcjach premium i
                  okresach rozliczeniowych są prezentowane przed dokonaniem
                  zakupu.
                </p>
                <p>
                  2. W przypadku subskrypcji odnawialnych użytkownik jest
                  informowany o cyklu płatności, zakresie usługi oraz sposobie
                  rezygnacji.
                </p>
                <p>
                  3. Płatności mogą być obsługiwane przez zewnętrznych
                  operatorów płatności. Ich działanie odbywa się zgodnie z
                  regulaminami tych dostawców.
                </p>
                <p>
                  4. Brak płatności może skutkować ograniczeniem lub wyłączeniem
                  płatnych funkcji konta, w tym obniżeniem widoczności profilu
                  albo dezaktywacją funkcji premium.
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
                  1. Showly może umożliwiać dodawanie opinii, komentarzy i ocen
                  dotyczących usługodawców lub wykonanych usług.
                </p>
                <p>
                  2. Opinie powinny być zgodne z prawdą, związane z realnym
                  kontaktem, rezerwacją lub współpracą i nie mogą naruszać praw
                  innych osób.
                </p>
                <p>
                  3. Zakazane jest publikowanie opinii fikcyjnych, sztucznie
                  zawyżających lub zaniżających ocenę, a także wystawianych na
                  własną rzecz.
                </p>
                <p>
                  4. Usługodawca może moderować, ukrywać lub usuwać opinie, jeśli
                  naruszają Regulamin, przepisy prawa albo zasady rzetelności
                  systemu ocen.
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
                  1. Reklamacje dotyczące działania Serwisu można zgłaszać na
                  adres e-mail: <strong>[e-mail]</strong>.
                </p>
                <p>
                  2. Reklamacja powinna zawierać dane zgłaszającego, opis
                  problemu oraz żądanie dotyczące sposobu jego rozwiązania.
                </p>
                <p>
                  3. Reklamacje dotyczące działania platformy rozpatrywane są w
                  terminie do 14 dni, chyba że charakter sprawy wymaga dłuższego
                  czasu.
                </p>
                <p>
                  4. Usługodawca może zawiesić lub usunąć konto użytkownika,
                  który narusza Regulamin, przepisy prawa lub działa na szkodę
                  Serwisu bądź innych użytkowników.
                </p>
                <p>
                  5. W sprawach nieuregulowanych zastosowanie mają przepisy
                  prawa polskiego. Regulamin wchodzi w życie z dniem
                  <strong> [data wejścia w życie]</strong>.
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
                <p><strong>[Nazwa firmy]</strong></p>
                <p>[adres]</p>
                <p>NIP: [NIP]</p>
                <p>E-mail: [e-mail]</p>
                <p>Telefon: [telefon]</p>
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Status dokumentu</h3>

              <div className={styles.statusPill}>
                <FiFileText />
                <span>Wersja robocza do publikacji po uzupełnieniu danych</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Regulations;