import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { sparklePath } from "../../art/seeded";
import {
  Bin,
  fbm2,
  frameCamera,
  glowSprite,
  glowTexture,
  motes,
  puffTexture,
  seededRandom,
  skyDome,
  starField,
} from "../kit";
import type { Palette } from "../palette";
import {
  campfire,
  castle,
  jitter,
  pine,
  rock,
  standard,
  wavePennants,
} from "../props";
import { Seating } from "../seating";
import type { ConceptScene, CreateConcept, Layout } from "../types";

const SEATS = 10;

/**
 * The Star Table: a round stone table for ten in a forest clearing. A
 * moonbeam falls on it, the fire burns in its heart, and the seat stones'
 * runes light one by one like players arriving. Overhead, a dome of
 * constellations turns slowly.
 */
export const createStarTable: CreateConcept = ({
  palette: p,
  lite,
  variant,
}) => {
  // The lobby framing as a fixed scene (thumbnails, the old lobby panel).
  // The stage passes a blend instead, and flies between the two.
  const lobby = variant === "lobby";
  const bin = new Bin();
  const scene = new Scene();
  scene.fog = new FogExp2(p["sky-low"], 0.012);
  const camera = new PerspectiveCamera(40, 1, 0.1, 1500);
  const random = seededRandom(5);

  scene.add(
    skyDome(bin, p, {
      glowDir: new Vector3(0, 1, 0),
      glowColor: p["cloud-deep"],
    }),
  );
  const stars = starField(bin, p, {
    count: lite ? 1000 : 2400,
    seed: 41,
    minY: 0.08,
  });
  scene.add(stars.object);
  const sky = constellations(bin, p, lite);
  scene.add(sky.object);
  const shooter = shootingStar(bin, p);
  scene.add(shooter.object);

  scene.add(new HemisphereLight(p["hill-0"], p["ground-dark"], 1.6));
  const moonLight = new DirectionalLight(p.moon, 1.4);
  moonLight.position.set(-10, 40, -6);
  scene.add(moonLight);
  // A soft light from the viewer's side in the lobby, so the figures read.
  const front = new DirectionalLight(p.moon, lobby ? 1.3 : 0);
  front.position.set(0, 14, 18);
  scene.add(front);

  /* ---- the clearing ---- */
  scene.add(clearing(bin, p));
  for (let i = 0; i < (lite ? 50 : 90); i++) {
    const a = random() * Math.PI * 2;
    // Leave a gap towards the castle.
    if (Math.abs(a - Math.PI * 1.5) < 0.22) continue;
    const r = 27 + random() * 20;
    const tree = pine(bin, p, 8 + random() * 7 + (r - 27) * 0.3, i + 3);
    tree.position.set(Math.cos(a) * r, -0.3, Math.sin(a) * r);
    scene.add(tree);
  }
  const keep = castle(bin, p, p["hill-2"], 21);
  keep.scale.setScalar(4);
  keep.position.set(0, 1, -78);
  const keepHill = rock(bin, standard(bin, p["hill-3"]), 16, 9);
  keepHill.scale.set(1.4, 0.45, 1);
  keepHill.position.set(0, -3, -80);
  scene.add(keepHill, keep);

  /* ---- the table ---- */
  const stone = standard(bin, p.stone);
  const shade = standard(bin, p["stone-shade"]);
  const table = new Group();
  scene.add(table);
  const top = new Mesh(
    bin.add(jitter(new CylinderGeometry(3.6, 3.9, 1.1, 40, 1), 0.06, 4)),
    stone,
  );
  top.position.y = 0.55;
  table.add(top);
  const plinth = new Mesh(
    bin.add(new CylinderGeometry(4.4, 4.7, 0.35, 40)),
    shade,
  );
  plinth.position.y = 0.05;
  table.add(plinth);
  const hearth = new Mesh(
    bin.add(new CylinderGeometry(1.2, 1.2, 0.02, 32)),
    standard(bin, p["ground-dark"]),
  );
  hearth.position.y = 1.11;
  table.add(hearth);
  const ringMat = bin.add(
    new MeshBasicMaterial({
      color: p.gold.clone().multiplyScalar(1.6),
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ring = new Mesh(bin.add(new RingGeometry(2.85, 3.0, 80)), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.125;
  table.add(ring);
  const fire = campfire(bin, p, {
    scale: 1.3,
    embers: lite ? 40 : 80,
    seed: 7,
  });
  fire.object.position.y = 1.12;
  table.add(fire.object);

  /* ---- the ten seat stones, each with a rune ---- */
  const runeTexture = runeMap(bin);
  const seats: {
    rune: Mesh;
    glow: Sprite;
    spoke: Mesh;
    slab: Mesh;
    /** Stone height on the landing, and lower in the lobby. */
    tall: number;
    low: number;
    phase: number;
  }[] = [];
  const spokeMat = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: p.window.clone() }, uLevel: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uLevel; varying vec2 vUv;
        void main() {
          float a = (1.0 - abs(vUv.y - 0.5) * 2.0) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
          gl_FragColor = vec4(uColor * 1.6, a * uLevel);
        }
      `,
    }),
  );
  const halo = glowTexture(bin, 2.2);
  for (let i = 0; i < SEATS; i++) {
    const a = (i / SEATS) * Math.PI * 2 + Math.PI / SEATS;
    const seat = new Group();
    seat.position.set(Math.cos(a) * 6.4, 0, Math.sin(a) * 6.4);
    seat.lookAt(0, 0, 0);
    // In the lobby the stones sink low, so the figures stand clear of them.
    const r = random();
    const h = 1.6 + r * 0.5;
    const low = 1.0 + r * 0.25;
    const slab = new Mesh(
      bin.add(jitter(new BoxGeometry(1.3, h, 0.7, 2, 3, 1), 0.12, 60 + i)),
      i % 3 ? stone : shade,
    );
    slab.position.y = h / 2 - 0.1;
    seat.add(slab);
    const runeMat = bin.add(
      new MeshBasicMaterial({
        map: runeTexture,
        color: p.window.clone().multiplyScalar(2),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        opacity: 0.15,
      }),
    );
    const rune = new Mesh(bin.add(new PlaneGeometry(0.75, 0.75)), runeMat);
    rune.position.set(0, h * 0.62, 0.37);
    seat.add(rune);
    const glow = glowSprite(bin, halo, p["fire-glow"], 2.2, 0);
    glow.position.set(0, h * 0.62, 0.6);
    seat.add(glow);
    scene.add(seat);
    // A line of light across the table from this seat to the fire.
    const spoke = new Mesh(
      bin.add(new PlaneGeometry(2.4, 0.14)),
      spokeMat.clone(),
    );
    bin.add(spoke.material as ShaderMaterial);
    spoke.rotation.set(-Math.PI / 2, 0, -a);
    spoke.position.set(Math.cos(a) * 2.25, 1.13, Math.sin(a) * 2.25);
    table.add(spoke);
    seats.push({ rune, glow, spoke, slab, tall: h, low, phase: i });
  }

  /* ---- the moonbeam, its dust, the mist and fireflies ---- */
  const beam = moonbeam(bin, p);
  scene.add(beam.object);
  const dust = motes(bin, {
    count: lite ? 40 : 90,
    seed: 2,
    color: p.star,
    altColor: p["star-blue"],
    origin: new Vector3(0, 6, 0),
    spread: new Vector3(4, 5, 4),
    rise: 0.15,
    life: 14,
    size: 0.9,
    wander: 0.6,
  });
  scene.add(dust.object);
  const flies = motes(bin, {
    count: lite ? 30 : 60,
    seed: 9,
    color: p["ground-lit-3"],
    altColor: p.window,
    origin: new Vector3(0, 2, 0),
    spread: new Vector3(16, 1.6, 16),
    rise: 0,
    life: 7,
    size: 1.4,
    wander: 1.4,
  });
  scene.add(flies.object);
  const puff = puffTexture(bin, 13);
  const mist: { sprite: Sprite; a: number; r: number; speed: number }[] = [];
  for (let i = 0; i < (lite ? 14 : 26); i++) {
    const material = bin.add(
      new SpriteMaterial({
        map: puff,
        color: i % 2 ? p["cloud-light"] : p.cloud,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    const sprite = new Sprite(material);
    const s = 9 + random() * 8;
    sprite.scale.set(s, s * 0.32, 1);
    mist.push({
      sprite,
      a: random() * Math.PI * 2,
      r: 12 + random() * 14,
      speed: 0.01 + random() * 0.02,
    });
    scene.add(sprite);
  }

  // In the lobby, players stand at the seats, starting across the table.
  const seating = new Seating(
    p,
    bin,
    scene,
    Array.from(
      { length: SEATS },
      (_, i) => (i / SEATS) * Math.PI * 2 + Math.PI / SEATS,
    ),
    7,
  );

  let layout: Layout = { width: 1, height: 1, aspect: 1, wide: false };
  const look = new Vector3();
  const heroLook = new Vector3(0, 6.2, 0);
  const lobbyLook = new Vector3(0, 1.5, -0.7);
  // Which turn of the landing orbit the flight starts from, fixed while
  // flying so the camera takes the short way round and never jumps.
  let turns = 0;

  const concept: ConceptScene = {
    scene,
    camera,
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.7 },
    posterTime: 21,
    resize(next) {
      layout = next;
      frame(lobby ? 1 : 0);
    },
    update({ time, dt, pointer, blend, flight }) {
      const b = blend ?? (lobby ? 1 : 0);
      frame(b);
      const tall = layout.aspect < 1.4;
      // The landing: a slow orbit, low and wide.
      const heroAz = -0.4 + time * 0.03 + pointer.x * 0.45;
      const heroDist = layout.aspect < 1 ? 24 : 20;
      const heroH = 6.5 + pointer.y * 1.8 + Math.sin(time * 0.08) * 0.5;
      // The lobby: looking down on the whole table, with a gentle sway.
      const lobbyAz = Math.sin(time * 0.06) * 0.14 + pointer.x * 0.3;
      const lobbyDist = tall ? 15.5 : 14.5;
      const lobbyH = (tall ? 15 : 11.5) + pointer.y * 1.2;
      if (b <= 0 || b >= 1)
        turns = Math.round((heroAz - lobbyAz) / (Math.PI * 2));
      const fromAz = heroAz - turns * Math.PI * 2;
      // Mid-flight the path bows: creating a room rises over the table and
      // drops onto it through the moonbeam; joining sweeps round low along
      // the edge of the clearing (inside the trees, which start at 27), as
      // if walking up to the fire.
      const bow = Math.sin(Math.PI * b);
      const path = flight?.path;
      const lift = path === "create" ? 15 : path === "join" ? -3.5 : 2;
      const reach = path === "create" ? -7 : path === "join" ? 3 : 3;
      const swing = path === "join" ? 1.1 : 0;
      const az = mix(fromAz, lobbyAz, b) + swing * bow;
      const distance = mix(heroDist, lobbyDist, b) + reach * bow;
      const height = Math.max(2.4, mix(heroH, lobbyH, b) + lift * bow);
      camera.position.set(
        Math.sin(az) * distance,
        height,
        Math.cos(az) * distance,
      );
      look.lerpVectors(heroLook, lobbyLook, b);
      if (path === "create") look.y += 1.5 * bow;
      camera.lookAt(look);

      front.intensity = 1.3 * b;
      seating.update(dt, time);

      // On the landing, runes light one by one round the table, hold, then
      // all dim together. In the lobby they show who is seated and ready.
      const cycle = (time % 16) / 16;
      const flare =
        path === "create"
          ? smooth(0.72, 0.86, flight!.progress) *
            (1 - smooth(0.86, 1, flight!.progress))
          : 0;
      for (let i = 0; i < seats.length; i++) {
        const seat = seats[i]!;
        const on = Math.min(1, Math.max(0, (cycle * 14 - seat.phase) / 1.2));
        const heroLevel = cycle > 0.85 ? on * (1 - (cycle - 0.85) / 0.15) : on;
        const s = seating.state(i);
        const lobbyLevel =
          !s.present || s.away ? 0.05 : s.ready ? s.arrive : 0.3 * s.arrive;
        const level = Math.min(1, mix(heroLevel, lobbyLevel, b) + flare);
        const base = mix(0.15, 0.12, b);
        (seat.rune.material as MeshBasicMaterial).opacity =
          base + level * (1 - base);
        seat.glow.material.opacity = level * mix(0.55, 0.5, b);
        (seat.spoke.material as ShaderMaterial).uniforms.uLevel!.value =
          level * 0.9;
        // The stones sink as the camera comes down to the table.
        const h = mix(seat.tall, seat.low, b);
        seat.slab.scale.y = h / seat.tall;
        seat.slab.position.y = h / 2 - 0.1;
        seat.rune.position.y = h * 0.62;
        seat.glow.position.y = h * 0.62;
      }
      const heroRing = 0.35 + 0.35 * Math.min(1, cycle * 1.3);
      ringMat.opacity = Math.min(1, mix(heroRing, 0.55, b) + flare * 0.6);
      tick(time, dt);
    },
    setPlayers(players) {
      seating.set(players);
    },
    settle() {
      seating.settle();
    },
    anchors() {
      return seating.anchors();
    },
    seated() {
      return seating.seated();
    },
    dispose() {
      seating.dispose();
      bin.addTree(scene);
      bin.dispose();
    },
  };

  /** Lens and framing, from the landing's (0) to the lobby's (1). */
  function frame(b: number): void {
    // The lobby's lens: tighter on a phone so the figures read, wider beside
    // a wide screen's panels so the whole table fits.
    const lobbyFov = layout.aspect >= 1.7 ? 38 : layout.width < 640 ? 40 : 46;
    frameCamera(camera, layout, {
      fov: mix(54, lobbyFov, b),
      tallFov: mix(66, 52, b),
      shift: 0.16 * (1 - b),
    });
  }

  /** The ambient life of the clearing, shared by both framings. */
  function tick(time: number, dt: number): void {
    for (const m of mist) {
      const a = m.a + time * m.speed;
      m.sprite.position.set(Math.cos(a) * m.r, 0.9, Math.sin(a) * m.r);
    }
    sky.update(time);
    shooter.update(time);
    stars.update(time);
    beam.update(time);
    fire.update(time, dt, camera);
    dust.update(time, dt, camera);
    flies.update(time, dt, camera);
    wavePennants(keep, time);
  }
  return concept;
};

/** The forest floor: dark, faceted, lit warm round the table. */
function clearing(bin: Bin, p: Palette): Mesh {
  const geometry = new PlaneGeometry(180, 180, 90, 90).toNonIndexed();
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const rise = d > 16 ? Math.min(6, (d - 16) * 0.12) : 0;
    pos.setY(i, (fbm2(x * 0.12, z * 0.12) - 0.5) * 0.7 + rise);
  }
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let f = 0; f < pos.count / 3; f++) {
    let x = 0;
    let z = 0;
    for (let v = 0; v < 3; v++) {
      x += pos.getX(f * 3 + v) / 3;
      z += pos.getZ(f * 3 + v) / 3;
    }
    const d = Math.hypot(x, z);
    if (d < 5) c.copy(p["ground-lit-2"]);
    else if (d < 9)
      c.copy(p["ground-lit-1"]).lerp(p["ground-lit-2"], (9 - d) / 4);
    else c.copy(p.ground).lerp(p["ground-lit-1"], Math.max(0, (16 - d) / 7));
    c.multiplyScalar(0.85 + fbm2(x * 0.5, z * 0.5) * 0.3);
    for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (f * 3 + v) * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new Mesh(
    bin.add(geometry),
    standard(bin, new Color(1, 1, 1), { vertexColors: true }),
  );
}

/** A four-pointed sparkle, as on the banner, for the seat runes. */
function runeMap(bin: Bin): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "white";
  ctx.fill(new Path2D(sparklePath(size * 0.42)));
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  const texture = bin.add(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Ten constellations on a slowly turning dome, stars joined by faint lines. */
function constellations(bin: Bin, p: Palette, lite: boolean) {
  const group = new Group();
  const random = seededRandom(88);
  const starPos: number[] = [];
  const starCol: number[] = [];
  const linePos: number[] = [];
  const radius = 400;
  const tints = [p.star, p["star-blue"], p["star-amber"], p["star-pink"]];
  for (let k = 0; k < SEATS; k++) {
    const az = (k / SEATS) * Math.PI * 2 + random() * 0.3;
    const el = 0.36 + random() * 0.26;
    const points: Vector3[] = [];
    const n = 4 + Math.floor(random() * 4);
    let a = az;
    let e = el;
    for (let i = 0; i < n; i++) {
      a += (random() - 0.5) * 0.28;
      e += (random() - 0.5) * 0.22;
      const v = new Vector3(
        Math.cos(e) * Math.cos(a),
        Math.sin(e),
        Math.cos(e) * Math.sin(a),
      ).multiplyScalar(radius);
      points.push(v);
      starPos.push(v.x, v.y, v.z);
      const t = tints[k % tints.length]!;
      starCol.push(t.r, t.g, t.b);
    }
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]!;
      const to = points[i]!;
      linePos.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
  }
  const lineGeo = bin.add(new BufferGeometry());
  lineGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(linePos), 3),
  );
  const lineMat = bin.add(
    new LineBasicMaterial({
      color: p["star-blue"],
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const lines = new LineSegments(lineGeo, lineMat);
  group.add(lines);
  const starGeo = bin.add(new BufferGeometry());
  starGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(starPos), 3),
  );
  starGeo.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(starCol), 3),
  );
  const starMat = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uSize: {
          value: (lite ? 9 : 11) * Math.min(window.devicePixelRatio || 1, 1.75),
        },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uSize; varying vec3 vColor; varying float vTw;
        void main() {
          vColor = color;
          vTw = 0.75 + 0.25 * sin(uTime * 1.3 + position.x * 0.05);
          gl_PointSize = uSize * vTw;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vTw;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = pow(max(0.0, 1.0 - r), 3.0);
          float cross = max(0.0, 1.0 - abs(d.x) * 16.0) * max(0.0, 1.0 - abs(d.y) * 2.0)
                      + max(0.0, 1.0 - abs(d.y) * 16.0) * max(0.0, 1.0 - abs(d.x) * 2.0);
          gl_FragColor = vec4(vColor * 2.4 * vTw, core + cross * 0.6);
        }
      `,
    }),
  );
  const pts = new Points(starGeo, starMat);
  pts.frustumCulled = false;
  group.add(pts);
  return {
    object: group,
    update(time: number) {
      group.rotation.y = time * 0.012;
      starMat.uniforms.uTime!.value = time;
      lineMat.opacity = 0.28 + 0.1 * Math.sin(time * 0.4);
    },
  };
}

