import type { GearParams } from '../domain';
import type { GearMetrics } from '../domain';
import { buildGearCutouts, countGearCutouts, type GearCutout } from './gearCutouts';
import { buildGearOutline, buildGearToothOutlines, getInvoluteToothProfile } from './gearProfile';
import { extrudeOutlineToSolid, extrudeOutlineWithCircularHoleToSolid } from './gearSolid';
import type { SolidMesh } from './gearSolid';

export type GearSolid = SolidMesh & {
  cutouts: GearCutout[];
  cutoutCounts: Record<GearCutout['kind'], number>;
};

export function buildGearSolid(params: GearParams, metrics: GearMetrics): GearSolid {
  const profile = getInvoluteToothProfile(params, metrics);
  const toothOutlines = buildGearToothOutlines(params, profile);
  const outline = buildGearOutline(params, toothOutlines, {}, metrics.root_radius);
  const solid = params.bore_diameter > 0
    ? extrudeOutlineWithCircularHoleToSolid(outline, params.face_width, params.bore_diameter / 2)
    : extrudeOutlineToSolid(outline, params.face_width);
  const cutouts = buildGearCutouts(params, metrics);

  return {
    ...solid,
    cutouts,
    cutoutCounts: countGearCutouts(cutouts),
  };
}