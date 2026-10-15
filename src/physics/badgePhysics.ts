/**
 * Hanging-ID physics: a pendulum with an elastic, stretchable lace.
 *
 * The badge hangs from a mount just above the top edge of the viewport by a
 * lace of natural length L. Free motion is a damped pendulum. Dragging moves
 * the card anywhere in the hero: past L the lace resists elastically (it
 * stretches instead of hard-clamping) and pulls back proportionally. Releasing
 * from a stretched yank converts the stored tension into card spin — the ID
 * twirls, decays, and the pendulum + card settle dead still.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** px/s² — full-length swing takes ~1s, like a real badge */
const GRAVITY = 1600;
/** pendulum damping (1/s) — a yank dies out in ~2–3s */
const PENDULUM_DAMPING = 1.6;
/** idle sway force amplitude — small enough that the badge reads as at rest */
const SWAY_FORCE = 0.045;
/** pendulum swing limits (rad from vertical) */
const THETA_LIMIT = 1.3;
/** lace elasticity: inward acceleration per px of stretch (1/s²) */
const STRETCH_K = 190;
/** stretch at which the lace stops extending no matter what (px over L) */
const MAX_STRETCH = 560;
/** stretch ratio that counts as a real "yank" and triggers spin */
const SPIN_THRESHOLD = 0.1;

export class BadgePhysics {
  /** fixed mount just above the top edge of the viewport */
  anchor: Vec2;
  /** natural (unstretched) lace length, px */
  length: number;
  private targetLength: number;

  /** strap angle from vertical: 0 = hanging straight down */
  theta = 0;
  omega = 0;

  /** in-plane lean (rad) — card aligns with the strap, never full rotations */
  tiltZ = 0;
  tiltZOmega = 0;

  /** Y-axis flip (rad, unbounded) — full flips reveal the back of the card */
  flipY = 0;
  flipOmega = 0;

