import type { CSSProperties } from "react";
import { about, identity } from "../content";
import { useReveal } from "../hooks/useReveal";
import SectionHeading from "./SectionHeading";

export default function AboutSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="section" id="about" ref={ref} aria-labelledby="about-title">
      <SectionHeading index="01" title="Profile" />
      <div className="about-grid">
        <div className="about-photo-wrap reveal">
          <img
            className="about-photo"
            src="/assets/profile.jpg"
            alt="NINO standing in a night garden among flowering plants and lit trees"
            loading="lazy"
          />
          <span className="about-photo-frame" aria-hidden="true" />
        </div>
        <div>
          <h3 className="about-name serif-display reveal" style={{ "--reveal-delay": "60ms" } as CSSProperties}>
            NINO<em>.</em>
          </h3>
          <p className="about-copy reveal" style={{ "--reveal-delay": "120ms" } as CSSProperties}>
            I specialize in transforming{" "}
            <strong>underutilized social media platforms</strong> into
            systematically run <strong>marketing systems</strong>. By integrating
            branding, structured content strategy, inquiry management, and
            conversion workflows, I help businesses turn online attention into
            organized, revenue-driven operations. I don't just create content —
            I build systems that <strong>capture opportunities</strong>, respond
            efficiently, and convert engagement into measurable growth.
          </p>
          <div className="about-education reveal" style={{ "--reveal-delay": "180ms" } as CSSProperties}>
            <span className="about-education__label">Education</span>
            <div>
              <h4 className="about-education__school" id="about-title">
                {about.education.school}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {about.education.period}</span>
              </h4>
              <p className="about-education__detail">{about.education.detail}</p>
            </div>
            <span className="about-education__label">Based in</span>
            <p className="about-education__detail">{identity.location}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
