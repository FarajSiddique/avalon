import {
  type Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Ray,
  type Vector3,
} from "three";
import type { QuestCard } from "@/shared/views";
import { sparklePath } from "../../art/seeded";
import { type Bin, glowSprite, glowTexture } from "../kit";
import type { Palette } from "../palette";

/* The drawn pieces of the game at the Star Table, and its hit test. */

/** A quest card's size on the table. */
export const CARD_W = 0.92;
export const CARD_H = 1.3;

/** Where a ray first meets an upright cylinder (with its top), or null. */
export function hitCylinder(
  ray: Ray,
  base: Vector3,
  radius: number,
  height: number,
): number | null {
  const o = ray.origin;
  const d = ray.direction;
  const ox = o.x - base.x;
  const oz = o.z - base.z;
  const a = d.x * d.x + d.z * d.z;
  let best: number | null = null;

  if (a > 1e-8) {
    const b = 2 * (ox * d.x + oz * d.z);
    const c = ox * ox + oz * oz - radius * radius;
    const disc = b * b - 4 * a * c;

    if (disc >= 0) {
      const root = Math.sqrt(disc);

      for (const t of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
        if (t <= 0) {
          continue;
        }

        const yy = o.y + d.y * t;

        if (yy >= 0 && yy <= height && (best === null || t < best)) {
          best = t;
        }
      }
    }
  }

  // Looking down, the ray may come in through the top.
  if (Math.abs(d.y) > 1e-8) {
    const t = (height - o.y) / d.y;

    if (t > 0) {
      const x = ox + d.x * t;
      const z = oz + d.z * t;

      if (x * x + z * z <= radius * radius && (best === null || t < best)) {
        best = t;
      }
    }
  }

  return best;
}

/** A little golden crown: a band with five points. */
export function crownMesh(bin: Bin, p: Palette): Group {
  const g = new Group();
  const gold = bin.add(
    new MeshBasicMaterial({ color: p.gold.clone().multiplyScalar(1.5) }),
  );
  const band = new Mesh(
    bin.add(new CylinderGeometry(0.34, 0.3, 0.16, 20, 1, true)),
    gold,
  );

  band.material.side = DoubleSide;
  g.add(band);
  const point = bin.add(new ConeGeometry(0.075, 0.24, 6));

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const m = new Mesh(point, gold);

    m.position.set(Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32);
    g.add(m);
  }

  const glow = glowSprite(bin, glowTexture(bin, 2.2), p.gold, 1.4, 0.5);

  glow.position.y = 0.08;
  g.add(glow);

  return g;
}

/**
 * A quest card, drawn on a canvas: the back is a night sky with the
 * banner's sparkle; Success is a sun with its rays, Fail a cracked crescent
 * moon. They differ by shape and word, not only colour.
 */
export function drawCard(
  kind: QuestCard | "back",
  p: Palette,
  font: string,
): HTMLCanvasElement {
  const w = 256;
  const h = Math.round((w * CARD_H) / CARD_W);
  const canvas = document.createElement("canvas");

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const css = (c: Color) => `#${c.getHexString()}`;
  const pad = 10;
  const radius = 22;
  const card = new Path2D();

  card.roundRect(pad, pad, w - pad * 2, h - pad * 2, radius);
  const inner = new Path2D();

  inner.roundRect(pad + 12, pad + 12, w - pad * 2 - 24, h - pad * 2 - 24, 14);
  ctx.lineJoin = ctx.lineCap = "round";

  if (kind === "back") {
    ctx.fillStyle = css(p["sky-mid"]);
    ctx.fill(card);
    ctx.strokeStyle = css(p.gold);
    ctx.lineWidth = 5;
    ctx.stroke(inner);
    ctx.fillStyle = css(p["star-blue"]);
    const dots = [
      [0.25, 0.2],
      [0.72, 0.16],
      [0.3, 0.78],
      [0.78, 0.7],
      [0.6, 0.86],
      [0.2, 0.5],
      [0.82, 0.44],
    ];

    for (const [x, y] of dots) {
      ctx.beginPath();
      ctx.arc(x! * w, y! * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = css(p.gold);
    ctx.fill(new Path2D(sparklePath(w * 0.24)));
    ctx.restore();

    return canvas;
  }

  const success = kind === "success";

  ctx.fillStyle = css(success ? p.tent : p.banner);
  ctx.fill(card);
  const ink = success ? p["tent-dark"] : p.moon;

  ctx.strokeStyle = css(success ? p.gold : p["star-pink"]);
  ctx.lineWidth = 5;
  ctx.stroke(inner);
  ctx.save();
  ctx.translate(w / 2, h * 0.42);

  if (success) {
    // The sun: a disc and twelve rays.
    ctx.fillStyle = css(p["fire-outer"]);
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(p["fire-outer"]);
    ctx.lineWidth = 9;

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 ? 72 : 82;

      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 54, Math.sin(a) * 54);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
  } else {
    // The moon: a crescent split by a jagged crack.
    const moon = document.createElement("canvas");

    moon.width = moon.height = 200;
    const m = moon.getContext("2d")!;

    m.translate(100, 100);
    m.fillStyle = css(p.moon);
    m.beginPath();
    m.arc(0, 0, 76, 0, Math.PI * 2);
    m.fill();
    m.globalCompositeOperation = "destination-out";
    m.beginPath();
    m.arc(34, -22, 66, 0, Math.PI * 2);
    m.fill();
    m.lineWidth = 11;
    m.lineJoin = m.lineCap = "round";
    m.beginPath();
    m.moveTo(-70, -40);
    m.lineTo(-38, -14);
    m.lineTo(-52, 8);
    m.lineTo(-20, 30);
    m.lineTo(-30, 52);
    m.lineTo(4, 82);
    m.stroke();
    ctx.drawImage(moon, -100, -100);
  }

  ctx.restore();
  ctx.fillStyle = css(ink);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 44px ${font}`;
  ctx.fillText(success ? "Success" : "Fail", w / 2, h * 0.84);

  return canvas;
}
