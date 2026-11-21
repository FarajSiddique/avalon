import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  type Animated,
  type Bin,
  flame,
  flicker,
  glowSprite,
  glowTexture,
  motes,
  noise2,
  seededRandom,
} from "./kit";
import type { Palette } from "./palette";

export function standard(
  bin: Bin,
  color: Color,
  extra: Partial<{
    roughness: number;
    flat: boolean;
    emissive: Color;
    emissiveIntensity: number;
    vertexColors: boolean;
  }> = {},
): MeshStandardMaterial {
  return bin.add(
    new MeshStandardMaterial({
      color,
      roughness: extra.roughness ?? 0.92,
      metalness: 0,
      flatShading: extra.flat ?? true,
      vertexColors: extra.vertexColors ?? false,
      emissive: extra.emissive ?? new Color(0, 0, 0),
      emissiveIntensity: extra.emissiveIntensity ?? 1,
    }),
  );
}

/** Give every face of a non-indexed geometry one colour, chosen per face. */
export function paintFaces(
  geometry: BufferGeometry,
  pick: (centre: Vector3, face: number) => Color,
): BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const centre = new Vector3();
  for (let f = 0; f < pos.count / 3; f++) {
    centre.set(0, 0, 0);
    for (let v = 0; v < 3; v++)
      centre.add(new Vector3().fromBufferAttribute(pos, f * 3 + v));
    centre.divideScalar(3);
    const c = pick(centre, f);
    for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (f * 3 + v) * 3);
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Nudge every vertex by seeded noise, for a hand-cut, faceted look. */
export function jitter(
  geometry: BufferGeometry,
  amount: number,
  seed: number,
): BufferGeometry {
  const pos = geometry.getAttribute("position");
  const random = seededRandom(seed);
  const moved = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = moved.get(key);
    if (!d) {
      d = [
        (random() - 0.5) * amount,
        (random() - 0.5) * amount,
        (random() - 0.5) * amount,
      ];
      moved.set(key, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A low-poly fir: stacked cones on a short trunk. Base at 0,0,0. */
export function pine(bin: Bin, p: Palette, height: number, seed = 1): Group {
  const group = new Group();
  const random = seededRandom(seed);
  const needles = standard(bin, p.tree);
  const lit = standard(bin, p["tree-light"]);
  const trunk = new Mesh(
    bin.add(
      new CylinderGeometry(height * 0.04, height * 0.06, height * 0.2, 6),
    ),
    standard(bin, p.trunk),
  );
  trunk.position.y = height * 0.1;
  group.add(trunk);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const r = height * (0.3 - i * 0.07);
    const h = height * (0.42 - i * 0.06);
    const cone = new Mesh(
      bin.add(
        jitter(new ConeGeometry(r, h, 7, 1), height * 0.03, seed * 7 + i),
      ),
      i === tiers - 1 && random() > 0.5 ? lit : needles,
    );
    cone.position.y = height * (0.32 + i * 0.22);
    cone.rotation.y = random() * Math.PI;
    group.add(cone);
  }
  return group;
}

/** A round striped pavilion with a pennant. Base at 0,0,0, door facing +z. */
export function pavilion(bin: Bin, p: Palette, scale = 1): Group {
  const group = new Group();
  const segments = 16;
  const stripe = (c: Vector3) => {
    const a = Math.atan2(c.z, c.x);
    return Math.floor(((a + Math.PI) / (Math.PI * 2)) * segments) % 2 === 0
      ? p.tent
      : p["tent-stripe"];
  };
  const wall = new Mesh(
    bin.add(
      paintFaces(
        new CylinderGeometry(1.3, 1.4, 1.2, segments, 1, true),
        stripe,
      ),
    ),
    standard(bin, new Color(1, 1, 1), { vertexColors: true }),
  );
  (wall.material as MeshStandardMaterial).side = DoubleSide;
  wall.position.y = 0.6;
  group.add(wall);
  const roof = new Mesh(
    bin.add(paintFaces(new ConeGeometry(1.55, 1.5, segments, 1, true), stripe)),
    standard(bin, new Color(1, 1, 1), { vertexColors: true }),
  );
  (roof.material as MeshStandardMaterial).side = DoubleSide;
  roof.position.y = 1.2 + 0.75;
  group.add(roof);
  // Scalloped valance: small spheres round the eave.
  const valance = standard(bin, p["tent-stripe"]);
  const bead = bin.add(new IcosahedronGeometry(0.11, 0));
  for (let i = 0; i < segments * 2; i++) {
    const a = (i / (segments * 2)) * Math.PI * 2;
    const m = new Mesh(bead, valance);
    m.position.set(Math.cos(a) * 1.5, 1.18, Math.sin(a) * 1.5);
    group.add(m);
  }
  // The door: a dark wedge with a warm glow inside.
  const door = new Mesh(
    bin.add(new ConeGeometry(0.42, 1.0, 3, 1)),
    standard(bin, p["tent-dark"], {
      emissive: p["fire-outer"],
      emissiveIntensity: 0.25,
    }),
  );
  door.position.set(0, 0.5, 1.3);
  door.scale.z = 0.2;
  group.add(door);
  const pole = new Mesh(
    bin.add(new CylinderGeometry(0.03, 0.03, 0.9, 5)),
    standard(bin, p.outline),
  );
  pole.position.y = 2.95;
  group.add(pole);
  const knob = new Mesh(
    bin.add(new IcosahedronGeometry(0.08, 1)),
    standard(bin, p.gold, { emissive: p.gold, emissiveIntensity: 0.4 }),
  );
  knob.position.y = 3.42;
  group.add(knob);
  const pennant = new Mesh(
    bin.add(new PlaneGeometry(0.7, 0.24, 6, 1)),
    standard(bin, p["cloud-edge"], { flat: false }),
  );
  (pennant.material as MeshStandardMaterial).side = DoubleSide;
  pennant.geometry.translate(0.35, 0, 0);
  pennant.position.y = 3.25;
  pennant.name = "pennant";
  group.add(pennant);
  group.scale.setScalar(scale);
  return group;
}

/** Wave a pennant made by `pavilion` (or any plane named "pennant"). */
export function wavePennants(root: Group, time: number): void {
  root.traverse((node) => {
    if (node.name !== "pennant") return;
    const mesh = node as Mesh;
    const pos = mesh.geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(time * 4 - x * 6) * 0.08 * x);
    }
    pos.needsUpdate = true;
  });
}

