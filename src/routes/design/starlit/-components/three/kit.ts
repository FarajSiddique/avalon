import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  type Color,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Camera,
  type PerspectiveCamera,
  type Material,
  type Object3D,
  type Texture,
  Vector3,
} from "three";
import { seededRandom } from "../art/seeded";
import type { Palette } from "./palette";
import type { Layout } from "./types";

export { seededRandom };

/* ---------- noise ---------- */

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise in 0..1. */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Fractal noise in roughly 0..1. */
export function fbm2(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum / (1 - 0.5 ** octaves);
}

/** The same noise in GLSL, for shaders. */
const GLSL_NOISE = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return s;
}
`;

/** A firelight flicker around 1. */
export function flicker(t: number, seed = 0): number {
  return (
    1 +
    0.08 * Math.sin(t * 9.1 + seed) +
    0.06 * Math.sin(t * 15.7 + seed * 2) +
    0.05 * Math.sin(t * 23.3 + seed * 3)
  );
}

/* ---------- resources ---------- */

/** Collects disposables so a scene can free everything in one call. */
export class Bin {
  private items: { dispose(): void }[] = [];
  add<T extends { dispose(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }
  /** Track the geometry and material(s) of every mesh under `root`. */
  addTree(root: Object3D): void {
    root.traverse((node) => {
      const n = node as Partial<Mesh>;
      if (n.geometry) this.add(n.geometry);
      const mat = n.material as Material | Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => this.add(m));
      else if (mat) this.add(mat);
    });
  }
  dispose(): void {
    for (const item of new Set(this.items)) item.dispose();
    this.items = [];
  }
}

/** A soft round white spot, for glows tinted by a sprite's colour. */
export function glowTexture(bin: Bin, falloff = 2.2): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const v = Math.pow(1 - d, falloff);
      const i = (y * size + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(v * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = bin.add(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function glowSprite(
  bin: Bin,
  texture: Texture,
  color: Color,
  scale: number,
  opacity = 1,
): Sprite {
  const material = bin.add(
    new SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const sprite = new Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

/* ---------- sky ---------- */

/** A gradient dome: top, middle and horizon colours, with a faint glow. */
export function skyDome(
  bin: Bin,
  p: Palette,
  options: { glowDir?: Vector3; glowColor?: Color; radius?: number } = {},
): Mesh {
  const material = bin.add(
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: p["sky-top"] },
        uMid: { value: p["sky-mid"] },
        uLow: { value: p["sky-low"] },
        uHorizon: { value: p["sky-horizon"] },
        uGlowDir: {
          value: (options.glowDir ?? new Vector3(0, 0.2, -1)).normalize(),
        },
        uGlow: { value: options.glowColor ?? p["cloud-edge-dim"] },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uMid, uLow, uHorizon, uGlowDir, uGlow;
        varying vec3 vDir;
        float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          float h = vDir.y;
          vec3 c = mix(uHorizon, uLow, smoothstep(-0.02, 0.12, h));
          c = mix(c, uMid, smoothstep(0.08, 0.38, h));
          c = mix(c, uTop, smoothstep(0.35, 0.9, h));
          float g = max(dot(normalize(vDir), uGlowDir), 0.0);
          c += uGlow * pow(g, 6.0) * 0.35;
          c += (rand(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    }),
  );
  const geometry = bin.add(new SphereGeometry(options.radius ?? 500, 48, 24));
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

interface Twinkling {
  object: Points;
  update(time: number): void;
}

/** A dome of twinkling stars, in the palette's four star colours. */
export function starField(
  bin: Bin,
  p: Palette,
  options: {
    count: number;
    seed: number;
    radius?: number;
    minY?: number;
    size?: number;
  },
): Twinkling {
  const random = seededRandom(options.seed);
  const radius = options.radius ?? 450;
  const positions = new Float32Array(options.count * 3);
  const colors = new Float32Array(options.count * 3);
  const extra = new Float32Array(options.count * 2);
  const tints = [
    p.star,
    p.star,
    p.star,
    p["star-blue"],
    p["star-pink"],
    p["star-amber"],
  ];
  for (let i = 0; i < options.count; i++) {
    // Denser towards the top, none below `minY`.
    const y =
      (options.minY ?? 0.02) +
      Math.pow(random(), 0.8) * (1 - (options.minY ?? 0.02));
    const angle = random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    positions.set(
      [Math.cos(angle) * r * radius, y * radius, Math.sin(angle) * r * radius],
      i * 3,
    );
    const tint = tints[Math.floor(random() * tints.length)]!;
    colors.set([tint.r, tint.g, tint.b], i * 3);
    const big = random() > 0.93;
    extra.set(
      [(big ? 2.6 : 1) * (0.7 + random() * 0.9), random() * 100],
      i * 2,
    );
  }
  const geometry = bin.add(new BufferGeometry());
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("extra", new BufferAttribute(extra, 2));
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uSize: {
          value:
            (options.size ?? 2.2) *
            Math.min(window.devicePixelRatio || 1, 1.75),
        },
      },
      vertexShader: /* glsl */ `
        attribute vec2 extra;
        uniform float uTime, uSize;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vColor = color;
          float tw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(extra.y) * 2.2) + extra.y);
          vTwinkle = tw;
          gl_PointSize = uSize * extra.x * (0.7 + 0.5 * tw);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = smoothstep(1.0, 0.0, r);
          float cross = max(0.0, 1.0 - abs(d.x) * 14.0) * max(0.0, 1.0 - abs(d.y) * 2.2)
                      + max(0.0, 1.0 - abs(d.y) * 14.0) * max(0.0, 1.0 - abs(d.x) * 2.2);
          float a = pow(core, 2.4) + cross * 0.35;
          gl_FragColor = vec4(vColor * (1.6 * vTwinkle), a);
        }
      `,
    }),
  );
  const object = new Points(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = -9;
  return {
    object,
    update(time) {
      material.uniforms.uTime!.value = time;
    },
  };
}

/* ---------- fire ---------- */

export interface Animated {
  object: Object3D;
  update(time: number, dt: number, camera: Camera): void;
}

/**
 * A stylised flame: three nested tongues of noise-driven fire on camera-facing
 * planes, additive, in the palette's fire colours.
 */
export function flame(bin: Bin, p: Palette, height = 1): Animated {
  const group = new Group();
  const geometry = bin.add(new PlaneGeometry(1, 1.6, 1, 1));
  geometry.translate(0, 0.8, 0);
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOuter: { value: p["fire-outer"] },
        uMid: { value: p["fire-mid"] },
        uCore: { value: p["fire-core"] },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uOuter, uMid, uCore;
        varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          vec2 uv = vUv;
          float y = uv.y;
          // Rising, wavering noise bends the tongue.
          float n = fbm(vec2(uv.x * 3.0, y * 2.4 - uTime * 2.2));
          float sway = (n - 0.5) * 0.35 * y;
          float x = (uv.x - 0.5 + sway) * 2.0;
          float width = mix(0.95, 0.0, pow(y, 0.8)) * (0.75 + 0.5 * n);
          float body = 1.0 - smoothstep(width * 0.6, width, abs(x));
          body *= smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.55, 1.0, y + n * 0.25));
          float heat = body * (1.0 - y * 0.9) * (0.7 + n * 0.6);
          vec3 c = mix(uOuter, uMid, smoothstep(0.25, 0.6, heat));
          c = mix(c, uCore, smoothstep(0.6, 0.95, heat));
          gl_FragColor = vec4(c * (1.2 + heat), body * smoothstep(0.02, 0.2, heat));
        }
      `,
    }),
  );
  const tongues: Mesh[] = [];
  for (const [w, h, x, z] of [
    [1.15, 1.0, 0, 0],
    [0.8, 0.8, 0.22, 0.12],
    [0.75, 0.75, -0.24, -0.08],
  ] as const) {
    const mesh = new Mesh(geometry, material.clone());
    bin.add(mesh.material as Material);
    mesh.scale.set(w * height, h * height, 1);
    mesh.position.set(x * height, 0, z * height);
    mesh.renderOrder = 5;
    tongues.push(mesh);
    group.add(mesh);
  }
  const world = new Vector3();
  const eye = new Vector3();
  return {
    object: group,
    update(time, _dt, camera) {
      camera.getWorldPosition(eye);
      tongues.forEach((mesh, i) => {
        const m = mesh.material as ShaderMaterial;
        m.uniforms.uTime!.value = time + i * 3.7;
        // Face the camera, turning about the vertical only.
        mesh.getWorldPosition(world);
        mesh.lookAt(eye.x, world.y, eye.z);
      });
    },
  };
}

