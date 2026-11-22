import {
  CanvasTexture,
  type Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TorusGeometry,
  Vector2,
} from "three";
import { CLOAK_TOKENS, type Avatar, type Emblem } from "@/design/avatar";
import { sparklePath } from "../art/seeded";
import { context2d, fillPath, isColorMaterial, isMesh } from "./guards";
import { Bin } from "./kit";
import { isArtToken, type Palette } from "./palette";
import { standard } from "./props";

/** Emblem pictures, drawn once per scene and shared by every figure. */
export class EmblemTextures {
  private cache = new Map<Emblem, Texture>();
  constructor(private bin: Bin) {}
  get(emblem: Emblem): Texture {
    let texture = this.cache.get(emblem);

    if (!texture) {
      texture = this.bin.add(new CanvasTexture(drawEmblem(emblem)));
      texture.colorSpace = SRGBColorSpace;
      this.cache.set(emblem, texture);
    }

    return texture;
  }
}

function drawEmblem(emblem: Emblem): HTMLCanvasElement {
  const size = 96;
  const canvas = document.createElement("canvas");

  canvas.width = canvas.height = size;
  const ctx = context2d(canvas);

  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = ctx.strokeStyle = "white";
  ctx.lineWidth = 7;
  ctx.lineCap = ctx.lineJoin = "round";

  switch (emblem) {
    case "star":
      fillPath(ctx, new Path2D(sparklePath(40)));
      break;
    case "moon":
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(16, -10, 30, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "sun":
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
        ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
        ctx.stroke();
      }

      break;
    case "leaf":
      ctx.rotate(-Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 34);
      ctx.stroke();
      break;
    case "key":
      ctx.beginPath();
      ctx.arc(0, -20, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 40);
      ctx.moveTo(0, 26);
      ctx.lineTo(14, 26);
      ctx.moveTo(0, 38);
      ctx.lineTo(12, 38);
      ctx.stroke();
      break;
  }

  return canvas;
}

export interface Figure {
  group: Group;
  /** Grey the figure out while its player is away. */
  setAway(away: boolean): void;
  /** Light the figure from within (the team), 0 off to 1 full. */
  setGlow(color: Color, level: number): void;
  dispose(): void;
}

/**
 * A little low-poly figure about 1.5 units tall, facing +z, feet at 0: a
 * bell of a cloak, a pale round face, small hands, headwear and an emblem.
 */
export function figure(
  p: Palette,
  avatar: Avatar,
  emblems: EmblemTextures,
): Figure {
  const bin = new Bin();
  const group = new Group();
  const cloakToken = CLOAK_TOKENS[avatar.cloak].slice(6);

  if (!isArtToken(cloakToken)) {
    throw new Error(`Unknown cloak token ${cloakToken}`);
  }

  const cloakColor = p[cloakToken].clone();
  const cloak = standard(bin, cloakColor);
  const cloakDeep = standard(bin, cloakColor.clone().multiplyScalar(0.72));
  const skin = standard(bin, p.tent, { flat: false, roughness: 0.8 });
  const ink = standard(bin, p.outline);

  const body = new Mesh(
    bin.add(
      new LatheGeometry(
        [
          [0.01, 0],
          [0.46, 0],
          [0.45, 0.12],
          [0.38, 0.5],
          [0.3, 0.8],
          [0.24, 0.98],
          [0.14, 1.08],
          [0.01, 1.1],
        ].map(([x, y]) => new Vector2(x, y)),
        14,
      ),
    ),
    cloak,
  );

  group.add(body);
  const collar = new Mesh(
    bin.add(new TorusGeometry(0.17, 0.06, 6, 14)),
    cloakDeep,
  );

  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.08;
  group.add(collar);

  const head = new Mesh(bin.add(new IcosahedronGeometry(0.22, 2)), skin);

  head.position.y = 1.32;
  group.add(head);
  const eye = bin.add(new SphereGeometry(0.028, 8, 6));

  for (const x of [-0.075, 0.075]) {
    const e = new Mesh(eye, ink);

    e.position.set(x, 1.33, 0.2);
    group.add(e);
  }

  const hand = bin.add(new SphereGeometry(0.075, 10, 8));

  for (const x of [-0.17, 0.17]) {
    const h = new Mesh(hand, skin);

    h.position.set(x, 0.66, 0.36);
    group.add(h);
  }

  // The emblem, glowing faintly on the chest.
  const emblemMat = bin.add(
    new MeshBasicMaterial({
      map: emblems.get(avatar.emblem),
      color: p.gold.clone().multiplyScalar(1.5),
      transparent: true,
      depthWrite: false,
    }),
  );
  const emblem = new Mesh(bin.add(new PlaneGeometry(0.24, 0.24)), emblemMat);

  emblem.position.set(0, 0.8, 0.325);
  emblem.rotation.x = -0.22;
  group.add(emblem);

  group.add(headwear(bin, p, avatar, cloakColor));

  // Remember the colours so "away" can grey them and back.
  const tinted: Array<{
    material: MeshStandardMaterial | MeshBasicMaterial;
    color: Color;
  }> = [];

  group.traverse((node) => {
    if (!isMesh(node) || Array.isArray(node.material)) {
      return;
    }

    const m = node.material;

    if (isColorMaterial(m) && !tinted.some((t) => t.material === m)) {
      tinted.push({ material: m, color: m.color.clone() });
    }
  });
  const grey = p["stone-shade"];
  // The lit materials and their own glow, so the team glow can mix back.
  const lit: Array<{
    material: MeshStandardMaterial;
    emissive: Color;
    k: number;
  }> = [];

  for (const { material } of tinted) {
    if ("emissive" in material) {
      lit.push({
        material,
        emissive: material.emissive.clone(),
        k: material.emissiveIntensity,
      });
    }
  }

  let glowLevel = -1;

  return {
    group,
    setAway(away) {
      for (const { material, color } of tinted) {
        material.color.copy(color);

        if (away) {
          material.color.lerp(grey, 0.65);
        }

        material.transparent = away || material === emblemMat;
        material.opacity = away ? 0.55 : 1;
      }
    },
    setGlow(color, level) {
      if (Math.abs(level - glowLevel) < 0.002) {
        return;
      }

      glowLevel = level;

      for (const { material, emissive, k } of lit) {
        material.emissive.copy(emissive).multiplyScalar(k).lerp(color, level);
        material.emissiveIntensity = 1;
      }
    },
    dispose() {
      bin.dispose();
    },
  };
}