/**
 * A castle: curtain wall, a tall keep and round towers with cone roofs, all
 * one stone tone so it reads as a silhouette, with glowing windows.
 */
export function castle(bin: Bin, p: Palette, tone: Color, seed = 3): Group {
  const group = new Group();
  const random = seededRandom(seed);
  const stone = standard(bin, tone);
  const roofMat = standard(bin, tone.clone().multiplyScalar(0.8));
  const lit = bin.add(
    new MeshBasicMaterial({ color: p.window.clone().multiplyScalar(2.2) }),
  );
  const pane = bin.add(new PlaneGeometry(0.12, 0.2));
  const windows = (
    w: number,
    h: number,
    d: number,
    at: Vector3,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const m = new Mesh(pane, lit);
      const side = random() > 0.5 ? 1 : -1;
      m.position.set(
        at.x + (random() - 0.5) * w * 0.7,
        at.y + (0.25 + random() * 0.6) * h,
        at.z + (d / 2 + 0.01) * side,
      );
      if (side < 0) m.rotation.y = Math.PI;
      group.add(m);
    }
  };
  const box = (w: number, h: number, d: number, x: number, z: number) => {
    const m = new Mesh(bin.add(new BoxGeometry(w, h, d)), stone);
    m.position.set(x, h / 2, z);
    group.add(m);
    // Crenellations.
    const merlon = bin.add(new BoxGeometry(0.16, 0.18, 0.16));
    for (let i = -w / 2 + 0.1; i <= w / 2 - 0.1; i += 0.36) {
      for (const dz of [-d / 2 + 0.08, d / 2 - 0.08]) {
        const c = new Mesh(merlon, stone);
        c.position.set(x + i, h + 0.09, z + dz);
        group.add(c);
      }
    }
    windows(w, h, d, new Vector3(x, 0, z), Math.round(w * 1.5));
  };
  const tower = (r: number, h: number, x: number, z: number, roof = true) => {
    const t = new Mesh(
      bin.add(new CylinderGeometry(r, r * 1.08, h, 10)),
      stone,
    );
    t.position.set(x, h / 2, z);
    group.add(t);
    if (roof) {
      const cone = new Mesh(
        bin.add(new ConeGeometry(r * 1.3, r * 2.6, 10)),
        roofMat,
      );
      cone.position.set(x, h + r * 1.3, z);
      group.add(cone);
      const flagPole = new Mesh(
        bin.add(new CylinderGeometry(0.02, 0.02, 0.5, 4)),
        stone,
      );
      flagPole.position.set(x, h + r * 2.6 + 0.25, z);
      group.add(flagPole);
      const flag = new Mesh(
        bin.add(new PlaneGeometry(0.4, 0.16, 5, 1)),
        standard(bin, p["cloud-edge"], { flat: false }),
      );
      (flag.material as MeshStandardMaterial).side = DoubleSide;
      flag.geometry.translate(0.2, 0, 0);
      flag.position.set(x, h + r * 2.6 + 0.42, z);
      flag.name = "pennant";
      group.add(flag);
    }
    for (let i = 0; i < 2; i++) {
      const m = new Mesh(pane, lit);
      const a = random() * Math.PI - Math.PI / 2;
      m.position.set(
        x + Math.sin(a) * (r + 0.01),
        h * (0.45 + random() * 0.4),
        z + Math.cos(a) * (r + 0.01),
      );
      m.rotation.y = a;
      group.add(m);
    }
  };
  box(3.2, 1.3, 1.6, 0, 0);
  box(1.3, 3.0, 1.3, 0.2, -0.1);
  tower(0.42, 2.2, -1.75, 0.6);
  tower(0.42, 2.0, 1.75, 0.6);
  tower(0.5, 3.6, -0.9, -0.5);
  tower(0.36, 4.2, 0.9, -0.6);
  // The gate, lit.
  const gate = new Mesh(bin.add(new PlaneGeometry(0.4, 0.55)), lit);
  gate.position.set(0, 0.28, 0.81);
  group.add(gate);
  return group;
}

