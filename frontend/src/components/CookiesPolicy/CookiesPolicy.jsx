import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import styles from "./CookiesPolicy.module.scss";
import {
  FiCoffee,
  FiShield,
  FiBarChart2,
  FiSettings,
  FiRefreshCcw,
  FiInfo,
  FiCheckCircle,
  FiLock,
} from "react-icons/fi";

export default function CookiesPolicy() {
  const location = useLocation();

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;

    if (!scrollTo) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.history.replaceState({}, document.title, location.pathname);
        return;
      }

      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname]);

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Legal</span>

            <h2 className={styles.heading}>Polityka cookies.</h2>

            <p className={styles.description}>
              Wyjaśniamy, w jaki sposób Showly.me może korzystać z plików
              cookies oraz podobnych technologii, takich jak localStorage.
            </p>

            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <strong>Techniczne</strong>
                <span>działanie strony, logowanie i bezpieczeństwo</span>
              </div>

              <div className={styles.metaItem}>
                <strong>Preferencje</strong>
                <span>zapamiętanie decyzji i ustawień użytkownika</span>
              </div>

              <div className={styles.metaItem}>
                <strong>Analityka</strong>
                <span>opcjonalna analiza działania serwisu w przyszłości</span>
              </div>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideHead}>
                <span>Rodzaje danych</span>
                <b>01</b>
              </div>

              <div className={styles.sideList}>
                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiLock />
                  </span>

                  <div>
                    <strong>Niezbędne</strong>
                    <p>
                      Potrzebne do działania strony, bezpieczeństwa i logowania.
                    </p>
                  </div>
                </div>

                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiSettings />
                  </span>

                  <div>
                    <strong>Funkcjonalne</strong>
                    <p>Pomagają zapamiętać ustawienia i decyzje użytkownika.</p>
                  </div>
                </div>

                <div className={styles.sideItem}>
                  <span className={styles.sideItemIcon}>
                    <FiBarChart2 />
                  </span>

                  <div>
                    <strong>Analityczne</strong>
                    <p>Mogą pomóc w analizie ruchu i rozwoju serwisu.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideHead}>
                <span>Status</span>
                <b>02</b>
              </div>

              <div className={styles.statusBox}>
                <FiCheckCircle />
                <span>
                  Banner cookies zapisuje decyzję użytkownika w localStorage.
                </span>
              </div>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideHead}>
                <span>Kontakt</span>
                <b>03</b>
              </div>

              <div className={styles.companyBox}>
                <p>
                  W sprawach dotyczących prywatności i cookies możesz
                  skontaktować się z administratorem serwisu.
                </p>

                <p>
                  E-mail: <strong>kontakt@showly.me</strong>
                </p>
              </div>
            </div>
          </aside>

          <main className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>
                  Cookies / localStorage / Prywatność
                </span>

                <h1>Pliki cookies i podobne technologie.</h1>
              </div>

              <span className={styles.chapterNumber}>00</span>
            </div>

            <p className={styles.lead}>
              Wyjaśniamy, jak Showly.me może wykorzystywać cookies oraz pamięć
              przeglądarki, aby zapewnić prawidłowe działanie serwisu,
              bezpieczeństwo kont i wygodę użytkowników.
            </p>

            <div className={styles.noticeBox}>
              <span className={styles.noticeIcon}>
                <FiInfo />
              </span>

              <div>
                <strong>Informacja o zgodzie</strong>

                <p>
                  Decyzja dotycząca cookies może być zapisana w pamięci
                  przeglądarki. Dzięki temu banner cookies nie pojawia się przy
                  każdej kolejnej wizycie na stronie.
                </p>
              </div>
            </div>

            <div className={styles.sections}>
              <article className={styles.sectionCard}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <FiCoffee />
                  </span>

                  <div>
                    <span className={styles.cardNumber}>01</span>
                    <h3>Czym są pliki cookies?</h3>
                    <p>
                      Krótkie wyjaśnienie technologii wykorzystywanych przez
                      stronę.
                    </p>
                  </div>
                </div>

                <div className={styles.textBlock}>
                  <p>
                    Pliki cookies to niewielkie informacje zapisywane w
                    przeglądarce użytkownika. Serwis Showly.me może korzystać
                    także z podobnych technologii, takich jak{" "}
                    <strong>localStorage</strong>, które pozwalają zapamiętać
                    wybrane ustawienia lub decyzje użytkownika.
                  </p>

                  <p>
                    Cookies i podobne technologie mogą być używane w celu
                    zapewnienia prawidłowego działania strony, obsługi logowania,
                    bezpieczeństwa, zapamiętywania preferencji oraz poprawy
                    jakości działania serwisu.
                  </p>
                </div>
              </article>

              <article className={styles.sectionCard}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <FiShield />
                  </span>

                  <div>
                    <span className={styles.cardNumber}>02</span>
                    <h3>Cookies techniczne</h3>
                    <p>
                      Elementy niezbędne do prawidłowego działania Showly.me.
                    </p>
                  </div>
                </div>

                <div className={styles.textBlock}>
                  <p>
                    Cookies techniczne są wykorzystywane do obsługi podstawowych
                    funkcji serwisu, takich jak utrzymanie działania strony,
                    bezpieczeństwo, logowanie, ochrona konta oraz zapamiętanie
                    decyzji dotyczącej zgody na cookies.
                  </p>

                  <p>
                    Tego typu mechanizmy są potrzebne, aby serwis mógł działać
                    prawidłowo i bezpiecznie.
                  </p>
                </div>
              </article>

              <article className={styles.sectionCard}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <FiSettings />
                  </span>

                  <div>
                    <span className={styles.cardNumber}>03</span>
                    <h3>Preferencje użytkownika</h3>
                    <p>
                      Dane zapisywane po to, aby korzystanie z aplikacji było
                      wygodniejsze.
                    </p>
                  </div>
                </div>

                <div className={styles.listBlock}>
                  <div className={styles.definitionItem}>
                    <strong>Zgoda cookies</strong>
                    <p>
                      Informacja, czy użytkownik zaakceptował lub odrzucił
                      cookies.
                    </p>
                  </div>

                  <div className={styles.definitionItem}>
                    <strong>Ustawienia aplikacji</strong>
                    <p>
                      Na przykład preferencje interfejsu, ustawienia konta lub
                      inne wybory użytkownika.
                    </p>
                  </div>

                  <div className={styles.definitionItem}>
                    <strong>Dane techniczne</strong>
                    <p>
                      Informacje potrzebne do poprawnego działania wybranych
                      funkcji serwisu.
                    </p>
                  </div>
                </div>
              </article>

              <article className={styles.sectionCard}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <FiBarChart2 />
                  </span>

                  <div>
                    <span className={styles.cardNumber}>04</span>
                    <h3>Cookies analityczne</h3>
                    <p>Opcjonalne narzędzia pomagające rozwijać platformę.</p>
                  </div>
                </div>

                <div className={styles.textBlock}>
                  <p>
                    W przyszłości Showly.me może korzystać z narzędzi
                    analitycznych, które pomagają sprawdzić, jak użytkownicy
                    korzystają ze strony, które funkcje są najczęściej używane
                    oraz co warto poprawić.
                  </p>

                  <p>
                    Jeśli dane narzędzia będą wymagały zgody użytkownika,
                    zostaną uruchomione dopiero po jej wyrażeniu.
                  </p>
                </div>
              </article>

              <article className={styles.sectionCard}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <FiRefreshCcw />
                  </span>

                  <div>
                    <span className={styles.cardNumber}>05</span>
                    <h3>Jak zmienić decyzję?</h3>
                    <p>
                      Użytkownik może w każdej chwili usunąć zapisane dane
                      strony.
                    </p>
                  </div>
                </div>

                <div className={styles.textBlock}>
                  <p>
                    Decyzję dotyczącą cookies można zmienić poprzez
                    wyczyszczenie danych strony w ustawieniach przeglądarki. Po
                    usunięciu danych lokalnych banner cookies pojawi się
                    ponownie przy kolejnej wizycie.
                  </p>

                  <p>
                    Możesz także zarządzać cookies bezpośrednio w ustawieniach
                    swojej przeglądarki internetowej.
                  </p>
                </div>
              </article>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}