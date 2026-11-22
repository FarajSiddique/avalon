import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { sparklePath } from "../../art/seeded";
import { type Bin, fbm2, seededRandom } from "../kit";
import type { Palette } from "../palette";
import { standard } from "../props";

/* The Star Table's clearing and sky, apart from the table itself. */

/** The forest floor: dark, faceted, lit warm round the table. */
export function clearing(bin: Bin, p: Palette): Mesh {
  const geometry = new PlaneGeometry(180, 180, 90, 90).toNonIndexed();

  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute("position") as BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const rise = d > 16 ? Math.min(6, (d - 16) * 0.12) : 0;

    pos.setY(i, (fbm2(x * 0.12, z * 0.12) - 0.5) * 0.7 + rise);
  }

  const colors = new Float32Array(pos.count * 3);
  const c = new Color();

  for (let f = 0; f < pos.count / 3; f++) {
    let x = 0;
    let z = 0;

    for (let v = 0; v < 3; v++) {
      x += pos.getX(f * 3 + v) / 3;
      z += pos.getZ(f * 3 + v) / 3;
    }

    const d = Math.hypot(x, z);

    if (d < 5) {
      c.copy(p["ground-lit-2"]);
    } else if (d < 9) {
      c.copy(p["ground-lit-1"]).lerp(p["ground-lit-2"], (9 - d) / 4);
    } else {
      c.copy(p.ground).lerp(p["ground-lit-1"], Math.max(0, (16 - d) / 7));
    }

    c.multiplyScalar(0.85 + fbm2(x * 0.5, z * 0.5) * 0.3);

    for (let v = 0; v < 3; v++) {
      colors.set([c.r, c.g, c.b], (f * 3 + v) * 3);
    }
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return new Mesh(
    bin.add(geometry),
    standard(bin, new Color(1, 1, 1), { vertexColors: true }),
  );
}

/** A four-pointed sparkle, as on the banner, for the seat runes. */
export function runeMap(bin: Bin): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");

  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "white";
  ctx.fill(new Path2D(sparklePath(size * 0.42)));
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  const texture = bin.add(new CanvasTexture(canvas));

  texture.colorSpace = SRGBColorSpace;

  return texture;
}

