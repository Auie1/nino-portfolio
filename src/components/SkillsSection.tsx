import { useEffect, useRef, useState } from "react";
import { skillDeck } from "../content";
import SectionHeading from "./SectionHeading";

/**
 * Face-down skill deck. Cards are dealt (spread) as the section scrolls into
 * view — one rAF loop interpolates each card from a gathered stack into its
 * grid slot with a fan rotation, matching the badge's scroll-driven house
 * style. Clicking a card flips it 3D to reveal the skill (badge-back artwork
 * is the face-down side). Reduced motion skips the deal; flips stay instant.
 */
export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>(() =>
    skillDeck.flatMap((g) => g.cards.map(() => false)),
  );

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const rows = Array.from(section.querySelectorAll<HTMLElement>(".skillfan__row"));

    const loop = () => {
      const vh = window.innerHeight;
      const mobile = window.innerWidth < 720;

      for (const row of rows) {
        // each row deals on its own watch: fully stacked while its top travels
        // from 62% of the viewport, fully dealt by ~6% — a long scrub so the
        // stacked deck is actually seen before it spreads
        const rowTop = row.getBoundingClientRect().top;
        const raw = (vh * 0.62 - rowTop) / (vh * 0.56);
        const p = reduced ? 1 : Math.min(Math.max(raw, 0), 1);
        // the row is the cards' offsetParent (its perspective makes it so), so
        // the pile centre is computed in row coordinates for both sides
        const rowCx = row.offsetWidth / 2;
        const rowCy = row.offsetHeight / 2;

        const cards = row.querySelectorAll<HTMLElement>(".skillcard");
        cards.forEach((el) => {
          const slot = Number(el.dataset.slot);
          const count = Number(el.dataset.count);
          // per-card stagger: each card leaves the deck slightly later
          const stag = slot * 0.055;
          const local = Math.min(
            Math.max((p - stag) / (1 - stag * (count - 1)), 0),
            1,
          );
          const e = 1 - Math.pow(1 - local, 3); // house easeOutCubic

          if (mobile) {
            // small screens: fade in place, keep the grid readable
            el.style.transform = "none";
            el.style.opacity = String(e);
            return;
          }

          // pile geometry: every card gathers to the exact centre of its row
          const gx = rowCx - (el.offsetLeft + el.offsetWidth / 2);
          const gy = rowCy - (el.offsetTop + el.offsetHeight / 2);
          // a physical deck: tiny alternating tilt + offsets so edges peek
          const stackR =
            (slot % 2 === 0 ? 2.1 : -1.7) + (slot - (count - 1) / 2) * 0.5;
          const fanR = (slot - (count - 1) / 2) * 2.4;
          // mid-flight lift, like a card dealt off the top of the deck
          const lift = Math.sin(e * Math.PI) * 0.05;

          el.style.opacity = "1";
          el.style.transform =
            `translate3d(${(gx * (1 - e)).toFixed(1)}px, ${(gy * (1 - e)).toFixed(1)}px, 0) ` +
            `scale(${(1 + lift).toFixed(3)}) rotate(${(stackR + (fanR - stackR) * e).toFixed(2)}deg)`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = (i: number) =>
    setFlipped((f) => f.map((v, j) => (j === i ? !v : v)));

  let flat = -1;

  return (
    <section className="section" id="skills" ref={sectionRef} aria-labelledby="skills-title">
      <SectionHeading index="02" title="Personal & Work Skills" />
      <p className="skillfan__hint mono reveal in-view">
        scroll to deal the deck — click a card to reveal the skill
      </p>

      {skillDeck.map((group) => (
        <div className="skillfan" key={group.label}>
          <div className="skillfan__label mono">{group.label}</div>
          <div className="skillfan__row">
            {group.cards.map((card, ci) => {
              flat += 1;
              const idx = flat;
              return (
                <button
                  key={card.title}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  className={`skillcard${flipped[idx] ? " is-flipped" : ""}`}
                  data-slot={ci}
                  data-count={group.cards.length}
                  onClick={() => toggle(idx)}
                  aria-pressed={flipped[idx]}
                  aria-label={`${card.title} — skill card, activate to reveal`}
                >
                  <span className="skillcard__inner">
                    <span className="skillcard__face skillcard__face--cover" aria-hidden="true">
                      <img src="/assets/badge-back.jpg" alt="" draggable={false} />
                      <span className="skillcard__shade" />
                      <span className="skillcard__idx mono">{String(idx + 1).padStart(2, "0")}</span>
                      <span className="skillcard__cover-hint mono">tap to reveal</span>
                    </span>
                    <span className="skillcard__face skillcard__face--info">
                      <span className="skillcard__ghost serif-display" aria-hidden="true">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="skillcard__kicker mono">{card.kicker}</span>
                      <span className="skillcard__title serif-display">{card.title}</span>
                      {card.note && <span className="skillcard__note">{card.note}</span>}
                      {card.tools && (
                        <span className="skillcard__tools">
                          {card.tools.map((t) => (
                            <span className="skillcard__tool mono" key={t}>
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="skillcard__flip-hint mono" aria-hidden="true">
                        skill file — n°{String(idx + 1).padStart(2, "0")} · click to seal
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
