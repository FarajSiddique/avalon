import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import {
  Bin,
  frameCamera,
  glowSprite,
  glowTexture,
  motes,
  puffTexture,
  seededRandom,
  skyDome,
  starField,
} from "../kit";
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
import type {
  ConceptScene,
  CreateConcept,
  Layout,
  Pointer,
  ShotMove,
} from "../types";
import { TablePlayView } from "./table-play";
import {
  copyPose,
  makePose,
  mixPose,
  type Pose,
  shotPose,
} from "./table-shots";
import {
  clearing,
  constellations,
  moonbeam,
  runeMap,
  shootingStar,
} from "./star-table-world";

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
  displayFont,
}) => {
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
  const sky = constellations(bin, p, lite, SEATS);

  scene.add(sky.object);
  const shooter = shootingStar(bin, p);

  scene.add(shooter.object);

  scene.add(new HemisphereLight(p["hill-0"], p["ground-dark"], 1.6));
  const moonLight = new DirectionalLight(p.moon, 1.4);

  moonLight.position.set(-10, 40, -6);
  scene.add(moonLight);
  // A soft light from the viewer's side in the lobby, so the figures read.
  const front = new DirectionalLight(p.moon, 0);

  front.position.set(0, 14, 18);
  scene.add(front);

  /* ---- the clearing ---- */
  scene.add(clearing(bin, p));

  for (let i = 0; i < (lite ? 50 : 90); i++) {
    const a = random() * Math.PI * 2;

    // Leave a gap towards the castle.
    if (Math.abs(a - Math.PI * 1.5) < 0.22) {
      continue;
    }

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
  const seats: Array<{
    rune: Mesh;
    glow: Sprite;
    spoke: Mesh;
    slab: Mesh;
    /** Stone height on the landing, and lower in the lobby. */
    tall: number;
    low: number;
    phase: number;
  }> = [];
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
  const mist: Array<{ sprite: Sprite; a: number; r: number; speed: number }> =
    [];

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

  // The game: the leader, the team and the quest cards, acted out.
  const play = new TablePlayView(p, bin, scene, seating, displayFont);
  const fireScale = fire.object.scale.x;

  let layout: Layout = { width: 1, height: 1, aspect: 1, wide: false };
  const look = new Vector3();
  const heroLook = new Vector3(0, 6.2, 0);
  const lobbyLook = new Vector3(0, 1.5, -0.7);
  // Which turn of the landing orbit the flight starts from, fixed while
  // flying so the camera takes the short way round and never jumps.
  let turns = 0;
  // The framing past the landing: the lobby's, or a game shot, and the
  // move between them (from where the camera was when the move began).
  const framed = makePose();
  const target = makePose();
  const moveFrom = makePose();
  let moveId = -1;
  let shotNow: ShotMove = { to: null, progress: 1, id: 0 };
  let blendNow = 0;
  const corners: Array<Vector3> = [];
  const others = new Map<string, Vector3>();

  /** The lobby's framing: the whole table from above, swaying gently. */
  const lobbyPose = (out: Pose, time: number, pointer: Pointer): Pose => {
    const tall = layout.aspect < 1.4;

    out.az = Math.sin(time * 0.06) * 0.14 + pointer.x * 0.3;
    out.dist = tall ? 15.5 : 14.5;
    out.height = (tall ? 15 : 11.5) + pointer.y * 1.2;
    out.look.copy(lobbyLook);
    // Tighter on a phone so the figures read, wider beside a wide screen's
    // panels so the whole table fits.
    out.fov = layout.aspect >= 1.7 ? 38 : layout.width < 640 ? 40 : 46;
    out.tallFov = 52;

    return out;
  };

  /** Where the framing past the landing is now. */
  const placeFrame = (time: number, pointer: Pointer, shot: ShotMove) => {
    if (shot.to) {
      shotPose(target, shot.to, {
        layout,
        standing: seating.standing(),
        teamIds: play.teamIds(),
        youAz: play.youAzimuth(),
        cardCorners: play.cardCorners(corners),
        time,
        pointer,
      });
    } else {
      lobbyPose(target, time, pointer);
    }

    if (shot.id !== moveId) {
      // A new move starts where the camera is (the first one: a cut).
      if (moveId < 0) {
        copyPose(moveFrom, target);
      } else {
        copyPose(moveFrom, framed);
      }

      moveId = shot.id;
    }

    if (shot.progress >= 1) {
      copyPose(framed, target);
    } else {
      mixPose(framed, moveFrom, target, easeInOut(shot.progress));
    }
  };

  const concept: ConceptScene = {
    scene,
    camera,
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.7 },
    posterTime: 21,
    resize(next) {
      layout = next;
      frame(blendNow);
    },
    update({ time, dt, pointer, blend, flight, shot }) {
      const b = blend ?? 0;

      blendNow = b;

      if (shot) {
        shotNow = shot;
      }

      seating.update(dt, time);
      play.update(dt, time, camera);
      placeFrame(time, pointer, shotNow);
      frame(b);
      // The landing: a slow orbit, low and wide.
      const heroAz = -0.4 + time * 0.03 + pointer.x * 0.45;
      const heroDist = layout.aspect < 1 ? 24 : 20;
      const heroH = 6.5 + pointer.y * 1.8 + Math.sin(time * 0.08) * 0.5;

      if (b <= 0 || b >= 1) {
        turns = Math.round((heroAz - framed.az) / (Math.PI * 2));
      }

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
      const az = mix(fromAz, framed.az, b) + swing * bow;
      const distance = mix(heroDist, framed.dist, b) + reach * bow;
      const height = Math.max(2.4, mix(heroH, framed.height, b) + lift * bow);

      camera.position.set(
        Math.sin(az) * distance,
        height,
        Math.cos(az) * distance,
      );
      look.lerpVectors(heroLook, framed.look, b);

      if (path === "create") {
        look.y += 1.5 * bow;
      }

      camera.lookAt(look);

      front.intensity = 1.3 * b;
      // The fire burns low while the quest cards lie by it.
      fire.object.scale.setScalar(fireScale * (1 - 0.5 * play.calm()));

      // On the landing, runes light one by one round the table, hold, then
      // all dim together. In the lobby they show who is seated and ready.
      const cycle = (time % 16) / 16;
      const flare =
        path === "create"
          ? smooth(0.72, 0.86, flight!.progress) *
            (1 - smooth(0.86, 1, flight!.progress))
          : 0;
      const game = play.active();

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
        // In the game every seat is "ready": the spokes dim, so the leader
        // and the team stand out.
        (seat.spoke.material as ShaderMaterial).uniforms.uLevel!.value =
          level * (game ? 0.3 : 0.9);
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
      play.settle();
      shotNow = { ...shotNow, progress: 1 };
    },
    setPlay(next) {
      play.set(next);
    },
    pick(x, y) {
      camera.updateMatrixWorld();

      return play.pick(x, y, camera, layout);
    },
    anchors() {
      // Behind your seat, your own figure is the shoulder in the foreground:
      // its tag would float over the others, so it has none.
      const all = seating.anchors();
      const you = play.youId();

      if (shotNow.to !== "role" || !you || !all.has(you)) {
        return all;
      }

      others.clear();

      for (const [id, at] of all) {
        if (id !== you) {
          others.set(id, at);
        }
      }

      return others;
    },
    seated() {
      return seating.seated();
    },
    dispose() {
      play.dispose();
      seating.dispose();
      bin.addTree(scene);
      bin.dispose();
    },
  };

  /** Lens, from the landing's (0) to the lobby's or the game shot's (1). */
  function frame(b: number): void {
    frameCamera(camera, layout, {
      fov: mix(54, framed.fov, b),
      tallFov: mix(66, framed.tallFov, b),
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

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));

  return t * t * (3 - 2 * t);
}
