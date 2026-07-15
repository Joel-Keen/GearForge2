# Gear STL Generator v2 – React / GitHub Pages Plan

## Context

The existing app is a FastAPI backend with a Python core: it validates gear parameters, builds a temporary OpenSCAD wrapper around `keyed-pinned-gear-v2-drummond-type.scad`, runs OpenSCAD to render STL output, and either streams the file back or parses it into triangle data for previews. It also exposes bulk export over a tooth range or list, and Windows-specific output-folder selection.

GitHub Pages serves static files only – there is no server-side Python or OpenSCAD available. v2 therefore drops OpenSCAD entirely and reimplements gear geometry directly in JavaScript/TypeScript using Three.js, as a single static frontend with no backend.

## Architecture

Single-page React app built with Vite. All gear geometry is generated client-side in TypeScript. STL is produced from a `THREE.BufferGeometry` via `STLExporter`.

## Build Steps

### 1. Port the parameter model - Done

Recreate the Pydantic model as a TypeScript interface/type, keeping the same field names, defaults, and validation ranges so derived-metric formulas and any saved parameter sets remain compatible. Validation moves from Pydantic to Zod (gives runtime validation and the TS type from one definition).

### 2. Port derived gear metrics - Done

Extract the metric calculations (pitch diameter, addendum/dedendum, outside diameter, etc.) into a standalone `gearMetrics.ts` module of pure functions. Unit-test these against known outputs from the existing Python/SCAD version before building anything on top of them.

### 3. Reimplement the gear solid - WIP

The core, highest-risk item:

- Involute tooth profile: generate the tooth curve points parametrically, build the full gear outline by array-rotating one tooth profile around the gear axis.
- Extrude the 2D outline to gear thickness (`THREE.ExtrudeGeometry`, or manual vertex/face construction if more control is needed).
- Keyway and pin holes: boolean-subtract from the extruded solid using a CSG library, since Three.js has no native CSG (`three-bvh-csg` recommended; `three-csg-ts` is an older, simpler alternative).

Validate dimensionally against existing STL output (bounding box, hole positions, tooth count) before moving on.

#### Stage 3 Implementation Part 1 - Done

Phase 3 should begin with a pure geometry layer that stays separate from rendering and STL export. The first code slice should be small enough to validate in isolation, but structured so later steps can reuse the same geometry primitives.

1. Create a dedicated `src/geometry/` module family.
	- Keep tooth-profile generation, outline construction, extrusion prep, and cutout helpers separate.
	- Consume `GearParams` and `GearMetrics` only through the shared domain layer.
	- Avoid React, Three.js scene code, and STL export in this first slice.

2. Implement the involute tooth profile first.
	- Generate a single tooth flank from the base circle up to the addendum circle.
	- Mirror it to create a closed tooth profile with predictable symmetry.
	- Parameterize the sampling density so later geometry quality tuning does not require a rewrite.

3. Add a deterministic outline builder next.
	- Assemble per-tooth geometry in a way that can later be unioned or extruded.
	- Keep root radius, addendum radius, and tooth pitch relationships explicit.
	- Make the output suitable for regression tests against known reference gears.

4. Validate the first slice before adding cutouts.
	- Check symmetry, radii, and tooth spacing for a simple known gear.
	- Keep the new helpers testable without browser APIs or Three.js runtime objects.
	- Use this boundary to unblock the later extrusion and boolean stages.

#### Stage 3 Implementation - Part 2 - Start here

1. Keyway position and size are good, but the meshing around the keyway is problematic. Need to revisit this part of the solid generator

2. Pin holes are problematically meshed as well, this needs looking at similar to the keyway meshing. Also the multiple holes aspect is not currently working, only two holes appear. This may be because of faulty assumptions in the legacy OPENSCAD file.


### 4. Port the engrave-name logic

Convert font outlines with `opentype.js`, extrude with `THREE.ExtrudeGeometry`, then CSG-union (embossed) or CSG-subtract (engraved) onto the gear solid, matching the current SCAD behaviour.


### 5. Single STL export

`THREE.STLExporter` on the finished `BufferGeometry`, output as a Blob, triggered via a standard anchor-download.

### 6. Bulk export

Loop client-side over the tooth range/list, generating each gear's geometry and STL blob in sequence (consider a Web Worker for large runs to avoid blocking the main thread). Collect into a zip with `JSZip` for a single download. Preserve the existing bulk-export result format (per-item success/failure, filenames) in the UI summary.

- Single gear: direct browser download.
- Bulk: zip download (step 7).
- Include a parameter dump for each gear in csv format with matching file names.

### 7. Pricing calculator (volume-based)

- Compute solid volume directly from the finished `BufferGeometry` (signed tetrahedron volume summed over triangles – no extra library needed).
- Add material parameters (density, cost per kg) and optionally a print-time estimate (simple heuristic, or a manual override field) to the parameter model.
- Cost = volume × density × cost-per-kg, surfaced alongside existing derived metrics, recomputed reactively whenever geometry regenerates.
- Extend the bulk-export result format to include per-item volume and cost, plus a total.


### 8. Multiple spline keyways

- Generalise the single-keyway parameter to an array: count, angular spacing (even or explicit angle list), width, depth, and profile type if supporting both straight and involute-spline keyways.
- CSG-subtract each keyway in a loop rather than once – watch performance, as CSG cost scales with boolean operation count.
- Validate against a simple even-spacing case (e.g. three keyways at 120°) before generalising to arbitrary angle lists.

### 9. Spacer bosses

- Add boss definitions to the parameter model: diameter, axial length, position (front/back face or both), optional own bore/keyway matching the parent gear's shaft.
- Geometry is an extruded cylinder (with keyway cut if present) CSG-unioned onto the gear face at the specified end.

### 10. Export to Bambu Studio

- Plain STL already imports into Bambu Studio, so the minimum viable version needs nothing beyond step 5.
- For a proper multi-part workflow (compound gears, bulk runs), 3MF is the better target: Bambu Studio reads 3MF project files with multiple objects pre-arranged on the plate, which STL-per-file plus manual arrangement cannot do. There is no mature JS 3MF writer, so this likely means writing a minimal 3MF (zip + XML) exporter scoped to object placement only, not slicer settings or AMS/colour metadata unless required.
- Treat as a distinct, separable milestone – file-format work, not geometry work, and can be built and tested independently of everything else.

### 11. Stacked compound gears

- Extend the parameter model from a single gear to an ordered array of gear-layer definitions (tooth count, module, thickness, bore, etc. per layer), sharing one axis.
- Build each layer's solid independently, translate along Z by cumulative thickness, then CSG-union the layers into one solid, or keep them as separate meshes in one scene for independent colouring/editing in the preview.
- Decide export behaviour up front: single fused STL per stack, versus one STL per layer – likely worth supporting both.
- Add UI to add/remove/reorder layers – the main new UI surface for this step.
