import { useEffect, useRef, useState } from "react";
import { intro } from "./introTimeline";

/**
 * Fixed overlay for the intro: the pure-black opening frame and, when the
 * hands touch, the shockwave flashbang — a white-gold burst born at the
 * fingertip contact point that expands to swallow the whole screen, holds a
 * beat, then decays to reveal the glowing badge. One rAF loop also
 * choreographs the hero typography (title pan, sub rise, HUD fade) so every
 * element answers to the same timeline. Renders nothing once finished — the
 * existing interactive hero takes over.
 */
export default function IntroOverlay() {
  const blackRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(!intro.active);

  useEffect(() => {
    // release the pre-React visibility lock from index.html — from here on
    // every element is styled by JS (or simply visible when skipped)
    document.documentElement.classList.remove("intro-boot");
    if (!intro.active) return;

    const title = document.querySelector<HTMLElement>(".hero__title");
    const sub = document.querySelector<HTMLElement>(".hero__sub");
    const eyebrow = document.querySelector<HTMLElement>(".hero__eyebrow");
    const huds = Array.from(document.querySelectorAll<HTMLElement>(".hero__hud"));
    const titlePan = -Math.min(Math.max(window.innerWidth * 0.07, 56), 110);

    // prime the choreography start states
    if (title) {
      title.style.opacity = "0";
      title.style.transform = `translate3d(${titlePan}px, 0, 0)`;
      title.style.willChange = "transform, opacity";
    }
    if (sub) {
      sub.style.opacity = "0";
      sub.style.transform = "translate3d(0, 18px, 0)";
    }
    if (eyebrow) eyebrow.style.opacity = "0";
    huds.forEach((h) => (h.style.opacity = "0"));

    let raf = 0;
    let flashSized = false;
    const loop = (now: number) => {
      const s = intro.frame(now);

      if (blackRef.current) blackRef.current.style.opacity = String(s.black);

      if (flashRef.current && s.flashScale > 0) {
        const flash = flashRef.current;
        if (!flashSized) {
          // size the burst once: a circle at the touch point big enough to
          // reach the farthest corner when fully expanded
          flashSized = true;
          const { innerWidth: vw, innerHeight: vh } = window;
          const r = Math.max(
            Math.hypot(vw - intro.touchX, vh - intro.touchY),
            Math.hypot(intro.touchX, intro.touchY),
            Math.hypot(vw - intro.touchX, intro.touchY),
            Math.hypot(intro.touchX, vh - intro.touchY),
          );
          flash.style.width = `${r * 2}px`;
          flash.style.height = `${r * 2}px`;
          flash.style.left = `${intro.touchX - r}px`;
          flash.style.top = `${intro.touchY - r}px`;
        }
        flash.style.transform = `scale(${s.flashScale.toFixed(3)})`;
        flash.style.opacity = String(s.flash);
      } else if (flashRef.current) {
        flashRef.current.style.opacity = "0";
      }
      if (title) {
        title.style.opacity = String(s.title);
        title.style.transform = `translate3d(${titlePan * (1 - s.title)}px, 0, 0)`;
      }
      if (sub) {
        sub.style.opacity = String(s.sub);
        sub.style.transform = `translate3d(0, ${18 * (1 - s.sub)}px, 0)`;
      }
      if (eyebrow) eyebrow.style.opacity = String(s.meta);
      huds.forEach((h) => (h.style.opacity = String(s.meta)));

      if (!s.black && !s.flash && !intro.active) {
        // finished — restore pristine inline state and unmount
        if (title) {
          title.style.opacity = "";
          title.style.transform = "";
          title.style.willChange = "";
        }
        if (sub) {
          sub.style.opacity = "";
          sub.style.transform = "";
        }
        if (eyebrow) eyebrow.style.opacity = "";
        huds.forEach((h) => (h.style.opacity = ""));
        setGone(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;

  return (
    <div className="intro-overlay" aria-hidden="true">
      <div ref={blackRef} className="intro-overlay__black" />
      <div ref={flashRef} className="intro-flash" />
    </div>
  );
}
