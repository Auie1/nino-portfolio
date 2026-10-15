import type { CSSProperties } from "react";
import { services, tools, traits } from "../content";
import { useReveal } from "../hooks/useReveal";
import SectionHeading from "./SectionHeading";

export default function SkillsSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="section" id="skills" ref={ref} aria-labelledby="skills-title">
      <SectionHeading index="02" title="Personal & Work Skills" />
      <div className="traits">
        {traits.map((t, i) => (
          <div
            className="trait-row reveal"
            key={t.title}
            style={{ "--reveal-delay": `${i * 70}ms` } as CSSProperties}
          >
            <span className="trait-row__index">0{i + 1}</span>
            <span className="trait-row__title serif-display">{t.title}</span>
            <span className="trait-row__note">{t.note}</span>
          </div>
        ))}
      </div>

      <h3 className="mono reveal" id="skills-title" style={{ marginTop: "clamp(44px, 7vh, 80px)", color: "var(--accent)" }}>
        What I do
      </h3>
      <div className="services reveal">
        {services.map((s) => (
          <span className="services__tag" key={s}>
            {s}
          </span>
        ))}
      </div>

      <div className="tools">
        {tools.map((group, gi) => (
          <div className="reveal" key={group.group} style={{ "--reveal-delay": `${gi * 80}ms` } as CSSProperties}>
            <div className="tools__group-label">{group.group}</div>
            <ul className="tools__list">
              {group.items.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  <span>{group.group === "AI" ? "assistant" : group.group === "Platforms" ? "channel" : "tool"}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
