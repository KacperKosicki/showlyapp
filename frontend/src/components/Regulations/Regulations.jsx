import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiFileText, FiShield, FiUsers, FiLock, FiBriefcase, FiMessageSquare, FiMail, FiCalendar, FiStar, FiAward, FiImage, FiSettings, FiZap, FiArrowUpRight, FiArrowDown, FiDownload, FiPrinter, FiChevronDown, FiInfo } from "react-icons/fi";
import useScrollReveal from "../../utils/useScrollReveal";
import { regulationsMeta, regulationSections, withdrawalTemplate, legalSources, buildRegulationsText } from "./regulationsContent";
import styles from "./Regulations.module.scss";

const icons = { document: FiFileText, shield: FiShield, users: FiUsers, lock: FiLock, briefcase: FiBriefcase, message: FiMessageSquare, mail: FiMail, calendar: FiCalendar, star: FiStar, award: FiAward, image: FiImage, settings: FiSettings, spark: FiZap };

export default function Regulations() {
  const location = useLocation();
  const sectionRef = useScrollReveal();
  const [contentsOpen, setContentsOpen] = useState(false);

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(scrollTo);
      if (target) {
        target.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.state, location.pathname]);

  const downloadDocument = () => {
    const blob = new Blob(["\ufeff", buildRegulationsText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `showly-regulamin-${regulationsMeta.version}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section id="scrollToId" ref={sectionRef} className={styles.section} aria-labelledby="regulations-title">
      <div className={styles.backdrop} aria-hidden="true"><span>ZASADY</span><div /></div>
      <div className={styles.inner}>
        <header className={styles.header} data-reveal>
          <div>
            <h1 id="regulations-title">Dobre relacje.<br /><span>Jasne zasady.</span></h1>
            <p className={styles.description}>Co możesz robić w Showly, jak dbamy o wspólną przestrzeń i gdzie szukać pomocy. Wszystko w jednym miejscu, bez drobnego druku.</p>
            <div className={styles.headerActions}>
              <a href="#regulamin-operator" className={styles.readButton}>Przejdź do zasad <FiArrowDown aria-hidden="true" /></a>
              <button type="button" className={styles.quietButton} onClick={downloadDocument}><FiDownload aria-hidden="true" /> Pobierz regulamin</button>
              <button type="button" className={styles.quietButton} onClick={() => window.print()}><FiPrinter aria-hidden="true" /> Drukuj / PDF</button>
            </div>
          </div>
          <div className={styles.coverNote} aria-hidden="true"><FiShield /><strong>Po ludzku.<br />Na jasnych<br />zasadach.</strong><div>Wersja testowa <FiArrowUpRight /></div></div>
        </header>

        <div className={styles.facts} data-reveal>
          <div><span>01 / Dostęp</span><strong>Od 16 lat</strong><small>Z uwzględnieniem zgody opiekuna.</small></div>
          <div><span>02 / Koszt</span><strong>Bezpłatna beta</strong><small>Bez automatycznej płatnej subskrypcji.</small></div>
          <div><span>03 / Kontakt</span><strong>Jesteśmy po drugiej stronie.</strong><a href={`mailto:${regulationsMeta.email}`}>{regulationsMeta.email} <FiArrowUpRight aria-hidden="true" /></a></div>
        </div>

        <div className={styles.draftNotice} role="note">
          <FiInfo aria-hidden="true" /><div><strong>{regulationsMeta.status}</strong><p>Treść przygotowano dla bezpłatnej wersji beta. Dane operatora nie zawierają jeszcze adresu usługodawcy; data wejścia w życie nie została ustalona. Ten projekt nie jest potwierdzeniem pełnej zgodności prawnej aplikacji.</p></div>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav className={styles.contents} aria-label="Spis treści regulaminu">
              <h2>Znajdź swoją odpowiedź.</h2>
              <button type="button" className={styles.contentsToggle} aria-expanded={contentsOpen} aria-controls="regulations-contents" onClick={() => setContentsOpen(!contentsOpen)}>Spis treści <span>{regulationSections.length} rozdziałów <FiChevronDown aria-hidden="true" /></span></button>
              <ol id="regulations-contents" className={contentsOpen ? styles.expanded : undefined}>
                {regulationSections.map((item, index) => <li key={item.id}><a href={`#regulamin-${item.id}`} onClick={() => setContentsOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{item.title}</a></li>)}
                <li><a href="#regulamin-odstapienie"><span>+</span>Wzór odstąpienia</a></li>
              </ol>
            </nav>
            <div className={styles.operatorCard}><span className={styles.smallLabel}>Operator projektu</span><strong>{regulationsMeta.operator}</strong><p>Osoba fizyczna / projekt testowy</p><a href={`mailto:${regulationsMeta.email}`}>{regulationsMeta.email}<FiArrowUpRight aria-hidden="true" /></a><div className={styles.version}>Wersja {regulationsMeta.version}<br />Przygotowano: {regulationsMeta.preparedOn}<br />Status: projekt do zatwierdzenia</div></div>
          </aside>

          <div className={styles.document}>
            <div className={styles.documentHead}><span>{regulationSections.length} rozdziałów / wersja beta</span></div>
            {regulationSections.map((item, index) => {
              const Icon = icons[item.icon];
              return <article id={`regulamin-${item.id}`} key={item.id} className={styles.chapter} aria-labelledby={`heading-${item.id}`} data-reveal>
                <div className={styles.chapterTop}><span className={styles.chapterNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h2 id={`heading-${item.id}`}>§ {index + 1}. {item.title}</h2><p>{item.lead}</p></div><Icon className={styles.chapterIcon} aria-hidden="true" /></div>
                <ol className={styles.points}>{item.points.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}</ol>
                {item.id === "prywatnosc" && <Link className={styles.relatedLink} to="/polityka-cookies">Przeczytaj politykę cookies <FiArrowUpRight aria-hidden="true" /></Link>}
                {item.id === "reklamacje" && <Link className={styles.relatedLink} to="/kontakt">Przejdź do formularza kontaktowego <FiArrowUpRight aria-hidden="true" /></Link>}
              </article>;
            })}
            <article id="regulamin-odstapienie" className={styles.templateCard} data-reveal>
              <span className={styles.smallLabel}>Do wykorzystania, gdy przysługuje Ci prawo odstąpienia</span><h2>Twoja decyzja.<br />Prosta wiadomość.</h2><p>Nie musisz korzystać z tego wzoru. Wystarczy jednoznaczne oświadczenie pozwalające ustalić, jakiej umowy dotyczy.</p><pre>{withdrawalTemplate}</pre><a href={`mailto:${regulationsMeta.email}?subject=${encodeURIComponent("Oświadczenie o odstąpieniu")}&body=${encodeURIComponent(withdrawalTemplate)}`}>Otwórz wzór w poczcie <FiArrowUpRight aria-hidden="true" /></a>
            </article>
            <footer className={styles.sources}><span className={styles.smallLabel}>Przepisy i pomoc</span><p>Źródła do sprawdzenia aktualnych przepisów i praw użytkownika. Ich wskazanie nie oznacza certyfikacji Showly.</p><div>{legalSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<FiArrowUpRight aria-hidden="true" /></a>)}</div></footer>
          </div>
        </div>
        <div className={styles.closing}><span>Dobre zasady pomagają się dogadać.</span><Link to="/kontakt">Masz pytanie? Napisz do nas. <FiArrowUpRight aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}