/** Embers or fireflies: points that rise (or wander) and fade, recycled. */
export function motes(
  bin: Bin,
  options: {
    count: number;
    seed: number;
    color: Color;
    altColor?: Color;
    /** Where they start: centre and half-size of a box. */
    origin: Vector3;
    spread: Vector3;
    /** Upward speed; 0 for fireflies that wander in place. */
    rise: number;
    life: number;
    size: number;
    wander?: number;
  },
): Animated {
  const random = seededRandom(options.seed);
  const n = options.count;
  const base = new Float32Array(n * 3);
  const seeds = new Float32Array(n * 2);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base.set(
      [
        options.origin.x + (random() * 2 - 1) * options.spread.x,
        options.origin.y + (random() * 2 - 1) * options.spread.y,
        options.origin.z + (random() * 2 - 1) * options.spread.z,
      ],
      i * 3,
    );
    seeds.set([random() * options.life, random() * 100], i * 2);
    const c =
      options.altColor && random() > 0.6 ? options.altColor : options.color;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = bin.add(new BufferGeometry());
  geometry.setAttribute("position", new BufferAttribute(base, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 2));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uRise: { value: options.rise },
        uLife: { value: options.life },
        uWander: { value: options.wander ?? 0.4 },
        uSize: {
          value: options.size * Math.min(window.devicePixelRatio || 1, 1.75),
        },
      },
      vertexShader: /* glsl */ `
        attribute vec2 seed;
        uniform float uTime, uRise, uLife, uWander, uSize;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          vColor = color;
          float age = mod(uTime + seed.x, uLife) / uLife;
          vec3 p = position;
          p.y += age * uRise * uLife;
          float s = seed.y;
          p.x += sin(uTime * 0.7 + s) * uWander + sin(uTime * 1.9 + s * 2.0) * uWander * 0.3;
          p.z += cos(uTime * 0.6 + s * 1.3) * uWander;
          p.y += uRise == 0.0 ? sin(uTime * 0.9 + s) * uWander * 0.6 : 0.0;
          float blink = uRise == 0.0 ? smoothstep(0.2, 0.9, sin(uTime * (0.8 + fract(s) * 1.4) + s)) : 1.0;
          vFade = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.6, 1.0, age)) * blink;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (1.0 - age * 0.5) * (30.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vFade;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = pow(max(0.0, 1.0 - r), 2.0) * vFade;
          gl_FragColor = vec4(vColor * 2.2, a);
        }
      `,
    }),
  );
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 6;
  return {
    object: points,
    update(time) {
      material.uniforms.uTime!.value = time;
    },
  };
}

/** A soft cumulus puff (several overlapping round lobes), white on clear. */
export function puffTexture(bin: Bin, seed = 5): Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const random = seededRandom(seed);
  for (let i = 0; i < 14; i++) {
    const x = size * (0.22 + random() * 0.56);
    const y = size * (0.4 + random() * 0.25);
    const r = size * (0.12 + random() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.6, "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = bin.add(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Fit the camera to the canvas. On a wide backdrop the view slides so the
 * subject sits `shift` of the width right of centre, clear of the title.
 */
export function frameCamera(
  camera: PerspectiveCamera,
  layout: Layout,
  options: { fov: number; tallFov?: number; shift: number },
): void {
  camera.aspect = layout.aspect;
  camera.fov =
    layout.aspect < 1 ? (options.tallFov ?? options.fov * 1.25) : options.fov;
  const half = ((camera.fov / 2) * Math.PI) / 180;
  camera.filmOffset = layout.wide
    ? -options.shift * 2 * camera.filmGauge * Math.tan(half) * layout.aspect
    : 0;
  camera.updateProjectionMatrix();
}