export interface Campfire extends Animated {
  light: PointLight;
}

/**
 * A campfire: a ring of stones, crossed logs, the flame, a glow, embers and a
 * flickering warm light.
 */
export function campfire(
  bin: Bin,
  p: Palette,
  options: { scale?: number; embers?: number; seed?: number } = {},
): Campfire {
  const scale = options.scale ?? 1;
  const group = new Group();
  const stoneMat = standard(bin, p.stone);
  const shadeMat = standard(bin, p["stone-shade"]);
  const rock = bin.add(new DodecahedronGeometry(0.18, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const m = new Mesh(rock, i % 3 === 0 ? shadeMat : stoneMat);
    m.position.set(Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.62);
    m.scale.set(1.2, 0.7, 1);
    m.rotation.set(i, i * 2, 0);
    group.add(m);
  }
  const logMat = standard(bin, p.log);
  const endMat = standard(bin, p["log-end"], {
    emissive: p["fire-outer"],
    emissiveIntensity: 0.35,
  });
  const logGeo = bin.add(new CylinderGeometry(0.09, 0.1, 1.1, 7));
  for (const [ry, tilt] of [
    [0.4, 0.25],
    [-0.5, 0.3],
    [1.9, 0.28],
  ] as const) {
    const log = new Mesh(logGeo, [logMat, endMat, endMat]);
    log.rotation.set(Math.PI / 2 - tilt, 0, 0);
    const holder = new Group();
    holder.rotation.y = ry;
    holder.add(log);
    log.position.y = 0.16;
    group.add(holder);
  }
  const fire = flame(bin, p, 0.9);
  fire.object.position.y = 0.05;
  group.add(fire.object);
  const glow = glowSprite(
    bin,
    glowTexture(bin, 2.6),
    p["fire-glow"],
    4.2,
    0.55,
  );
  glow.position.y = 0.6;
  group.add(glow);
  const light = new PointLight(p["fire-glow"], 14, 0, 2);
  light.position.y = 0.9;
  group.add(light);
  const embers = motes(bin, {
    count: options.embers ?? 50,
    seed: options.seed ?? 11,
    color: p["fire-mid"],
    altColor: p["fire-outer"],
    origin: new Vector3(0, 0.5, 0),
    spread: new Vector3(0.35, 0.15, 0.35),
    rise: 0.9,
    life: 3.2,
    size: 1.1,
    wander: 0.25,
  });
  group.add(embers.object);
  group.scale.setScalar(scale);
  const baseIntensity = light.intensity;
  return {
    object: group,
    light,
    update(time, dt, camera) {
      fire.update(time, dt, camera);
      embers.update(time, dt, camera);
      const f = flicker(time, options.seed ?? 0);
      light.intensity = baseIntensity * f * scale * scale;
      glow.material.opacity = 0.28 + (f - 1) * 0.8;
    },
  };
}

/** A faceted rock, roughly round, for floating stones and boulders. */
export function rock(
  bin: Bin,
  mat: MeshStandardMaterial,
  size: number,
  seed: number,
): Mesh {
  const g = jitter(new IcosahedronGeometry(size, 1), size * 0.45, seed);
  return new Mesh(bin.add(g), mat);
}

/** A shader for falling or flowing water: streaks scrolling along v. */
export function waterfallMaterial(bin: Bin, p: Palette): ShaderMaterial {
  return bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: p.river },
        uFoam: { value: p.star },
        uSky: { value: p["star-blue"] },
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
        uniform vec3 uDeep, uFoam, uSky;
        varying vec2 vUv;
        float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main() {
          float v = vUv.y;
          float streak = n(vec2(vUv.x * 18.0, v * 3.0 + uTime * 2.6));
          streak = smoothstep(0.55, 0.95, streak);
          float body = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          vec3 c = mix(uDeep, uSky, 0.35 + 0.3 * n(vec2(vUv.x * 6.0, v * 2.0 + uTime)));
          c = mix(c, uFoam, streak * 0.8);
          float fade = smoothstep(0.0, 0.35, v);
          gl_FragColor = vec4(c * 1.15, body * fade * (0.55 + streak * 0.4));
        }
      `,
    }),
  );
}

export { noise2 };
