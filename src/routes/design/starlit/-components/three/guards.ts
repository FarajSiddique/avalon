import type {
  BufferAttribute,
  BufferGeometry,
  IUniform,
  InterleavedBufferAttribute,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
} from "three";

/**
 * Checked lookups for the scene code. Each throws a clear Error when an
 * invariant breaks, and none allocates, so they are safe in per-frame code.
 */

/** `arr[i]`, or a thrown Error when the index is out of range. */
export function at<T>(arr: ArrayLike<T>, i: number): T {
  const value = arr[i];

  if (i < 0 || i >= arr.length || value === undefined) {
    throw new Error(`Index ${i} is out of range (length ${arr.length})`);
  }

  return value;
}

/** The 2D context of a canvas, or a thrown Error when there is none. */
export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("A 2D canvas context is not available");
  }

  return ctx;
}

/** A named value out of a `Map`, or a thrown Error when it is missing. */
export function need<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);

  if (value === undefined) {
    throw new Error(`Missing ${what}`);
  }

  return value;
}

/** A named uniform of a shader material, or a thrown Error when missing. */
export function uniform(material: ShaderMaterial, name: string): IUniform {
  const found = material.uniforms[name];

  if (!found) {
    throw new Error(`Shader uniform ${name} is missing`);
  }

  return found;
}

/*
 * Type guards read three's own `isX` flags rather than using `instanceof`.
 */

export function isMesh(node: Object3D): node is Mesh {
  return "isMesh" in node && node.isMesh === true;
}

export function isShaderMaterial(
  material: Material,
): material is ShaderMaterial {
  return "isShaderMaterial" in material && material.isShaderMaterial === true;
}

export function isBasicMaterial(
  material: Material,
): material is MeshBasicMaterial {
  return (
    "isMeshBasicMaterial" in material && material.isMeshBasicMaterial === true
  );
}

export function isStandardMaterial(
  material: Material,
): material is MeshStandardMaterial {
  return (
    "isMeshStandardMaterial" in material &&
    material.isMeshStandardMaterial === true
  );
}

/** True for a lit or unlit colour material. */
export function isColorMaterial(
  material: Material,
): material is MeshStandardMaterial | MeshBasicMaterial {
  return isStandardMaterial(material) || isBasicMaterial(material);
}

function isBufferAttribute(
  attribute: BufferAttribute | InterleavedBufferAttribute,
): attribute is BufferAttribute {
  return (
    "isBufferAttribute" in attribute && attribute.isBufferAttribute === true
  );
}

/** A mesh's single material, which must be a `ShaderMaterial`. */
export function shaderMaterial(mesh: Mesh): ShaderMaterial {
  const { material } = mesh;

  if (Array.isArray(material) || !isShaderMaterial(material)) {
    throw new Error("Expected a ShaderMaterial");
  }

  return material;
}

/** A mesh's single material, which must be a `MeshBasicMaterial`. */
export function basicMaterial(mesh: Mesh): MeshBasicMaterial {
  const { material } = mesh;

  if (Array.isArray(material) || !isBasicMaterial(material)) {
    throw new Error("Expected a MeshBasicMaterial");
  }

  return material;
}

/** A plain (not interleaved) attribute of a geometry. */
export function bufferAttribute(
  geometry: BufferGeometry,
  name: string,
): BufferAttribute {
  const attribute = geometry.getAttribute(name);

  if (!isBufferAttribute(attribute)) {
    throw new Error(`Attribute ${name} is not a BufferAttribute`);
  }

  return attribute;
}

/** Fill a path on a 2D canvas context. */
export function fillPath(ctx: CanvasRenderingContext2D, path: Path2D): void {
  ctx.fill(path);
}

/** True for an HTML element (as opposed to, say, an SVG one). */
export function isHtmlElement(el: Element): el is HTMLElement {
  return "dataset" in el;
}