/** A soft cone of moonlight falling on the table. */
function moonbeam(bin: Bin, p: Palette) {
  const geometry = bin.add(new CylinderGeometry(1.2, 4.8, 44, 48, 1, true));
  geometry.translate(0, 22, 0);
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      uniforms: {
        uColor: { value: p.moon.clone().lerp(p["star-blue"], 0.5) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal; varying vec3 vView; varying float vY;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormal = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - world.xyz);
          vY = position.y / 44.0;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uTime;
        varying vec3 vNormal; varying vec3 vView; varying float vY;
        void main() {
          float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.0);
          float fade = smoothstep(1.0, 0.25, vY) * smoothstep(0.0, 0.08, vY);
          float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + vY * 9.0);
          gl_FragColor = vec4(uColor * edge * fade * shimmer * 0.05, 1.0);
        }
      `,
    }),
  );
  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, 0.4, 0);
  mesh.rotation.z = 0.12;
  mesh.renderOrder = 7;
  return {
    object: mesh,
    update(time: number) {
      material.uniforms.uTime!.value = time;
    },
  };
}

/** Now and then a shooting star crosses the dome. */
function shootingStar(bin: Bin, p: Palette) {
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
      uniforms: { uColor: { value: p.star.clone() }, uLife: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uLife; varying vec2 vUv;
        void main() {
          float a = pow(vUv.x, 3.0) * (1.0 - abs(vUv.y - 0.5) * 2.0);
          float life = sin(uLife * 3.14159);
          gl_FragColor = vec4(uColor * 2.5, a * life);
        }
      `,
    }),
  );
  const mesh = new Mesh(bin.add(new PlaneGeometry(60, 1.2)), material);
  mesh.visible = false;
  const random = seededRandom(3);
  let next = 2.5;
  let start = -100;
  const from = new Vector3();
  const dir = new Vector3();
  const xAxis = new Vector3();
  const yAxis = new Vector3();
  const zAxis = new Vector3();
  const basis = new Matrix4();
  return {
    object: mesh,
    update(time: number) {
      if (time > next) {
        start = time;
        next = time + 6 + random() * 7;
        const az = random() * Math.PI * 2;
        from.set(Math.cos(az) * 220, 150 + random() * 60, Math.sin(az) * 220);
        dir.set(-Math.sin(az), -0.35, Math.cos(az)).normalize();
      }
      const t = (time - start) / 1.1;
      mesh.visible = t >= 0 && t <= 1;
      if (!mesh.visible) return;
      material.uniforms.uLife!.value = t;
      mesh.position.copy(from).addScaledVector(dir, t * 120);
      // The streak's long axis runs along its travel, its face to the centre.
      xAxis.copy(dir);
      zAxis.copy(mesh.position).negate().normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      zAxis.crossVectors(xAxis, yAxis);
      basis.makeBasis(xAxis, yAxis, zAxis);
      mesh.quaternion.setFromRotationMatrix(basis);
    },
  };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
