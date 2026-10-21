/**
 * Cinematic intro timeline — the single source of truth for the opening
 * sequence (black frame → hands reach → touch flashbang → badge spawns
 * mid-spin → title pan-in).
 *
 * A time-based singleton, deliberately framework-free to match the house
 * style (badge physics, cursor and parallax are all hand-rolled rAF loops).
 * Consumers call sample() every frame and compose the returned factors into
 * whatever they already render; nothing here owns a transform, so it can
 * never fight the badge physics or the scroll transition. When the timeline
 * ends every factor is exactly the identity value, which makes the handoff
 * to the existing interactive hero jump-free by construction.
 *
 * Replay policy: once per tab session (sessionStorage), so refreshes inside
 * the same tab skip it. `?intro=replay` forces it, `?intro=skip` suppresses
 * it. Skipped entirely for prefers-reduced-motion or a restored scroll
 * position deep in the page.
 */

const TAU = Math.PI * 2;

/** seconds — choreography. Stage A waits for the hands to touch; the touch
 *  detonates a full-screen flashbang (stage B): the flash whites out the
 *  frame and fades to reveal the badge already mid-spin at centre — a slow
 *  full 360° — which then descends, glides right and hands off to the hero. */
const T = {
  /** stage A — black lifts, the hands video lights up */
  blackHold: 0.35,
  blackEnd: 1.1,
  handIn: [0.4, 1.4],
  /** video currentTime (s) at which the fingertips meet, from the source */
  touchAt: 5.5,
  /** wall-clock fallback: if the video can't play, the touch fires anyway */
  touchFallback: 4.5,
  /** stage B — seconds after the touch */
  flashExpand: 0.55,
  flashDecay: [0.22, 1.15],
  badgeIn: [0.45, 0.9],
  badgePop: [0.45, 1.1],
  badgeGlowEnd: 2.3,
  descend: [0.55, 1.9],
  rotate: [0.55, 2.75],
  glide: [1.25, 2.6],
  handDim: [0.15, 1.3],
  title: [1.35, 2.45],
  sub: [2.05, 2.85],
  meta: [2.25, 3.05],
  hint: [2.65, 3.15],
  total: 3.3,
} as const;

/** exported for the hands video component — it fires the touch */
export const TOUCH_AT = T.touchAt;

/** resting lace length during the reveal, as a fraction of the hero length */
const START_LENGTH_FACTOR = 0.34;
/** initial Y rotation (one full turn, unwound as the badge settles) */
const START_FLIP = -TAU;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** normalized progress of `time` inside the [a, b] band, clamped to 0..1 */
const seg = (time: number, a: number, b: number) =>
  Math.min(Math.max((time - a) / (b - a), 0), 1);

export interface IntroSample {
  /** pure-black overlay opacity */
  black: number;
  /** hands backdrop: dot fade-in (0 = emerging, 1 = fully lit) */
  handIn: number;
  /** hands backdrop dimming to its ambient hero level (0 = intro bright, 1 = ambient) */
  handDim: number;
  /** full-screen flashbang intensity (1 = white-out, decays to 0) */
  flash: number;
  /** flashbang radius expansion (0 = point at the touch, 1 = screen filled) */
  flashScale: number;
  /** badge card + lace opacity */
  badgeOpacity: number;
  /** warm halo around the spawning badge (1 = full glow, burns off to 0) */
  badgeGlow: number;
  /** badge pop scale multiplier (settles to 1 after the spawn) */
  badgePop: number;
  /** lace length as a fraction of the hero length (descend) */
  lengthFactor: number;
  /** 0 = badge under the beam (start x), 1 = existing hero position */
  anchorGlide: number;
  /** additive Y-rotation offset (rad) unwound to 0 by the handoff */
  flipOffset: number;
  /** hero typography: title pan / sub rise / eyebrow+hud fade / drag hint */
  title: number;
  sub: number;
  meta: number;
  hint: number;
}

const IDENTITY: IntroSample = {
  black: 0,
  handIn: 1,
  handDim: 1,
  flash: 0,
  flashScale: 1,
  badgeOpacity: 1,
  badgeGlow: 0,
  badgePop: 1,
  lengthFactor: 1,
  anchorGlide: 1,
  flipOffset: 0,
  title: 1,
  sub: 1,
  meta: 1,
  hint: 1,
};

type Decision = { active: boolean; start: number };

function decide(): Decision {
  const inactive = () => ({ active: false, start: 0 });
  try {
    const param = new URLSearchParams(window.location.search).get("intro");
    if (param === "skip") return inactive();
    const played = sessionStorage.getItem("nino-intro-played");
    if (played && param !== "replay") return inactive();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return inactive();
    // restored scroll position deep in the page — no entrance for a hero
    // that is already off-screen
    if (window.scrollY > window.innerHeight * 0.5) return inactive();
    // once-per-tab-session: `replay` forces it now, and either way this load
    // counts as played so a plain refresh afterwards stays skipped
    sessionStorage.setItem("nino-intro-played", "1");
    return { active: true, start: performance.now() };
  } catch {
    return inactive();
  }
}

