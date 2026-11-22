import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type PerspectiveCamera,
  PlaneGeometry,
  Ray,
  ShaderMaterial,
  type Sprite,
  SRGBColorSpace,
  Vector3,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { QuestCard } from "@/shared/views";
import { type Bin, glowSprite, glowTexture } from "../kit";
import type { Palette } from "../palette";
import { HEAD, type Seating, type Standing, STAND } from "../seating";
import {
  CARD_H,
  CARD_W,
  crownMesh,
  drawCard,
  hitCylinder,
} from "./table-play-art";
import type { Layout, TablePlay } from "../types";

/** The table top's height, where quest cards lie. */
const TABLE_TOP = 1.12;
/** Quest cards lie on an arc round the fire, on your side of it. */
const CARD_ARC = 2.05;
/** The least space between two neighbouring cards (at their inner corners). */
const CARD_GAP = 0.05;
/**
 * The angle between neighbouring cards. Each card points at the fire, so
 * neighbours lean in and come closest at their inner corners: the step puts
 * the next card's inner corner CARD_GAP beyond this card's side, so no two
 * cards ever overlap (overlapping cards at one height flicker).
 */
const CARD_STEP = (() => {
  const inner = CARD_ARC - CARD_H / 2;
  const half = CARD_W / 2;

  // inner * sin(step) - half * cos(step) = half + CARD_GAP
  return (
    Math.asin((half + CARD_GAP) / Math.hypot(inner, half)) +
    Math.atan2(half, inner)
  );
})();
/** Seconds for a card to land, and between one landing and the next. */
const CARD_LAND = 0.55;
const CARD_STAGGER = 0.16;
/** Seconds for a card to turn over. */
const CARD_FLIP = 0.7;
/** Seconds for a glow to come or go. */
const GLOW_FADE = 0.35;
/** Height of the lines of light between the team. */
const LINE_Y = 1.95;
/** A pick's hit cylinder: from the feet to just over the head. */
const HIT_TOP = HEAD - 0.2;
/** The smallest hit area, in CSS pixels across (the 44px touch target). */
const HIT_MIN_PX = 44;

interface Card {
  group: Group;
  flipper: Group;
  front: Mesh;
  face: QuestCard | null;
  /** 0 above the table, 1 lying on it. */
  land: number;
  /** 0 face down, 1 face up. */
  flip: number;
  delay: number;
}

interface Glow {
  level: number;
  column: Mesh;
}

/**
 * The game acted out on the Star Table: the leader's ring and crown, the
 * team's glow and the lines of light that join it, and the quest cards that
 * land face down at the table's centre and turn over. Display only: it is
 * told what to show, never a vote, a role or who played which card.
 */
export class TablePlayView {
  private play: TablePlay | null = null;
  private glows = new Map<string, Glow>();
  private columnGeo: CylinderGeometry;
  private columnMat: ShaderMaterial;
  private teamColor: Color;
  private crown: Group;
  private crownLevel = 0;
  private crownAt = new Vector3();
  private line: Line2;
  private lineGeo: LineGeometry | null = null;
  private lineMat: LineMaterial;
  private lineKey = "";
  private lineIds: Array<string> = [];
  private lineLevel = 0;
  private nodes: Array<Sprite> = [];
  private cards: Array<Card> = [];
  private cardKey = "";
  private cardsLevel = 0;
  private textures: Partial<Record<QuestCard | "back", CanvasTexture>> = {};
  private cardGeo: PlaneGeometry;
  private backMat: MeshBasicMaterial | null = null;
  private faceMats: Partial<Record<QuestCard, MeshBasicMaterial>> = {};
  private group = new Group();
  private youAngle = Math.PI * 1.5;
  private yourId: string | null = null;

