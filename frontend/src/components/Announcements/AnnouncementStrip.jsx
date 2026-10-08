import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiArrowRight, FiMapPin, FiMusic, FiCode, FiFeather, FiPlus } from 'react-icons/fi';
import { budgetLabel, examples } from './announcementData';
import useScrollReveal from '../../utils/useScrollReveal';
import styles from './AnnouncementStrip.module.scss';

const ideas = examples.slice(0, 3);
const icons = [FiMusic, FiCode, FiFeather];
const labels = ['Wydarzenie', 'Projekt', 'Coś wyjątkowego'];

export default function AnnouncementStrip() {
  const sectionRef = useScrollReveal();
  const [active, setActive] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const move = event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({ x: (event.clientX - bounds.left) / bounds.width * 6 - 3, y: 3 - (event.clientY - bounds.top) / bounds.height * 6 });
  };

  return (
    <section ref={sectionRef} className={styles.section} aria-labelledby="announcement-strip-title">
      <div className={styles.sceneBackdrop} aria-hidden="true">
        <span className={styles.sceneWord}>A CO, GDYBY…</span>
        <span className={styles.sceneShape} />
      </div>
      <div className={styles.inner}>
        <div className={styles.copy} data-reveal>
          <h2 id="announcement-strip-title">Rzuć pomysł.<br /><span>Ktoś go podchwyci.</span></h2>
          <p>Nie musisz wiedzieć, kogo wybrać. Powiedz, czego potrzebujesz — a osoby z profilem Showly mogą zaproponować swoją pomoc.</p>
          <div className={styles.actions}>
            <Link to="/twoje-ogloszenia?nowe=1" state={{ scrollToId: 'announcements' }} className={styles.primary}><FiPlus />Dodaj swój pomysł</Link>
            <Link to="/ogloszenia" state={{ scrollToId: 'announcements' }}>Odkryj ogłoszenia <FiArrowUpRight /></Link>
          </div>
          <small>Wystawiasz z konta. Odpowiadasz ze swoją wizytówką.</small>
        </div>
        <div className={styles.playground} data-reveal style={{ '--reveal-delay': '120ms' }}>
          <svg className={styles.ideaTrail} viewBox="0 0 620 470" fill="none" aria-hidden="true"><path d="M20 290C-20 80 166-10 350 30S672 195 540 343 260 478 331 389 482 376 565 415" /><path d="m545 400 20 15-23 4" /></svg>
          <span className={styles.sticker} aria-hidden="true">Mały pomysł.<br />Dużo możliwości.</span>
          <div className={styles.stage} onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0 })} style={{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg` }}>
            <div className={styles.deck}>
              {ideas.map((item, index) => {
                const position = (index - active + ideas.length) % ideas.length;
                const Icon = icons[index];
                return (
                  <button type="button" key={item._id} className={`${styles.idea} ${styles[`position${position}`]} ${styles[`tone${index}`]}`} aria-pressed={active === index} aria-label={`Pokaż pomysł: ${item.title}`} onClick={() => setActive(index)}>
                    <span className={styles.cardTop}><span className={styles.icon}><Icon aria-hidden="true" /></span><span>Pomysł / 0{index + 1}</span><FiArrowUpRight aria-hidden="true" /></span>
                    <span className={styles.cardTitle}>{item.title}</span>
                    <span className={styles.description}>{item.description}</span>
                    <span className={styles.cardBottom}><span><FiMapPin aria-hidden="true" />{item.workMode === 'remote' ? 'Zdalnie' : item.location}</span><strong>{budgetLabel(item)}</strong></span>
                    <span className={styles.example}>Przykładowe ogłoszenie</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.switcher} aria-label="Wybierz przykładowy pomysł">
            {labels.map((label, index) => <button key={label} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span>{label}</button>)}
          </div>
          <p className={styles.hint}>Trzy pomysły na początek. Twój może być zupełnie inny.</p>
        </div>
      </div>
      <div className={styles.journey} data-reveal aria-label="Jak działają ogłoszenia">
        <span><b>01 /</b>Twój pomysł</span><FiArrowRight aria-hidden="true" /><span><b>02 /</b>Czyjś talent</span><FiArrowRight aria-hidden="true" /><span><b>03 /</b>Dobra rozmowa</span>
        <strong>Jest miejsce na Twój pomysł.<FiArrowUpRight aria-hidden="true" /></strong>
      </div>
    </section>
  );
}
