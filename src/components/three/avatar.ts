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
import { CLOAK_TOKENS, SKIN_TOKENS } from "@/client/avatar";
import type { Avatar, Body, Emblem } from "@/shared/avatar";
import { sparklePath } from "@/components/art/seeded";
import { context2d, fillPath, isColorMaterial, isMesh } from "./guards";
import { Bin } from "./kit";
import { isArtToken, type ArtToken, type Palette } from "./palette";
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

/** The palette entry for an `--art-*` token name. */
function artToken(token: string): ArtToken {
  const name = token.slice(6);

  if (!isArtToken(name)) {
    throw new Error(`Unknown art token ${token}`);
  }

  return name;
}

/** How each body is cut: the cloak's profile and where things sit on it. */
interface Build {
  /** The cloak's lathe profile, [radius, height] from hem to neck. */
  profile: ReadonlyArray<readonly [number, number]>;
  /** Side-to-side stretch of the cloak (shoulder breadth). */
  breadth: number;
  collar: number;
  /** How far forward the emblem and hands sit (clear of the cloak). */
  emblemZ: number;
  handX: number;
  handZ: number;
}

const BUILDS: Record<Body, Build> = {
  // Broad, square shoulders and a straight fall of cloak.
  male: {
    profile: [
      [0.01, 0],
      [0.42, 0],
      [0.41, 0.12],
      [0.36, 0.5],
      [0.3, 0.8],
      [0.3, 0.94],
      [0.17, 1.07],
      [0.01, 1.1],
    ],
    breadth: 1.14,
    collar: 0.17,
    emblemZ: 0.325,
    handX: 0.19,
    handZ: 0.36,
  },
  // Narrow shoulders, a cinched waist and a wide, flared hem.
  female: {
    profile: [
      [0.01, 0],
      [0.52, 0],
      [0.5, 0.05],
      [0.38, 0.26],
      [0.27, 0.56],
      [0.23, 0.72],
      [0.26, 0.84],
      [0.21, 0.97],
      [0.12, 1.07],
      [0.01, 1.1],
    ],
    breadth: 0.94,
    collar: 0.145,
    emblemZ: 0.29,
    handX: 0.15,
    handZ: 0.3,
  },
};

/**
 * A little low-poly figure about 1.5 units tall, facing +z, feet at 0: a
 * cloak cut for the body, a round face and hands in the chosen skin, headwear
 * and an emblem.
 */
export function figure(
  p: Palette,
  avatar: Avatar,
  emblems: EmblemTextures,
): Figure {
  const bin = new Bin();
  const group = new Group();
  const build = BUILDS[avatar.body];
  const cloakColor = p[artToken(CLOAK_TOKENS[avatar.cloak])].clone();
  const cloak = standard(bin, cloakColor);
  const cloakDeep = standard(bin, cloakColor.clone().multiplyScalar(0.72));
  const skinColor = p[artToken(SKIN_TOKENS[avatar.skin])].clone();
  // Dark skins glow a touch from within so they still read against the
  // night; light ones (luminance past 0.25, linear) get none.
  const luminance =
    0.2126 * skinColor.r + 0.7152 * skinColor.g + 0.0722 * skinColor.b;
  const lift = Math.max(0, 1 - luminance / 0.25) * 1.1;
  const skin = standard(bin, skinColor, {
    flat: false,
    roughness: 0.8,
    emissive: skinColor,
    emissiveIntensity: lift,
  });
  const ink = standard(bin, p.outline);

  const body = new Mesh(
    bin.add(
      new LatheGeometry(
        build.profile.map(([x, y]) => new Vector2(x, y)),
        14,
      ),
    ),
    cloak,
  );

  body.scale.x = build.breadth;
  group.add(body);
  const collar = new Mesh(
    bin.add(new TorusGeometry(build.collar, 0.06, 6, 14)),
    cloakDeep,
  );

  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.08;
  collar.scale.x = build.breadth;
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

  for (const x of [-build.handX, build.handX]) {
    const h = new Mesh(hand, skin);

    h.position.set(x, 0.66, build.handZ);
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

  emblem.position.set(0, 0.8, build.emblemZ);
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
  const long = avatar.body === "female";

  /** Long hair falling behind the shoulders, for the long-haired body. */
  const fall = (mat: MeshStandardMaterial): void => {
    if (!long) {
      return;
    }

    mat.side = DoubleSide;
    // The back half of a tapered tube, from the crown to below the shoulders.
    const hair = new Mesh(
      bin.add(
        new CylinderGeometry(
          0.2,
          0.27,
          0.56,
          12,
          1,
          true,
          Math.PI * 0.4,
          Math.PI * 1.2,
        ),
      ),
      mat,
    );

    hair.position.set(0, y - 0.19, -0.03);
    hair.rotation.x = 0.08;
    g.add(hair);
  };

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
      const hairMat = standard(bin, p["log-end"]);
      const hair = new Mesh(
        bin.add(
          new SphereGeometry(0.225, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
        ),
        hairMat,
      );

      hair.position.y = y + 0.01;
      hair.rotation.x = -0.25;
      g.add(hair);
      fall(hairMat);
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
      fall(standard(bin, p.trunk));
      break;
    }

    case "bare": {
      const hairMat = standard(bin, p.trunk);
      const hair = new Mesh(
        bin.add(
          new SphereGeometry(0.228, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
        ),
        hairMat,
      );

      hair.position.y = y + 0.01;
      hair.rotation.x = -0.3;
      g.add(hair);
      fall(hairMat);
      break;
    }
  }

  return g;
}
