import { describe, expect, it } from 'vitest';
import { createGearParams, calculateGearMetrics } from '../domain';
import { buildGearToothOutlines, getInvoluteToothProfile, rotatePoints } from './gearProfile';

describe('gear profile helpers', () => {
  it('creates a symmetric involute tooth profile', () => {
    const params = createGearParams({ module: 1, teeth: 20, face_width: 10 });
    const metrics = calculateGearMetrics(params);
    const profile = getInvoluteToothProfile(params, metrics);

    expect(profile.leftFlank.length).toBeGreaterThan(2);
    expect(profile.rightFlank.length).toBeGreaterThan(2);
    expect(profile.outline[0]).toBeDefined();
    expect(profile.outline[profile.outline.length - 1]).toEqual(profile.outline[0]);
  });

  it('rotates points around the origin', () => {
    const rotated = rotatePoints([[1, 0]], Math.PI / 2);
    expect(rotated[0][0]).toBeCloseTo(0, 6);
    expect(rotated[0][1]).toBeCloseTo(1, 6);
  });

  it('builds one rotated outline per tooth', () => {
    const params = createGearParams({ module: 1, teeth: 12, face_width: 10 });
    const metrics = calculateGearMetrics(params);
    const profile = getInvoluteToothProfile(params, metrics);
    const outlines = buildGearToothOutlines(params, profile);

    expect(outlines).toHaveLength(12);
    expect(outlines[0][0]).toBeDefined();
    expect(outlines[1][0]).toBeDefined();
  });
});