  /** badge attach point = punch hole = lace end */
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };

  /** smoothed current stretch ratio (0 = slack/taut, >0 = stretched) */
  stretchRatio = 0;
  private spinning = false;

  dragging = false;
  reducedMotion = false;

  /** verlet lace */
  rope: Vec2[] = [];
  private ropePrev: Vec2[] = [];
  ropeSegments = 16;

  private dragTarget: Vec2;
  private pointerHistory: { x: number; y: number; t: number }[] = [];

  constructor(anchor: Vec2, rest: Vec2) {
    this.anchor = { ...anchor };
    this.length = Math.max(rest.y - anchor.y, 60);
    this.targetLength = this.length;
    this.pos = { x: anchor.x, y: anchor.y + this.length };
    this.dragTarget = { ...this.pos };
    this.buildRope();
  }

  private buildRope() {
    this.rope = [];
    this.ropePrev = [];
    for (let i = 0; i <= this.ropeSegments; i++) {
      const t = i / this.ropeSegments;
      const p = { x: this.anchor.x, y: this.anchor.y + this.length * t };
      this.rope.push({ ...p });
      this.ropePrev.push({ ...p });
    }
  }

  /** update mount + natural length (hero ↔ compact transition); length eases */
  setGeometry(anchor: Vec2, rest: Vec2) {
    this.anchor = { ...anchor };
    this.targetLength = Math.max(rest.y - anchor.y, 48);
  }

  /** point on the current lace polyline at fraction t of its arc length */
  pointAt(t: number): { x: number; y: number; angle: number } {
    const pts = this.rope;
    let total = 0;
    const segs: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segs.push(d);
      total += d;
    }
    let want = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (want <= segs[i] || i === segs.length - 1) {
        const f = segs[i] === 0 ? 0 : want / segs[i];
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * f;
        const y = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
        const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
        return { x, y, angle };
      }
      want -= segs[i];
    }
    return { x: pts[0].x, y: pts[0].y, angle: Math.PI / 2 };
  }

  /** clamp the drag target to the hero viewport — the card can go anywhere */
  private clampToViewport(p: Vec2): Vec2 {
    const m = 48;
    return {
      x: Math.max(m, Math.min(window.innerWidth - m, p.x)),
      y: Math.max(m, Math.min(window.innerHeight - m, p.y)),
    };
  }

  grab(pointer: Vec2) {
    this.dragging = true;
    this.dragTarget = this.clampToViewport(pointer);
    this.pointerHistory = [{ ...pointer, t: performance.now() }];
    this.vel.x *= 0.25;
    this.vel.y *= 0.25;
    this.omega *= 0.25;
  }

  dragTo(pointer: Vec2) {
    if (!this.dragging) return;
    this.dragTarget = this.clampToViewport(pointer);
    const now = performance.now();
    this.pointerHistory.push({ ...pointer, t: now });
    while (this.pointerHistory.length > 8 || (this.pointerHistory.length && now - this.pointerHistory[0].t > 120)) {
      this.pointerHistory.shift();
    }
  }

  release() {
    if (!this.dragging) return;
    this.dragging = false;

    // angular velocity from drag tracking (fallback: pointer history)
    if (Math.abs(this.omega) < 0.05 && this.pointerHistory.length >= 2) {
      const first = this.pointerHistory[0];
      const last = this.pointerHistory[this.pointerHistory.length - 1];
      const dt = Math.max((last.t - first.t) / 1000, 1 / 240);
      const vx = (last.x - first.x) / dt;
      const vy = (last.y - first.y) / dt;
      const tx = Math.cos(this.theta);
      const ty = -Math.sin(this.theta);
      this.omega = (vx * tx + vy * ty) / this.length;
    }
    this.omega = Math.max(-6, Math.min(6, this.omega));

    // yank spin: stored lace tension converts into a Y-axis flip on release —
    // the card turns edge-on and shows its back, like a badge twirling on a lace
    const over = (Math.hypot(this.pos.x - this.anchor.x, this.pos.y - this.anchor.y) - this.length) / this.length;
    if (over > SPIN_THRESHOLD) {
      const dir = Math.abs(this.omega) > 0.3 ? Math.sign(this.omega) : Math.sign(this.pos.x - this.anchor.x) || 1;
      // 1–2 readable flips rather than a blur
      const impulse = (3.2 + Math.min(over, 1.4) * 5.5) * dir;
      this.flipOmega += impulse;
      this.spinning = true;
      // a yank also whips the pendulum back through center
      this.omega += -dir * Math.min(over, 1.2) * 1.6;
    }
  }

  /** advance the simulation; dt in seconds */
  step(dt: number, timeS: number) {
    // ease natural length toward its target (scroll transition)
    this.length += (this.targetLength - this.length) * Math.min(1, dt * 6);

    if (this.dragging) {
      // stiff damped spring toward the pointer — minimal perceived latency
      const k = 650;
      const d = 48;
      this.vel.x += ((this.dragTarget.x - this.pos.x) * k - this.vel.x * d) * dt;
      this.vel.y += ((this.dragTarget.y - this.pos.y) * k - this.vel.y * d) * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;

      // elastic lace: past natural length it pulls back, harder the further
      // it goes — stretchable everywhere in the hero, but never rubber-banding
      let dx = this.pos.x - this.anchor.x;
      let dy = this.pos.y - this.anchor.y;
      let r = Math.hypot(dx, dy);
      const over = r - this.length;
      if (over > 0) {
        const capped = Math.min(over, MAX_STRETCH);
        const nx = dx / (r || 1);
        const ny = dy / (r || 1);
        this.vel.x -= nx * capped * STRETCH_K * dt;
        this.vel.y -= ny * capped * STRETCH_K * dt;
        // recompute after the elastic step
        dx = this.pos.x - this.anchor.x;
        dy = this.pos.y - this.anchor.y;
        r = Math.hypot(dx, dy);
      }
      if (this.pos.y < this.anchor.y + 40) {
        this.pos.y = this.anchor.y + 40;
        this.vel.y = Math.max(0, this.vel.y);
      }

      // track strap angle + angular velocity while dragged
      const newTheta = Math.atan2(this.pos.x - this.anchor.x, this.pos.y - this.anchor.y);
      let dTh = newTheta - this.theta;
      while (dTh > Math.PI) dTh -= Math.PI * 2;
      while (dTh < -Math.PI) dTh += Math.PI * 2;
      this.theta = newTheta;
      const instOmega = dTh / Math.max(dt, 1 / 240);
      this.omega += (instOmega - this.omega) * Math.min(1, dt * 30);
    } else {
      // damped pendulum + gentle idle breathing force
      let alpha = -(GRAVITY / this.length) * Math.sin(this.theta) - PENDULUM_DAMPING * this.omega;
      if (!this.reducedMotion) {
        alpha += (Math.sin(timeS * 0.55) * 0.6 + Math.sin(timeS * 0.23 + 1.7) * 0.4) * SWAY_FORCE;
      }
      this.omega += alpha * dt;
      this.theta += this.omega * dt;
      if (this.theta > THETA_LIMIT) {
        this.theta = THETA_LIMIT;
        this.omega *= -0.36;
      } else if (this.theta < -THETA_LIMIT) {
        this.theta = -THETA_LIMIT;
        this.omega *= -0.36;
      }
      this.pos.x = this.anchor.x + Math.sin(this.theta) * this.length;
      this.pos.y = this.anchor.y + Math.cos(this.theta) * this.length;
      this.vel.x = this.omega * this.length * Math.cos(this.theta);
      this.vel.y = -this.omega * this.length * Math.sin(this.theta);

      // stretched after release (snap-back): pull along the strap too
      const r = Math.hypot(this.pos.x - this.anchor.x, this.pos.y - this.anchor.y);
      const over = r - this.length;
      if (over > 0) {
        const nx = (this.pos.x - this.anchor.x) / r;
        const ny = (this.pos.y - this.anchor.y) / r;
        this.pos.x -= nx * over * Math.min(1, dt * 26);
        this.pos.y -= ny * over * Math.min(1, dt * 26);
      }
    }

    // smoothed stretch ratio for the renderer (strap thins under tension)
    const rawOver = Math.max(
      0,
      Math.hypot(this.pos.x - this.anchor.x, this.pos.y - this.anchor.y) / this.length - 1,
    );
    this.stretchRatio += (rawOver - this.stretchRatio) * Math.min(1, dt * 14);

    // ————— card motion —————
    // in-plane lean: card follows the strap direction with a touch of drag lean
    const phi = Math.atan2(this.pos.x - this.anchor.x, Math.max(this.pos.y - this.anchor.y, 40));
    const leanZ = this.dragging
      ? Math.max(-0.18, Math.min(0.18, this.vel.x * 0.00025))
      : 0;
    const targetZ = Math.max(-0.7, Math.min(0.7, phi + leanZ));
    this.tiltZOmega += ((targetZ - this.tiltZ) * 140 - this.tiltZOmega * 11) * dt;
    this.tiltZ += this.tiltZOmega * dt;

    // Y-flip: while twirling fast it's nearly free (light damping, so it
    // "eventually stops"); once slow, a shortest-path spring returns the FRONT
    // face to the viewer (nearest whole turn)
    const spinRate = Math.abs(this.flipOmega);
    if (spinRate < 2.5) this.spinning = false;
    if (this.spinning) {
      this.flipOmega -= this.flipOmega * 2.2 * dt;
    } else {
      const nearest = Math.round(this.flipY / (Math.PI * 2)) * Math.PI * 2;
      this.flipOmega += ((nearest - this.flipY) * 130 - this.flipOmega * 11) * dt;
    }
    this.flipY += this.flipOmega * dt;

    this.stepRope();
  }

  /** card center from the attach point + in-plane lean */
  cardCenter(h: number): Vec2 {
    return {
      x: this.pos.x - Math.sin(this.tiltZ) * (h / 2),
      y: this.pos.y + Math.cos(this.tiltZ) * (h / 2),
    };
  }

  /** lace end = badge punch hole */
  badgeAttachPoint(): Vec2 {
    return { x: this.pos.x, y: this.pos.y };
  }

  private stepRope() {
    const n = this.rope.length;
    if (n < 2) return;
    const pts = this.rope;
    const prev = this.ropePrev;
    const attach = this.badgeAttachPoint();

    // segment length follows the end-to-end span: taut + straight under
    // tension, sagging with slack when the badge hangs closer than L
    const span = Math.hypot(attach.x - this.anchor.x, attach.y - this.anchor.y);
    const segLen = Math.max(span / (n - 1), 4);

    for (let i = 1; i < n - 1; i++) {
      const px = pts[i].x;
      const py = pts[i].y;
      const vx = pts[i].x - prev[i].x;
      const vy = pts[i].y - prev[i].y;
      prev[i].x = px;
      prev[i].y = py;
      pts[i].x = px + vx * 0.985;
      pts[i].y = py + vy * 0.985 + GRAVITY * (1 / 3600);
    }

    const iterations = 3;
    for (let it = 0; it < iterations; it++) {
      pts[0].x = this.anchor.x;
      pts[0].y = this.anchor.y;
      pts[n - 1].x = attach.x;
      pts[n - 1].y = attach.y;
      for (let i = 0; i < n - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const corr = ((dist - segLen) / dist) * 0.5;
        if (i === 0) {
          b.x -= dx * corr * 2;
          b.y -= dy * corr * 2;
        } else if (i === n - 2) {
          a.x += dx * corr * 2;
          a.y += dy * corr * 2;
        } else {
          a.x += dx * corr;
          a.y += dy * corr;
          b.x -= dx * corr;
          b.y -= dy * corr;
        }
      }
    }
  }

  /** catmull-rom smoothed path through the lace points */
  ropePath(): string {
    const p = this.rope;
    if (p.length < 2) return "";
    let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[Math.min(p.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
}
