import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  type IUniform,
  type Object3D,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { avatarKey } from "@/shared/avatar";
import { EmblemTextures, figure, type Figure } from "./avatar";
import { at as nth } from "./guards";
import type { Bin } from "./kit";
import type { Palette } from "./palette";
import type { TablePlayer } from "./types";

/** Where a figure stands: between its seat stone and the table. */
export const STAND = 5.2;
/** How much bigger than the 1.5 unit model each figure is drawn. */
const SCALE = 2.05;

/** Height of the name tag's anchor over a standing figure's feet. */
export const HEAD = 2.15 * SCALE;
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

/** A figure standing (or rising) at the table, for the game's visuals. */
export interface Standing {
  id: string;
  isYou: boolean;
  /** The seat's angle round the table (x = cos, z = sin). */
  angle: number;
  /** Where its feet are, on the ground. */
  at: Vector3;
  /** 0 to 1, how far it has risen. */
  arrive: number;
  figure: Figure;
}

/** How a seat's ring is lit during the game. */
interface RingLook {
  /** 0 to 1. */
  level: number;
  scale: number;
}

interface SeatState {
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
  private ringMats: Array<MeshBasicMaterial> = [];
  private columns: Array<Mesh> = [];
  /** Each column's own light level, the uniform of its cloned material. */
  private columnLevels: Array<IUniform<number>> = [];
  private rings: Array<Mesh> = [];
  private first = true;
  /** Count of figures moved out of your seat, for their keys. */
  private ghosts = 0;
  private anchorMap = new Map<string, Vector3>();
  /**
   * During the game, the rings show the leader rather than who is ready.
   * Null: the lobby's rule.
   */
  ringLook: ((id: string) => RingLook) | null = null;