/** Ten constellations on a slowly turning dome, stars joined by faint lines. */
export function constellations(
  bin: Bin,
  p: Palette,
  lite: boolean,
  count: number,
) {
  const group = new Group();
  const random = seededRandom(88);
  const starPos: Array<number> = [];
  const starCol: Array<number> = [];
  const linePos: Array<number> = [];
  const radius = 400;
  const tints = [p.star, p["star-blue"], p["star-amber"], p["star-pink"]];

  for (let k = 0; k < count; k++) {
    const az = (k / count) * Math.PI * 2 + random() * 0.3;
    const el = 0.36 + random() * 0.26;
    const points: Array<Vector3> = [];
    const n = 4 + Math.floor(random() * 4);
    let a = az;
    let e = el;

    for (let i = 0; i < n; i++) {
      a += (random() - 0.5) * 0.28;
      e += (random() - 0.5) * 0.22;
      const v = new Vector3(
        Math.cos(e) * Math.cos(a),
        Math.sin(e),
        Math.cos(e) * Math.sin(a),
      ).multiplyScalar(radius);

      points.push(v);
      starPos.push(v.x, v.y, v.z);
      const t = tints[k % tints.length]!;

      starCol.push(t.r, t.g, t.b);
    }

    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]!;
      const to = points[i]!;

      linePos.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
  }

  const lineGeo = bin.add(new BufferGeometry());

  lineGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(linePos), 3),
  );
  const lineMat = bin.add(
    new LineBasicMaterial({
      color: p["star-blue"],
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const lines = new LineSegments(lineGeo, lineMat);

  group.add(lines);
  const starGeo = bin.add(new BufferGeometry());

  starGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(starPos), 3),
  );
  starGeo.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(starCol), 3),
  );
  const starMat = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uSize: {
          value: (lite ? 9 : 11) * Math.min(window.devicePixelRatio || 1, 1.75),
        },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uSize; varying vec3 vColor; varying float vTw;
        void main() {
          vColor = color;
          vTw = 0.75 + 0.25 * sin(uTime * 1.3 + position.x * 0.05);
          gl_PointSize = uSize * vTw;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vTw;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = pow(max(0.0, 1.0 - r), 3.0);
          float cross = max(0.0, 1.0 - abs(d.x) * 16.0) * max(0.0, 1.0 - abs(d.y) * 2.0)
                      + max(0.0, 1.0 - abs(d.y) * 16.0) * max(0.0, 1.0 - abs(d.x) * 2.0);
          gl_FragColor = vec4(vColor * 2.4 * vTw, core + cross * 0.6);
        }
      `,
    }),
  );
  const pts = new Points(starGeo, starMat);

  pts.frustumCulled = false;
  group.add(pts);

  return {
    object: group,
    update(time: number) {
      group.rotation.y = time * 0.012;
      starMat.uniforms.uTime!.value = time;
      lineMat.opacity = 0.28 + 0.1 * Math.sin(time * 0.4);
    },
  };
}

/** A soft cone of moonlight falling on the table. */
export function moonbeam(bin: Bin, p: Palette) {
  const geometry = bin.add(new CylinderGeometry(1.2, 4.8, 44, 48, 1, true));

  geometry.translate(0, 22, 0);
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      uniforms: {
        uColor: { value: p.moon.clone().lerp(p["star-blue"], 0.5) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal; varying vec3 vView; varying float vY;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormal = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - world.xyz);
          vY = position.y / 44.0;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uTime;
        varying vec3 vNormal; varying vec3 vView; varying float vY;
        void main() {
          float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.0);
          float fade = smoothstep(1.0, 0.25, vY) * smoothstep(0.0, 0.08, vY);
          float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + vY * 9.0);
          gl_FragColor = vec4(uColor * edge * fade * shimmer * 0.05, 1.0);
        }
      `,
    }),
  );
  const mesh = new Mesh(geometry, material);

  mesh.position.set(0, 0.4, 0);
  mesh.rotation.z = 0.12;
  mesh.renderOrder = 7;

  return {
    object: mesh,
    update(time: number) {
      material.uniforms.uTime!.value = time;
    },
  };
}

/** Now and then a shooting star crosses the dome. */
export function shootingStar(bin: Bin, p: Palette) {
  const material = bin.add(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
      uniforms: { uColor: { value: p.star.clone() }, uLife: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uLife; varying vec2 vUv;
        void main() {
          float a = pow(vUv.x, 3.0) * (1.0 - abs(vUv.y - 0.5) * 2.0);
          float life = sin(uLife * 3.14159);
          gl_FragColor = vec4(uColor * 2.5, a * life);
        }
      `,
    }),
  );
  const mesh = new Mesh(bin.add(new PlaneGeometry(60, 1.2)), material);

  mesh.visible = false;
  const random = seededRandom(3);
  let next = 2.5;
  let start = -100;
  const from = new Vector3();
  const dir = new Vector3();
  const xAxis = new Vector3();
  const yAxis = new Vector3();
  const zAxis = new Vector3();
  const basis = new Matrix4();

  return {
    object: mesh,
    update(time: number) {
      if (time > next) {
        start = time;
        next = time + 6 + random() * 7;
        const az = random() * Math.PI * 2;

        from.set(Math.cos(az) * 220, 150 + random() * 60, Math.sin(az) * 220);
        dir.set(-Math.sin(az), -0.35, Math.cos(az)).normalize();
      }

      const t = (time - start) / 1.1;

      mesh.visible = t >= 0 && t <= 1;

      if (!mesh.visible) {
        return;
      }

      material.uniforms.uLife!.value = t;
      mesh.position.copy(from).addScaledVector(dir, t * 120);
      // The streak's long axis runs along its travel, its face to the centre.
      xAxis.copy(dir);
      zAxis.copy(mesh.position).negate().normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      zAxis.crossVectors(xAxis, yAxis);
      basis.makeBasis(xAxis, yAxis, zAxis);
      mesh.quaternion.setFromRotationMatrix(basis);
    },
  };
}
