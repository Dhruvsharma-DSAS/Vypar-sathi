import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import LocalityAnalyser from "../components/LocalityAnalyser.jsx";

const Legacy = lazy(() => import("./LegacyWardExplorer.jsx"));

export default function GapFinder(props) {
  const [old, setOld] = useState(false);
  return (
    <div className="screen locality-page">
      <div className="market-page-heading">
        <h1>Locality lab</h1>
        <p>Compare mapped supply, test your assumptions and decide what to check on the street.</p>
        <Link className="button secondary" to="/spot">Spot, timing & site checks</Link>
      </div>
      <LocalityAnalyser {...props} />
      <details className="legacy-ward" onToggle={(event) => setOld(event.currentTarget.open)}>
        <summary>Original ward gap explorer · sample data</summary>
        {old && (
          <Suspense fallback={<p role="status">Loading original explorer…</p>}>
            <Legacy {...props} />
          </Suspense>
        )}
      </details>
    </div>
  );
}
