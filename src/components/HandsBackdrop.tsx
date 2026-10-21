import { useEffect, useRef } from "react";
import { intro, TOUCH_AT } from "../intro/introTimeline";

/**
 * The Creation-of-Adam, recreated live. The reference video plays offscreen
 * and every frame is re-sampled onto the canvas as the site's flickering dot
 * field — the motion comes straight from the source footage, so it can't
 * drift from it.
 *
 * During the intro the video runs at 2× (fingertips meet ~2.7s in). The
 * moment its currentTime crosses TOUCH_AT, it fires the timeline's touch —
 * the full-screen flashbang detonates (drawn by the IntroOverlay) and the
 * badge spawns mid-spin as the flash decays. After the handoff the video
 * returns to 1× and loops forever as the ambient hero backdrop.
 */
export default function HandsBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // fixed low-res sampling buffer for the current video frame
    const SW = 184;
    const SH = 103;
    const sample = document.createElement("canvas");
    sample.width = SW;
    sample.height = SH;
    const sctx = sample.getContext("2d", { willReadFrequently: true })!;

    let raf = 0;
    let running = true;

    const resize = () => {
      const hero = canvas.parentElement!;
      const cw = hero.clientWidth;
      const ch = hero.clientHeight;
      if (!cw || !ch) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // contain-fit of the 736×414 source inside the hero box
    const fit = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const scale = Math.min((cw * 0.96) / 736, (ch * 0.78) / 414);
      const dw = 736 * scale;
      const dh = 414 * scale;
      return { dx: (cw - dw) / 2, dy: Math.max(20, (ch - dh) / 2 - ch * 0.04), dw, dh };
    };

    const draw = (now: number) => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      if (video.readyState < 2) return;
      const { dx, dy, dw, dh } = fit();

      sctx.drawImage(video, 0, 0, SW, SH);
      const data = sctx.getImageData(0, 0, SW, SH).data;

      const s = intro.frame(now);
      const t = now / 1000;

      // frame-accurate touch detection (timeupdate only fires ~4Hz)
      if (intro.active && video.currentTime >= TOUCH_AT) intro.fireTouch();

      ctx.fillStyle = "#f0eee7";

      // mean of the dots hugging the centre column ≈ the fingertip gap
      let contactX = 0;
      let contactY = 0;
      let contactN = 0;
      const midX = dx + dw / 2;

      for (let sy = 0; sy < SH; sy++) {
        for (let sx = 0; sx < SW; sx++) {
          const px = (sy * SW + sx) * 4;
          const bright =
            0.2126 * data[px] + 0.7152 * data[px + 1] + 0.0722 * data[px + 2];
          if (bright <= 62) continue;
          const x = dx + ((sx + 0.5) / SW) * dw;
          const y = dy + ((sy + 0.5) / SH) * dh;
          const a = Math.min(1, bright / 210);
          const flicker = reduced
            ? 1
            : 0.72 +
              0.28 * (0.5 + 0.5 * Math.sin(t * (0.9 + ((sx * 7 + sy * 13) % 9) * 0.13) + sx));
          ctx.globalAlpha =
            a * flicker * s.handIn * (1 - 0.64 * s.handDim);
          ctx.fillRect(x - 1.1, y - 1.1, 2.2, 2.2);
          if (Math.abs(x - midX) < dw * 0.05) {
            contactX += x;
            contactY += y;
            contactN++;
          }
        }
      }
      ctx.globalAlpha = 1;

      // the flashbang is born exactly where the fingertips meet
      if (contactN > 0) {
        intro.touchX = contactX / contactN;
        intro.touchY = contactY / contactN;
      }
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // fire the timeline's touch the instant the video's fingertips meet —
    // checked per frame inside draw() above, not via the coarse timeupdate

    // intro finished → hand the video back as the ambient 1× loop
    const off = window.setInterval(() => {
      if (!intro.active) {
        video.playbackRate = 1;
        video.loop = true;
        if (video.ended) video.play().catch(() => {});
        window.clearInterval(off);
      }
    }, 400);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
            if (!reduced) video.play().catch(() => {});
          } else {
            stop();
            if (!intro.active) video.pause();
          }
        });
      },
      { threshold: 0.02 },
    );
    io.observe(canvas.parentElement!);

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        video.pause();
      } else {
        start();
        if (!reduced) video.play().catch(() => {});
      }
    };

    resize();
    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(resize, 180);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      // no motion: hold the touching pose, one static render
      video.pause();
      video.currentTime = TOUCH_AT + 0.15;
      video.addEventListener(
        "loadeddata",
        () => {
          resize();
          draw(performance.now());
        },
        { once: true },
      );
    } else {
      // 2× during the intro so the fingertips meet ~2.7s in; back to 1× after
      video.playbackRate = intro.active ? 2 : 1;
      video.play().catch(() => {});
      raf = requestAnimationFrame(loop);
    }

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(rt);
    };
  }, []);

  return (
    <>
      {/* offscreen source player — the visible layer is the canvas */}
      <video
        ref={videoRef}
        className="hands-source"
        src="/assets/hands-touch.mp4"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="hands-canvas" aria-hidden="true" />
    </>
  );
}
