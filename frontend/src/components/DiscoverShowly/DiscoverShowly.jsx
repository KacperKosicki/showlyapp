import { Link } from "react-router-dom";
import { FiArrowRight, FiArrowUpRight, FiArrowDownRight, FiBookOpen, FiCamera, FiMusic, FiSun, FiScissors, FiSearch } from "react-icons/fi";
import styles from "./DiscoverShowly.module.scss";
import useScrollReveal from "../../utils/useScrollReveal";

const categories = [
  { id: "photo", icon: FiCamera, label: "Fotografia", query: "fotograf", eyebrow: "Zatrzymaj chwilę", text: "Portret, wydarzenie czy nowa historia Twojej marki?", detail: "Znajdź fotografa" },
  { id: "beauty", icon: FiScissors, label: "Beauty & styl", query: "beauty", eyebrow: "Czas dla Ciebie", text: "Odkryj swój nowy look.", detail: "Odkrywaj beauty" },
  { id: "music", icon: FiMusic, label: "Muzyka & eventy", query: "DJ", eyebrow: "Nadaj temu rytm", text: "Dobry klimat zaczyna się od ludzi.", detail: "Znajdź DJ-a" },
  { id: "learning", icon: FiBookOpen, label: "Nauka & rozwój", query: "korepetycje", eyebrow: "Zrób krok dalej", text: "Nowa umiejętność? Zacznij z kimś, kto pomoże Ci ruszyć.", detail: "Szukaj korepetycji" },
];
const ideas = [
  { label: "Projekt graficzny", query: "grafik" },
  { label: "Trening", query: "trener" },
  { label: "Usługi lokalne", query: "usługi" },
];

const CategoryArt = ({ category }) => {
  if (category === "photo") return <div className={styles.lens}><span /><span /><span /><i /></div>;
  if (category === "beauty") return <div className={styles.sculpture}><span /><span /><i /></div>;
  if (category === "music") return <div className={styles.wave}>{[30, 55, 85, 45, 100, 65, 90, 40, 70].map((height, i) => <span key={i} style={{ "--bar-height": `${height}%`, "--bar-delay": `${i * 40}ms` }} />)}</div>;
  return <div className={styles.letterArt}><span>Aa</span><FiSun aria-hidden="true" /></div>;
};

const DiscoverShowly = () => {
  const sectionRef = useScrollReveal();
  return (
  <section ref={sectionRef} className={styles.section} id="discover-showly" aria-labelledby="discover-showly-title">
    <div className={styles.background} aria-hidden="true">
      <span className={styles.bigWord}>ODKRYWAJ SHOWLY</span>
      <span className={styles.dotField} />
      <FiArrowDownRight className={styles.backgroundArrow} />
    </div>
    <div className={styles.inner}>
      <header className={styles.header} data-reveal>
        <div>
          <h2 id="discover-showly-title">Dobry pomysł.<br /><span>Właściwi ludzie.</span></h2>
        </div>
        <div className={styles.intro}>
          <p>Co dziś chodzi Ci po głowie? Wybierz kierunek i poznaj osoby, które pomogą Ci zrobić kolejny krok.</p>
          <span className={styles.hint}><FiArrowUpRight aria-hidden="true" /> Kliknij kafelek, żeby wyszukać profile.</span>
        </div>
      </header>

      <div className={styles.gridCaption}>
        <span className={styles.sectionLabel}>Wybierz swój kierunek</span>
        <span className={styles.categoryCount}><span aria-hidden="true"><FiArrowDownRight /></span> 04 kategorie na dobry początek</span>
      </div>
      <div className={styles.grid}>
        {categories.map(({ id, icon: Icon, label, query, eyebrow, text, detail }) => (
          <Link key={id} to={`/profile?q=${encodeURIComponent(query)}`} state={{ scrollToId: "profilesHub" }}
            className={`${styles.card} ${styles[id]}`} aria-label={`${detail} — ${label}`} data-reveal>
            <div className={styles.cardTop}><span><Icon aria-hidden="true" />{eyebrow}</span><FiArrowUpRight className={styles.cardArrow} aria-hidden="true" /></div>
            <div className={styles.art} aria-hidden="true"><CategoryArt category={id} /></div>
            <div className={styles.cardCopy}>
              <h3>{label}</h3><p>{text}</p>
              <span className={styles.cardAction}>{detail}<FiArrowRight aria-hidden="true" /></span>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.moreIdeas} data-reveal>
        <div className={styles.ideasCopy}><span className={styles.sectionLabel}>Jeszcze więcej możliwości</span><h3>Masz inny pomysł?</h3></div>
        <ul aria-label="Więcej inspiracji">{ideas.map(({ label, query }) => <li key={label}><Link to={`/profile?q=${encodeURIComponent(query)}`} state={{ scrollToId: "profilesHub" }}>{label}<FiArrowUpRight aria-hidden="true" /></Link></li>)}</ul>
      </div>
      <footer className={styles.footer} data-reveal>
        <div className={styles.footerCopy}><span className={styles.searchIcon}><FiSearch aria-hidden="true" /></span><div><span className={styles.sectionLabel}>Twój następny krok</span><h3>Nie musisz mieścić się w kategorii.</h3><p>Przejrzyj wszystkie profile i znajdź coś dla siebie.</p></div></div>
        <Link to="/profile" state={{ scrollToId: "profilesHub" }} className={styles.browseButton}>Odkrywaj wszystkie profile <FiArrowUpRight aria-hidden="true" /></Link>
      </footer>
    </div>
  </section>
);
};

export default DiscoverShowly;
