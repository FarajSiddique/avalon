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
}

export interface Mounted {
  stop(): void;
  /** Lobby: change who is at the table without remounting. */
  setPlayers(players: readonly TablePlayer[]): void;
}

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
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    bloom.resolution.set((width * dpr) / 2, (height * dpr) / 2);
    const aspect = width / height;
    layout = {
      width,
      height,
      aspect,
      wide: options.backdrop && aspect > 1.25 && width >= 1024,
    };
    concept.resize(layout);
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
        x: ((projected.x + 1) / 2) * layout.width,
        y: ((1 - projected.y) / 2) * layout.height,
        depth: projected.z,
      });
    }
    tags.sort((a, b) => a.depth - b.depth);
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
      // Never off the top of the canvas.
      bottom = Math.max(bottom, h + 4);
      placed.push({
        left: tag.x - w / 2,
        right: tag.x + w / 2,
        top: bottom - h,
        bottom,
      });
      tag.el.style.transform = `translate(${tag.x.toFixed(1)}px, ${bottom.toFixed(1)}px) translate(-50%, -100%)`;
      tag.el.style.opacity = "1";
    }
    host.dataset.seated = String(concept.seated?.() ?? 0);
  };

  const renderOnce = () => {
    composer.render();
    placeTags();
  };

  const tick = (now: number) => {
    frameId = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt / tempoOf();
    if (options.interactive && coarse) {
      target.x = Math.sin(time * 0.13) * 0.6;
      target.y = Math.sin(time * 0.21) * 0.3;
    }
    const ease = 1 - Math.exp(-dt * 2.5);
    pointer.x += (target.x - pointer.x) * ease;
    pointer.y += (target.y - pointer.y) * ease;
    concept.update({ time, dt, pointer });
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
      });
    concept.settle?.();
    concept.update({
      time: concept.posterTime,
      dt: 1 / 30,
      pointer: { x: 0, y: 0 },
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
    return { stop: () => image.remove(), setPlayers: () => undefined };
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
    concept.update({ time, dt: 0, pointer });
    renderOnce();
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
  return { stop, setPlayers };
}
