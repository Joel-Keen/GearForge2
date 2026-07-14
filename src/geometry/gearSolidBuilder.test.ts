import { describe, expect, it } from 'vitest';
import { createGearParams, calculateGearMetrics } from '../domain';
import { buildGearSolid } from './gearSolidBuilder';
import { getSolidBounds } from './gearSolid';

describe('gear solid builder', () => {
  it('combines the outline solid with cutout metadata', () => {
    const params = createGearParams({
      module: 1,
      teeth: 20,
      face_width: 12.7,
      bore_diameter: 6,
      keywayed: true,
      pinned: true,
      pin_number: 2,
    });
    const metrics = calculateGearMetrics(params);
    const solid = buildGearSolid(params, metrics);
    const bounds = getSolidBounds(solid);

    expect(solid.cutouts).toHaveLength(4);
    expect(solid.cutoutCounts).toEqual({ bore: 1, keyway: 1, 'pin-hole': 2 });
    expect(bounds.min[2]).toBeCloseTo(-params.face_width / 2, 6);
    expect(bounds.max[2]).toBeCloseTo(params.face_width / 2, 6);
    expect(solid.vertices.length).toBeGreaterThan(0);
    expect(solid.triangles.length).toBeGreaterThan(0);
  });
});