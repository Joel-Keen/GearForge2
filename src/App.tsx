import { useMemo, useState } from 'react';
import { createGearParams } from './domain';
import { calculateGearMetrics, formatGearMetrics, toLegacyV1Metrics } from './domain';
import { buildGearSolid } from './geometry';
import { GearPreview } from './preview';

const defaultParams = createGearParams();

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function App() {
  const [moduleValue, setModuleValue] = useState(defaultParams.module);
  const [teeth, setTeeth] = useState(defaultParams.teeth);
  const [faceWidth, setFaceWidth] = useState(defaultParams.face_width);
  const [pressureAngle, setPressureAngle] = useState(defaultParams.pressure_angle);
  const [boreDiameter, setBoreDiameter] = useState(defaultParams.bore_diameter);
  const [keywayed, setKeywayed] = useState(defaultParams.keywayed);
  const [pinned, setPinned] = useState(defaultParams.pinned);
  const [pinNumber, setPinNumber] = useState(defaultParams.pin_number);

  const params = useMemo(
    () =>
      createGearParams({
        module: moduleValue,
        teeth,
        face_width: faceWidth,
        pressure_angle: pressureAngle,
        bore_diameter: boreDiameter,
        keywayed,
        pinned,
        pin_number: pinNumber,
      }),
    [moduleValue, teeth, faceWidth, pressureAngle, boreDiameter, keywayed, pinned, pinNumber],
  );

  const metrics = useMemo(() => calculateGearMetrics(params), [params]);
  const displayMetrics = useMemo(() => formatGearMetrics(metrics), [metrics]);
  const legacyMetrics = useMemo(() => toLegacyV1Metrics(params), [params]);
  const solid = useMemo(() => buildGearSolid(params, metrics), [params, metrics]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">GearForge2 local preview</p>
        <h1>Preview the gear solid in-browser.</h1>
        <p className="lede">
          This page now renders the generated gear solid directly in a local Three.js viewport,
          so you can test the geometry without leaving the app.
        </p>
      </section>

      <section className="preview-layout">
        <aside className="controls card">
          <h2>Test Parameters</h2>
          <label>
            Module
            <input type="number" min="0.1" step="0.1" value={moduleValue} onChange={(event) => setModuleValue(parseNumber(event.currentTarget.value))} />
          </label>
          <label>
            Teeth
            <input type="number" min="3" max="400" step="1" value={teeth} onChange={(event) => setTeeth(Math.max(3, Math.min(400, Math.round(parseNumber(event.currentTarget.value)))))} />
          </label>
          <label>
            Face width
            <input type="number" min="0.1" step="0.1" value={faceWidth} onChange={(event) => setFaceWidth(Math.max(0.1, parseNumber(event.currentTarget.value)))} />
          </label>
          <label>
            Pressure angle
            <input type="number" min="1" max="44.9" step="0.1" value={pressureAngle} onChange={(event) => setPressureAngle(Math.max(1, Math.min(44.9, parseNumber(event.currentTarget.value))))} />
          </label>
          <label>
            Bore diameter
            <input type="number" min="0" step="0.1" value={boreDiameter} onChange={(event) => setBoreDiameter(Math.max(0, parseNumber(event.currentTarget.value)))} />
          </label>
          <label>
            <input type="checkbox" checked={keywayed} onChange={(event) => setKeywayed(event.currentTarget.checked)} />
            Keywayed
          </label>
          <label>
            <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.currentTarget.checked)} />
            Pinned
          </label>
          <label>
            Pin number
            <input type="number" min="1" max="8" step="1" value={pinNumber} onChange={(event) => setPinNumber(Math.max(1, Math.min(8, Math.round(parseNumber(event.currentTarget.value)))))} />
          </label>
        </aside>

        <section className="viewport card">
          <div className="viewport-header">
            <div>
              <h2>3D Preview</h2>
              <p>Use mouse drag to orbit. Scroll to zoom.</p>
            </div>
            <div className="viewport-stats">
              <span>{solid.vertices.length} vertices</span>
              <span>{solid.triangles.length} triangles</span>
              <span>{solid.cutouts.length} cutouts</span>
            </div>
          </div>
          <GearPreview mesh={solid} params={params} metrics={metrics} />
        </section>
      </section>

      <section className="card-grid metrics-grid">
        <article className="card">
          <h2>Default parameters</h2>
          <pre>{JSON.stringify(params, null, 2)}</pre>
        </article>

        <article className="card">
          <h2>Derived metrics</h2>
          <pre>{JSON.stringify(metrics, null, 2)}</pre>
        </article>

        <article className="card">
          <h2>Display metrics</h2>
          <pre>{JSON.stringify(displayMetrics, null, 2)}</pre>
        </article>

        <article className="card">
          <h2>Legacy v1 shape</h2>
          <pre>{JSON.stringify(legacyMetrics, null, 2)}</pre>
        </article>
      </section>
    </main>
  );
}