import { z } from 'zod';

const gearDefaults = {
  module: 1,
  teeth: 20,
  face_width: 10,
  pressure_angle: 20,
  bore_diameter: 0,
  resolution: 64,
  unit_mode: 'metric' as const,
  optimized: false,
  keywayed: false,
  key_width: 3.2,
  key_depth: 3.5,
  pinned: false,
  pin_diameter: 4.75,
  pin_pcd: 25.4,
  pin_number: 2,
  engrave_name: '',
};

const positiveFinite = z.number().finite().gt(0);

export const gearSchema = z
  .object({
    module: positiveFinite.default(gearDefaults.module),
    teeth: z.number().int().min(3).max(400).default(gearDefaults.teeth),
    face_width: positiveFinite.default(gearDefaults.face_width),
    pressure_angle: z.number().finite().gt(0).lt(45).default(gearDefaults.pressure_angle),
    bore_diameter: z.number().finite().min(0).default(gearDefaults.bore_diameter),
    resolution: z.number().int().min(16).max(256).default(gearDefaults.resolution),
    unit_mode: z.enum(['metric', 'imperial']).default(gearDefaults.unit_mode),
    optimized: z.boolean().default(gearDefaults.optimized),
    keywayed: z.boolean().default(gearDefaults.keywayed),
    key_width: positiveFinite.default(gearDefaults.key_width),
    key_depth: positiveFinite.default(gearDefaults.key_depth),
    pinned: z.boolean().default(gearDefaults.pinned),
    pin_diameter: positiveFinite.default(gearDefaults.pin_diameter),
    pin_pcd: positiveFinite.default(gearDefaults.pin_pcd),
    pin_number: z.number().int().min(1).max(8).default(gearDefaults.pin_number),
    engrave_name: z.string().default(gearDefaults.engrave_name),
  })
  .strict()
  .superRefine((params, context) => {
    const pitch_radius = (params.module * params.teeth) / 2;
    const root_radius = pitch_radius - params.module * 1.25;
    const max_bore_radius = root_radius - 1;

    if (params.bore_diameter > 0 && params.bore_diameter / 2 >= max_bore_radius) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bore_diameter'],
        message: 'Bore diameter too large for this gear',
      });
    }
  });

export type GearParams = z.infer<typeof gearSchema>;

export function createGearParams(input: Partial<GearParams> = {}): GearParams {
  return gearSchema.parse(input);
}

export function isValidGearParams(input: unknown): input is GearParams {
  return gearSchema.safeParse(input).success;
}

export function getGearDefaults(): GearParams {
  return createGearParams();
}

export { gearDefaults };