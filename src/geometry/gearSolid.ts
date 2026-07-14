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

function almostEqualPoint(a: Point2D, b: Point2D): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function pushPoint(points: Point2D[], point: Point2D): void {
  const lastPoint = points[points.length - 1];
  if (!lastPoint || !almostEqualPoint(lastPoint, point)) {
    points.push(point);
  }
}

function makeCircleLoop(radius: number, segments: number): Point2D[] {
  const loop: Point2D[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    loop.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return loop;
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let normalized = angle % twoPi;
  if (normalized < 0) {
    normalized += twoPi;
  }
  return normalized;
}

function pointAngle(point: Point2D): number {
  return normalizeAngle(Math.atan2(point[1], point[0]));
}

function pointDistance(a: Point2D, b: Point2D): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function findNearestAngleIndex(points: Point2D[], targetAngle: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const angle = pointAngle(point);
    const distance = Math.min(Math.abs(angle - targetAngle), Math.PI * 2 - Math.abs(angle - targetAngle));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function walkLoop(points: Point2D[], startIndex: number, endIndex: number, forward: boolean): Point2D[] {
  const walked: Point2D[] = [];
  const length = points.length;

  if (length === 0) {
    return walked;
  }

  let index = startIndex;
  for (let guard = 0; guard < length; guard += 1) {
    walked.push(points[index]);
    if (index === endIndex) {
      break;
    }
    index = forward ? (index + 1) % length : (index - 1 + length) % length;
  }

  return walked;
}

function buildPolygonWithCircularHole(
  outerOutline: Point2D[],
  holeRadius: number,
  holeSegments: number,
): Point2D[] {
  const cleanOuter = dedupeClosingPoint(outerOutline);
  const innerLoop = makeCircleLoop(holeRadius, Math.max(12, holeSegments));
  const bridgeDelta = Math.PI / Math.max(12, holeSegments);
  const outerStartIndex = findNearestAngleIndex(cleanOuter, 0);
  const outerEndIndex = findNearestAngleIndex(cleanOuter, bridgeDelta);
  const innerStartIndex = findNearestAngleIndex(innerLoop, bridgeDelta);
  const innerEndIndex = findNearestAngleIndex(innerLoop, 0);

  const polygon: Point2D[] = [];
  const outerSpan = walkLoop(cleanOuter, outerStartIndex, outerEndIndex, true);
  const innerSpan = walkLoop(innerLoop, innerStartIndex, innerEndIndex, false);

  for (const point of outerSpan) {
    pushPoint(polygon, point);
  }

  pushPoint(polygon, innerLoop[innerStartIndex]);

  for (const point of innerSpan) {
    pushPoint(polygon, point);
  }

  pushPoint(polygon, cleanOuter[outerStartIndex]);

  return closeLoop(polygon);
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

function closeLoop(points: Point2D[]): Point2D[] {
  if (points.length === 0) {
    return [];
  }

  const closed = points.slice();
  const firstPoint = closed[0];
  const lastPoint = closed[closed.length - 1];
  if (!almostEqualPoint(firstPoint, lastPoint)) {
    closed.push(firstPoint);
  }

  return closed;
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

function extrudePolygonToSolid(polygon: Point2D[], thickness: number): SolidMesh {
  const cleanPolygon = dedupeClosingPoint(polygon);
  if (cleanPolygon.length < 3) {
    throw new Error('Outline requires at least three points');
  }

  const halfThickness = thickness / 2;
  const vertices: Point3D[] = [];

  for (const [x, y] of cleanPolygon) {
    vertices.push([x, y, -halfThickness]);
  }

  for (const [x, y] of cleanPolygon) {
    vertices.push([x, y, halfThickness]);
  }

  const triangles: Triangle[] = [];
  const topTriangles = triangulatePolygon(cleanPolygon);
  for (const [a, b, c] of topTriangles) {
    triangles.push([a, b, c]);
    triangles.push([cleanPolygon.length + c, cleanPolygon.length + b, cleanPolygon.length + a]);
  }

  triangles.push(...buildSideTriangles(cleanPolygon.length));

  return {
    vertices,
    triangles,
    outline: cleanPolygon,
    thickness,
  };
}

export function extrudeOutlineToSolid(outline: Point2D[], thickness: number): SolidMesh {
  return extrudePolygonToSolid(outline, thickness);
}

export function extrudeOutlineWithCircularHoleToSolid(
  outline: Point2D[],
  thickness: number,
  holeRadius: number,
  holeSegments = 48,
): SolidMesh {
  const polygon = buildPolygonWithCircularHole(outline, holeRadius, holeSegments);
  return extrudePolygonToSolid(polygon, thickness);
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