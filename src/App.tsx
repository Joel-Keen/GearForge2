import { createGearParams } from './domain';
import { calculateGearMetrics, formatGearMetrics, toLegacyV1Metrics } from './domain';

const defaultParams = createGearParams();
const defaultMetrics = calculateGearMetrics(defaultParams);
const displayMetrics = formatGearMetrics(defaultMetrics);
const legacyMetrics = toLegacyV1Metrics(defaultParams);

export default function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">GearForge2 foundation</p>
        <h1>Canonical gear parameters, validation, and metrics.</h1>
        <p className="lede">
          Step 1 is now implemented as a shared domain layer so later geometry, preview, export,
          and pricing work can all reuse the same contract.
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <h2>Default parameters</h2>
          <pre>{JSON.stringify(defaultParams, null, 2)}</pre>
        </article>

        <article className="card">
          <h2>Derived metrics</h2>
          <pre>{JSON.stringify(defaultMetrics, null, 2)}</pre>
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