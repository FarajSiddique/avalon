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
import { readPalette } from "./palette";
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

interface MountOptions {
  /** Follow the mouse (or drift by itself on touch screens). */
  interactive: boolean;
  /** Treat a landscape canvas as a backdrop with content on its left. */
  backdrop: boolean;
  /** The GPU dropped the context: the caller should show a notice. */
  onLost?: () => void;
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
 * Put the Star Table into `host`. Returns its controls, or null when the
 * browser has no WebGL (the caller shows a notice).
 */
export async function mountStarTable(
  host: HTMLElement,
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
  const create: CreateConcept = await import("./scenes/star-table").then(
    (m) => m.createStarTable,
  );

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

  const displayFont =
    getComputedStyle(themeEl).getPropertyValue("--display-font").trim() ||
    undefined;
  let players: readonly TablePlayer[] | null = options.players ?? null;
  let play: TablePlay | null = null;
  const concept: ConceptScene = create({
    renderer,
    palette: readPalette(themeEl),
    lite,
    displayFont,
  });
  if (players) concept.setPlayers?.(players);

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

  // Name tags follow the figures' heads. Each sits on a fixed point just
  // over its head; one that would overlap another stacks straight up above
  // it, and eases there rather than jumping. A tag lifted well off its head
  // draws a thin stem down to it, so it still reads as that player's.
  const projected = new Vector3();
  const body = new Vector3();
  let tagLayer: HTMLElement | null = options.overlay ?? null;
  // A screen's own tag layer has its own origin: tags are placed in the
  // stage's coordinates, then moved by the gap between the two.
  const tagOffset = { x: 0, y: 0 };
  /**
   * Per player: how far their tag is moved off its natural spot (pixels
   * right and up), as shown and as aimed for, and how fast it is easing.
   * By id, so a screen's new tag for the same player carries on.
   */
  const tagStates = new Map<
    string,
    { shown: Offset; speed: Offset; target: Offset }
  >();
  /** The order tags claim their spots in, kept from frame to frame. */
  let tagOrder: string[] = [];
  let tagClock = 0;
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
    // When it shows again, it appears at its spot rather than easing there.
    if (el.dataset.tag) tagStates.delete(el.dataset.tag);
  };
  const placeTags = () => {
    const overlay = tagLayer;
    if (!overlay || !concept.anchors) return;
    const now = performance.now();
    const dt = tagClock ? Math.min(0.1, (now - tagClock) / 1000) : 0;
    tagClock = now;
    // Held still, or placed outside the frame loop: straight to the spot.
    const snap = motion.matches || !running;
    const anchors = concept.anchors();
    const tags = new Map<string, TagSpot & { el: HTMLElement }>();
    // On the stage, tags stay inside the open space; elsewhere the canvas.
    const box = stage ? focus : whole();
    for (const child of overlay.children) {
      const el = child as HTMLElement;
      const id = el.dataset.tag;
      const at = id ? anchors.get(id) : undefined;
      if (!id || !at) {
        hide(el);
        continue;
      }
      projected.copy(at).project(concept.camera);
      const hx = ((projected.x + 1) / 2) * size.width;
      const hy = ((1 - projected.y) / 2) * size.height;
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
          (hx < box.x ||
            hx > box.x + box.w ||
            hy > box.y + box.h ||
            bx < box.x ||
            bx > box.x + box.w ||
            by < box.y ||
            by > box.y + box.h))
      ) {
        hide(el);
        continue;
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Inside the open space: from side to side, and never off its top.
      const left = stage ? box.x + w / 2 + 4 : -Infinity;
      const right = stage ? box.x + box.w - w / 2 - 4 : Infinity;
      const highest = stage ? box.y + h + 4 : h + 4;
      tags.set(id, {
        el,
        hx,
        hy,
        w,
        h,
        left,
        right: Math.max(left, right),
        highest,
        lowest: stage ? box.y + box.h : size.height,
        x: Math.min(Math.max(hx, left), Math.max(left, right)),
        natural: Math.max(hy, highest),
      });
    }
    // The lowest tag on screen (the nearest figure) claims its spot first.
    // The order changes only when two tags are clearly the other way round,
    // so a small drift of the camera does not reshuffle the stack.
    tagOrder = tagOrder.filter((id) => tags.has(id));
    for (const id of tags.keys()) if (!tagOrder.includes(id)) tagOrder.push(id);
    for (let i = 1; i < tagOrder.length; i++) {
      for (let j = i; j > 0; j--) {
        const a = tagOrder[j]!;
        const b = tagOrder[j - 1]!;
        if (tags.get(a)!.natural <= tags.get(b)!.natural + TAG_REORDER_PX)
          break;
        tagOrder[j - 1] = a;
        tagOrder[j] = b;
      }
    }
    // On the stage, tags come in as the camera arrives at the table.
    const arrived = stage ? Math.min(1, Math.max(0, (blend - 0.7) / 0.3)) : 1;
    const tagOpacity = arrived.toFixed(2);
    const placed: Box[] = [];
    for (const id of tagOrder) {
      const tag = tags.get(id)!;
      const state = tagStates.get(id);
      const target = tagSpot(tag, placed, state?.target);
      const x = tag.x + target.x;
      const bottom = tag.natural - target.y;
      placed.push({
        left: x - tag.w / 2,
        right: x + tag.w / 2,
        top: bottom - tag.h,
        bottom,
      });
      // Ease toward the aim (critically damped), so a tag that makes room
      // glides there. The offset is from the head, so the tag still moves
      // with its figure exactly.
      const shown = { ...target };
      const speed = { x: 0, y: 0 };
      if (state && !snap && dt > 0) {
        const decay = Math.exp(-TAG_SPRING * dt);
        for (const k of ["x", "y"] as const) {
          const off = state.shown[k] - target[k];
          const drive = state.speed[k] + TAG_SPRING * off;
          shown[k] = target[k] + (off + drive * dt) * decay;
          speed[k] = (state.speed[k] - TAG_SPRING * drive * dt) * decay;
        }
      }
      tagStates.set(id, { shown, speed, target });
      const style = tag.el.style;
      const left = tag.x + shown.x;
      const top = tag.natural - shown.y;
      // Lifted well over its head (and still over it): a stem down to it.
      const stem = tag.hy - top;
      const reach = tag.hx - left;
      if (stem > TAG_STEM_PX && Math.abs(reach) < tag.w / 2 - 8) {
        style.setProperty("--tag-stem", `${stem.toFixed(1)}px`);
        style.setProperty("--tag-stem-x", `${reach.toFixed(1)}px`);
        style.setProperty(
          "--tag-stem-opacity",
          Math.min(1, (stem - TAG_STEM_PX) / TAG_STEM_PX).toFixed(2),
        );
      } else style.setProperty("--tag-stem-opacity", "0");
      // A lifted tag's stem passes behind the tags under it: the higher a
      // tag is lifted, the further back it sits.
      style.zIndex = String(100 - Math.min(99, Math.round(stem / 4)));
      const tx = left + tagOffset.x;
      const ty = top + tagOffset.y;
      style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) translate(-50%, -100%)`;
      style.opacity = tagOpacity;
      style.visibility = "";
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

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  });
  intersection.observe(host);
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
    resizeObserver.disconnect();
    layerObserver.disconnect();
    intersection.disconnect();
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

/** Pixels a tag's head must be lower than another's to go before it. */
const TAG_REORDER_PX = 10;
/** Stiffness of a tag's ease to a new spot (1/s: about a quarter second). */
const TAG_SPRING = 16;
/** A tag lifted more than this over its head shows a stem down to it. */
const TAG_STEM_PX = 12;
/** Clearance kept round a tag. */
const TAG_PAD = { x: 4, y: 3 };
/** A tag keeps its spot unless another is better by this many pixels. */
const TAG_STAY_PX = 18;

interface Offset {
  x: number;
  y: number;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A tag this frame: its head, its size, its bounds and its natural spot. */
interface TagSpot {
  /** The head's point, in the stage's pixels. */
  hx: number;
  hy: number;
  w: number;
  h: number;
  /** The range the tag's centre may take, side to side. */
  left: number;
  right: number;
  /** The range the tag's bottom may take: the open space. */
  highest: number;
  lowest: number;
  /** The tag's centre over its head, kept inside the open space. */
  x: number;
  /** The tag's bottom when nothing is in the way: on its head. */
  natural: number;
}

/**
 * Where a tag goes, as an offset from its natural spot (pixels right and
 * up), given the tags already placed. It looks at the spots that just clear
 * another tag: straight up first, then aside, then below (each costs more),
 * and takes the nearest free one inside the open space. It keeps last
 * frame's spot while that is free and nearly as near, so tags do not flick
 * between spots as the camera drifts.
 */
function tagSpot(
  tag: TagSpot,
  placed: readonly Box[],
  previous: Offset | undefined,
): Offset {
  // `slack`: how much overlap to forgive (a kept spot may touch by a hair as
  // heads drift by fractions of a pixel).
  const free = (cx: number, bottom: number, slack = 0) =>
    !placed.some(
      (b) =>
        cx - tag.w / 2 < b.right + TAG_PAD.x - slack &&
        cx + tag.w / 2 > b.left - TAG_PAD.x + slack &&
        bottom - tag.h < b.bottom + TAG_PAD.y - slack &&
        bottom > b.top - TAG_PAD.y + slack,
    );
  const inside = (cx: number, bottom: number, lowest: number, slack = 0.5) =>
    cx >= tag.left - slack &&
    cx <= tag.right + slack &&
    bottom >= tag.highest - slack &&
    bottom <= lowest + slack;
  const was = previous
    ? { x: tag.x + previous.x, bottom: tag.natural - previous.y }
    : null;
  // Nearest to the head; among near equals, nearest to where it was.
  const cost = (cx: number, bottom: number) => {
    const up = tag.natural - bottom;
    const away = was ? Math.hypot(cx - was.x, bottom - was.bottom) * 0.25 : 0;
    return Math.abs(cx - tag.x) * 1.5 + (up >= 0 ? up : -up * 2) + away;
  };
  const xs = [tag.x, tag.left, tag.right];
  const bottoms = [tag.natural];
  for (const b of placed) {
    xs.push(b.left - TAG_PAD.x - tag.w / 2, b.right + TAG_PAD.x + tag.w / 2);
    bottoms.push(b.top - TAG_PAD.y, b.bottom + TAG_PAD.y + tag.h);
  }
  const best = (lowest: number) => {
    let spot: { x: number; bottom: number; cost: number } | null = null;
    for (const cx of xs) {
      for (const bottom of bottoms) {
        if (!inside(cx, bottom, lowest)) continue;
        const c = cost(cx, bottom);
        // Each spot just touches a tag's clearance: forgive rounding.
        if ((!spot || c < spot.cost) && free(cx, bottom, 0.5))
          spot = { x: cx, bottom, cost: c };
      }
    }
    return spot;
  };
  // Inside the open space if it can; else anywhere below; else on its head.
  const spot = best(tag.lowest) ?? best(Infinity);
  if (!spot) return { x: 0, y: 0 };
  if (
    previous &&
    was &&
    inside(was.x, was.bottom, Math.max(tag.lowest, spot.bottom), 2) &&
    cost(was.x, was.bottom) <= spot.cost + TAG_STAY_PX &&
    free(was.x, was.bottom, 1.5)
  )
    return previous;
  return { x: spot.x - tag.x, y: tag.natural - spot.bottom };
}
