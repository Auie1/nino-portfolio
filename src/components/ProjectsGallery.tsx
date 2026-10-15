import { useEffect, useRef, useState, type CSSProperties } from "react";
import { projects, type Project } from "../content";
import { useReveal } from "../hooks/useReveal";
import SectionHeading from "./SectionHeading";

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (p: Project) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // pointer-tilt + glow position (desktop, motion-ok); tap/click always works
  useEffect(() => {
    const el = ref.current!;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const apply = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `perspective(900px) rotateX(${(-cy * 1.6).toFixed(2)}deg) rotateY(${(cx * 2).toFixed(2)}deg) translateY(-3px)`;
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = 0;
      }
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, []);

  return (
    <button
      ref={ref}
      className={`project-card project-card--${project.span} reveal`}
      onClick={() => onOpen(project)}
      aria-haspopup="dialog"
    >
      <span className="project-card__index">{project.index}</span>
      <span className="project-card__media">
        {project.image ? (
          <img className="project-card__img" src={project.image} alt={project.alt || ""} loading="lazy" />
        ) : (
          <span className="project-card__mock project-card__mock--system" aria-hidden="true">
            <span className="pcm-phone" />
            <span className="pcm-phone pcm-phone--tall" />
            <span className="pcm-desktop">
              <span className="pcm-desktop__bar" />
              <span className="pcm-desktop__body" />
            </span>
          </span>
        )}
        <span className="project-card__glow" aria-hidden="true" />
      </span>
      <span className="project-card__body">
        <span className="project-card__title serif-display">{project.title}</span>
        <span className="project-card__cat">{project.category}</span>
        <span className="project-card__arrow" aria-hidden="true">↗</span>
      </span>
    </button>
  );
}

/** Instagram post template framing a sliding photo set */
function IgSlider({ photos, handle, altBase }: { photos: string[]; handle: string; altBase: string }) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, dx: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { active: true, startX: e.clientX, dx: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.dx = e.clientX - drag.current.startX;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(${-idx * 100}% + ${drag.current.dx}px))`;
    }
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    if (dx < -40 && idx < photos.length - 1) setIdx(idx + 1);
    else if (dx > 40 && idx > 0) setIdx(idx - 1);
  };

  return (
    <article className="igpost" aria-label="Instagram post with sliding photos">
      <header className="igpost__head">
        <span className="igpost__avatar" aria-hidden="true" />
        <span className="igpost__handle mono">{handle}</span>
        <span className="igpost__more" aria-hidden="true">···</span>
      </header>

      <div
        className="igpost__media"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className="igpost__track"
          style={{ transform: `translateX(${-idx * 100}%)` }}
        >
          {photos.map((p, i) => (
            <div key={i} className="igpost__slide igpost__slide--photo">
              <img src={p} alt={`${altBase} — photo ${i + 1}`} draggable={false} />
            </div>
          ))}
        </div>

        {idx > 0 && (
          <button className="igpost__nav igpost__nav--prev" onClick={() => setIdx(idx - 1)} aria-label="Previous slide">
            ‹
          </button>
        )}
        {idx < photos.length - 1 && (
          <button className="igpost__nav igpost__nav--next" onClick={() => setIdx(idx + 1)} aria-label="Next slide">
            ›
          </button>
        )}
        <span className="igpost__count mono">
          {idx + 1}/{photos.length}
        </span>
      </div>

      <div className="igpost__actions" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="igpost__icon"><path d="M12 21s-7.5-4.7-10-9C.6 8.6 2.6 5 6 5c2.2 0 3.7 1.2 4.5 2.5h3C14.3 6.2 15.8 5 18 5c3.4 0 5.4 3.6 4 7-2.5 4.3-10 9-10 9z" /></svg>
        <svg viewBox="0 0 24 24" className="igpost__icon"><path d="M21 12a9 9 0 1 1-3.3-7L21 3v6h-6l2.4-2.4A7 7 0 1 0 19 12h2z" /></svg>
        <svg viewBox="0 0 24 24" className="igpost__icon"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        <span className="igpost__dots">
          {photos.map((_, i) => (
            <i key={i} className={i === idx ? "on" : ""} />
          ))}
        </span>
      </div>
    </article>
  );
}

function CaseStudyBody({ project }: { project: Project }) {
  const cs = project.caseStudy!;
  // photo sets provided by the user — before the service, and after
  const beforePhotos = Array.from({ length: 5 }, (_, i) => `/assets/nrg-user-b-${i + 1}.jpg`);
  const afterPhotos = Array.from({ length: 5 }, (_, i) => `/assets/nrg-user-a-${i + 1}.jpg`);

  return (
    <div className="cs__body">
      <p className="mono cs__eyebrow">{cs.eyebrow}</p>
      <h3 className="cs__title serif-display">
        Case Study — <em>NRG Tattoo</em>
      </h3>
      <p className="mono mono--accent cs__chapter">{cs.chapter}</p>

      <div className="cs__cards">
        {cs.stats.map((s) => (
          <div className="cs__card" key={s.label}>
            <span className="cs__card-value serif-display">{s.value}</span>
            <span className="cs__card-label mono">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="cs__statsline mono">{cs.statsLine}</p>

      <div className="cs__outcomes">
        {cs.outcomes.map((o) => (
          <p key={o}>{o}</p>
        ))}
      </div>

      <p className="cs__paragraph">{cs.paragraph}</p>

      <div className="cs__ba">
        <p className="cs__ba-label">
          {cs.beforeLabel[0]}
          <br />
          <span>{cs.beforeLabel[1]}</span>
        </p>
        <IgSlider photos={beforePhotos} handle={cs.handle} altBase="Before social media curation" />
      </div>

      <div className="cs__ba">
        <p className="cs__ba-label">{cs.afterLabel}</p>
        <IgSlider photos={afterPhotos} handle={cs.handle} altBase="After social media curation" />
      </div>

      <h4 className="cs__cta serif-display">{cs.cta}</h4>
      <a className="cs__link mono" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
        let's keep in touch ↗
      </a>
    </div>
  );
}

function ProjectDetail({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current!;
    overlay.classList.add("is-open");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="detail-panel">
        <div className="detail-panel__head">
          <span className="mono mono--accent">{project.index} — {project.category}</span>
          <button ref={closeRef} className="detail-close" onClick={onClose}>
            Close ✕
          </button>
        </div>
        {project.caseStudy ? (
          <CaseStudyBody project={project} />
        ) : (
          <>
            {project.image ? (
              <img className="detail-panel__img" src={project.image} alt={project.alt || ""} />
            ) : (
              <div className="detail-panel__mock project-card__mock project-card__mock--system" aria-hidden="true">
                <span className="pcm-phone" />
                <span className="pcm-phone pcm-phone--tall" />
                <span className="pcm-desktop">
                  <span className="pcm-desktop__bar" />
                  <span className="pcm-desktop__body" />
                </span>
              </div>
            )}
            <div className="detail-panel__body">
              <h3 className="detail-panel__title serif-display">{project.detail.heading}</h3>
              <p className="detail-panel__text">{project.detail.body}</p>
              <p className="detail-panel__caption">{project.detail.caption}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProjectsGallery() {
  const ref = useReveal<HTMLElement>();
  const [open, setOpen] = useState<Project | null>(null);

  return (
    <section className="section" id="projects" ref={ref} aria-labelledby="projects-title">
      <SectionHeading index="03" title="Recent Projects" />
      <div className="projects-grid">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            onOpen={setOpen}
          />
        ))}
      </div>
      {open && <ProjectDetail project={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
