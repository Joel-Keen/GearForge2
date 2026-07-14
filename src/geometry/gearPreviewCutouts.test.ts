import { describe, expect, it } from 'vitest';
import { createGearParams, calculateGearMetrics } from '../domain';
import { buildGearCutouts, buildGearPreviewCutoutLoops } from './index';

describe('gear preview cutout loops', () => {
  it('keeps bore, keyway, and pin-hole preview geometry aligned with the cutout descriptors', () => {
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
    const previewLoops = buildGearPreviewCutoutLoops(cutouts, 32);

    expect(previewLoops).toHaveLength(4);

    const bore = previewLoops.find((loop) => loop.kind === 'bore');
    expect(bore).toMatchObject({ center: [0, 0], radius: 3 });
    expect(bore?.points).toHaveLength(32);

    const keyway = previewLoops.find((loop) => loop.kind === 'keyway');
    expect(keyway).toMatchObject({ center: [0, metrics.root_radius / 2], width: params.key_width, depth: params.key_depth });
    expect(keyway?.points).toEqual([
      [-(params.key_width / 2), metrics.root_radius / 2 - params.key_depth / 2],
      [params.key_width / 2, metrics.root_radius / 2 - params.key_depth / 2],
      [params.key_width / 2, metrics.root_radius / 2 + params.key_depth / 2],
      [-(params.key_width / 2), metrics.root_radius / 2 + params.key_depth / 2],
    ]);

    const pinHoles = previewLoops.filter((loop) => loop.kind === 'pin-hole');
    expect(pinHoles).toHaveLength(2);
    expect(pinHoles[0]?.center[0]).toBeCloseTo(-params.pin_pcd / 2, 6);
    expect(pinHoles[1]?.center[0]).toBeCloseTo(params.pin_pcd / 2, 6);
  });
});