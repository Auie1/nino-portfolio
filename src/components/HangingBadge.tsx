import { useEffect, useRef } from "react";
import { BadgePhysics } from "../physics/badgePhysics";
import { identity } from "../content";
import { intro, START_LENGTH_FACTOR } from "../intro/introTimeline";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** lace mount sits just above the viewport so the strap is cut off by the edge */
const ANCHOR_Y = -14;

/**
 * The hanging ID badge: elastic-lace pendulum with yank-spin, transforming
 * into a compact identity chip pinned top-right as the user scrolls.
 * All motion is applied by mutating refs inside one rAF loop.
 */
export default function HangingBadge() {
  const stageRef = useRef<HTMLDivElement>(null);
  const strapBaseRef = useRef<SVGPathElement>(null);
  const strapFaceRef = useRef<SVGPathElement>(null);
  const strapWeaveRef = useRef<SVGPathElement>(null);
  const strapShadowRef = useRef<SVGPathElement>(null);
  const strapTextRefs = useRef<(SVGTextPathElement | null)[]>([]);
  const buckleRef = useRef<SVGGElement>(null);
  const laceGroupRef = useRef<SVGGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLAnchorElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const strapBase = strapBaseRef.current!;
    const strapFace = strapFaceRef.current!;
    const strapWeave = strapWeaveRef.current!;
    const strapShadow = strapShadowRef.current!;
    const buckle = buckleRef.current!;
    const laceGroup = laceGroupRef.current!;
    const chip = chipRef.current!;
    const hint = hintRef.current!;
    const stage = stageRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;

    const geometry = () => {
      const w = wrap.offsetWidth || 224;
      const h = wrap.offsetHeight || 336;
      const isMobile = vw() < 720;
      const padX = Math.min(Math.max(vw() * 0.06, 20), 96);
      // hero: intentionally off-center, right side; lace hangs from directly above
      const heroX = isMobile ? vw() - w / 2 - 24 : vw() - padX - w / 2;
      const heroY = isMobile ? vh() * 0.56 : vh() * 0.52;
      // compact: small, upper-right
      const compactW = w * 0.24;
      const compactH = h * 0.24;
      const compactX = vw() - Math.min(Math.max(vw() * 0.06, 20), 96) - compactW / 2 - 4;
      const compactY = 30 + compactH / 2;
      return { w, h, heroX, heroY, compactX, compactY };
    };

    const g0 = geometry();
    // during the intro the badge starts tucked just under the light source and
    // descends into the hero position, so the simulated lace begins short
    const introRest = intro.active
      ? { x: intro.startX, y: ANCHOR_Y + (g0.heroY - ANCHOR_Y) * START_LENGTH_FACTOR }
      : { x: g0.heroX, y: g0.heroY };
    const physics = new BadgePhysics(
      { x: introRest.x, y: ANCHOR_Y },
      introRest,
    );
    physics.reducedMotion = reduced;

    // intro-owned initial state: badge + lace invisible, drag locked,
    // stage lifted above the intro's black layer until the handoff
    let introCleanup = false;
    if (intro.active) {
      wrap.style.opacity = "0";
      laceGroup.style.opacity = "0";
      hint.style.opacity = "0";
      wrap.style.pointerEvents = "none";
      stage.classList.add("badge-stage--intro");
      introCleanup = true;
    }

    // —— scroll-linked transition ——
    let scrollY = window.scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // —— pointer drag ——
    const onPointerDown = (e: PointerEvent) => {
      if (intro.active || transition() > 0.35) return; // locked during intro / while compact
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add("is-dragging");
      physics.grab({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (physics.dragging) physics.dragTo({ x: e.clientX, y: e.clientY });
    };
    const endDrag = (e: PointerEvent) => {
      if (!physics.dragging) return;
      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      wrap.classList.remove("is-dragging");
      physics.release();
    };
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);

    /** 0 = full hero badge, 1 = compact */
    const transition = () => {
      const range = reduced ? vh() * 0.3 : vh() * 0.62;
      const p = Math.min(Math.max(scrollY / range, 0), 1);
      return easeOutCubic(p);
    };

    let raf = 0;
    let last = performance.now();
    let chipOn = false;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = transition();
      const g = geometry();
      const s = intro.frame(now);

      // intro composes on the hero side of the geometry: anchor starts under
      // the beam and glides to the hero spot while the lace extends (descend).
      // The scroll blend toward compact still applies on top, uninterrupted.
      const introAnchorX = s.anchorGlide < 1
        ? intro.startX + (g.heroX - intro.startX) * s.anchorGlide
        : g.heroX;
      const introRestY = s.lengthFactor < 1
        ? ANCHOR_Y + (g.heroY - ANCHOR_Y) * s.lengthFactor
        : g.heroY;

      // interpolate mount + natural lace length from hero to compact
      const anchorX = introAnchorX + (g.compactX - introAnchorX) * t;
      const restY = introRestY + (g.compactY - introRestY) * t;
      // intro pop: the badge snaps 12% larger at the spark, settling to 1
      const scale = (1 + (0.24 - 1) * t) * s.badgePop;
      physics.setGeometry({ x: anchorX, y: ANCHOR_Y }, { x: anchorX, y: restY });

      physics.step(dt, now / 1000);

      const center = physics.cardCenter(g.h);
      if (intro.active) intro.reportBadge(center.x, center.y);

      // face swap at the edge-on instant: past 90° of flip, show the back face
      // (unmirrored) and continue the rotation from the equivalent angle.
      // The intro's unwind offset composes additively and lands on exactly 0.
      const spinY = physics.flipY + s.flipOffset;
      const showBack = Math.cos(spinY) < 0;
      const renderAngle = showBack ? spinY - Math.PI : spinY;
      wrap.style.transform =
        `translate3d(${center.x - g.w / 2}px, ${center.y - g.h / 2}px, 0) ` +
        `scale(${scale}) rotate(${physics.tiltZ}rad) perspective(1100px) rotateY(${renderAngle}rad)`;
      wrap.classList.toggle("is-compact", t > 0.5);
      if (showBack !== wrap.classList.contains("show-back")) {
        wrap.classList.toggle("show-back", showBack);
      }

      // intro reveal — direct opacity + spawn halo while it runs, released
      // to CSS on the handoff (the final intro frame writes the identity
      // values, identical to no inline style)
      if (intro.active) {
        wrap.style.opacity = String(s.badgeOpacity);
        if (s.badgeGlow > 0.01) {
          const g = s.badgeGlow;
          wrap.style.filter =
            `drop-shadow(0 0 ${14 + 26 * g}px rgba(244, 240, 226, ${0.5 * g})) ` +
            `drop-shadow(0 0 ${52 * g}px rgba(198, 180, 135, ${0.32 * g}))`;
        } else {
          wrap.style.filter = "";
        }
        hint.style.opacity = String(s.hint * 0.85);
      } else if (introCleanup) {
        wrap.style.opacity = "";
        wrap.style.filter = "";
        wrap.style.pointerEvents = "";
        hint.style.opacity = "";
        stage.classList.remove("badge-stage--intro");
        introCleanup = false;
      }

      // lace fades as the badge compacts
      const laceOpacity = Math.max(0, 1 - t * 1.8) * s.badgeOpacity;
      laceGroup.style.opacity = String(laceOpacity);
      if (laceOpacity > 0.01) {
        const d = physics.ropePath();
        strapShadow.setAttribute("d", d);
        strapBase.setAttribute("d", d);
        strapFace.setAttribute("d", d);
        strapWeave.setAttribute("d", d);
        // strap thins slightly under tension
        const thin = Math.min(physics.stretchRatio, 1);
        strapBase.setAttribute("stroke-width", String(13 - thin * 3));
        strapFace.setAttribute("stroke-width", String(11.5 - thin * 3));
        // buckle rides the strap
        const bp = physics.pointAt(0.8);
        const deg = (bp.angle * 180) / Math.PI;
        buckle.setAttribute(
          "transform",
          `translate(${bp.x.toFixed(1)},${bp.y.toFixed(1)}) rotate(${deg.toFixed(1)})`,
        );
      }

      const wantChip = t > 0.92;
      if (wantChip !== chipOn) {
        chipOn = wantChip;
        chip.classList.toggle("is-visible", chipOn);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", endDrag);
      wrap.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  const strapWords = [
    { word: "COMMUNIO", offset: "4%" },
    { word: "DISCOSB", offset: "30%" },
    { word: "COMMUNIO", offset: "56%" },
    { word: "DISCOSB", offset: "82%" },
  ];

  return (
    <>
      <div ref={stageRef} className="badge-stage" aria-hidden="true">
        <svg className="lanyard-svg">
          <g ref={laceGroupRef}>
            {/* flat woven strap, cut off by the top edge of the viewport */}
            <path ref={strapShadowRef} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="13" strokeLinecap="butt" transform="translate(1.5,3)" />
            <path ref={strapBaseRef} id="lace-path" fill="none" stroke="#0c0d10" strokeWidth="13" strokeLinecap="butt" />
            <path ref={strapFaceRef} fill="none" stroke="#171922" strokeWidth="11.5" strokeLinecap="butt" />
            <path ref={strapWeaveRef} fill="none" stroke="rgba(236,231,218,0.055)" strokeWidth="11" strokeDasharray="1.5 2.5" strokeLinecap="butt" />
            {/* white outlined print along the strap, following its curve */}
            <text className="lace-text" dominantBaseline="middle">
              {strapWords.map((s, i) => (
                <textPath
                  key={i}
                  href="#lace-path"
                  startOffset={s.offset}
                  ref={(el) => {
                    strapTextRefs.current[i] = el;
                  }}
                >
                  {s.word}
                </textPath>
              ))}
            </text>
            {/* side-release buckle riding the strap */}
            <g ref={buckleRef}>
              <rect x="-16" y="-8" width="32" height="16" rx="4" fill="#101116" stroke="#2b2f3a" strokeWidth="1.2" />
              <rect x="-11" y="-2" width="22" height="4" rx="2" fill="#262a33" />
              <rect x="-2.5" y="-6.5" width="5" height="13" rx="2" fill="#1b1e26" />
            </g>
          </g>
        </svg>
        <div ref={wrapRef} className="badge-wrap">
          {/* plastic clamp hardware pinning the lace into the card punch */}
          <div className="lace-clip" aria-hidden="true">
            <span className="lace-clip__pin" />
          </div>
          <div className="badge-card">
            <div className="badge-face badge-face--front">
              <div className="badge-card__punch" />
              <img className="badge-card__photo" src="/assets/badge-portrait.jpg" alt="" draggable={false} />
              <div className="badge-card__name">{identity.handle}</div>
              <div className="badge-card__role">{identity.role}</div>
              <div className="badge-card__meta">
                <span className="badge-card__id">NO. 001 — PORTFOLIO ACCESS</span>
                <span className="badge-card__chip" />
              </div>
            </div>
            <div className="badge-face badge-face--back" aria-hidden="true">
              <img className="badge-back__img" src="/assets/badge-back.jpg" alt="" draggable={false} />
              <div className="badge-card__punch" />
            </div>
          </div>
          <div ref={hintRef} className="badge-hint">drag the badge</div>
        </div>
      </div>

      {/* compact identity element after the hero */}
      <a
        ref={chipRef}
        className="identity-chip"
        href="#top"
        aria-label="Back to top — NINO"
      >
        <img className="identity-chip__photo" src="/assets/badge-portrait.jpg" alt="" />
        <span>
          <span className="identity-chip__name">{identity.handle}</span>
          <span className="identity-chip__sub" style={{ display: "block" }}>
            {identity.location}
          </span>
        </span>
      </a>
    </>
  );
}
