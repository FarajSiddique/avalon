import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  Bin,
  fbm2,
  frameCamera,
  glowSprite,
  glowTexture,
  moonSprite,
  motes,
  puffTexture,
  seededRandom,
  skyDome,
  starField,
} from "../kit";
import {
  campfire,
  castle,
  pavilion,
  pine,
  rock,
  standard,
  waterfallMaterial,
  wavePennants,
} from "../props";
import type { ConceptScene, CreateConcept, Layout } from "../types";

/**
 * Ember Isle: the camp on a floating island of rock above a sea of cloud.
 * A waterfall spills off the edge into the void, the castle floats on a
 * second island behind, loose stones circle slowly, embers climb from the
 * fire and the camera drifts with the pointer.
 */
export const createEmberIsle: CreateConcept = ({ palette: p, lite }) => {
  const bin = new Bin();
  const scene = new Scene();
  scene.fog = new Fog(p["sky-low"], 34, 120);
  const camera = new PerspectiveCamera(38, 1, 0.1, 1200);

  const moonDir = new Vector3(0.42, 0.24, -1).normalize();
  scene.add(skyDome(bin, p, { glowDir: moonDir, glowColor: p.moon }));
  const stars = starField(bin, p, {
    count: lite ? 900 : 2200,
    seed: 7,
    minY: 0.04,
  });
  scene.add(stars.object);
  const moon = moonSprite(bin, p, { size: 130 });
  moon.position.copy(moonDir.clone().multiplyScalar(420));
  scene.add(moon);

  scene.add(new HemisphereLight(p["hill-0"], p["cloud-deep"], 2.6));
  const moonLight = new DirectionalLight(p.moon, 2.2);
  moonLight.position.copy(moonDir.clone().multiplyScalar(50));
  scene.add(moonLight);
  const rim = new DirectionalLight(p["cloud-edge"], 1.4);
  rim.position.set(-30, -4, -20);
  scene.add(rim);

  /* ---- the island ---- */
  const world = new Group();
  scene.add(world);
  const isle = new Group();
  world.add(isle);
  isle.add(island(bin, p, 7, 11, 21));

  const fire = campfire(bin, p, { scale: 1.25, embers: lite ? 40 : 80 });
  fire.object.position.set(-0.6, 0.32, 1.4);
  isle.add(fire.object);

  const tent = pavilion(bin, p, 0.95);
  tent.position.set(2.4, 0.3, -1.4);
  tent.rotation.y = -0.6;
  isle.add(tent);

  // Log seats round the fire.
  const logMat = standard(bin, p.log);
  for (const [x, z, ry] of [
    [-2.4, 1.1, 0.3],
    [0.9, 3.0, -1.2],
  ] as const) {
    const seat = new Mesh(
      bin.add(new CylinderGeometry(0.22, 0.24, 1.4, 8)),
      logMat,
    );
    seat.rotation.set(0, ry, Math.PI / 2);
    seat.position.set(x, 0.5, z);
    isle.add(seat);
  }

  // A sword in a stone by the fire.
  const sword = new Group();
  const blade = new Mesh(
    bin.add(new PlaneGeometry(0.12, 1.1)),
    standard(bin, p.steel, { emissive: p.steel, emissiveIntensity: 0.4 }),
  );
  blade.position.y = 0.75;
  const guard = new Mesh(
    bin.add(new PlaneGeometry(0.5, 0.08)),
    standard(bin, p.gold),
  );
  guard.position.y = 1.3;
  sword.add(blade, guard);
  const stoneMat = standard(bin, p.stone);
  const base = rock(bin, stoneMat, 0.42, 5);
  base.scale.y = 0.7;
  sword.add(base);
  sword.position.set(-3.2, 0.25, -0.6);
  sword.rotation.y = 0.5;
  isle.add(sword);
  const swordGlint = glowSprite(bin, glowTexture(bin, 3), p.star, 0.9, 0.7);
  swordGlint.position.set(-3.2, 1.6, -0.6);
  isle.add(swordGlint);

  // Firs round the back of the island.
  const random = seededRandom(31);
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (1.05 + random() * 0.9);
    const r = 4.6 + random() * 1.7;
    const tree = pine(bin, p, 1.6 + random() * 1.6, i + 2);
    tree.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
    isle.add(tree);
  }

  // The spring and the waterfall pouring off the near-left edge.
  const fallAngle = 0.35;
  const pivot = new Group();
  pivot.rotation.y = -fallAngle;
  isle.add(pivot);
  const lip = new Vector3(
    Math.cos(fallAngle) * 6.75,
    0.25,
    Math.sin(fallAngle) * 6.75,
  );
  const fallMat = waterfallMaterial(bin, p);
  const fallGeo = bin.add(new PlaneGeometry(1.4, 16, 1, 32));
  const fp = fallGeo.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < fp.count; i++) {
    const t = (8 - fp.getY(i)) / 16; // 0 at the lip, 1 at the bottom
    fp.setZ(i, Math.pow(t, 0.5) * 1.8);
    fp.setX(i, fp.getX(i) * (1 + t * 1.8));
  }
  fallGeo.translate(0, -8, 0);
  fallGeo.rotateY(Math.PI / 2);
  const fall = new Mesh(fallGeo, fallMat);
  fall.position.set(6.75, 0.25, 0);
  fall.renderOrder = 4;
  pivot.add(fall);
  const stream = new Mesh(bin.add(new PlaneGeometry(4.2, 0.7, 8, 1)), fallMat);
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(4.7, 0.36, 0);
  pivot.add(stream);
  const mist = motes(bin, {
    count: lite ? 30 : 60,
    seed: 4,
    color: p.star,
    altColor: p["star-blue"],
    origin: new Vector3(lip.x * 1.25, -13, lip.z * 1.25),
    spread: new Vector3(2, 1, 2),
    rise: 0.6,
    life: 5,
    size: 4,
    wander: 0.8,
  });
  isle.add(mist.object);

  /* ---- the castle on its own island ---- */
  const far = new Group();
  far.position.set(9, 2.5, -34);
  far.add(island(bin, p, 4.2, 7, 77));
  const keep = castle(bin, p, p["hill-1"], 9);
  keep.scale.setScalar(1.25);
  keep.position.y = 0.2;
  far.add(keep);
  const farGlow = glowSprite(bin, glowTexture(bin, 2), p.window, 9, 0.18);
  farGlow.position.y = 2.6;
  far.add(farGlow);
  world.add(far);

  /* ---- stones that circle the island ---- */
  const orbiters: {
    mesh: Mesh;
    r: number;
    a: number;
    y: number;
    speed: number;
  }[] = [];
  const shade = standard(bin, p["stone-shade"]);
  for (let i = 0; i < (lite ? 7 : 12); i++) {
    const mesh = rock(
      bin,
      i % 2 ? stoneMat : shade,
      0.18 + random() * 0.3,
      40 + i,
    );
    orbiters.push({
      mesh,
      r: 9 + random() * 6,
      a: random() * Math.PI * 2,
      y: -4 + random() * 7,
      speed: 0.03 + random() * 0.05,
    });
    world.add(mesh);
  }

  /* ---- the sea of cloud below ---- */
  const puff = puffTexture(bin, 8);
  const clouds: { sprite: Sprite; speed: number }[] = [];
  const tones = [p["cloud-deep"], p.cloud, p["cloud-light"], p.cloud];
  for (let i = 0; i < (lite ? 26 : 48); i++) {
    const material = bin.add(
      new SpriteMaterial({
        map: puff,
        color: tones[i % tones.length]!,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    const sprite = new Sprite(material);
    const s = 14 + random() * 22;
    sprite.scale.set(s, s * 0.55, 1);
    sprite.position.set(
      -70 + random() * 140,
      -15 - random() * 5,
      -70 + random() * 95,
    );
    clouds.push({ sprite, speed: 0.2 + random() * 0.4 });
    scene.add(sprite);
  }
  // Pink light along the cloud tops, as in the drawn scenes.
  for (let i = 0; i < (lite ? 8 : 14); i++) {
    const g = glowSprite(
      bin,
      puff,
      p["cloud-edge-dim"],
      18 + random() * 14,
      0.35,
    );
    g.scale.y *= 0.4;
    g.position.set(-60 + random() * 120, -13.5, -60 + random() * 80);
    clouds.push({ sprite: g, speed: 0.3 });
    scene.add(g);
  }

  const look = new Vector3(1.5, -2.2, -2);
  let layout: Layout = { width: 1, height: 1, aspect: 1, wide: false };

  const concept: ConceptScene = {
    scene,
    camera,
    bloom: { strength: 0.7, radius: 0.5, threshold: 0.72 },
    posterTime: 7,
    resize(next) {
      layout = next;
      frameCamera(camera, layout, {
        fov: layout.wide ? 40 : 44,
        tallFov: 58,
        shift: 0.17,
      });
    },
    update({ time, dt, pointer }) {
      const azimuth = 0.32 + Math.sin(time * 0.045) * 0.22 + pointer.x * 0.28;
      const height = 5.2 + Math.sin(time * 0.07) * 0.6 + pointer.y * 1.6;
      const distance = layout.aspect < 1 ? 34 : 28;
      camera.position.set(
        Math.sin(azimuth) * distance,
        height,
        Math.cos(azimuth) * distance,
      );
      camera.lookAt(look);

      isle.position.y = Math.sin(time * 0.45) * 0.25;
      isle.rotation.z = Math.sin(time * 0.3) * 0.012;
      far.position.y = 2.5 + Math.sin(time * 0.35 + 1) * 0.4;
      for (const o of orbiters) {
        const a = o.a + time * o.speed;
        o.mesh.position.set(
          Math.cos(a) * o.r,
          o.y + Math.sin(time * 0.6 + o.a) * 0.4,
          Math.sin(a) * o.r,
        );
        o.mesh.rotation.set(time * 0.2 + o.a, time * 0.13, 0);
      }
      for (const c of clouds) {
        c.sprite.position.x += c.speed * dt;
        if (c.sprite.position.x > 75) c.sprite.position.x -= 150;
      }
      fire.update(time, dt, camera);
      mist.update(time, dt, camera);
      fallMat.uniforms.uTime!.value = time;
      stars.update(time);
      wavePennants(tent, time);
      wavePennants(keep, time + 1);
      swordGlint.material.opacity =
        0.35 + 0.35 * Math.max(0, Math.sin(time * 0.8));
    },
    dispose() {
      bin.addTree(scene);
      bin.dispose();
    },
  };
  return concept;
};

/**
 * A floating island: a grassy top that falls away into a long jagged root of
 * rock, flat shaded, coloured by height (and by firelight near the camp).
 */
function island(
  bin: Bin,
  p: Palette,
  radius: number,
  depth: number,
  seed: number,
): Mesh {
  const profile = [
    [0.01, -depth],
    [0.12, -depth * 0.8],
    [0.3, -depth * 0.55],
    [0.52, -depth * 0.34],
    [0.75, -depth * 0.16],
    [0.92, -depth * 0.06],
    [1.0, -0.15],
    [0.97, 0.12],
    [0.75, 0.28],
    [0.4, 0.32],
    [0.01, 0.3],
  ].map(([r, y]) => new Vector2(r! * radius, y!));
  const geometry = new LatheGeometry(profile, 44).toNonIndexed();
  const pos = geometry.getAttribute("position") as BufferAttribute;
  const random = seededRandom(seed);
  const offsets = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    let n = offsets.get(key);
    if (n === undefined) {
      n = random();
      offsets.set(key, n);
    }
    const a = Math.atan2(z, x);
    if (y < -0.1) {
      const k =
        1 + (fbm2(a * 2.2 + seed, y * 0.35) - 0.5) * 0.7 + (n - 0.5) * 0.18;
      pos.setXYZ(i, x * k, y + (n - 0.5) * 0.9, z * k);
    } else {
      const hill = fbm2(x * 0.22 + seed, z * 0.22) * 0.55;
      pos.setY(i, y + hill * (1 - Math.hypot(x, z) / (radius * 1.1)));
    }
  }
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  const fireAt = new Vector2(-0.6, 1.4);
  for (let f = 0; f < pos.count / 3; f++) {
    let cy = 0;
    let cx = 0;
    let cz = 0;
    for (let v = 0; v < 3; v++) {
      cx += pos.getX(f * 3 + v) / 3;
      cy += pos.getY(f * 3 + v) / 3;
      cz += pos.getZ(f * 3 + v) / 3;
    }
    if (cy > -0.05) {
      const d = Math.hypot(cx - fireAt.x, cz - fireAt.y) / radius;
      if (d < 0.18) c.copy(p["ground-lit-2"]);
      else if (d < 0.42)
        c.copy(p["ground-lit-1"]).lerp(p["ground-lit-2"], 0.25);
      else
        c.copy(p.ground)
          .lerp(p["hill-2"], 0.35)
          .lerp(p["ground-lit-1"], Math.max(0, 0.7 - d));
      c.multiplyScalar(0.92 + fbm2(cx * 0.8, cz * 0.8) * 0.2);
    } else {
      const band = fbm2(cy * 0.9 + seed, Math.atan2(cz, cx) * 1.5);
      c.copy(band > 0.55 ? p.stone : p["stone-shade"]);
      c.lerp(p["hill-4"], Math.min(1, -cy / depth) * 0.75);
      if (cy > -0.9) c.lerp(p["ground-dark"], 0.5);
    }
    for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (f * 3 + v) * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new Mesh(
    bin.add(geometry),
    standard(bin, new Color(1, 1, 1), { vertexColors: true }),
  );
}

type Palette = Parameters<CreateConcept>[0]["palette"];
