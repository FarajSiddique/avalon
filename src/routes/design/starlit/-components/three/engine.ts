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
  ShotMove,
  TablePlay,
  TablePlayer,
  TableShot,
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
/** Settled on a framing (the mode's name), or flying between two. */
export type StagePhase = "hero" | "lobby" | "role" | "table" | "flying";

/** The screen that has the stage. Role and table are past the lobby. */
export type StageMode = "hero" | "lobby" | "role" | "table";

/** What the stage should show. Null rects mean the whole canvas. */
export interface StageTarget {
  mode: StageMode;
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
  /**
   * Past the lobby: a change of shot may move the camera (the next step of
   * the game's flow). False: it cuts, as for a jump from the nav bar.
   */
  move?: boolean;
}

export interface Mounted {
  stop(): void;
  /** Lobby: change who is at the table without remounting. */
  setPlayers(players: readonly TablePlayer[]): void;
  /** The stage only: change framing, flying when asked to. */
  setTarget(target: StageTarget): void;
  /**
   * Role and table: the game's state in the scene. `move`: a change of
   * shot moves the camera (the next step), rather than cutting.
   */
  setPlay(play: TablePlay | null, move?: boolean): void;
  /** The player whose figure is under this viewport point, or null. */
  pickAt(clientX: number, clientY: number): string | null;
  /**
   * Position name tags inside this element instead of the stage's own
   * overlay (a screen owns its tags so they can be buttons). Null: back to
   * the stage's overlay.
   */
  setTagLayer(el: HTMLElement | null): void;
}

const OWNERS = new WeakMap<HTMLElement, object>();

