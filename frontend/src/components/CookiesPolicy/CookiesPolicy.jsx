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
    return (
        <section className={styles.section}>
            <div className={styles.sectionBackground} aria-hidden="true" />

            <div className={styles.bg} aria-hidden="true">
                <span className={styles.blur1} />
                <span className={styles.blur2} />
                <span className={styles.vignette} />
            </div>

            <div className={styles.inner}>
                <div className={styles.head}>
                    <div className={styles.labelRow}>
                        <span className={styles.labelBadge}>Showly Legal</span>
                        <span className={styles.labelDot} />
                        <span className={styles.labelDesc}>Pliki cookies i podobne technologie</span>
                        <span className={styles.labelLine} />
                        <span className={styles.pill}>Cookies • localStorage • Prywatność</span>
                    </div>

                    <h2 className={styles.heading}>
                        Polityka <span className={styles.headingAccent}>cookies</span>
                    </h2>

                    <p className={styles.description}>
                        Wyjaśniamy, w jaki sposób Showly.me może korzystać z plików cookies
                        oraz podobnych technologii, takich jak localStorage, aby zapewnić
                        prawidłowe działanie serwisu, bezpieczeństwo kont i wygodę użytkowników.
                    </p>

                    <div className={styles.metaRow}>
                        <div className={styles.metaCard}>
                            <strong>Techniczne</strong>
                            <span>niezbędne do działania strony i logowania</span>
                        </div>

                        <div className={styles.metaCard}>
                            <strong>Preferencje</strong>
                            <span>zapamiętanie decyzji i ustawień użytkownika</span>
                        </div>

                        <div className={styles.metaCard}>
                            <strong>Analityka</strong>
                            <span>opcjonalna analiza działania serwisu w przyszłości</span>
                        </div>
                    </div>
                </div>

                <div className={styles.noticeBox}>
                    <div className={styles.noticeIcon}>
                        <FiInfo />
                    </div>

                    <div>
                        <p className={styles.noticeTitle}>Informacja o zgodzie</p>
                        <p className={styles.noticeText}>
                            Decyzja dotycząca cookies może być zapisana w pamięci przeglądarki.
                            Dzięki temu banner cookies nie pojawia się przy każdej kolejnej
                            wizycie na stronie.
                        </p>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    <div className={styles.mainColumn}>
                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTop}>
                                <div className={styles.sectionIcon}>
                                    <FiCoffee />
                                </div>

                                <div>
                                    <h3 className={styles.sectionTitle}>Czym są pliki cookies?</h3>
                                    <p className={styles.sectionLead}>
                                        Krótkie wyjaśnienie technologii wykorzystywanych przez stronę.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.textBlock}>
                                <p>
                                    Pliki cookies to niewielkie informacje zapisywane w przeglądarce
                                    użytkownika. Serwis Showly.me może korzystać także z podobnych
                                    technologii, takich jak <strong>localStorage</strong>, które
                                    pozwalają zapamiętać wybrane ustawienia lub decyzje użytkownika.
                                </p>

                                <p>
                                    Cookies i podobne technologie mogą być używane w celu zapewnienia
                                    prawidłowego działania strony, obsługi logowania, bezpieczeństwa,
                                    zapamiętywania preferencji oraz poprawy jakości działania serwisu.
                                </p>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTop}>
                                <div className={styles.sectionIcon}>
                                    <FiShield />
                                </div>

                                <div>
                                    <h3 className={styles.sectionTitle}>Cookies techniczne</h3>
                                    <p className={styles.sectionLead}>
                                        Elementy niezbędne do prawidłowego działania Showly.me.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.textBlock}>
                                <p>
                                    Cookies techniczne są wykorzystywane do obsługi podstawowych
                                    funkcji serwisu, takich jak utrzymanie działania strony,
                                    bezpieczeństwo, logowanie, ochrona konta oraz zapamiętanie decyzji
                                    dotyczącej zgody na cookies.
                                </p>

                                <p>
                                    Tego typu mechanizmy są potrzebne, aby serwis mógł działać
                                    prawidłowo i bezpiecznie.
                                </p>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTop}>
                                <div className={styles.sectionIcon}>
                                    <FiSettings />
                                </div>

                                <div>
                                    <h3 className={styles.sectionTitle}>Preferencje użytkownika</h3>
                                    <p className={styles.sectionLead}>
                                        Dane zapisywane po to, aby korzystanie z aplikacji było wygodniejsze.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.listBlock}>
                                <div className={styles.definitionItem}>
                                    <strong>Zgoda cookies</strong>
                                    <p>informacja, czy użytkownik zaakceptował lub odrzucił cookies.</p>
                                </div>

                                <div className={styles.definitionItem}>
                                    <strong>Ustawienia aplikacji</strong>
                                    <p>np. preferencje interfejsu, ustawienia konta lub inne wybory użytkownika.</p>
                                </div>

                                <div className={styles.definitionItem}>
                                    <strong>Dane techniczne</strong>
                                    <p>informacje potrzebne do poprawnego działania wybranych funkcji serwisu.</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTop}>
                                <div className={styles.sectionIcon}>
                                    <FiBarChart2 />
                                </div>

                                <div>
                                    <h3 className={styles.sectionTitle}>Cookies analityczne</h3>
                                    <p className={styles.sectionLead}>
                                        Opcjonalne narzędzia pomagające rozwijać platformę.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.textBlock}>
                                <p>
                                    W przyszłości Showly.me może korzystać z narzędzi analitycznych,
                                    które pomagają sprawdzić, jak użytkownicy korzystają ze strony,
                                    które funkcje są najczęściej używane oraz co warto poprawić.
                                </p>

                                <p>
                                    Jeśli dane narzędzia będą wymagały zgody użytkownika, zostaną
                                    uruchomione dopiero po jej wyrażeniu.
                                </p>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <div className={styles.sectionTop}>
                                <div className={styles.sectionIcon}>
                                    <FiRefreshCcw />
                                </div>

                                <div>
                                    <h3 className={styles.sectionTitle}>Jak zmienić decyzję?</h3>
                                    <p className={styles.sectionLead}>
                                        Użytkownik może w każdej chwili usunąć zapisane dane strony.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.textBlock}>
                                <p>
                                    Decyzję dotyczącą cookies można zmienić poprzez wyczyszczenie
                                    danych strony w ustawieniach przeglądarki. Po usunięciu danych
                                    lokalnych banner cookies pojawi się ponownie przy kolejnej wizycie.
                                </p>

                                <p>
                                    Możesz także zarządzać cookies bezpośrednio w ustawieniach swojej
                                    przeglądarki internetowej.
                                </p>
                            </div>
                        </div>
                    </div>

                    <aside className={styles.sideColumn}>
                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Rodzaje danych</h3>

                            <div className={styles.sideList}>
                                <div className={styles.sideItem}>
                                    <span className={styles.sideItemIcon}>
                                        <FiLock />
                                    </span>
                                    <div>
                                        <strong>Niezbędne</strong>
                                        <p>Potrzebne do działania strony, bezpieczeństwa i logowania.</p>
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
                            <h3 className={styles.sideTitle}>Aktualny status</h3>

                            <div className={styles.statusPill}>
                                <FiCheckCircle />
                                <span>Banner cookies zapisuje decyzję użytkownika w localStorage.</span>
                            </div>
                        </div>

                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Kontakt</h3>

                            <div className={styles.companyBox}>
                                <p>
                                    W sprawach dotyczących prywatności i cookies możesz skontaktować
                                    się z administratorem serwisu.
                                </p>

                                <p>
                                    E-mail: <strong>kontakt@showly.me</strong>
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}