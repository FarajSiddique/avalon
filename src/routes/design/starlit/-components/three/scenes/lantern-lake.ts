import {
  AdditiveBlending,
  type BufferAttribute,
  type Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type Sprite,
  Vector3,
} from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  Bin,
  GLSL_NOISE,
  fbm2,
  frameCamera,
  glowSprite,
  glowTexture,
  moonSprite,
  motes,
  seededRandom,
  skyDome,
  starField,
} from "../kit";
import type { Palette } from "../palette";
import {
  campfire,
  castle,
  pavilion,
  pine,
  rock,
  standard,
  wavePennants,
} from "../props";
import type { ConceptScene, CreateConcept, Layout } from "../types";

/**
 * Lantern Lake: a still lake that mirrors everything, a castle lit up on the
 * far shore, an aurora over the mountains, and paper lanterns rising off the
 * water into the night. The camp waits on a jetty in the foreground.
 */
export const createLanternLake: CreateConcept = ({ palette: p, lite }) => {
  const bin = new Bin();
  const scene = new Scene();
  scene.fog = new Fog(p["sky-low"], 140, 520);
  const camera = new PerspectiveCamera(42, 1, 0.1, 1500);
  const random = seededRandom(17);

  const moonDir = new Vector3(0.3, 0.3, -1).normalize();
  scene.add(skyDome(bin, p, { glowDir: moonDir, glowColor: p["cloud-deep"] }));
  const stars = starField(bin, p, {
    count: lite ? 900 : 2000,
    seed: 23,
    minY: 0.05,
  });
  scene.add(stars.object);
  const moon = moonSprite(bin, p, { size: 95 });
  moon.material.color.setScalar(0.72);
  moon.position.copy(moonDir.clone().multiplyScalar(460));
  scene.add(moon);

  scene.add(new HemisphereLight(p["hill-0"], p["cloud-deep"], 1.3));
  const moonLight = new DirectionalLight(p.moon, 1.1);
  moonLight.position.copy(moonDir.clone().multiplyScalar(60));
  scene.add(moonLight);

  /* ---- the aurora ---- */
  const aurora = auroraCurtains(bin, p);
  scene.add(aurora.object);

  /* ---- far shore: mountains, hills, trees and the castle ---- */
  for (const [depth, tone, height, seed] of [
    [-300, p["hill-0"], 52, 2],
    [-220, p["hill-1"], 34, 5],
    [-150, p["hill-2"], 18, 9],
  ] as const) {
    scene.add(ridge(bin, tone, depth, height, seed));
  }
  const shore = new Group();
  scene.add(shore);
  const hill = rock(bin, standard(bin, p["hill-3"]), 18, 77);
  hill.scale.set(1.6, 0.42, 0.9);
  hill.position.set(14, -2.2, -78);
  shore.add(hill);
  const keep = castle(bin, p, p["hill-2"], 12);
  keep.scale.setScalar(3.4);
  keep.position.set(14, 4.6, -80);
  shore.add(keep);
  const castleGlow = glowSprite(bin, glowTexture(bin, 1.6), p.window, 40, 0.16);
  castleGlow.position.set(14, 12, -78);
  shore.add(castleGlow);
  for (let i = 0; i < (lite ? 40 : 80); i++) {
    const x = -120 + random() * 240;
    if (Math.abs(x - 14) < 22) continue;
    const tree = pine(bin, p, 5 + random() * 7, i + 40);
    tree.position.set(x, -0.5, -70 - random() * 30);
    shore.add(tree);
  }

  /* ---- the mirror ---- */
  const water = new Reflector(bin.add(new PlaneGeometry(600, 600)), {
    textureWidth: lite ? 512 : 1024,
    textureHeight: lite ? 512 : 1024,
    clipBias: 0.003,
    multisample: lite ? 0 : 4,
    shader: waterShader(p, moonDir),
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const waterMat = water.material as ShaderMaterial;
  bin.add(water);

  /* ---- lanterns ---- */
  const lanternGeo = bin.add(
    new CylinderGeometry(0.34, 0.24, 0.62, 8, 1, true),
  );
  const lanternMats = [p.window, p.window, p["fire-mid"], p["fire-outer"]].map(
    (c) =>
      bin.add(
        new MeshBasicMaterial({
          color: c.clone().multiplyScalar(2.4),
          side: DoubleSide,
        }),
      ),
  );
  const halo = glowTexture(bin, 2.4);
  type Lantern = {
    body: Mesh;
    glow: Sprite;
    x: number;
    z: number;
    y: number;
    speed: number;
    phase: number;
    floating: boolean;
  };
  const lanterns: Lantern[] = [];
  const count = lite ? 34 : 70;
  for (let i = 0; i < count; i++) {
    const floating = i < count * 0.3;
    const body = new Mesh(lanternGeo, lanternMats[i % lanternMats.length]!);
    const glow = glowSprite(bin, halo, p["fire-glow"], 2.2, 0.32);
    const lantern: Lantern = {
      body,
      glow,
      x: -36 + random() * 72,
      z: floating ? -14 - random() * 56 : -26 - random() * 64,
      y: floating ? 0.3 : random() * 50,
      speed: floating ? 0.4 + random() * 0.5 : 0.45 + random() * 0.6,
      phase: random() * 10,
      floating,
    };
    lanterns.push(lantern);
    scene.add(body, glow);
  }

  /* ---- the foreground: a low bank with the camp ---- */
  const near = new Group();
  scene.add(near);
  const bank = rock(bin, standard(bin, p.ground), 7, 3);
  bank.scale.set(1.7, 0.25, 1.1);
  bank.position.set(9.5, -1.2, -3);
  near.add(bank);
  const fire = campfire(bin, p, {
    scale: 1.2,
    embers: lite ? 30 : 60,
    seed: 3,
  });
  fire.object.position.set(7, 0.5, -2);
  near.add(fire.object);
  const tent = pavilion(bin, p, 1.1);
  tent.position.set(11.6, 0.4, -6.5);
  tent.rotation.y = -0.5;
  near.add(tent);
  for (let i = 0; i < 5; i++) {
    const tree = pine(bin, p, 6 + random() * 5, 90 + i);
    tree.position.set(17 + random() * 9, 0, -24 + random() * 8);
    near.add(tree);
  }
  near.add(reeds(bin, p, 12));
  const flies = motes(bin, {
    count: lite ? 24 : 50,
    seed: 61,
    color: p["ground-lit-3"],
    altColor: p.window,
    origin: new Vector3(6, 1.2, 0),
    spread: new Vector3(6, 1, 3),
    rise: 0,
    life: 6,
    size: 1.4,
    wander: 1.2,
  });
  near.add(flies.object);

  let layout: Layout = { width: 1, height: 1, aspect: 1, wide: false };
  const look = new Vector3();

  const concept: ConceptScene = {
    scene,
    camera,
    bloom: { strength: 0.8, radius: 0.5, threshold: 0.74 },
    posterTime: 30,
    resize(next) {
      layout = next;
      frameCamera(camera, layout, { fov: 40, tallFov: 56, shift: 0.15 });
    },
    update({ time, dt, pointer }) {
      const sway = Math.sin(time * 0.05);
      camera.position.set(
        2 + sway * 3 + pointer.x * 4,
        2.6 + pointer.y * 1.1 + Math.sin(time * 0.11) * 0.25,
        layout.aspect < 1 ? 26 : 20,
      );
      look.set(10 + pointer.x * 2, 4.5 + pointer.y * 1.2, -60);
      camera.lookAt(look);

      for (const l of lanterns) {
        if (l.floating) {
          l.z -= l.speed * dt * 0.6;
          if (l.z < -70) l.z = -14;
          l.y = 0.32 + Math.sin(time * 1.3 + l.phase) * 0.05;
        } else {
          l.y += l.speed * dt;
          if (l.y > 60) {
            l.y = 0.3;
            l.x = -36 + ((l.phase * 97) % 72);
          }
        }
        const drift = l.floating ? 0 : Math.sin(time * 0.3 + l.phase) * 0.8;
        l.body.position.set(l.x + drift, l.y + 0.3, l.z);
        l.body.rotation.z = Math.sin(time * 0.8 + l.phase) * 0.06;
        l.glow.position.copy(l.body.position);
        const fade = l.floating ? 1 : Math.min(1, (62 - l.y) / 18);
        l.glow.material.opacity = 0.32 * fade;
        l.body.visible = fade > 0.05;
      }
      waterMat.uniforms.uTime!.value = time;
      aurora.update(time);
      stars.update(time);
      fire.update(time, dt, camera);
      flies.update(time, dt, camera);
      wavePennants(tent, time);
      wavePennants(keep, time + 2);
      castleGlow.material.opacity = 0.14 + Math.sin(time * 0.5) * 0.02;
    },
    dispose() {
      bin.addTree(scene);
      bin.dispose();
    },
  };
  return concept;
};

/** The mirror: the reflection, rippled, tinted deep, with moon glitter. */
function waterShader(p: Palette, moonDir: Vector3) {
  return {
    name: "LanternLakeWater",
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uDeep: { value: p["hill-4"].clone() },
      uShallow: { value: p["sky-horizon"].clone() },
      uMoon: { value: p.moon.clone() },
      uMoonDir: { value: moonDir.clone() },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform vec3 uDeep, uShallow, uMoon, uMoonDir;
      varying vec4 vUv;
      varying vec3 vWorld;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vWorld.xz;
        float n1 = fbm(p * vec2(0.08, 0.35) + vec2(0.0, uTime * 0.25));
        float n2 = fbm(p * vec2(0.11, 0.42) - vec2(uTime * 0.18, 0.0));
        vec2 ripple = vec2(n1 - 0.5, n2 - 0.5);
        vec4 uv = vUv;
        uv.xy += ripple * 0.9 * (0.4 + uv.w * 0.012);
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        vec3 view = normalize(vWorld - cameraPosition);
        float fres = pow(1.0 - max(dot(-view, vec3(0.0, 1.0, 0.0)), 0.0), 2.5);
        vec3 c = mix(uDeep, refl * 0.92, 0.35 + 0.6 * fres);
        c = mix(c, uShallow, 0.08);
        // Moon glitter: where the ripples tilt the surface towards the moon.
        vec3 nrm = normalize(vec3(ripple.x * 0.9, 1.0, ripple.y * 0.9));
        vec3 r = reflect(view, nrm);
        float spec = pow(max(dot(r, uMoonDir), 0.0), 220.0);
        float sparkle = step(0.6, vnoise(p * 2.6 + uTime * 0.7));
        c += uMoon * spec * (0.2 + sparkle * 0.8);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  };
}

/** Curtains of aurora over the far mountains. */
function auroraCurtains(bin: Bin, p: Palette) {
  const group = new Group();
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uA: { value: p["ground-lit-3"].clone() },
        uB: { value: p["star-blue"].clone() },
        uC: { value: p["cloud-edge"].clone() },
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
        uniform vec3 uA, uB, uC;
        varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          float x = vUv.x;
          float y = vUv.y;
          float rays = fbm(vec2(x * 22.0, uTime * 0.12)) ;
          rays = pow(rays, 2.2) * 2.4;
          float wave = fbm(vec2(x * 3.0 - uTime * 0.03, uTime * 0.05));
          float curtain = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.35, 1.0, y));
          float edge = smoothstep(0.35, 0.75, wave);
          vec3 c = mix(uA, uB, smoothstep(0.1, 0.7, y));
          c = mix(c, uC, smoothstep(0.55, 1.0, y) * 0.8);
          float a = curtain * rays * edge * smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.88, x);
          gl_FragColor = vec4(c * a * 0.9, 1.0);
        }
      `,
    }),
  );
  for (const [z, x, w, h, bend, tilt] of [
    [-330, 40, 520, 150, 60, 0.18],
    [-300, -120, 380, 110, 40, -0.12],
  ] as const) {
    const geometry = bin.add(new PlaneGeometry(w, h, 96, 1));
    const pos = geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / w;
      pos.setZ(i, Math.sin(u * Math.PI * 2.2) * bend);
    }
    geometry.translate(0, h / 2, 0);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, 30, z);
    mesh.rotation.z = tilt * 0.2;
    mesh.rotation.x = -0.15;
    mesh.renderOrder = -5;
    group.add(mesh);
  }
  return {
    object: group,
    update(time: number) {
      material.uniforms.uTime!.value = time;
    },
  };
}

/** A long jagged mountain silhouette across the far side of the lake. */
function ridge(
  bin: Bin,
  tone: Color,
  z: number,
  height: number,
  seed: number,
): Mesh {
  const width = 900;
  const geometry = new PlaneGeometry(width, height * 2, 120, 1);
  const pos = geometry.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      const x = pos.getX(i);
      const peak =
        fbm2(x * 0.012 + seed, seed) * 1.3 +
        Math.abs(Math.sin(x * 0.02 + seed)) * 0.3;
      pos.setY(i, height * peak);
    } else pos.setY(i, -4);
  }
  geometry.computeVertexNormals();
  const material = bin.add(new MeshBasicMaterial({ color: tone, fog: true }));
  const mesh = new Mesh(bin.add(geometry), material as Material);
  mesh.position.set(0, 0, z);
  return mesh;
}

/** Cattails and reeds along the near edge of the water. */
function reeds(bin: Bin, p: Palette, seed: number): Group {
  const group = new Group();
  const random = seededRandom(seed);
  const stem = standard(bin, p["ground-dark"]);
  const head = standard(bin, p.log);
  const stemGeo = bin.add(new CylinderGeometry(0.025, 0.04, 1, 4));
  const headGeo = bin.add(new CylinderGeometry(0.07, 0.07, 0.36, 6));
  for (let i = 0; i < 40; i++) {
    const h = 0.6 + random() * 1.1;
    const s = new Mesh(stemGeo, stem);
    s.scale.y = h;
    const x = 1 + random() * 6;
    const z = 0 + random() * 4;
    s.position.set(x, h / 2 - 0.2, z);
    s.rotation.z = (random() - 0.5) * 0.2;
    group.add(s);
    if (random() > 0.6) {
      const c = new Mesh(headGeo, head);
      c.position.set(x, h - 0.1, z);
      group.add(c);
    }
  }
  return group;
}
