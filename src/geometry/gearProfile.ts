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

function mirrorPoint(point: Point2D): Point2D {
  return [point[0], -point[1]];
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

export function getInvoluteToothProfile(
  params: Pick<GearParams, 'module' | 'teeth' | 'pressure_angle'>,
  metrics: Pick<GearMetrics, 'pitch_radius' | 'base_circle_radius' | 'tip_radius' | 'root_radius'>,
  options: GeometryProfileOptions = {},
): ToothProfile {
  const sampleCount = options.sampleCount ?? 12;
  const pitchAngle = Math.PI / params.teeth;
  const pitchBaseRatio = metrics.pitch_radius / metrics.base_circle_radius;
  const tipBaseRatio = metrics.tip_radius / metrics.base_circle_radius;
  const pitchInvolute = Math.sqrt(Math.max(0, pitchBaseRatio * pitchBaseRatio - 1));
  const tipInvolute = Math.sqrt(Math.max(0, tipBaseRatio * tipBaseRatio - 1));
  const toothOffset = pitchAngle / 2 - involuteFunction(pitchInvolute);
  const flankSamples = sampleRange(0, tipInvolute, sampleCount).map((t) => {
    const [x, y] = involutePoint(metrics.base_circle_radius, t);
    return [x * Math.cos(toothOffset) - y * Math.sin(toothOffset), x * Math.sin(toothOffset) + y * Math.cos(toothOffset)] as Point2D;
  });

  const rightFlank = flankSamples;
  const leftFlank = flankSamples.map(mirrorPoint).reverse();
  const tipArcStart = leftFlank[leftFlank.length - 1] ?? [metrics.tip_radius, 0];
  const tipArcEnd = rightFlank[rightFlank.length - 1] ?? [metrics.tip_radius, 0];
  const tipArcStartAngle = Math.atan2(tipArcStart[1], tipArcStart[0]);
  const tipArcEndAngle = Math.atan2(tipArcEnd[1], tipArcEnd[0]);
  const tipArcSamples = sampleRange(tipArcStartAngle, tipArcEndAngle, Math.max(2, sampleCount / 2)).map((angle) =>
    polarToCartesian(metrics.tip_radius, angle),
  );

  const rootLeft = polarToCartesian(metrics.root_radius, -pitchAngle / 2);
  const rootRight = polarToCartesian(metrics.root_radius, pitchAngle / 2);
  const outline = closePoints([rootLeft, ...leftFlank, ...tipArcSamples, ...rightFlank.slice(1), rootRight]);

  return {
    leftFlank,
    rightFlank,
    outline,
  };
}

export function rotatePoints(points: Point2D[], angle: number): Point2D[] {
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  return points.map(([x, y]) => [x * cosAngle - y * sinAngle, x * sinAngle + y * cosAngle]);
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