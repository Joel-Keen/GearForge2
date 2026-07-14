import { describe, expect, it } from 'vitest';
import { createGearParams, calculateGearMetrics } from '../domain';
import { buildGearOutline, buildGearToothOutlines, getInvoluteToothProfile, rotatePoints } from './gearProfile';
import { extrudeOutlineToSolid, getSolidBounds } from './gearSolid';

describe('gear profile helpers', () => {
  it('creates a symmetric involute tooth profile', () => {
    const params = createGearParams({ module: 1, teeth: 20, face_width: 10 });
    const metrics = calculateGearMetrics(params);
    const profile = getInvoluteToothProfile(params, metrics);

    expect(profile.leftFlank.length).toBeGreaterThan(2);
    expect(profile.rightFlank.length).toBeGreaterThan(2);
    expect(profile.outline[0]).toBeDefined();
    expect(profile.outline[profile.outline.length - 1]).not.toEqual(profile.outline[0]);
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

  it('builds a closed outline envelope from tooth outlines', () => {
    const params = createGearParams({ module: 1, teeth: 20, face_width: 10 });
    const metrics = calculateGearMetrics(params);
    const profile = getInvoluteToothProfile(params, metrics);
    const outlines = buildGearToothOutlines(params, profile);
    const outline = buildGearOutline(params, outlines, {}, metrics.root_radius);

    expect(outline.length).toBeGreaterThan(20);
    expect(outline[0]).toEqual(outline[outline.length - 1]);
    const radii = outline.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...radii)).toBeCloseTo(metrics.tip_radius, 1);
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(metrics.root_radius - 0.5);
  });

  it('extrudes the outline into a centered solid mesh', () => {
    const params = createGearParams({ module: 1, teeth: 20, face_width: 12.7 });
    const metrics = calculateGearMetrics(params);
    const profile = getInvoluteToothProfile(params, metrics);
    const outlines = buildGearToothOutlines(params, profile);
    const outline = buildGearOutline(params, outlines, {}, metrics.root_radius);
    const solid = extrudeOutlineToSolid(outline, params.face_width);
    const bounds = getSolidBounds(solid);

    expect(solid.vertices).toHaveLength(solid.outline.length * 2);
    expect(solid.triangles.length).toBeGreaterThan(outline.length);
    expect(bounds.min[2]).toBeCloseTo(-params.face_width / 2, 6);
    expect(bounds.max[2]).toBeCloseTo(params.face_width / 2, 6);
    expect(bounds.max[0]).toBeCloseTo(metrics.tip_radius, 1);
  });
});