import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useReveal } from "../hooks/useReveal";
import SectionHeading from "./SectionHeading";

/** steady turntable rate (rad/s) */
const TURNTABLE = 0.22;
/** static presentation tilt: dips the nose (applied around z once length is along x) */
const TILT_Z = 0.3;

/**
 * Self-hosted showroom: the downloaded 2023 Porsche 911 GT3 RS (model by
 * musiss, CC Attribution) rendered locally with three.js in its original
 * vertex-color palette. Always turning slowly; drag to spin it yourself;
 * hovering the car switches the headlights on.
 */
export default function ShowroomSection() {
  const sectionRef = useReveal<HTMLElement>();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // clear any stale canvas from a hot-reload before mounting ours
    stage.replaceChildren();
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(33, 16 / 9, 0.1, 80);
    scene.add(camera);

    // studio reflections — kept restrained so the dark ambience stays dark
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // lights: restrained warm key with shadow, cool rim — dark ambience
    const key = new THREE.DirectionalLight(0xfff1dc, 1.35);
    key.position.set(5, 4.5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x9db8d4, 1.4);
    rim.position.set(-5, 3, -4.5);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x8890a0, 0.16));

    // ————— the car —————
    const carGroup = new THREE.Group(); // drag yaw + turntable
    const tiltGroup = new THREE.Group(); // static nose-down presentation tilt
    tiltGroup.rotation.z = TILT_Z;
    carGroup.add(tiltGroup);
    scene.add(carGroup);

    // original palette: vertex colors baked in the GLB, kept in a dark mood
    const paint = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0.12,
      roughness: 0.46,
      clearcoat: 0.7,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.32,
    });

    let disposed = false;
    let carMesh: THREE.Mesh | null = null;
    let lampRig: THREE.Group | null = null;
    let carSphere: THREE.Sphere | null = null; // body-only bounds for framing
    const easedMats: { mat: THREE.SpriteMaterial | THREE.MeshBasicMaterial; base: number }[] = [];
    const rearGlows: { mat: THREE.SpriteMaterial; base: number }[] = [];
    const lampSpots: THREE.SpotLight[] = [];
    const lampPoints: THREE.PointLight[] = [];
    const rearPoints: THREE.PointLight[] = [];

    /** soft radial-bloom texture for light glows */
    const glowTexture = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.55)");
      g.addColorStop(0.6, "rgba(255,255,255,0.14)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();

    const addSprite = (
      rig: THREE.Group,
      color: number,
      scale: [number, number],
      base: number,
      rear = false,
    ) => {
      const mat = new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(scale[0], scale[1], 1);
      rig.add(sp);
      (rear ? rearGlows : easedMats).push({ mat, base });
      return sp;
    };

    const buildLamps = (box: THREE.Box3, frontSign: number) => {
      const size = box.getSize(new THREE.Vector3());
      const rig = new THREE.Group();
      const noseX = frontSign > 0 ? box.max.x : box.min.x;
      const tailX = frontSign > 0 ? box.min.x : box.max.x;
      const fx = noseX - frontSign * size.x * 0.04;
      const fz = (size.z / 2) * 0.62;
      const fy = size.y * 0.5;
      const fwd = new THREE.Vector3(frontSign, 0, 0);

      // ————— headlights: bright cores + halos + dual-layer beams + real light —————
      for (const zSide of [1, -1] as const) {
        const pos = new THREE.Vector3(fx, fy, zSide * fz);

        // lens core (punch) + halo (bloom) — the model's lamp area lights up
        const core = addSprite(rig, 0xfff8e2, [0.26, 0.26], 1.0);
        core.position.copy(pos);
        const halo = addSprite(rig, 0xffeebb, [0.95, 0.95], 0.34);
        halo.position.copy(pos);

        // dual-layer beam cones fading into the dark
        const beam = (radius: number, opacity: number) => {
          const mat = new THREE.MeshBasicMaterial({
            color: 0xfff0c8,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const m = new THREE.Mesh(new THREE.ConeGeometry(radius, 3.8, 24, 1, true), mat);
          m.position.copy(pos.clone().add(fwd.clone().multiplyScalar(2.1)));
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fwd.clone().negate());
          rig.add(m);
          easedMats.push({ mat, base: opacity });
        };
        beam(0.3, 0.13);
        beam(0.62, 0.05);

        // real light: warm spill on the nose + a beam that kisses the bodywork
        const pt = new THREE.PointLight(0xffd9a0, 0, 2.2, 1.6);
        pt.position.copy(pos);
        rig.add(pt);
        lampPoints.push(pt);

        const spot = new THREE.SpotLight(0xffedc2, 0, 16, 0.5, 0.85, 1.2);
        spot.position.copy(pos);
        spot.target.position
          .copy(pos)
          .add(fwd.clone().multiplyScalar(4.5))
          .setY(0.05);
        rig.add(spot);
        rig.add(spot.target);
        lampSpots.push(spot);
      }

      // ————— rear: full-width light bar glow + corner cores + red spill —————
      const barY = size.y * 0.52;
      const bar = addSprite(rig, 0xff1c12, [1.75, 0.3], 0.95, true);
      bar.position.set(tailX - frontSign * size.x * 0.012, barY, 0);
      for (const zSide of [1, -1] as const) {
        const core = addSprite(rig, 0xff2a1e, [0.3, 0.3], 0.9, true);
        core.position.set(tailX - frontSign * size.x * 0.012, barY, zSide * (size.z / 2) * 0.82);
        const halo = addSprite(rig, 0xff2016, [0.7, 0.7], 0.3, true);
        halo.position.copy(core.position);
      }
      const rPt = new THREE.PointLight(0xff231a, 0, 3.2, 1.8);
      rPt.position.set(tailX - frontSign * size.x * 0.08, barY, 0);
      rig.add(rPt);
      rearPoints.push(rPt);

      return rig;
    };

    new GLTFLoader().load(
      "/assets/gt3rs.glb",
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.material = paint;
            mesh.castShadow = true;
            if (!carMesh) carMesh = mesh;
          }
        });

        // canonicalize: the export runs along z — rotate the length onto x
        let box = new THREE.Box3().setFromObject(model);
        let size = box.getSize(new THREE.Vector3());
        if (size.z > size.x) model.rotation.y = Math.PI / 2;

        // scale to ~4.6 units, center on origin, bottom at y=0
        const scale = 4.6 / Math.max(size.x, size.z);
        model.scale.setScalar(scale);
        box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.updateMatrixWorld(true);
        // lamps must be built from the FINAL (post-centering) frame, or they
        // drift off the body by the centering offset
        box = new THREE.Box3().setFromObject(model);

        // front detection: the GT3 RS wing makes the rear the tallest end —
        // scan ALL mesh vertices near each x-end and compare peak heights
        let maxYplus = 0;
        let maxYminus = 0;
        if (carMesh) {
          const pos = carMesh.geometry.attributes.position as THREE.BufferAttribute;
          const v = new THREE.Vector3();
          const cx = (box.min.x + box.max.x) / 2;
          const halfLen = (box.max.x - box.min.x) / 2;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(carMesh.matrixWorld);
            if (v.x > cx + halfLen * 0.5) {
              if (v.y > maxYplus) maxYplus = v.y;
            } else if (v.x < cx - halfLen * 0.5) {
              if (v.y > maxYminus) maxYminus = v.y;
            }
          }
        }
        const frontSign = maxYplus > maxYminus ? -1 : 1; // wing end = rear
        tiltGroup.rotation.z = frontSign < 0 ? TILT_Z : -TILT_Z; // dip the nose

        // camera frames the CAR body only — not the beam cones / light bar,
        // which are allowed to spill past the edges of the shot
        carSphere = new THREE.Box3()
          .setFromObject(model)
          .getBoundingSphere(new THREE.Sphere());

        tiltGroup.add(model);

        lampRig = buildLamps(box, frontSign);
        tiltGroup.add(lampRig);

        frameCamera();
        stage.dataset.loaded = "1";
      },
      undefined,
      (err) => {
        console.error("gt3rs.glb failed to load", err);
        stage.dataset.error = "1";
      },
    );

    carGroup.rotation.y = 2.45; // rear three-quarter — the wing is the signature

    /** frame the camera tight to the car body — bigger on desktop */
    const frameCamera = () => {
      const sphere = carSphere;
      if (!sphere) return;
      const desktop = window.innerWidth >= 1024;
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const distV = sphere.radius / Math.sin(vFov / 2);
      const distH = sphere.radius / Math.sin(hFov / 2);
      // desktop: near-zero margin so the car dominates; mobile: keep breathing room
      const dist = Math.max(distV, distH) * (desktop ? 0.94 : 1.15);
      const dir = new THREE.Vector3(0.6, 0.3, 0.74).normalize();
      camera.position.copy(dir.multiplyScalar(dist)).add(sphere.center);
      camera.lookAt(sphere.center);
    };

    // ————— interaction —————
    let yaw = carGroup.rotation.y;
    let yawVel = 0;
    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const el = renderer.domElement;
    el.style.cursor = "grab";
    el.setAttribute("role", "img");
    el.setAttribute(
      "aria-label",
      "Interactive 3D model of a Porsche 911 GT3 RS — drag to rotate, hover to light the headlights",
    );

    // hover → headlights
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2); // offscreen until moved
    let hovering = false;
    let lightsOn = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      yawVel = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointerNdc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        yawVel = dx * 0.005;
        yaw += yawVel;
        pitch = Math.min(0.18, Math.max(-0.03, pitch + dy * 0.0016));
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      el.style.cursor = hovering ? "pointer" : "grab";
    };
    const onLeave = () => {
      pointerNdc.set(2, 2);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);

    // ————— sizing —————
    const setSize = () => {
      const w = stage.clientWidth || 640;
      const h = stage.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (carGroup.children.length) frameCamera();
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(stage);

    // ————— render only when visible —————
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    io.observe(stage);

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 1 / 20);

      // turntable: always drifting; a drag pauses it, then inertia blends back
      if (!dragging) {
        yawVel *= 0.94;
        yaw += yawVel;
        if (!reduced) yaw += TURNTABLE * dt;
      }
      carGroup.rotation.y = yaw;
      carGroup.rotation.x = pitch;

      // headlight hover state
      if (carMesh && pointerNdc.x <= 1) {
        raycaster.setFromCamera(pointerNdc, camera);
        hovering = raycaster.intersectObject(carMesh, false).length > 0;
        el.style.cursor = dragging ? "grabbing" : hovering ? "pointer" : "grab";
      } else {
        hovering = false;
      }
      const target = hovering ? 1 : 0;
      lightsOn += (target - lightsOn) * Math.min(1, dt * 9);
      const on = lightsOn;
      easedMats.forEach((e) => (e.mat.opacity = e.base * on));
      // taillights breathe very subtly, like real running lights
      const breathe = 0.94 + 0.06 * Math.sin(clock.elapsedTime * 2.4);
      rearGlows.forEach((e) => (e.mat.opacity = e.base * on * breathe));
      lampPoints.forEach((l) => (l.intensity = 7 * on));
      lampSpots.forEach((l) => (l.intensity = 34 * on));
      rearPoints.forEach((l) => (l.intensity = 6 * on));

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      pmrem.dispose();
      el.remove();
    };
  }, []);

  return (
    <section className="section showroom" id="showroom" ref={sectionRef} aria-labelledby="showroom-title">
      <SectionHeading index="04" title="Showroom" />
      <div className="showroom__stage reveal" ref={stageRef} />
      <div className="showroom__foot">
        <div className="reveal">
          <p className="mono mono--accent">personal goal — before turning 20</p>
          <h3 className="showroom__title serif-display" id="showroom-title">
            Porsche 911 <em>GT3 RS</em>
          </h3>
        </div>
        <p className="showroom__hint mono reveal" aria-hidden="true">
          drag to rotate · hover for headlights
        </p>
      </div>
      {/* 3D model: "2023 Porsche 911 GT3 RS" by musiss (Sketchfab, CC Attribution) */}
    </section>
  );
}
