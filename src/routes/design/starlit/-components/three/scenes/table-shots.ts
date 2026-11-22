import { Vector3 } from "three";
import { HEAD, type Standing, STAND } from "../seating";
import type { Layout, Pointer, TableShot } from "../types";

/**
 * Where the camera is, round the table's centre: its azimuth (x = sin,
 * z = cos), distance out and height, what it looks at, and its lens.
 * Moves interpolate these, so the camera swings round the table rather than
 * cutting through it.
 */
export interface Pose {
  az: number;
  dist: number;
  height: number;
  look: Vector3;
  fov: number;
  /** The lens on a portrait frame. */
  tallFov: number;
}

export function makePose(): Pose {
  return {
    az: 0,
    dist: 15,
    height: 12,
    look: new Vector3(),
    fov: 40,
    tallFov: 52,
  };
}

export function copyPose(out: Pose, from: Pose): Pose {
  out.az = from.az;
  out.dist = from.dist;
  out.height = from.height;
  out.look.copy(from.look);
  out.fov = from.fov;
  out.tallFov = from.tallFov;
  return out;
}

/** Between two poses, the short way round. */
export function mixPose(out: Pose, a: Pose, b: Pose, t: number): Pose {
  const turn = wrap(b.az - a.az);
  out.az = a.az + turn * t;
  out.dist = a.dist + (b.dist - a.dist) * t;
  out.height = a.height + (b.height - a.height) * t;
  out.look.lerpVectors(a.look, b.look, t);
  out.fov = a.fov + (b.fov - a.fov) * t;
  out.tallFov = a.tallFov + (b.tallFov - a.tallFov) * t;
  return out;
}

interface ShotInput {
  layout: Layout;
  standing: readonly Standing[];
  teamIds: readonly string[];
  /** The camera's azimuth behind your seat. */
  youAz: number;
  cardCorners: readonly Vector3[];
  time: number;
  pointer: Pointer;
}

/** A tag is about this tall and (with a long name) half this wide, in px. */
const TAG_H = 22;
const TAG_HALF_W = 46;

/**
 * The camera for each of the game's shots. Each is tuned for a phone (a
 * narrow open space) and a wide screen separately, as the lobby's lens is;
 * the table and team shots then fit their distance so every figure and its
 * tag lands inside the open space, whatever its shape.
 */
export function shotPose(out: Pose, shot: TableShot, input: ShotInput): Pose {
  const { layout, standing, youAz, time, pointer } = input;
  const phone = layout.width < 640;
  const sway = Math.sin(time * 0.06) * 0.035 + pointer.x * 0.06;
  switch (shot) {
    case "role": {
      // Low behind your seat and a little to one side, looking across the
      // table: your shoulders in the foreground, everyone else facing you.
      const back = phone ? 5.4 : 5.6;
      const side = phone ? 1.2 : 1.9;
      const out_ = STAND + back;
      const ax = Math.sin(youAz) * out_ + Math.cos(youAz) * side;
      const az_ = Math.cos(youAz) * out_ - Math.sin(youAz) * side;
      out.az = Math.atan2(ax, az_) + sway * 0.5;
      out.dist = Math.hypot(ax, az_);
      out.height = (phone ? 6.2 : 5.8) + pointer.y * 0.3;
      out.look.set(-Math.sin(youAz) * 2.6, 2.0, -Math.cos(youAz) * 2.6);
      out.fov = phone ? 50 : 46;
      out.tallFov = phone ? 60 : 56;
      return out;
    }
    case "table": {
      const points = figurePoints(standing, () => true);
      return fitPose(out, points, {
        layout,
        az: youAz + sway,
        elevation: phone ? 0.72 : 0.98,
        fov: phone ? 30 : 26,
        tallFov: phone ? 40 : 36,
        lift: 1.4,
      });
    }
    case "team": {
      const team = new Set(input.teamIds);
      const members = standing.filter((s) => team.has(s.id));
      if (!members.length) return shotPose(out, "table", input);
      // Look at the team from across the table, so they face the camera,
      // unless they are spread all round it (then from your side).
      let cx = 0;
      let cz = 0;
      for (const s of members) {
        cx += s.at.x / members.length;
        cz += s.at.z / members.length;
      }
      const az =
        Math.hypot(cx, cz) > 1.6 ? Math.atan2(-cx, -cz) : youAz + sway * 0.5;
      return fitPose(
        out,
        figurePoints(members, () => true),
        {
          layout,
          az,
          elevation: phone ? 0.8 : 0.66,
          fov: phone ? 36 : 30,
          tallFov: phone ? 46 : 42,
          lift: 1.6,
        },
      );
    }
    case "cards": {
      const points = input.cardCorners.map((p) => ({
        p,
        top: 0.3,
        bottom: 0.2,
        side: 0.3,
      }));
      return fitPose(out, points, {
        layout,
        az: youAz + sway * 0.4,
        elevation: phone ? 1.12 : 1.04,
        fov: phone ? 38 : 32,
        tallFov: phone ? 48 : 44,
        lift: TABLE_Y,
        fraction: true,
      });
    }
  }
}