  constructor(
    private p: Palette,
    private bin: Bin,
    parent: Object3D,
    private seating: Seating,
    private font = "serif",
  ) {
    parent.add(this.group);
    this.teamColor = p["star-blue"].clone();

    // A soft column of light round each team member.
    this.columnGeo = bin.add(new CylinderGeometry(0.95, 1.1, 5.4, 28, 1, true));
    this.columnGeo.translate(0, 2.7, 0);
    this.columnMat = bin.add(
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uColor: { value: p["star-blue"].clone() },
          uLevel: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying float vY; varying vec3 vNormal; varying vec3 vView;
          void main() {
            vY = position.y / 5.4;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vNormal = normalize(mat3(modelMatrix) * normal);
            vView = normalize(cameraPosition - world.xyz);
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uLevel;
          varying float vY; varying vec3 vNormal; varying vec3 vView;
          void main() {
            float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
            float a = pow(1.0 - vY, 1.6) * (0.35 + 0.65 * edge) * uLevel;
            gl_FragColor = vec4(uColor * 1.2, a * 0.26);
          }
        `,
      }),
    );

    this.crown = crownMesh(bin, p);
    this.crown.visible = false;
    this.group.add(this.crown);

    this.lineMat = bin.add(
      new LineMaterial({
        vertexColors: true,
        linewidth: 3.5,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        worldUnits: false,
      }),
    );
    this.line = new Line2(new LineGeometry(), this.lineMat);
    this.line.visible = false;
    this.line.frustumCulled = false;
    this.group.add(this.line);

    const halo = glowTexture(bin, 2.4);

    for (let i = 0; i < 10; i++) {
      const node = glowSprite(bin, halo, p["star-blue"], 0.9, 0);

      node.visible = false;
      this.nodes.push(node);
      this.group.add(node);
    }

    this.cardGeo = bin.add(new PlaneGeometry(CARD_W, CARD_H));
  }

  set(play: TablePlay | null): void {
    this.play = play;
    const cards = play?.cards ?? null;
    const key = cards ? cards.join(",") : "";

    if (key !== this.cardKey) {
      const fresh = !this.cardKey;

      this.cardKey = key;
      this.layCards(cards ?? [], fresh);
    }
  }

  /** The game is on (role or table), not the landing or the lobby. */
  active(): boolean {
    return this.play !== null;
  }

  /** Your figure's player id, if you are at the table. */
  youId(): string | null {
    return this.yourId;
  }

  /** The seat angle of "you" (the camera's side in the game shots). */
  you(): number {
    return this.youAngle;
  }

  /** The camera's azimuth behind your seat (x = sin, z = cos). */
  youAzimuth(): number {
    const a = this.youAngle;

    return Math.atan2(Math.cos(a), Math.sin(a));
  }

  /** Points the team shot frames: each team member's feet and head. */
  teamIds(): ReadonlyArray<string> {
    return this.play?.teamIds ?? [];
  }

  /** The corners of the quest cards (or where three would lie). */
  cardCorners(out: Array<Vector3>): Array<Vector3> {
    out.length = 0;
    const n = Math.max(3, this.cards.filter((c) => c.face).length);
    const half = this.arcHalf(n);
    const az = this.youAzimuth();

    for (const k of [-1, 1]) {
      const phi = az + k * half;

      for (const r of [CARD_ARC - CARD_H / 2, CARD_ARC + CARD_H / 2]) {
        out.push(new Vector3(Math.sin(phi) * r, TABLE_TOP, Math.cos(phi) * r));
      }
    }

    out.push(
      new Vector3(
        Math.sin(az) * (CARD_ARC + CARD_H / 2),
        TABLE_TOP,
        Math.cos(az) * (CARD_ARC + CARD_H / 2),
      ),
    );

    return out;
  }

  /** How far the fire is damped for the cards, 0 to 1. */
  calm(): number {
    return this.cardsLevel;
  }

  /** Finish every glow, crown and card at once. */
  settle(): void {
    this.update(10, 0, null, true);
  }

  update(
    dt: number,
    time: number,
    camera: PerspectiveCamera | null,
    snap = false,
  ): void {
    const play = this.play;
    const standing = this.seating.standing();
    const you = standing.find((s) => s.isYou);

    if (you && you.angle !== this.youAngle) {
      this.youAngle = you.angle;

      // The cards lie on your side: once you are seated, lay them there.
      if (this.cardKey) {
        this.layCards(this.play?.cards ?? [], false);
      }
    }

    this.yourId = you?.id ?? null;
    const team = new Set(play?.teamIds ?? []);
    const leader = play?.leaderId ?? null;
    const step = snap ? 1 : dt / GLOW_FADE;

    // The rings show the leader while the game is on.
    this.seating.ringLook = play
      ? (id) =>
          id === leader
            ? { level: 1, scale: 1.32 }
            : team.has(id)
              ? { level: 0.42, scale: 1 }
              : { level: 0.12, scale: 1 }
      : null;

    // The team glows from within, in a soft column of light.
    for (const s of standing) {
      let glow = this.glows.get(s.id);
      const want = team.has(s.id) ? 1 : 0;

      if (!glow) {
        if (!want) {
          s.figure.setGlow(this.teamColor, 0);
          continue;
        }

        const column = new Mesh(this.columnGeo, this.columnMat.clone());

        this.bin.add(column.material as ShaderMaterial);
        this.group.add(column);
        glow = { level: 0, column };
        this.glows.set(s.id, glow);
      }

      glow.level = toward(glow.level, want, step);
      const level = glow.level * s.arrive;

      s.figure.setGlow(this.teamColor, level * 0.3);
      glow.column.position.copy(s.at);
      glow.column.visible = level > 0.01;
      (glow.column.material as ShaderMaterial).uniforms.uLevel!.value =
        level * (0.85 + 0.15 * Math.sin(time * 1.8 + s.angle * 3));
    }

    for (const [id, glow] of this.glows) {
      if (!standing.some((s) => s.id === id)) {
        glow.level = 0;
        glow.column.visible = false;
      }
    }

    // A small crown floats over the leader's head.
    const head = standing.find((s) => s.id === leader);

    this.crownLevel = toward(this.crownLevel, head ? 1 : 0, step);

    if (head) {
      this.crownAt.copy(head.at);
    }

    this.crown.visible = this.crownLevel > 0.01;

    if (this.crown.visible) {
      const lift = head ? head.arrive : 1;

      this.crown.position.set(
        this.crownAt.x,
        (HEAD - 0.6) * lift + Math.sin(time * 1.4) * 0.06,
        this.crownAt.z,
      );
      this.crown.rotation.y = time * 0.5;
      this.crown.scale.setScalar(Math.max(0.001, this.crownLevel));
    }

    this.updateLines(standing, team, step, time);

    if (camera?.view) {
      this.lineMat.resolution.set(camera.view.width, camera.view.height);
    }

    this.updateCards(dt, snap);
  }

  /** Lines of light join the team in seat order, like a constellation. */
  private updateLines(
    standing: Array<Standing>,
    team: Set<string>,
    step: number,
    time: number,
  ): void {
    const members = standing.filter((s) => team.has(s.id));
    const chain = orderChain(members);
    const key = chain.map((s) => s.id).join(",");

    if (key !== this.lineKey) {
      this.lineKey = key;
      this.lineIds = chain.map((s) => s.id);
      this.lineGeo?.dispose();
      this.lineGeo = null;

      if (chain.length >= 2) {
        const positions: Array<number> = [];
        const colors: Array<number> = [];
        const ends = chain.map((s) =>
          s.at
            .clone()
            .multiplyScalar((STAND - 0.75) / STAND)
            .setY(LINE_Y),
        );

        for (let i = 1; i < ends.length; i++) {
          const a = ends[i - 1]!;
          const b = ends[i]!;
          const bow = a.distanceTo(b) * 0.12;
          const segs = 16;

          for (let k = i === 1 ? 0 : 1; k <= segs; k++) {
            const t = k / segs;

            positions.push(
              a.x + (b.x - a.x) * t,
              a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * bow,
              a.z + (b.z - a.z) * t,
            );
            colors.push(this.teamColor.r, this.teamColor.g, this.teamColor.b);
          }
        }

        this.lineGeo = new LineGeometry();
        this.lineGeo.setPositions(positions);
        this.lineGeo.setColors(colors);
        this.line.geometry = this.lineGeo;
      }

      chain.forEach((s, i) => {
        const node = this.nodes[i];

        if (!node) {
          return;
        }

        node.position
          .copy(s.at)
          .multiplyScalar((STAND - 0.75) / STAND)
          .setY(LINE_Y);
      });
    }

    // The lines come with the glow of the team they join.
    const levels = this.lineIds.map((id) => this.glows.get(id)?.level ?? 0);
    const want = levels.length >= 2 ? Math.min(...levels) : 0;

    this.lineLevel = toward(this.lineLevel, want, step);
    this.line.visible = !!this.lineGeo && this.lineLevel > 0.01;
    this.lineMat.opacity = this.lineLevel * 0.9;
    this.nodes.forEach((node, i) => {
      const id = this.lineIds[i];
      const level = id ? (this.glows.get(id)?.level ?? 0) : 0;

      node.visible = level > 0.01;
      node.material.opacity =
        level * (0.75 + 0.25 * Math.sin(time * 2.2 + i * 1.3));
    });
  }

  /** Lay the cards out on the arc, face down, in the order given. */
  private layCards(cards: ReadonlyArray<QuestCard>, fresh: boolean): void {
    while (this.cards.length < cards.length) {
      this.cards.push(this.makeCard());
    }

    const half = this.arcHalf(cards.length);
    const az = this.youAzimuth();

    this.cards.forEach((card, i) => {
      const face = cards[i] ?? null;

      card.face = face;

      if (!face) {
        return;
      }

      card.front.material = this.faceMat(face);
      const t = cards.length > 1 ? i / (cards.length - 1) : 0.5;
      const phi = az - half + t * half * 2;

      card.group.position.set(
        Math.sin(phi) * CARD_ARC,
        TABLE_TOP,
        Math.cos(phi) * CARD_ARC,
      );
      // The picture's top points to the fire, so it reads from your side.
      card.group.rotation.y = phi;

      if (fresh) {
        card.land = 0;
        card.flip = 0;
        card.delay = i * CARD_STAGGER;
      }
    });
  }

  /** Half the arc a row of `n` cards covers, in radians. */
  private arcHalf(n: number): number {
    return ((n - 1) * CARD_STEP) / 2;
  }

  private updateCards(dt: number, snap: boolean): void {
    const shown = this.play?.cardsShown ?? 0;
    let any = false;

    this.cards.forEach((card, i) => {
      const want = card.face ? 1 : 0;

      if (snap) {
        card.delay = 0;
        card.land = want;
        card.flip = want && i < shown ? 1 : 0;
      } else if (card.delay > 0 && want) {
        card.delay = Math.max(0, card.delay - dt);
      } else {
        card.land = toward(card.land, want, dt / CARD_LAND);
        // A card turns only once it has landed.
        const up = want && i < shown && card.land >= 1 ? 1 : 0;

        card.flip = toward(card.flip, up, dt / CARD_FLIP);
      }

      card.group.visible = card.land > 0.001;

      if (!card.group.visible) {
        return;
      }

      any = true;
      // It drops onto the table with a small settle.
      const l = card.land;
      const fall = 1 - easeOutBack(l);

      card.group.position.y = TABLE_TOP + 0.02 + fall * 2.4;
      card.flipper.rotation.z = Math.PI * (1 - easeInOut(card.flip));
      card.flipper.position.y = Math.sin(Math.PI * card.flip) * 0.55;
      card.group.scale.setScalar(Math.max(0.001, Math.min(1, l * 1.6)));
    });
    this.cardsLevel = toward(
      this.cardsLevel,
      any && this.cardKey ? 1 : 0,
      snap ? 1 : dt / 0.6,
    );
  }

  private makeCard(): Card {
    const group = new Group();
    const flipper = new Group();

    group.add(flipper);
    const front = new Mesh(this.cardGeo, this.faceMat("success"));

    front.rotation.x = -Math.PI / 2;
    front.position.y = 0.012;
    flipper.add(front);
    const back = new Mesh(this.cardGeo, this.backMaterial());

    back.rotation.x = Math.PI / 2;
    back.position.y = -0.012;
    flipper.add(back);
    group.visible = false;
    this.group.add(group);

    return { group, flipper, front, face: null, land: 0, flip: 0, delay: 0 };
  }

  private backMaterial(): MeshBasicMaterial {
    if (!this.backMat) {
      this.backMat = this.bin.add(
        new MeshBasicMaterial({ map: this.texture("back") }),
      );
    }

    return this.backMat;
  }

  private faceMat(face: QuestCard): MeshBasicMaterial {
    let mat = this.faceMats[face];

    if (!mat) {
      // Dimmed a little, so the pale face does not bloom into a blur.
      mat = this.bin.add(
        new MeshBasicMaterial({
          map: this.texture(face),
          color: new Color().setScalar(0.72),
        }),
      );
      this.faceMats[face] = mat;
    }

    return mat;
  }

  private texture(kind: QuestCard | "back"): CanvasTexture {
    let texture = this.textures[kind];

    if (!texture) {
      texture = this.bin.add(
        new CanvasTexture(drawCard(kind, this.p, this.font)),
      );
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      this.textures[kind] = texture;
    }

    return texture;
  }

  /**
   * Whose figure is at this point (normalised device coordinates of the
   * whole canvas). Each figure is a generous upright cylinder, never less
   * than 44 CSS px across where it stands, nor wider than half the gap to
   * its neighbours. The nearest one hit wins.
   */
  pick(
    x: number,
    y: number,
    camera: PerspectiveCamera,
    layout: Layout,
  ): string | null {
    const ray = new Ray();

    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.set(x, y, 0.5).unproject(camera).sub(ray.origin).normalize();
    const tanHalf = Math.tan(((camera.fov / 2) * Math.PI) / 180) / camera.zoom;
    // The neighbours are a tenth of the table round.
    const cap = STAND * Math.sin(Math.PI / 10);
    let best: string | null = null;
    let bestT = Infinity;
    const toAxis = new Vector3();
    const forward = new Vector3();

    camera.getWorldDirection(forward);

    for (const s of this.seating.standing()) {
      if (s.arrive < 0.5) {
        continue;
      }

      const depth = toAxis
        .copy(s.at)
        .setY(HIT_TOP / 2)
        .sub(ray.origin)
        .dot(forward);

      if (depth <= 0) {
        continue;
      }

      const perPx = (2 * depth * tanHalf) / Math.max(1, layout.height);
      const radius = Math.min(cap, Math.max(1.0, (HIT_MIN_PX / 2) * perPx));
      const t = hitCylinder(ray, s.at, radius, HIT_TOP);

      if (t !== null && t < bestT) {
        bestT = t;
        best = s.id;
      }
    }

    return best;
  }

  dispose(): void {
    this.lineGeo?.dispose();
    this.line.geometry.dispose();
  }
}

/** The team in seat order, starting after the widest gap round the table. */
function orderChain(members: Array<Standing>): Array<Standing> {
  if (members.length < 3) {
    return members;
  }

  const sorted = [...members].sort((a, b) => a.angle - b.angle);
  let widest = 0;
  let at = 0;

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!.angle;
    const b = sorted[(i + 1) % sorted.length]!.angle;
    const gap = (b - a + Math.PI * 4) % (Math.PI * 2);

    if (gap > widest) {
      widest = gap;
      at = (i + 1) % sorted.length;
    }
  }

  return [...sorted.slice(at), ...sorted.slice(0, at)];
}

function toward(value: number, target: number, step: number): number {
  return value < target
    ? Math.min(target, value + step)
    : Math.max(target, value - step);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeOutBack(t: number): number {
  const c = 1.4;

  return t >= 1 ? 1 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}
