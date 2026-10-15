import type { CSSProperties } from "react";
import { contact, identity } from "../content";
import { useReveal } from "../hooks/useReveal";

export default function ContactSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="section contact" id="contact" ref={ref} aria-labelledby="contact-title">
      <h2 className="contact__headline reveal" id="contact-title">
        ready to take the <em>next step</em> for your business?
      </h2>
      <div className="reveal" style={{ "--reveal-delay": "120ms" } as CSSProperties}>
        <a
          className="contact__cta"
          href={identity.instagram}
          target="_blank"
          rel="noopener noreferrer"
        >
          {contact.cta} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