  constructor(
    private p: Palette,
    bin: Bin,
    private parent: Object3D,
    private angles: ReadonlyArray<number>,
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
      const columnMaterial = this.columnMat.clone();
      const level: IUniform<number> = { value: 0 };

      columnMaterial.uniforms.uLevel = level;
      const column = new Mesh(this.columnGeo, columnMaterial);

      bin.add(columnMaterial);
      column.position.copy(at);
      column.visible = false;
      parent.add(column);
      this.columns.push(column);
      this.columnLevels.push(level);
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
  set(players: ReadonlyArray<TablePlayer>): void {
    const list = players.slice(0, this.angles.length);
    const keep = new Set(list.map((p) => p.id));

    for (const [id, seat] of this.seats) {
      if (!keep.has(id)) {
        seat.leaving = true;
      }
    }

    // Everyone staying keeps their seat. A newcomer takes the seat its place
    // in the list asks for when it is free, else the next free one round
    // the table, so two figures never share a seat (the lobby's guests
    // becoming the game's seven). You are the exception: you always take
    // your seat (across the table from the lobby's camera), and whoever is
    // in it moves to a free one.
    const kept = new Set<number>();
    const leavingSeats = new Set<number>();

    for (const seat of this.seats.values()) {
      (seat.leaving ? leavingSeats : kept).add(seat.seat);
    }

    const n = this.angles.length;

    const seatFor = (index: number, wanted = (this.startSeat + index) % n) => {
      for (const avoid of [true, false]) {
        for (let k = 0; k < n; k++) {
          const at = (wanted + k) % n;

          if (!kept.has(at) && !(avoid && leavingSeats.has(at))) {
            return at;
          }
        }
      }

      return wanted;
    };

    list.forEach((player, index) => {
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
        this.seats.delete(player.id);
        leavingSeats.delete(existing.seat);
      }

      const wanted = (this.startSeat + index) % n;

      if (player.isYou) {
        const holder = [...this.seats.values()].find(
          (s) => !s.leaving && s.seat === wanted,
        );

        if (holder) {
          // The one in your seat sinks away there and rises at a free seat.
          this.seats.set(`${holder.player.id}\u0000${this.ghosts++}`, {
            ...holder,
            leaving: true,
            head: new Vector3(),
          });
          kept.delete(wanted);
          leavingSeats.add(wanted);
          const to = seatFor(index, (wanted + 1) % n);

          kept.add(to);
          holder.seat = to;
          holder.figure = this.place(holder.player, to);
          holder.figure.setAway(!holder.player.connected);
          holder.arrive = 0;
          holder.delay = 0;
        }
      }

      const seatIndex =
        player.isYou && !kept.has(wanted) ? wanted : seatFor(index);

      kept.add(seatIndex);
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
    this.first = false;
  }

  private place(player: TablePlayer, seat: number): Figure {
    const made = figure(this.p, player.avatar, this.emblems);
    const a = nth(this.angles, seat);

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

    for (const seat of this.seats.values()) {
      const there = bySeat.get(seat.seat);

      if (!there || there.leaving) {
        bySeat.set(seat.seat, seat);
      }
    }

    this.anchorMap.clear();

    // A figure sinking away where a newcomer rises still sinks.
    for (const seat of this.seats.values()) {
      if (bySeat.get(seat.seat) !== seat) {
        this.poseFigure(seat, time);
      }
    }

    this.angles.forEach((_, i) => {
      const seat = bySeat.get(i);
      const column = nth(this.columns, i);
      const level = nth(this.columnLevels, i);
      const ringMat = nth(this.ringMats, i);

      if (!seat) {
        column.visible = false;
        ringMat.opacity = 0;

        return;
      }

      const t = seat.arrive;
      const eased = this.poseFigure(seat, time);
      const g = seat.figure.group;
      // A column of light while rising, gone once standing.
      const flash = t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0;

      column.visible = flash > 0.01;
      level.value = flash * 0.55;
      const { ready, connected } = seat.player;
      const pulse = 0.85 + 0.15 * Math.sin(time * 2 + seat.phase);
      const look = this.ringLook?.(seat.player.id);
      const ring = nth(this.rings, i);

      if (look) {
        ringMat.opacity = look.level * (0.88 + 0.12 * pulse) * t;
        ring.scale.setScalar(look.scale);
      } else {
        ringMat.opacity = !connected ? 0 : ready ? 0.75 * pulse * t : 0.18 * t;
        ring.scale.setScalar(1);
      }

      // The tag's anchor rises with the figure but leaves out its idle bob,
      // so a name tag holds still over a figure at rest.
      if (t > 0.05) {
        this.anchorMap.set(
          seat.player.id,
          seat.head.set(
            g.position.x,
            risen(eased) + HEAD * Math.min(1, eased),
            g.position.z,
          ),
        );
      }
    });
  }

  /** Rise, bob and sway one figure. Returns how far it has risen, eased. */
  private poseFigure(seat: Seat, time: number): number {
    const t = seat.arrive;
    // Ease out with a small overshoot, so a figure lands with a little hop.
    const k = 1.6;
    const eased = t >= 1 ? 1 : 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
    const g = seat.figure.group;
    const bob = Math.sin(time * 1.6 + seat.phase) * 0.025 * t;

    g.position.y = risen(eased) + bob;
    g.scale.setScalar(Math.max(0.001, SCALE * Math.min(1.05, eased)));
    const a = nth(this.angles, seat.seat);

    g.rotation.y =
      Math.atan2(-Math.cos(a), -Math.sin(a)) +
      Math.sin(time * 0.45 + seat.phase) * 0.18 * t;

    return eased;
  }

  /** Per seat stone: who is there, for its rune. */
  state(seatIndex: number): SeatState {
    for (const seat of this.seats.values()) {
      if (seat.seat === seatIndex && !seat.leaving) {
        return {
          present: true,
          ready: seat.player.ready,
          away: !seat.player.connected,
          arrive: seat.arrive,
        };
      }
    }

    return { present: false, ready: false, away: false, arrive: 0 };
  }

  /** Every figure that is not leaving, in seat order. */
  standing(): Array<Standing> {
    const out: Array<Standing> = [];

    for (const seat of this.seats.values()) {
      if (seat.leaving) {
        continue;
      }

      const a = nth(this.angles, seat.seat);

      out.push({
        id: seat.player.id,
        isYou: seat.player.isYou,
        angle: a,
        at: new Vector3(Math.cos(a) * STAND, 0, Math.sin(a) * STAND),
        arrive: seat.arrive,
        figure: seat.figure,
      });
    }

    return out.sort((x, y) => x.angle - y.angle);
  }

  anchors(): ReadonlyMap<string, Vector3> {
    return this.anchorMap;
  }

  seated(): number {
    let n = 0;

    for (const seat of this.seats.values()) {
      if (!seat.leaving && seat.arrive >= 0.999) {
        n++;
      }
    }

    return n;
  }

  dispose(): void {
    for (const seat of this.seats.values()) {
      seat.figure.dispose();
    }

    this.seats.clear();
  }
}

/** A figure's height as it rises from under the floor (eased 0 to 1). */
function risen(eased: number): number {
  return (1 - eased) * -1.4;
}
