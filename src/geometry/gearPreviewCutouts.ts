import type { GearCutout } from './gearCutouts';
import type { Point2D } from './gearProfile';

export type GearPreviewCutoutLoop = {
  kind: GearCutout['kind'];
  points: Point2D[];
  center: [number, number];
  radius?: number;
  width?: number;
  depth?: number;
};

function makeCircleLoop(center: [number, number], radius: number, segments: number): Point2D[] {
  const loop: Point2D[] = [];
  const pointCount = Math.max(12, segments);

  for (let index = 0; index < pointCount; index += 1) {
    const angle = (Math.PI * 2 * index) / pointCount;
    loop.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
  }

  return loop;
}

function makeRectangleLoop(center: [number, number], width: number, height: number): Point2D[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    [center[0] - halfWidth, center[1] - halfHeight],
    [center[0] + halfWidth, center[1] - halfHeight],
    [center[0] + halfWidth, center[1] + halfHeight],
    [center[0] - halfWidth, center[1] + halfHeight],
  ];
}

export function buildGearPreviewCutoutLoops(cutouts: GearCutout[], segments = 48): GearPreviewCutoutLoop[] {
  const loops: GearPreviewCutoutLoop[] = [];

  for (const cutout of cutouts) {
    if (cutout.kind === 'bore' || cutout.kind === 'pin-hole') {
      loops.push({
        kind: cutout.kind,
        center: cutout.center,
        radius: cutout.diameter / 2,
        points: makeCircleLoop(cutout.center, cutout.diameter / 2, segments),
      });
      continue;
    }

    loops.push({
      kind: cutout.kind,
      center: cutout.center,
      width: cutout.width,
      depth: cutout.depth,
      points: makeRectangleLoop(cutout.center, cutout.width, cutout.depth),
    });
  }

  return loops;
}