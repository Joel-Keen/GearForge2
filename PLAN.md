# Gear STL Generator v2 – React / GitHub Pages Plan

## Context

The existing app is a FastAPI backend with a Python core: it validates gear parameters, builds a temporary OpenSCAD wrapper around `keyed-pinned-gear-v2-drummond-type.scad`, runs OpenSCAD to render STL output, and either streams the file back or parses it into triangle data for previews. It also exposes bulk export over a tooth range or list, and Windows-specific output-folder selection.

GitHub Pages serves static files only – there is no server-side Python or OpenSCAD available. v2 therefore drops OpenSCAD entirely and reimplements gear geometry directly in JavaScript/TypeScript using Three.js, as a single static frontend with no backend.

## Architecture

Single-page React app built with Vite. All gear geometry is generated client-side in TypeScript. STL is produced from a `THREE.BufferGeometry` via `STLExporter`.

## Build Steps

### 1. Port the parameter model

Recreate the Pydantic model as a TypeScript interface/type, keeping the same field names, defaults, and validation ranges so derived-metric formulas and any saved parameter sets remain compatible. Validation moves from Pydantic to Zod (gives runtime validation and the TS type from one definition).

### 2. Port derived gear metrics

Extract the metric calculations (pitch diameter, addendum/dedendum, outside diameter, etc.) into a standalone `gearMetrics.ts` module of pure functions. Unit-test these against known outputs from the existing Python/SCAD version before building anything on top of them.

### 3. Reimplement the gear solid

The core, highest-risk item:

- Involute tooth profile: generate the tooth curve points parametrically, build the full gear outline by array-rotating one tooth profile around the gear axis.
- Extrude the 2D outline to gear thickness (`THREE.ExtrudeGeometry`, or manual vertex/face construction if more control is needed).
- Keyway and pin holes: boolean-subtract from the extruded solid using a CSG library, since Three.js has no native CSG (`three-bvh-csg` recommended; `three-csg-ts` is an older, simpler alternative).

Validate dimensionally against existing STL output (bounding box, hole positions, tooth count) before moving on.

### 4. Port the engrave-name logic

Convert font outlines with `opentype.js`, extrude with `THREE.ExtrudeGeometry`, then CSG-union (embossed) or CSG-subtract (engraved) onto the gear solid, matching the current SCAD behaviour.

### 5. Preview

Render the same `BufferGeometry` used for export directly in a `@react-three/fiber` (or plain Three.js) canvas. This removes the need for a separate preview-mesh endpoint or triangle-parsing step, since geometry lives in-browser from the start – a deliberate simplification versus v1.

### 6. Single STL export

`THREE.STLExporter` on the finished `BufferGeometry`, output as a Blob, triggered via a standard anchor-download. Preserve binary vs ASCII STL choice if v1 exposed one.

### 7. Bulk export

Loop client-side over the tooth range/list, generating each gear's geometry and STL blob in sequence (consider a Web Worker for large runs to avoid blocking the main thread). Collect into a zip with `JSZip` for a single download. Preserve the existing bulk-export result format (per-item success/failure, filenames) in the UI summary.

### 8. Drop Windows-specific I/O

No folder picker, no local file writes. Replace with:

- Single gear: direct browser download.
- Bulk: zip download (step 7).
- Optional enhancement (Chromium-only, not a hard dependency): File System Access API for saving directly to a chosen folder, with zip download as fallback elsewhere.

### 9. Deployment

- Vite + `vite-plugin-gh-pages`, or a manual GitHub Actions workflow (`actions/deploy-pages`) building to `dist/` on push to main.
- Set `base` in `vite.config.ts` to the repo name for correct asset paths under `username.github.io/repo`.
- CSG and font libraries add meaningful bundle size – check chunk sizes and lazy-load the CSG module if it is only needed on generate, not on initial page load.

### 10. Pricing calculator (volume-based)

- Compute solid volume directly from the finished `BufferGeometry` (signed tetrahedron volume summed over triangles – no extra library needed).
- Add material parameters (density, cost per kg) and optionally a print-time estimate (simple heuristic, or a manual override field) to the parameter model.
- Cost = volume × density × cost-per-kg, surfaced alongside existing derived metrics, recomputed reactively whenever geometry regenerates.
- Extend the bulk-export result format to include per-item volume and cost, plus a total.

### 11. Stacked compound gears

- Extend the parameter model from a single gear to an ordered array of gear-layer definitions (tooth count, module, thickness, bore, etc. per layer), sharing one axis.
- Build each layer's solid independently, translate along Z by cumulative thickness, then CSG-union the layers into one solid, or keep them as separate meshes in one scene for independent colouring/editing in the preview.
- Decide export behaviour up front: single fused STL per stack, versus one STL per layer – likely worth supporting both.
- Add UI to add/remove/reorder layers – the main new UI surface for this step.

### 12. Multiple spline keyways

- Generalise the single-keyway parameter to an array: count, angular spacing (even or explicit angle list), width, depth, and profile type if supporting both straight and involute-spline keyways.
- CSG-subtract each keyway in a loop rather than once – watch performance, as CSG cost scales with boolean operation count.
- Validate against a simple even-spacing case (e.g. three keyways at 120°) before generalising to arbitrary angle lists.

### 13. Spacer bosses

- Add boss definitions to the parameter model: diameter, axial length, position (front/back face or both), optional own bore/keyway matching the parent gear's shaft.
- Geometry is an extruded cylinder (with keyway cut if present) CSG-unioned onto the gear face at the specified end.
- Check whether this can share geometry code with step 11, since bosses are effectively a simplified stack layer.

### 14. Export to Bambu Studio

- Plain STL already imports into Bambu Studio, so the minimum viable version needs nothing beyond step 5.
- For a proper multi-part workflow (compound gears, bulk runs), 3MF is the better target: Bambu Studio reads 3MF project files with multiple objects pre-arranged on the plate, which STL-per-file plus manual arrangement cannot do. There is no mature JS 3MF writer, so this likely means writing a minimal 3MF (zip + XML) exporter scoped to object placement only, not slicer settings or AMS/colour metadata unless required.
- Treat as a distinct, separable milestone – file-format work, not geometry work, and can be built and tested independently of everything else.

## Suggested Build Order

1. Parameter model + derived metrics (unit tested against v1 output)
2. Basic tooth profile + extrusion, no holes/keyway – validate against a known simple gear
3. Pin holes and keyway via CSG
4. Preview rendering
5. Single STL export/download
6. Engrave-name
7. Bulk export + zip
8. GitHub Pages deployment pipeline
9. Volume + pricing calculator
10. Compound gear stacking
11. Multiple spline keyways
12. Spacer bosses
13. Bambu Studio 3MF export

Steps 2 to 4 carry the most technical uncertainty and are worth timeboxing and validating early, before the rest of the UI is built on top of them.