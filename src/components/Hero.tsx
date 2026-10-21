import { useEffect, useRef } from "react";
import { identity } from "../content";
import HandsBackdrop from "./HandsBackdrop";

/**
 * Opening viewport: oversized serif PORTFOLIO on the left, hanging badge on
 * the right (rendered by HangingBadge), tiny HUD metadata in the corners.
 */
export default function Hero() {
  const glowCoolRef = useRef<HTMLDivElement>(null);
  const glowWarmRef = useRef<HTMLDivElement>(null);

  // damped pointer parallax on the ambient glows (desktop, motion-ok)
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const cool = glowCoolRef.current!;
    const warm = glowWarmRef.current!;
    let mx = 0, my = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    const loop = () => {
      cx += (mx - cx) * 0.04;
      cy += (my - cy) * 0.04;
      cool.style.transform = `translate3d(${cx * 60}px, ${cy * 44}px, 0)`;
      warm.style.transform = `translate3d(${cx * -40}px, ${cy * -30}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="hero" id="top">
      <HandsBackdrop />
      <div ref={glowCoolRef} className="hero__glow hero__glow--cool" aria-hidden="true" />
      <div ref={glowWarmRef} className="hero__glow hero__glow--warm" aria-hidden="true" />

      <div className="hero__hud hero__hud--tl mono" aria-hidden="true">
        {identity.coords}
      </div>
      <div className="hero__hud hero__hud--tr mono" aria-hidden="true">
        NO. 001 — ID / ACCESS
      </div>
      <div className="hero__hud hero__hud--bl" aria-hidden="true">
        <span className="hero__scroll-line" />
        <span className="mono">scroll</span>
      </div>

      <div className="hero__grid">
        <div className="hero__eyebrow">
          <span className="dot" />
          <span className="mono mono--accent">portfolio — 2026</span>
        </div>
        <h1 className="hero__title serif-display">
          <span className="hero__title-echo" aria-hidden="true">Portfolio</span>
          Por<span className="t-accent">t</span>folio
        </h1>
        <div className="hero__sub">
          <span className="hero__sub-name">{identity.name}</span>
          <span className="hero__sub-role">
            {identity.role} · {identity.location}
          </span>
        </div>
        <p className="sr-only" style={{ position: "absolute", left: -9999 }}>
          {identity.name} — {identity.role} portfolio.
        </p>
      </div>
    </header>
  );
}
