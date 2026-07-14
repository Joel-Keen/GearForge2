import { describe, expect, it } from 'vitest';
import { createGearParams, gearSchema } from './gear';
import { calculateGearMetrics, toLegacyV1Metrics } from './gearMetrics';

describe('gear schema', () => {
  it('fills the v1-compatible defaults', () => {
    const params = createGearParams({ module: 2.5, teeth: 24, face_width: 12.7 });

    expect(params).toMatchObject({
      module: 2.5,
      teeth: 24,
      face_width: 12.7,
      pressure_angle: 20,
      bore_diameter: 0,
      resolution: 64,
      unit_mode: 'metric',
      optimized: false,
      keywayed: false,
      key_width: 3.2,
      key_depth: 3.5,
      pinned: false,
      pin_diameter: 4.75,
      pin_pcd: 25.4,
      pin_number: 2,
      engrave_name: '',
    });
  });

  it('rejects an oversized bore diameter', () => {
    const result = gearSchema.safeParse({
      module: 2,
      teeth: 10,
      face_width: 5,
      bore_diameter: 16,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['bore_diameter']);
    }
  });
});

describe('gear metrics', () => {
  it('matches the v1 diameter calculations', () => {
    const metrics = calculateGearMetrics({
      module: 1,
      teeth: 20,
      pressure_angle: 20,
    });

    expect(metrics.pitch_diameter).toBeCloseTo(20, 3);
    expect(metrics.tip_diameter).toBeCloseTo(22, 3);
    expect(metrics.root_diameter).toBeCloseTo(17.5, 3);
    expect(metrics.base_circle_diameter).toBeCloseTo(18.794, 3);
    expect(metrics.circular_pitch).toBeCloseTo(Math.PI, 3);
  });

  it('preserves the legacy v1 preview metric shape', () => {
    const metrics = toLegacyV1Metrics({
      module: 1,
      teeth: 20,
      pressure_angle: 20,
    });

    expect(metrics).toEqual({
      pitch_diameter: 20,
      tip_diameter: 22,
      root_diameter: 17.5,
      base_circle: 18.794,
      circular_pitch: 3.142,
    });
  });
});