/** Seconds a move between game shots takes, by the wall clock. */
const SHOT_SECONDS = 1.2;
/** Seconds for the longer move from the lobby round to your seat. */
const SHOT_SECONDS_FAR = 1.6;

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
  // One mount at a time owns the host's data attributes: one cancelled
  // while loading (React's development double mount) must not write over
  // the live one's. The newest owns them; when it stops, the next one to
  // write takes them over and writes all of its own.
  const owner = {};
  OWNERS.set(host, owner);
  const marks = new Map<string, string | null>();
  const write = (key: string, value: string | null) => {
    if (value === null) delete host.dataset[key];
    else host.dataset[key] = value;
  };
  const mark = (key: string, value: string | null) => {
    marks.set(key, value);
    const current = OWNERS.get(host);
    if (current && current !== owner) return;
    if (!current) {
      OWNERS.set(host, owner);
      for (const [k, v] of marks) write(k, v);
    } else write(key, value);
  };
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
  const displayFont =
    getComputedStyle(themeEl).getPropertyValue("--display-font").trim() ||
    undefined;
  let players: readonly TablePlayer[] | null = options.players ?? null;
  let play: TablePlay | null = null;
  let concept: ConceptScene = create({
    renderer,
    palette: readPalette(themeEl),
    lite,
    variant,
    displayFont,
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
    mark("stage", next);
    stage?.onPhase?.(next);
  };
  /* ---- past the lobby: the game's shots, and the moves between them ---- */
  let shot: ShotMove = { to: null, progress: 1, id: 0 };
  let shotMove: {
    seconds: number;
    focusFrom: Rect;
    revealFrom: Rect;
    fadeFrom: number;
  } | null = null;
  /** The first shot after mounting is a cut. */
  let shotReady = false;
  const resolveShot = (): TableShot | null => {
    const mode = aim?.mode;
    if (mode !== "role" && mode !== "table") return null;
    return play?.shot ?? (mode === "role" ? "role" : "table");
  };
  /** Move (or cut) to the shot the mode and the play ask for. */
  const retarget = (move: boolean) => {
    if (!stage || !aim) return;
    const to = resolveShot();
    if (shotReady && to === shot.to) return;
    // A flight from the landing carries the camera to the shot by itself.
    const animate =
      shotReady && move && !motion.matches && !flight && blend >= 1;
    shotReady = true;
    shot = { to, progress: animate ? 0 : 1, id: shot.id + 1 };
    mark("shot", to ?? "lobby");
    if (animate) {
      const far = phase === "lobby" || shot.to === "role";
      shotMove = {
        seconds: far ? SHOT_SECONDS_FAR : SHOT_SECONDS,
        focusFrom: { ...focus },
        revealFrom: { ...reveal },
        fadeFrom: fade,
      };
      mark("moving", "");
      // A move to another screen's framing is a flight; a new shot on the
      // same screen (the next step at the table) is not.
      if (aim.mode !== phase) report("flying");
    } else {
      shotMove = null;
      mark("moving", null);
      // Cut to the game (a direct load or a jump): everyone is already
      // seated, nobody rises.
      if (to) concept.settle?.();
    }
  };
  const frameInfo = () => ({
    blend: stage ? blend : undefined,
    flight: flight ? { path: flight.path, progress: flight.progress } : null,
    shot: stage ? { ...shot } : undefined,
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
        report(blend >= 1 ? (aim?.mode ?? "lobby") : "hero");
      }
    } else if (shotMove) {
      shot.progress = Math.min(1, shot.progress + seconds / shotMove.seconds);
      const t = easeInOut(shot.progress);
      focus = mixRect(shotMove.focusFrom, toFocus, t);
      reveal = mixRect(shotMove.revealFrom, toReveal, t);
      fade = shotMove.fadeFrom + (toFade - shotMove.fadeFrom) * t;
      if (shot.progress >= 1) {
        shotMove = null;
        mark("moving", null);
        report(aim?.mode ?? "lobby");
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
    measureTags();
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
  const body = new Vector3();
  let tagLayer: HTMLElement | null = options.overlay ?? null;
  // A screen's own tag layer has its own origin: tags are placed in the
  // stage's coordinates, then moved by the gap between the two.
  const tagOffset = { x: 0, y: 0 };
  const measureTags = () => {
    if (!tagLayer || tagLayer === options.overlay) {
      tagOffset.x = tagOffset.y = 0;
      return;
    }
    const a = host.getBoundingClientRect();
    const b = tagLayer.getBoundingClientRect();
    tagOffset.x = a.left - b.left;
    tagOffset.y = a.top - b.top;
  };
  const layerObserver = new ResizeObserver(() => {
    measureTags();
    if (!running) placeTags();
  });
  const hide = (el: HTMLElement) => {
    el.style.opacity = "0";
    el.style.visibility = "hidden";
  };
  const placeTags = () => {
    const overlay = tagLayer;
    if (!overlay || !concept.anchors) return;
    const anchors = concept.anchors();
    const tags: { el: HTMLElement; x: number; y: number; depth: number }[] = [];
    // On the stage, tags stay inside the open space; elsewhere the canvas.
    const box = stage ? focus : whole();
    for (const child of overlay.children) {
      const el = child as HTMLElement;
      const at = el.dataset.tag ? anchors.get(el.dataset.tag) : undefined;
      if (!at) {
        hide(el);
        continue;
      }
      projected.copy(at).project(concept.camera);
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      // The figure's middle, below the tag's anchor: when it is out of the
      // open space, so is the figure, and so is its tag.
      body.copy(at);
      body.y -= 2.4;
      body.project(concept.camera);
      const bx = ((body.x + 1) / 2) * size.width;
      const by = ((1 - body.y) / 2) * size.height;
      // Behind the camera, off the sides of the open space, below it
      // (behind a panel), or the figure out of it (a close shot of the
      // cards): no tag. A head just above the top has its tag pinned there.
      if (
        projected.z >= 1 ||
        (stage &&
          (x < box.x ||
            x > box.x + box.w ||
            y > box.y + box.h ||
            bx < box.x ||
            bx > box.x + box.w ||
            by < box.y ||
            by > box.y + box.h))
      ) {
        hide(el);
        continue;
      }
      tags.push({ el, x, y, depth: projected.z });
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
      // Inside the open space: from side to side, and never off its top.
      const left = stage ? box.x + w / 2 + 4 : -Infinity;
      const right = stage ? box.x + box.w - w / 2 - 4 : Infinity;
      const highest = stage ? box.y + h + 4 : h + 4;
      const clampX = (value: number) =>
        Math.min(Math.max(value, left), Math.max(left, right));
      const hitAt = (cx: number, cb: number) =>
        placed.find(
          (b) =>
            cx - w / 2 < b.right + 4 &&
            cx + w / 2 > b.left - 4 &&
            cb - h < b.bottom + 2 &&
            cb > b.top - 2,
        );
      let x = clampX(tag.x);
      let bottom = Math.max(tag.y, highest);
      // A tag in the way: go up above it while there is room; then try
      // beside it; then just below it.
      let spot: { x: number; bottom: number } | null = null;
      for (let tries = 0; tries < 8 && !spot; tries++) {
        const hit = hitAt(x, bottom);
        if (!hit) spot = { x, bottom };
        else if (hit.top - 3 >= highest) bottom = hit.top - 3;
        else break;
      }
      if (!spot) {
        const hit = hitAt(x, bottom);
        if (hit) {
          const sides = [hit.right + 4 + w / 2, hit.left - 4 - w / 2]
            .map(clampX)
            .sort((m, n) => Math.abs(m - tag.x) - Math.abs(n - tag.x));
          for (const side of sides) {
            if (!hitAt(side, bottom)) {
              spot = { x: side, bottom };
              break;
            }
          }
          if (!spot) {
            let below = hit.bottom + h + 3;
            for (let tries = 0; tries < 8; tries++) {
              const next = hitAt(x, below);
              if (!next) break;
              below = next.bottom + h + 3;
            }
            spot = { x, bottom: below };
          }
        } else spot = { x, bottom };
      }
      x = spot.x;
      bottom = spot.bottom;
      placed.push({
        left: x - w / 2,
        right: x + w / 2,
        top: bottom - h,
        bottom,
      });
      const tx = x + tagOffset.x;
      const ty = bottom + tagOffset.y;
      tag.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) translate(-50%, -100%)`;
      tag.el.style.opacity = tagOpacity;
      tag.el.style.visibility = "";
    }
    mark("seated", String(concept.seated?.() ?? 0));
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
      displayFont,
    });
    // Same people, already standing, the same play: a colour change is not
    // an arrival, nor a new step.
    if (players) concept.setPlayers?.(players);
    concept.setPlay?.(play);
    if (players || play) concept.settle?.();
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
      setPlay: () => undefined,
      pickAt: () => null,
      setTagLayer: () => undefined,
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
    // The landing is blend 0; the lobby, the role card and the table all sit
    // at blend 1, apart by their shot.
    const to = next.mode === "hero" ? 0 : 1;
    const wasTo = was === "hero" ? 0 : 1;
    let settled = false;
    if (to !== wasTo || (!flight && blend !== to)) {
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
        mark("flight", path);
        report("flying");
      } else {
        flight = null;
        blend = to;
        settled = true;
      }
    } else if (flight && next.path) flight.path = next.path;
    else if (!flight && next.mode !== was) settled = true;
    retarget(next.move ?? false);
    // A new screen's framing: settled now, or once the move arrives.
    if (settled) report(shotMove ? "flying" : next.mode);
    measureTags();
    applyStage(0);
    if (running) return;
    if (motion.matches) still();
    else renderOnce();
  };

  const stop = () => {
    if (OWNERS.get(host) === owner) OWNERS.delete(host);
    running = false;
    cancelAnimationFrame(frameId);
    window.clearTimeout(rebuildTimer);
    resizeObserver.disconnect();
    layerObserver.disconnect();
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
  const setPlay = (next: TablePlay | null, move = false) => {
    play = next;
    concept.setPlay?.(next);
    retarget(move);
    if (running) return;
    // Held still (reduced motion): the new state shows at once, settled.
    if (motion.matches) still();
    else {
      concept.update({ time, dt: 0, pointer, ...frameInfo() });
      renderOnce();
    }
  };
  const pickAt = (clientX: number, clientY: number): string | null => {
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const x = ((clientX - box.left) / box.width) * 2 - 1;
    const y = -(((clientY - box.top) / box.height) * 2 - 1);
    return concept.pick?.(x, y) ?? null;
  };
  const setTagLayer = (el: HTMLElement | null) => {
    if (tagLayer && tagLayer !== options.overlay)
      layerObserver.unobserve(tagLayer);
    tagLayer = el ?? options.overlay ?? null;
    if (el) layerObserver.observe(el);
    measureTags();
    if (!running) placeTags();
  };

  if (stage) report(blend >= 1 ? "lobby" : "hero");
  return { stop, setPlayers, setTarget, setPlay, pickAt, setTagLayer };
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
