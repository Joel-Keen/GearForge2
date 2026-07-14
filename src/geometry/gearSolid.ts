import type { Point2D } from './gearProfile';

export type Point3D = [number, number, number];

export type Triangle = [number, number, number];

export type SolidMesh = {
  vertices: Point3D[];
  triangles: Triangle[];
  outline: Point2D[];
  thickness: number;
};

type IndexedPoint = {
  index: number;
  point: Point2D;
};

function polygonArea(points: Point2D[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function cross(a: Point2D, b: Point2D, c: Point2D): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function isPointInTriangle(point: Point2D, a: Point2D, b: Point2D, c: Point2D): boolean {
  const c1 = cross(a, b, point);
  const c2 = cross(b, c, point);
  const c3 = cross(c, a, point);
  const hasNegative = c1 < 0 || c2 < 0 || c3 < 0;
  const hasPositive = c1 > 0 || c2 > 0 || c3 > 0;
  return !(hasNegative && hasPositive);
}

function isConvex(prev: Point2D, current: Point2D, next: Point2D, clockwise: boolean): boolean {
  const turn = cross(prev, current, next);
  return clockwise ? turn <= 0 : turn >= 0;
}

function dedupeClosingPoint(points: Point2D[]): Point2D[] {
  if (points.length < 2) {
    return points;
  }

  const [firstX, firstY] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  if (firstX === lastX && firstY === lastY) {
    return points.slice(0, -1);
  }

  return points;
}

function triangulatePolygon(points: Point2D[]): Triangle[] {
  const cleanPoints = dedupeClosingPoint(points);
  if (cleanPoints.length < 3) {
    return [];
  }

  const working = cleanPoints.map((point, index) => ({ point, index }));
  const triangles: Triangle[] = [];
  const clockwise = polygonArea(cleanPoints) < 0;
  let guard = 0;

  while (working.length >= 3 && guard < 10_000) {
    guard += 1;
    let clipped = false;

    for (let index = 0; index < working.length; index += 1) {
      const prev = working[(index - 1 + working.length) % working.length];
      const current = working[index];
      const next = working[(index + 1) % working.length];

      if (!isConvex(prev.point, current.point, next.point, clockwise)) {
        continue;
      }

      let containsPoint = false;
      for (const candidate of working) {
        if (candidate === prev || candidate === current || candidate === next) {
          continue;
        }
        if (isPointInTriangle(candidate.point, prev.point, current.point, next.point)) {
          containsPoint = true;
          break;
        }
      }

      if (containsPoint) {
        continue;
      }

      triangles.push([prev.index, current.index, next.index]);
      working.splice(index, 1);
      clipped = true;
      break;
    }

    if (!clipped) {
      break;
    }
  }

  return triangles;
}

function buildSideTriangles(pointCount: number): Triangle[] {
  const triangles: Triangle[] = [];
  const topOffset = pointCount;

  for (let index = 0; index < pointCount; index += 1) {
    const next = (index + 1) % pointCount;
    triangles.push([index, next, topOffset + next]);
    triangles.push([index, topOffset + next, topOffset + index]);
  }

  return triangles;
}

export function extrudeOutlineToSolid(outline: Point2D[], thickness: number): SolidMesh {
  const cleanOutline = dedupeClosingPoint(outline);
  if (cleanOutline.length < 3) {
    throw new Error('Outline requires at least three points');
  }

  const halfThickness = thickness / 2;
  const vertices: Point3D[] = [];

  for (const [x, y] of cleanOutline) {
    vertices.push([x, y, -halfThickness]);
  }

  for (const [x, y] of cleanOutline) {
    vertices.push([x, y, halfThickness]);
  }

  const triangles: Triangle[] = [];
  const topTriangles = triangulatePolygon(cleanOutline);
  for (const [a, b, c] of topTriangles) {
    triangles.push([a, b, c]);
    triangles.push([cleanOutline.length + c, cleanOutline.length + b, cleanOutline.length + a]);
  }

  triangles.push(...buildSideTriangles(cleanOutline.length));

  return {
    vertices,
    triangles,
    outline: cleanOutline,
    thickness,
  };
}

export function getSolidBounds(mesh: SolidMesh): { min: Point3D; max: Point3D } {
  const min: Point3D = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: Point3D = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

  for (const [x, y, z] of mesh.vertices) {
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }

  return { min, max };
}