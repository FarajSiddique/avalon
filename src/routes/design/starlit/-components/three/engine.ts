import {
  NeutralToneMapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { readPalette, readPaletteSource } from "./palette";
import type {
  ConceptScene,
  CreateConcept,
  Flight,
  FlightPath,
  Layout,
  Pointer,
  TablePlayer,
} from "./types";

export type ConceptName = "isle" | "lake" | "table";

const LOADERS: Record<ConceptName, () => Promise<CreateConcept>> = {
  isle: () => import("./scenes/ember-isle").then((m) => m.createEmberIsle),
  lake: () => import("./scenes/lantern-lake").then((m) => m.createLanternLake),
  table: () => import("./scenes/star-table").then((m) => m.createStarTable),
};

export interface MountOptions {
  /** Follow the mouse (or drift by itself on touch screens). */
  interactive: boolean;
  /** Treat a landscape canvas as a backdrop with content on its left. */
  backdrop: boolean;
  /**
   * Draw one still frame, keep it as an image and free the GPU at once. For
   * thumbnails, so a page of them holds no WebGL contexts.
   */
  snapshot?: boolean;
  /** The GPU dropped the context: the caller should show the drawing. */
  onLost?: () => void;
  /** "lobby" frames the whole table and seats `players` at it. */
  variant?: "hero" | "lobby";
  /** Lobby: who is at the table when it opens. */
  players?: readonly TablePlayer[];
  /**
   * Lobby: an element over the canvas whose children carry `data-tag` set to
   * a player id. Each is moved above that player's head every frame.
   */
  overlay?: HTMLElement | null;
  /**
   * The stage: one Star Table shared by the landing (blend 0) and the lobby
   * (blend 1). `setTarget` moves it between them.
   */
  stage?: { blend: 0 | 1; onPhase?: (phase: StagePhase) => void };
}

/** A rectangle in the canvas, in CSS pixels from its top left. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the stage is: settled on one framing, or flying between them. */
export type StagePhase = "hero" | "lobby" | "flying";

/** What the stage should show. Null rects mean the whole canvas. */
export interface StageTarget {
  mode: "hero" | "lobby";
  /** The way to fly there. Defaults to "create" (to the lobby) or "back". */
  path?: FlightPath;
  /** Where the scene's own frame sits in the canvas: the open space. */
  focus: Rect | null;
  /** The part of the canvas that shows; the rest is masked away. */
  reveal: Rect | null;
  /** Pixels of soft fade at the top of the revealed part. */
  fade: number;
  /** Fly there (false: cut, as on a first load). */
  animate: boolean;
}

export interface Mounted {
  stop(): void;
  /** Lobby: change who is at the table without remounting. */
  setPlayers(players: readonly TablePlayer[]): void;
  /** The stage only: change framing, flying when asked to. */
  setTarget(target: StageTarget): void;
}

/** Seconds each flight takes, by the wall clock. */
const FLIGHT_SECONDS: Record<FlightPath, number> = {
  create: 3,
  join: 3.4,
  back: 1.9,
};

/**
 * Put a 3D concept into `host`. Returns its controls, or null when the
 * browser has no WebGL (the caller shows the drawing).
 */
export async function mountConcept(
  host: HTMLElement,
  name: ConceptName,
  options: MountOptions,
): Promise<Mounted | null> {
  const create = await LOADERS[name]();

  // Ask quietly first: three.js logs an error when it cannot get a context.
  if (!document.createElement("canvas").getContext("webgl2")) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.appendChild(canvas);

  const themeEl = host.closest(".theme-starlit") ?? document.documentElement;
  const lite = Math.min(window.innerWidth, window.innerHeight) < 600;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tempoOf = () => {
    const value = Number.parseFloat(
      getComputedStyle(themeEl).getPropertyValue("--ambient-tempo"),
    );
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const variant = options.variant ?? "hero";
  let players: readonly TablePlayer[] | null = options.players ?? null;
  let concept: ConceptScene = create({
    renderer,
    palette: readPalette(themeEl),
    lite,
    variant,
  });
  if (players) concept.setPlayers?.(players);
  let paletteSource = readPaletteSource(themeEl);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(concept.scene, concept.camera);
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0, 0, 0);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const applyBloom = () => {
    bloom.strength = concept.bloom.strength;
    bloom.radius = concept.bloom.radius;
    bloom.threshold = concept.bloom.threshold;
  };
  applyBloom();

  let layout: Layout = { width: 1, height: 1, aspect: 1, wide: false };
  /** The canvas, in CSS pixels. */
  const size = { width: 1, height: 1 };

  /* ---- the stage: framing, flights, the reveal mask ---- */
  const stage = options.stage;
  let blend: number = stage?.blend ?? 0;
  let aim: StageTarget | null = null;
  let flight:
    | (Flight & {
        from: number;
        to: number;
        seconds: number;
        focusFrom: Rect;
        revealFrom: Rect;
        fadeFrom: number;
      })
    | null = null;
  const whole = (): Rect => ({ x: 0, y: 0, w: size.width, h: size.height });
  let focus: Rect = whole();
  let reveal: Rect = whole();
  let fade = 0;
  let phase: StagePhase | null = null;
  const report = (next: StagePhase) => {
    if (next === phase) return;
    phase = next;
    host.dataset.stage = next;
    stage?.onPhase?.(next);
  };
  const frameInfo = () => ({
    blend: stage ? blend : undefined,
    flight: flight ? { path: flight.path, progress: flight.progress } : null,
  });
  /** Advance the flight by `seconds` of wall clock, then frame the camera. */
  const applyStage = (seconds: number, force = false) => {
    if (!stage) return;
    if (flight)
      flight.progress = Math.min(1, flight.progress + seconds / flight.seconds);
    const progress = flight?.progress ?? 1;
    const along = easeInOut(progress);
    // The reveal opens faster than the camera travels.
    const opening = easeInOut(Math.min(1, progress * 1.6));
    const toFocus = aim?.focus ?? whole();
    const toReveal = aim?.reveal ?? whole();
    const toFade = aim?.fade ?? 0;
    if (flight) {
      blend = flight.from + (flight.to - flight.from) * along;
      focus = mixRect(flight.focusFrom, toFocus, opening);
      reveal = mixRect(flight.revealFrom, toReveal, opening);
      fade = flight.fadeFrom + (toFade - flight.fadeFrom) * opening;
      if (flight.progress >= 1) {
        blend = flight.to;
        flight = null;
        report(blend >= 1 ? "lobby" : "hero");
      }
    } else {
      focus = toFocus;
      reveal = toReveal;
      fade = toFade;
    }
    const w = Math.max(1, focus.w);
    const h = Math.max(1, focus.h);
    const aspect = w / h;
    const next: Layout = {
      width: w,
      height: h,
      aspect,
      wide: options.backdrop && aspect > 1.25 && w >= 1024,
    };
    if (
      force ||
      next.width !== layout.width ||
      next.height !== layout.height ||
      next.wide !== layout.wide
    ) {
      layout = next;
      concept.resize(layout);
    }
    // The scene frames itself for the focus; this places that frame in the
    // canvas, and the rest of the canvas shows the world around it.
    concept.camera.setViewOffset(
      w,
      h,
      -focus.x,
      -focus.y,
      size.width,
      size.height,
    );
    const style = host.style;
    style.setProperty("--reveal-x", `${reveal.x.toFixed(1)}px`);
    style.setProperty("--reveal-y", `${reveal.y.toFixed(1)}px`);
    style.setProperty("--reveal-w", `${reveal.w.toFixed(1)}px`);
    style.setProperty("--reveal-h", `${reveal.h.toFixed(1)}px`);
    style.setProperty("--reveal-fade", `${fade.toFixed(1)}px`);
  };

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    bloom.resolution.set((width * dpr) / 2, (height * dpr) / 2);
    size.width = width;
    size.height = height;
    if (stage) applyStage(0, true);
    else {
      const aspect = width / height;
      layout = {
        width,
        height,
        aspect,
        wide: options.backdrop && aspect > 1.25 && width >= 1024,
      };
      concept.resize(layout);
    }
    if (!running) renderOnce();
  };

  // Pointer, smoothed. Touch screens get a slow figure-of-eight instead.
  const target: Pointer = { x: 0, y: 0 };
  const pointer: Pointer = { x: 0, y: 0 };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const onPointer = (event: PointerEvent) => {
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = 1 - (event.clientY / window.innerHeight) * 2;
  };
  if (options.interactive && !coarse)
    window.addEventListener("pointermove", onPointer, { passive: true });

  let time = 0;
  let last = performance.now();
  let frameId = 0;
  let running = false;
  let visible = true;

  // Name tags follow the figures' heads. Nearer figures place theirs first;
  // a tag that would overlap one already placed moves up above it.
  const projected = new Vector3();
  const placeTags = () => {
    const overlay = options.overlay;
    if (!overlay || !concept.anchors) return;
    const anchors = concept.anchors();
    const tags: { el: HTMLElement; x: number; y: number; depth: number }[] = [];
    for (const child of overlay.children) {
      const el = child as HTMLElement;
      const at = el.dataset.tag ? anchors.get(el.dataset.tag) : undefined;
      if (!at) {
        el.style.opacity = "0";
        continue;
      }
      projected.copy(at).project(concept.camera);
      if (projected.z >= 1) {
        el.style.opacity = "0";
        continue;
      }
      tags.push({
        el,
        x: ((projected.x + 1) / 2) * size.width,
        y: ((1 - projected.y) / 2) * size.height,
        depth: projected.z,
      });
    }
    tags.sort((a, b) => a.depth - b.depth);
    // On the stage, tags come in as the camera arrives at the table.
    const arrived = stage ? Math.min(1, Math.max(0, (blend - 0.7) / 0.3)) : 1;
    const tagOpacity = arrived.toFixed(2);
    const placed: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[] = [];
    for (const tag of tags) {
      const w = tag.el.offsetWidth;
      const h = tag.el.offsetHeight;
      let bottom = tag.y;
      for (let tries = 0; tries < 6; tries++) {
        const hit = placed.find(
          (b) =>
            tag.x - w / 2 < b.right + 4 &&
            tag.x + w / 2 > b.left - 4 &&
            bottom - h < b.bottom + 2 &&
            bottom > b.top - 2,
        );
        if (!hit) break;
        bottom = hit.top - 3;
      }
      // Never off the top of the open space.
      bottom = Math.max(bottom, (stage ? focus.y : 0) + h + 4);
      placed.push({
        left: tag.x - w / 2,
        right: tag.x + w / 2,
        top: bottom - h,
        bottom,
      });
      tag.el.style.transform = `translate(${tag.x.toFixed(1)}px, ${bottom.toFixed(1)}px) translate(-50%, -100%)`;
      tag.el.style.opacity = tagOpacity;
    }
    host.dataset.seated = String(concept.seated?.() ?? 0);
  };

  const renderOnce = () => {
    composer.render();
    placeTags();
  };

  const tick = (now: number) => {
    frameId = requestAnimationFrame(tick);
    const elapsed = (now - last) / 1000;
    const dt = Math.min(0.05, elapsed);
    last = now;
    applyStage(Math.min(0.25, elapsed));
    time += dt / tempoOf();
    if (options.interactive && coarse) {
      target.x = Math.sin(time * 0.13) * 0.6;
      target.y = Math.sin(time * 0.21) * 0.3;
    }
    const ease = 1 - Math.exp(-dt * 2.5);
    pointer.x += (target.x - pointer.x) * ease;
    pointer.y += (target.y - pointer.y) * ease;
    concept.update({ time, dt, pointer, ...frameInfo() });
    renderOnce();
  };

  const still = () => {
    // Settle particles and flames, then hold one frame.
    const steps = 40;
    for (let i = 0; i < steps; i++)
      concept.update({
        time: concept.posterTime - (steps - i) / 30,
        dt: 1 / 30,
        pointer: { x: 0, y: 0 },
        ...frameInfo(),
      });
    concept.settle?.();
    concept.update({
      time: concept.posterTime,
      dt: 1 / 30,
      pointer: { x: 0, y: 0 },
      ...frameInfo(),
    });
    renderOnce();
  };

  const sync = () => {
    const shouldRun = visible && !document.hidden && !motion.matches;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      frameId = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frameId);
    }
    if (motion.matches) still();
  };

  const rebuild = () => {
    const source = readPaletteSource(themeEl);
    if (source === paletteSource) return;
    paletteSource = source;
    concept.dispose();
    concept = create({
      renderer,
      palette: readPalette(themeEl),
      lite,
      variant,
    });
    // Same people, already standing: a colour change is not an arrival.
    if (players) {
      concept.setPlayers?.(players);
      concept.settle?.();
    }
    renderPass.scene = concept.scene;
    renderPass.camera = concept.camera;
    applyBloom();
    concept.resize(layout);
    applyStage(0, true);
    if (!running) still();
  };

  if (options.snapshot) {
    resize();
    still();
    const image = document.createElement("img");
    image.alt = "";
    image.src = canvas.toDataURL("image/jpeg", 0.88);
    image.style.cssText =
      "display:block;width:100%;height:100%;object-fit:cover";
    host.appendChild(image);
    window.removeEventListener("pointermove", onPointer);
    concept.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    return {
      stop: () => image.remove(),
      setPlayers: () => undefined,
      setTarget: () => undefined,
    };
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  });
  intersection.observe(host);
  // A tweak dial rewrites a <style> inside the theme (and stylesheets can
  // change in the head): when the art tokens change, rebuild with them. The
  // check is a cheap string compare, so other DOM changes cost little.
  let rebuildTimer = 0;
  const styles = new MutationObserver(() => {
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(rebuild, 150);
  });
  for (const root of [document.head, themeEl]) {
    styles.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", sync);
  const onLost = (event: Event) => {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(frameId);
    options.onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  resize();
  if (motion.matches) still();
  sync();

  const setPlayers = (next: readonly TablePlayer[]) => {
    players = next;
    concept.setPlayers?.(next);
    if (running) return;
    if (motion.matches) concept.settle?.();
    concept.update({ time, dt: 0, pointer, ...frameInfo() });
    renderOnce();
  };

  const setTarget = (next: StageTarget) => {
    if (!stage) return;
    const was = aim?.mode ?? (blend >= 0.5 ? "lobby" : "hero");
    aim = next;
    const to = next.mode === "lobby" ? 1 : 0;
    if (next.mode !== was || (!flight && blend !== to)) {
      if (next.animate && !motion.matches) {
        const path = next.path ?? (to === 1 ? "create" : "back");
        flight = {
          path,
          progress: 0,
          from: blend,
          to,
          seconds: FLIGHT_SECONDS[path] * Math.max(0.4, Math.abs(to - blend)),
          focusFrom: { ...focus },
          revealFrom: { ...reveal },
          fadeFrom: fade,
        };
        report("flying");
      } else {
        flight = null;
        blend = to;
        report(next.mode);
      }
    } else if (flight && next.path) flight.path = next.path;
    applyStage(0);
    if (running) return;
    if (motion.matches) still();
    else renderOnce();
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(frameId);
    window.clearTimeout(rebuildTimer);
    resizeObserver.disconnect();
    intersection.disconnect();
    styles.disconnect();
    document.removeEventListener("visibilitychange", sync);
    motion.removeEventListener("change", sync);
    window.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("webglcontextlost", onLost);
    concept.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  if (stage) report(blend >= 1 ? "lobby" : "hero");
  return { stop, setPlayers, setTarget };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function mixRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  };
}
