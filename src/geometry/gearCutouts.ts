import type { GearParams } from '../domain';
import type { GearMetrics } from '../domain';

export type GearCutoutBase = {
  kind: 'bore' | 'keyway' | 'pin-hole';
};

export type BoreCutout = GearCutoutBase & {
  kind: 'bore';
  diameter: number;
  center: [number, number];
  zMin: number;
  zMax: number;
};

export type KeywayCutout = GearCutoutBase & {
  kind: 'keyway';
  width: number;
  depth: number;
  center: [number, number];
  zMin: number;
  zMax: number;
};

export type PinHoleCutout = GearCutoutBase & {
  kind: 'pin-hole';
  diameter: number;
  center: [number, number];
  zMin: number;
  zMax: number;
};

export type GearCutout = BoreCutout | KeywayCutout | PinHoleCutout;

function getAxialSpan(faceWidth: number): [number, number] {
  const halfWidth = faceWidth / 2;
  return [-halfWidth, halfWidth];
}

export function buildGearCutouts(params: GearParams, metrics: Pick<GearMetrics, 'root_radius'>): GearCutout[] {
  const cutouts: GearCutout[] = [];
  const [zMin, zMax] = getAxialSpan(params.face_width);

  if (params.bore_diameter > 0) {
    cutouts.push({
      kind: 'bore',
      diameter: params.bore_diameter,
      center: [0, 0],
      zMin,
      zMax,
    });
  }

  if (params.keywayed) {
    cutouts.push({
      kind: 'keyway',
      width: params.key_width,
      depth: params.key_depth,
      center: [0, metrics.root_radius / 2],
      zMin,
      zMax,
    });
  }

  if (params.pinned) {
    const spacing = params.pin_number === 1 ? 0 : params.pin_pcd / 2;
    for (let index = 0; index < params.pin_number; index += 1) {
      const offset = params.pin_number === 1 ? 0 : index === 0 ? -spacing : spacing;
      cutouts.push({
        kind: 'pin-hole',
        diameter: params.pin_diameter,
        center: [offset, 0],
        zMin,
        zMax,
      });
    }
  }

  return cutouts;
}

export function countGearCutouts(cutouts: GearCutout[]): Record<GearCutout['kind'], number> {
  return cutouts.reduce(
    (counts, cutout) => {
      counts[cutout.kind] += 1;
      return counts;
    },
    { bore: 0, keyway: 0, 'pin-hole': 0 },
  );
}