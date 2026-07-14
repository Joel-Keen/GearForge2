import type { GearParams } from './gear';

export type GearMetrics = {
  pitch_radius: number;
  tip_radius: number;
  root_radius: number;
  base_circle_radius: number;
  pitch_diameter: number;
  tip_diameter: number;
  root_diameter: number;
  base_circle_diameter: number;
  circular_pitch: number;
  addendum: number;
  dedendum: number;
  clearance: number;
};

export type LegacyV1Metrics = {
  pitch_diameter: number;
  tip_diameter: number;
  root_diameter: number;
  base_circle: number;
  circular_pitch: number;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function calculateGearMetrics(params: Pick<GearParams, 'module' | 'teeth' | 'pressure_angle'>): GearMetrics {
  const pitch_radius = (params.module * params.teeth) / 2;
  const addendum = params.module;
  const dedendum = params.module * 1.25;
  const tip_radius = pitch_radius + addendum;
  const root_radius = pitch_radius - dedendum;
  const base_circle_radius = pitch_radius * Math.cos((params.pressure_angle * Math.PI) / 180);

  return {
    pitch_radius: round3(pitch_radius),
    tip_radius: round3(tip_radius),
    root_radius: round3(root_radius),
    base_circle_radius: round3(base_circle_radius),
    pitch_diameter: round3(pitch_radius * 2),
    tip_diameter: round3(tip_radius * 2),
    root_diameter: round3(root_radius * 2),
    base_circle_diameter: round3(base_circle_radius * 2),
    circular_pitch: round3(Math.PI * params.module),
    addendum: round3(addendum),
    dedendum: round3(dedendum),
    clearance: round3(dedendum - addendum),
  };
}

export function toLegacyV1Metrics(params: Pick<GearParams, 'module' | 'teeth' | 'pressure_angle'>): LegacyV1Metrics {
  const metrics = calculateGearMetrics(params);

  return {
    pitch_diameter: metrics.pitch_diameter,
    tip_diameter: metrics.tip_diameter,
    root_diameter: metrics.root_diameter,
    base_circle: metrics.base_circle_diameter,
    circular_pitch: metrics.circular_pitch,
  };
}