const decision = decide();

class IntroTimeline {
  active = decision.active;
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** badge anchor start x (center, under the beam) — read by the badge loop */
  startX = window.innerWidth * 0.5;
  /** full turn is skipped on narrow screens (simplified mobile motion) */
  enableFlip = window.innerWidth >= 720;
  /** latest badge anchor x / card center y, reported by the badge loop */
  badgeX = this.startX;
  badgeY = window.innerHeight * 0.42;
  /** fingertip contact point (viewport px) — written by the hands canvas,
   *  read by the overlay so the flashbang is born exactly at the touch */
  touchX = this.startX;
  touchY = window.innerHeight * 0.44;

  private start = decision.start;
  private sample: IntroSample = { ...IDENTITY };
  private touchFired = false;
  private touchAt = 0;
  private watchdog = window.setTimeout(
    () => this.finish(),
    (T.touchFallback + T.total + 1) * 1000,
  );

  /** the hands video calls this the moment its fingertips meet */
  fireTouch() {
    if (!this.active || this.touchFired) return;
    this.touchFired = true;
    this.touchAt = performance.now();
  }

  /** per-frame factors; returns a shared record — read, don't retain */
  frame(nowMs: number): IntroSample {
    if (!this.active) return IDENTITY;
    const t = (nowMs - this.start) / 1000;
    if (t >= T.touchFallback + T.total) {
      this.finish();
      return IDENTITY;
    }
    const s = this.sample;

    // —— stage A: the deck waits for the touch ——
    if (!this.touchFired) {
      if (t >= T.touchFallback) this.fireTouch(); // video failed — proceed anyway
      s.black = 1 - easeInOutCubic(seg(t, T.blackHold, T.blackEnd));
      s.handIn = easeOutCubic(seg(t, T.handIn[0], T.handIn[1]));
      s.handDim = 0;
      s.flash = 0;
      s.flashScale = 0;
      s.badgeOpacity = 0;
      s.badgeGlow = 0;
      s.badgePop = 1;
      s.lengthFactor = START_LENGTH_FACTOR;
      s.anchorGlide = 0;
      s.flipOffset = this.enableFlip ? START_FLIP : 0;
      s.title = 0;
      s.sub = 0;
      s.meta = 0;
      s.hint = 0;
      return s;
    }

    // —— stage B: flashbang → the badge spawns mid-spin and takes the stage ——
    const t2 = (nowMs - this.touchAt) / 1000;
    if (t2 >= T.total) {
      this.finish();
      return IDENTITY;
    }
    s.black = 0;
    s.handIn = 1;
    // shockwave: born at the fingertip point, expands to fill the screen,
    // holds a beat at full white, then decays
    s.flashScale = easeOutCubic(seg(t2, 0, T.flashExpand));
    s.flash =
      seg(t2, 0, 0.05) * (1 - easeInOutCubic(seg(t2, T.flashDecay[0], T.flashDecay[1])));
    s.handDim = easeInOutCubic(seg(t2, T.handDim[0], T.handDim[1]));
    s.badgeOpacity = easeOutSine(seg(t2, T.badgeIn[0], T.badgeIn[1]));
    // the spawn halo — full at birth, burns off as the spin settles
    s.badgeGlow = 1 - easeOutCubic(seg(t2, T.badgeIn[0], T.badgeGlowEnd));
    s.badgePop = 1 + 0.1 * (1 - easeOutCubic(seg(t2, T.badgePop[0], T.badgePop[1])));
    s.lengthFactor =
      START_LENGTH_FACTOR +
      (1 - START_LENGTH_FACTOR) * easeOutCubic(seg(t2, T.descend[0], T.descend[1]));
    s.anchorGlide = easeInOutCubic(seg(t2, T.glide[0], T.glide[1]));
    s.flipOffset = this.enableFlip
      ? START_FLIP * (1 - easeOutSine(seg(t2, T.rotate[0], T.rotate[1])))
      : 0;
    s.title = easeOutCubic(seg(t2, T.title[0], T.title[1]));
    s.sub = easeOutCubic(seg(t2, T.sub[0], T.sub[1]));
    s.meta = seg(t2, T.meta[0], T.meta[1]);
    s.hint = seg(t2, T.hint[0], T.hint[1]);
    return s;
  }

  /** badge loop reports its live anchor x / card center y for the beam to follow */
  reportBadge(x: number, y: number) {
    this.badgeX = x;
    this.badgeY = y;
  }

  /** release control to the existing interactive hero; idempotent */
  finish() {
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.watchdog);
  }
}

export const intro = new IntroTimeline();
export { START_LENGTH_FACTOR };
