import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  type Object3D,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { avatarKey } from "@/design/avatar";
import { EmblemTextures, figure, type Figure } from "./avatar";
import type { Bin } from "./kit";
import type { Palette } from "./palette";
import type { TablePlayer } from "./types";

/** Where a figure stands: between its seat stone and the table. */
const STAND = 5.2;
const SCALE = 2.05;
/** Seconds for a figure to rise into place, or sink away. */
const RISE = 0.9;
/** Seconds between arrivals when a lobby first opens. */
const STAGGER = 0.5;

interface Seat {
  player: TablePlayer;
  look: string;
  figure: Figure;
  /** 0 below ground, 1 standing. */
  arrive: number;
  /** Seconds to wait before rising. */
  delay: number;
  leaving: boolean;
  seat: number;
  phase: number;
  head: Vector3;
}

export interface SeatState {
  present: boolean;
  ready: boolean;
  away: boolean;
  /** 0 to 1, how far the figure has risen. */
  arrive: number;
}

/**
 * The figures at the Star Table. Players fill seats in order, starting
 * across the table from the camera so "you" faces it. New players rise out of
 * a column of light; players who leave sink away.
 */
export class Seating {
  private seats = new Map<string, Seat>();
  private emblems: EmblemTextures;
  private columnMat: ShaderMaterial;
  private columnGeo: CylinderGeometry;
  private ringGeo: RingGeometry;
  private ringMats: MeshBasicMaterial[] = [];
  private columns: Mesh[] = [];
  private rings: Mesh[] = [];
  private first = true;
  private anchorMap = new Map<string, Vector3>();