const TABLE_Y = 1.12;

interface FitPoint {
  p: Vector3;
  /** Room to leave above, below and to each side (px, or a fraction). */
  top: number;
  bottom: number;
  side: number;
}

/** The feet and the tag anchor of each figure, with room for its tag. */
function figurePoints(
  standing: readonly Standing[],
  keep: (s: Standing) => boolean,
): FitPoint[] {
  const out: FitPoint[] = [];
  for (const s of standing) {
    if (!keep(s)) continue;
    out.push({ p: s.at.clone(), top: 6, bottom: 10, side: 26 });
    out.push({
      p: s.at.clone().setY(HEAD),
      top: TAG_H,
      bottom: 0,
      side: TAG_HALF_W,
    });
  }
  return out;
}

const UP = new Vector3(0, 1, 0);

/**
 * Point the camera along an azimuth and elevation, then find the look point
 * and distance that put every point inside the frame with its margin.
 */
function fitPose(
  out: Pose,
  points: readonly FitPoint[],
  options: {
    layout: Layout;
    az: number;
    elevation: number;
    fov: number;
    tallFov: number;
    /** Height of the look point. */
    lift: number;
    /** Margins are fractions of the frame, not pixels. */
    fraction?: boolean;
  },
): Pose {
  const { layout, az, elevation } = options;
  const vfov = layout.aspect < 1 ? options.tallFov : options.fov;
  const tanV = Math.tan(((vfov / 2) * Math.PI) / 180);
  const tanH = tanV * layout.aspect;
  const toCam = new Vector3(
    Math.sin(az) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(az) * Math.cos(elevation),
  );
  const forward = toCam.clone().negate();
  const right = new Vector3().crossVectors(forward, UP).normalize();
  const up = new Vector3().crossVectors(right, forward);
  const look = new Vector3();
  for (const { p } of points) look.add(p);
  look.divideScalar(Math.max(1, points.length)).setY(options.lift);
  const w = Math.max(1, layout.width);
  const h = Math.max(1, layout.height);
  const limit = (px: number, size: number) =>
    Math.max(0.2, 1 - (options.fraction ? px * 2 : (px * 2) / size));
  const q = new Vector3();
  let distance = 10;
  // Fit, re-centre on what was fitted, and fit again.
  for (let pass = 0; pass < 3; pass++) {
    distance = 4;
    for (const pt of points) {
      q.copy(pt.p).sub(look);
      const x = q.dot(right);
      const y = q.dot(up);
      const along = q.dot(forward);
      const side = limit(pt.side, w);
      distance = Math.max(distance, Math.abs(x) / (tanH * side) - along);
      if (y > 0)
        distance = Math.max(distance, y / (tanV * limit(pt.top, h)) - along);
      else
        distance = Math.max(
          distance,
          -y / (tanV * limit(pt.bottom, h)) - along,
        );
    }
    if (pass === 2) break;
    // Where the points land, in the frame, edges with margins included.
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of points) {
      q.copy(pt.p).sub(look);
      const depth = distance + q.dot(forward);
      const x = q.dot(right) / (depth * tanH);
      const y = q.dot(up) / (depth * tanV);
      const sx = 1 - limit(pt.side, w);
      minX = Math.min(minX, x - sx);
      maxX = Math.max(maxX, x + sx);
      minY = Math.min(minY, y - (1 - limit(pt.bottom, h)));
      maxY = Math.max(maxY, y + (1 - limit(pt.top, h)));
    }
    const shiftX = ((minX + maxX) / 2) * distance * tanH;
    const shiftY = ((minY + maxY) / 2) * distance * tanV;
    look.addScaledVector(right, shiftX).addScaledVector(up, shiftY);
  }
  const camera = look.clone().addScaledVector(toCam, distance);
  out.az = Math.atan2(camera.x, camera.z);
  out.dist = Math.hypot(camera.x, camera.z);
  out.height = camera.y;
  out.look.copy(look);
  out.fov = options.fov;
  out.tallFov = options.tallFov;
  return out;
}

function wrap(a: number): number {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
}