function headwear(
  bin: Bin,
  p: Palette,
  avatar: Avatar,
  cloakColor: Color,
): Group {
  const g = new Group();
  const y = 1.32;

  switch (avatar.headwear) {
    case "hood": {
      const mat = standard(bin, cloakColor.clone().multiplyScalar(0.82));

      mat.side = DoubleSide;
      const hood = new Mesh(
        bin.add(
          new SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
        ),
        mat,
      );

      hood.position.y = y;
      hood.rotation.x = -0.5;
      g.add(hood);
      const tip = new Mesh(bin.add(new ConeGeometry(0.09, 0.22, 8)), mat);

      tip.position.set(0, y + 0.18, -0.2);
      tip.rotation.x = -1.1;
      g.add(tip);
      break;
    }

    case "helm": {
      const steel = standard(bin, p.steel, { roughness: 0.45 });
      const band = new Mesh(
        bin.add(new CylinderGeometry(0.235, 0.24, 0.2, 14)),
        steel,
      );

      band.position.y = y + 0.06;
      g.add(band);
      const dome = new Mesh(
        bin.add(
          new SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        ),
        steel,
      );

      dome.position.y = y + 0.16;
      g.add(dome);
      const nasal = new Mesh(
        bin.add(new CylinderGeometry(0.02, 0.025, 0.18, 6)),
        steel,
      );

      nasal.position.set(0, y + 0.02, 0.235);
      g.add(nasal);
      const crest = new Mesh(
        bin.add(new ConeGeometry(0.03, 0.12, 6)),
        standard(bin, p.gold),
      );

      crest.position.y = y + 0.44;
      g.add(crest);
      break;
    }

    case "circlet": {
      const gold = standard(bin, p.gold, {
        roughness: 0.4,
        emissive: p.gold,
        emissiveIntensity: 0.25,
      });
      const ring = new Mesh(
        bin.add(new TorusGeometry(0.2, 0.024, 6, 24)),
        gold,
      );

      ring.rotation.x = Math.PI / 2 - 0.12;
      ring.position.y = y + 0.1;
      g.add(ring);
      const gem = new Mesh(
        bin.add(new IcosahedronGeometry(0.04, 0)),
        bin.add(
          new MeshBasicMaterial({ color: p.window.clone().multiplyScalar(2) }),
        ),
      );

      gem.position.set(0, y + 0.13, 0.205);
      g.add(gem);
      const hair = new Mesh(
        bin.add(
          new SphereGeometry(0.225, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
        ),
        standard(bin, p["log-end"]),
      );

      hair.position.y = y + 0.01;
      hair.rotation.x = -0.25;
      g.add(hair);
      break;
    }

    case "cap": {
      const felt = standard(bin, cloakColor.clone().multiplyScalar(0.7));
      const brim = new Mesh(
        bin.add(new CylinderGeometry(0.29, 0.29, 0.035, 16)),
        felt,
      );

      brim.position.y = y + 0.14;
      brim.rotation.x = -0.12;
      g.add(brim);
      const crown = new Mesh(
        bin.add(new SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
        felt,
      );

      crown.position.y = y + 0.15;
      crown.scale.y = 0.9;
      g.add(crown);
      const featherMat = standard(bin, p["cloud-edge"], { flat: false });

      featherMat.side = DoubleSide;
      const feather = new Mesh(
        bin.add(new PlaneGeometry(0.09, 0.46)),
        featherMat,
      );

      feather.position.set(0.17, y + 0.36, -0.08);
      feather.rotation.set(-0.5, 0.4, -0.45);
      g.add(feather);
      break;
    }

    case "bare": {
      const hair = new Mesh(
        bin.add(
          new SphereGeometry(0.228, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
        ),
        standard(bin, p.trunk),
      );

      hair.position.y = y + 0.01;
      hair.rotation.x = -0.3;
      g.add(hair);
      break;
    }
  }

  return g;
}