  constructor(
    private p: Palette,
    bin: Bin,
    private parent: Object3D,
    private angles: readonly number[],
    private startSeat: number,
  ) {
    this.emblems = new EmblemTextures(bin);
    this.columnGeo = bin.add(new CylinderGeometry(0.55, 0.75, 5, 24, 1, true));
    this.columnGeo.translate(0, 2.5, 0);
    this.columnMat = bin.add(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uColor: { value: p.window.clone() }, uLevel: { value: 0 } },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() { vY = position.y / 5.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uLevel; varying float vY;
          void main() { gl_FragColor = vec4(uColor * 1.8, (1.0 - vY) * uLevel); }
        `,
      }),
    );
    this.ringGeo = bin.add(new RingGeometry(0.62, 0.78, 40));
    angles.forEach((a) => {
      const at = new Vector3(Math.cos(a) * STAND, 0.04, Math.sin(a) * STAND);
      const column = new Mesh(this.columnGeo, this.columnMat.clone());
      bin.add(column.material as ShaderMaterial);
      column.position.copy(at);
      column.visible = false;
      parent.add(column);
      this.columns.push(column);
      const ringMat = bin.add(
        new MeshBasicMaterial({
          color: p.gold.clone().multiplyScalar(1.6),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const ring = new Mesh(this.ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(at);
      parent.add(ring);
      this.rings.push(ring);
      this.ringMats.push(ringMat);
    });
  }

  /** Who is at the table. Seats follow list order. */
  set(players: readonly TablePlayer[]): void {
    const keep = new Set<string>();
    players.slice(0, this.angles.length).forEach((player, index) => {
      keep.add(player.id);
      const seatIndex = (this.startSeat + index) % this.angles.length;
      const look = avatarKey(player.avatar);
      const existing = this.seats.get(player.id);
      if (existing && !existing.leaving) {
        existing.player = player;
        if (existing.look !== look) {
          // A new look swaps the figure in place, no arrival.
          this.parent.remove(existing.figure.group);
          existing.figure.dispose();
          existing.figure = this.place(player, existing.seat);
          existing.look = look;
        }
        existing.figure.setAway(!player.connected);
        return;
      }
      if (existing) {
        this.parent.remove(existing.figure.group);
        existing.figure.dispose();
      }
      const made = this.place(player, seatIndex);
      made.setAway(!player.connected);
      this.seats.set(player.id, {
        player,
        look,
        figure: made,
        arrive: 0,
        delay: this.first ? index * STAGGER : 0,
        leaving: false,
        seat: seatIndex,
        phase: index * 1.7,
        head: new Vector3(),
      });
    });
    for (const [id, seat] of this.seats) {
      if (!keep.has(id)) seat.leaving = true;
    }
    this.first = false;
  }

  private place(player: TablePlayer, seat: number): Figure {
    const made = figure(this.p, player.avatar, this.emblems);
    const a = this.angles[seat]!;
    made.group.position.set(Math.cos(a) * STAND, 0, Math.sin(a) * STAND);
    made.group.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    made.group.scale.setScalar(0.001);
    this.parent.add(made.group);
    return made;
  }

  /** Finish every arrival and departure at once (reduced motion, rebuilds). */
  settle(): void {
    for (const seat of this.seats.values()) {
      seat.delay = 0;
      seat.arrive = seat.leaving ? 0 : 1;
    }
    this.sweep();
    this.pose(0);
  }

  update(dt: number, time: number): void {
    for (const seat of this.seats.values()) {
      if (seat.delay > 0) {
        seat.delay = Math.max(0, seat.delay - dt);
        continue;
      }
      const step = dt / RISE;
      seat.arrive = seat.leaving
        ? Math.max(0, seat.arrive - step)
        : Math.min(1, seat.arrive + step);
    }
    this.sweep();
    this.pose(time);
  }

  /** Drop the figures that have finished leaving. */
  private sweep(): void {
    for (const [id, seat] of this.seats) {
      if (seat.leaving && seat.arrive <= 0) {
        this.parent.remove(seat.figure.group);
        seat.figure.dispose();
        this.seats.delete(id);
      }
    }
  }

  private pose(time: number): void {
    const bySeat = new Map<number, Seat>();
    for (const seat of this.seats.values()) bySeat.set(seat.seat, seat);
    this.anchorMap.clear();
    this.angles.forEach((_, i) => {
      const seat = bySeat.get(i);
      const column = this.columns[i]!;
      const ringMat = this.ringMats[i]!;
      if (!seat) {
        column.visible = false;
        ringMat.opacity = 0;
        return;
      }
      const t = seat.arrive;
      // Ease out with a small overshoot, so a figure lands with a little hop.
      const k = 1.6;
      const eased = t >= 1 ? 1 : 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
      const g = seat.figure.group;
      const bob = Math.sin(time * 1.6 + seat.phase) * 0.025 * t;
      g.position.y = (1 - eased) * -1.4 + bob;
      g.scale.setScalar(Math.max(0.001, SCALE * Math.min(1.05, eased)));
      const a = this.angles[i]!;
      g.rotation.y =
        Math.atan2(-Math.cos(a), -Math.sin(a)) +
        Math.sin(time * 0.45 + seat.phase) * 0.18 * t;
      // A column of light while rising, gone once standing.
      const flash = t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0;
      column.visible = flash > 0.01;
      (column.material as ShaderMaterial).uniforms.uLevel!.value = flash * 0.55;
      const { ready, connected } = seat.player;
      const pulse = 0.85 + 0.15 * Math.sin(time * 2 + seat.phase);
      ringMat.opacity = !connected ? 0 : ready ? 0.75 * pulse * t : 0.18 * t;
      if (t > 0.05)
        this.anchorMap.set(
          seat.player.id,
          seat.head.set(
            g.position.x,
            g.position.y + 2.15 * SCALE * Math.min(1, eased),
            g.position.z,
          ),
        );
    });
  }

  /** Per seat stone: who is there, for its rune. */
  state(seatIndex: number): SeatState {
    for (const seat of this.seats.values()) {
      if (seat.seat === seatIndex && !seat.leaving)
        return {
          present: true,
          ready: seat.player.ready,
          away: !seat.player.connected,
          arrive: seat.arrive,
        };
    }
    return { present: false, ready: false, away: false, arrive: 0 };
  }

  anchors(): ReadonlyMap<string, Vector3> {
    return this.anchorMap;
  }

  seated(): number {
    let n = 0;
    for (const seat of this.seats.values())
      if (!seat.leaving && seat.arrive >= 0.999) n++;
    return n;
  }

  dispose(): void {
    for (const seat of this.seats.values()) seat.figure.dispose();
    this.seats.clear();
  }
}
