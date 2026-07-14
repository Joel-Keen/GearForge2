import type { GearParams } from '../domain';
import type { GearMetrics } from '../domain';

export type Point2D = [number, number];

export type ToothProfile = {
  leftFlank: Point2D[];
  rightFlank: Point2D[];
  outline: Point2D[];
};

export type GeometryProfileOptions = {
  sampleCount?: number;
};

export type GearOutlineOptions = {
  outlineSampleCount?: number;
};

function polarToCartesian(radius: number, angle: number): Point2D {
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function involuteFunction(t: number): number {
  return t - Math.atan(t);
}

function involutePoint(baseRadius: number, t: number): Point2D {
  const radius = baseRadius * Math.sqrt(1 + t * t);
  const angle = involuteFunction(t);
  return polarToCartesian(radius, angle);
}

function involuteParameterAtRadius(baseRadius: number, radius: number): number {
  const ratio = radius / baseRadius;
  return Math.sqrt(Math.max(0, ratio * ratio - 1));
}

function mirrorPoint(point: Point2D): Point2D {
  return [point[0], -point[1]];
}

function rotatePoint([x, y]: Point2D, angle: number): Point2D {
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  return [x * cosAngle - y * sinAngle, x * sinAngle + y * cosAngle];
}

function closePoints(points: Point2D[]): Point2D[] {
  if (points.length === 0) {
    return [];
  }

  const [firstX, firstY] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  if (firstX === lastX && firstY === lastY) {
    return points;
  }

  return [...points, points[0]];
}

function sampleRange(start: number, end: number, sampleCount: number): number[] {
  if (sampleCount <= 1) {
    return [start, end];
  }

  const values: number[] = [];
  const step = (end - start) / sampleCount;
  for (let index = 0; index <= sampleCount; index += 1) {
    values.push(start + step * index);
  }
  return values;
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let normalized = angle % twoPi;
  if (normalized < 0) {
    normalized += twoPi;
  }
  return normalized;
}

function pointRadius(point: Point2D): number {
  return Math.hypot(point[0], point[1]);
}

function pointAngle(point: Point2D): number {
  return normalizeAngle(Math.atan2(point[1], point[0]));
}

// Samples the root-circle arc strictly between two points, excluding both
// endpoints (the caller already has those from the adjacent tooth outlines).
function sampleArc(start: Point2D, end: Point2D, segments: number): Point2D[] {
  const radius = (pointRadius(start) + pointRadius(end)) / 2;
  const startAngle = pointAngle(start);
  let endAngle = pointAngle(end);
  if (endAngle <= startAngle) {
    endAngle += Math.PI * 2;
  }

  const points: Point2D[] = [];
  for (let index = 1; index < segments; index += 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    points.push(polarToCartesian(radius, angle));
  }
  return points;
}

function appendPoints(target: Point2D[], points: Point2D[]): void {
  const epsilon = 1e-6;
  for (const point of points) {
    const last = target[target.length - 1];
    if (!last || Math.abs(last[0] - point[0]) > epsilon || Math.abs(last[1] - point[1]) > epsilon) {
      target.push(point);
    }
  }
}

export function getInvoluteToothProfile(
  params: Pick<GearParams, 'module' | 'teeth' | 'pressure_angle' | 'resolution'>,
  metrics: Pick<GearMetrics, 'pitch_radius' | 'base_circle_radius' | 'tip_radius' | 'root_radius'>,
  options: GeometryProfileOptions = {},
): ToothProfile {
  const sampleCount = Math.max(4, options.sampleCount ?? Math.max(48, params.resolution));
  const halfToothThickness = Math.PI / (2 * params.teeth);
  const baseRadius = metrics.base_circle_radius;

  // The involute is only defined outside the base circle. If the root sits
  // inside the base circle, the flank starts at the base circle and a
  // straight radial line fills in down to the root circle.
  const flankStartRadius = Math.max(baseRadius, metrics.root_radius);
  const pitchT = involuteParameterAtRadius(baseRadius, metrics.pitch_radius);
  const startT = involuteParameterAtRadius(baseRadius, flankStartRadius);
  const tipT = Math.max(involuteParameterAtRadius(baseRadius, metrics.tip_radius), startT);

  // Standard involute tooth-thickness relation: angular half-thickness at
  // radius r = half-thickness at the pitch circle + inv(pressure angle at
  // pitch) - inv(pressure angle at r). Angular thickness must shrink as
  // radius grows, which is what makes the tooth taper to a point at the
  // tip rather than flare outward and self-intersect with its neighbour.
  const angleOffset = halfToothThickness + involuteFunction(pitchT);

  const flankSamples = sampleRange(startT, tipT, sampleCount).map((t) =>
    rotatePoint(mirrorPoint(involutePoint(baseRadius, t)), angleOffset),
  );

  const rightFlank: Point2D[] =
    metrics.root_radius < baseRadius
      ? [polarToCartesian(metrics.root_radius, pointAngle(flankSamples[0])), ...flankSamples]
      : flankSamples;

  // Mirroring about the tooth centreline gives the left flank, in the same
  // root-to-tip order as the right flank.
  const leftFlank = rightFlank.map(mirrorPoint);

  const tipArcStart = leftFlank[leftFlank.length - 1];
  const tipArcEnd = rightFlank[rightFlank.length - 1];
  const tipArc = sampleArc(tipArcStart, tipArcEnd, Math.max(2, Math.round(sampleCount / 4)));

  // Single continuous tooth silhouette: left root -> left flank -> tip arc
  // -> right flank -> right root, with angle increasing monotonically
  // throughout so the polygon cannot self-intersect. Left deliberately open
  // (not closed into its own polygon) so buildGearOutline can stitch teeth
  // together through the root circle between them.
  const outline: Point2D[] = [
    ...leftFlank,
    ...tipArc,
    ...rightFlank.slice().reverse(),
  ];

  return {
    leftFlank,
    rightFlank,
    outline,
  };
}

export function rotatePoints(points: Point2D[], angle: number): Point2D[] {
  return points.map((point) => rotatePoint(point, angle));
}

export function buildGearToothOutlines(
  params: Pick<GearParams, 'teeth'>,
  profile: ToothProfile,
): Point2D[][] {
  const outlines: Point2D[][] = [];
  const toothPitch = (Math.PI * 2) / params.teeth;

  for (let toothIndex = 0; toothIndex < params.teeth; toothIndex += 1) {
    outlines.push(rotatePoints(profile.outline, toothIndex * toothPitch));
  }

  return outlines;
}

export function buildGearOutline(
  params: Pick<GearParams, 'teeth'>,
  toothOutlines: Point2D[][],
  options: GearOutlineOptions = {},
  minimumRadius = 0,
): Point2D[] {
  void params;
  void minimumRadius; // retained for call-site compatibility; not needed by the corrected algorithm

  const arcSegments = Math.max(2, options.outlineSampleCount ?? 6);
  const outline: Point2D[] = [];

  for (let toothIndex = 0; toothIndex < toothOutlines.length; toothIndex += 1) {
    const currentTooth = toothOutlines[toothIndex];
    const nextTooth = toothOutlines[(toothIndex + 1) % toothOutlines.length];

    appendPoints(outline, currentTooth);

    const rootArcStart = currentTooth[currentTooth.length - 1];
    const rootArcEnd = nextTooth[0];
    appendPoints(outline, sampleArc(rootArcStart, rootArcEnd, arcSegments));
  }

  return closePoints(outline);
}
