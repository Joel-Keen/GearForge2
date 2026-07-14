import { describe, expect, it } from 'vitest';
import { createGearParams, calculateGearMetrics } from '../domain';
import { buildGearCutouts, countGearCutouts } from './gearCutouts';

describe('gear cutout descriptors', () => {
  it('builds bore, keyway, and pin-hole descriptors from params', () => {
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
    const cutouts = buildGearCutouts(params, metrics);

    expect(countGearCutouts(cutouts)).toEqual({
      bore: 1,
      keyway: 1,
      'pin-hole': 2,
    });
    expect(cutouts[0]).toMatchObject({ kind: 'bore', center: [0, 0], zMin: -6.35, zMax: 6.35 });
    expect(cutouts.some((cutout) => cutout.kind === 'keyway')).toBe(true);
    expect(cutouts.filter((cutout) => cutout.kind === 'pin-hole')).toHaveLength(2);
  });
});