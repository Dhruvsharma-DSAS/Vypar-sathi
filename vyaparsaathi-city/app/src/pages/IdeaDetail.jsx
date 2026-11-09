import { useParams, useNavigate } from "react-router-dom";
import { scoreBusiness } from "../lib/score.js";
import { startupTotal, rupees } from "../lib/money.js";
import ScoreBar from "../components/ScoreBar.jsx";
import Badge from "../components/Badge.jsx";

export default function IdeaDetail(props) {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const p = props.profile;
  const type = props.common.types.find((t) => t.id === typeId);
  const stats = props.cityData.stats;
  let ward = stats.wards.find((w) => w.ward_id === p.wardId);
  if (!ward) {
    ward = stats.wards[0];
  }

  if (!type) {
    return <div className="screen"><p>Business not found.</p></div>;
  }

  const s = scoreBusiness(type, ward, stats, p, p.city);
  let verdict = "Good opportunity";
  let verdictCls = "verdict good";
  if (s.total < 50) {
    verdict = "Risky - check carefully";
    verdictCls = "verdict risky";
  } else if (s.total < 65) {
    verdict = "Possible - verify first";
    verdictCls = "verdict ok";
  }

  let competitionLine = "";
  if (s.facts.per10k < s.facts.median) {
    competitionLine = "Fewer " + type.category.replace("_", " ") + " places than usual: " + s.facts.per10k + " per 10,000 people vs city median " + s.facts.median + ".";
  } else {
    competitionLine = "More " + type.category.replace("_", " ") + " places than usual: " + s.facts.per10k + " per 10,000 people vs city median " + s.facts.median + ".";
  }

  function choose() {
    props.updateProfile({ businessId: type.id, wardId: ward.ward_id });
    navigate("/spot");
  }

  return (
    <div className="screen">
      <div className="topbar"><button className="back" onClick={() => navigate(-1)}>←</button><b>{type.name}</b><span /></div>
      <div className="score-hero">
        <div className="score-big">{s.total}<small>/100</small></div>
        <div>
          <div className={verdictCls}>{verdict}</div>
          <div className="muted small">{ward.name} · {type.hindi}</div>
          <Badge level={ward.confidence} />
        </div>
      </div>
      <div className="card">
        <div className="card-title">How the score is made</div>
        {s.parts.map((part) => (
          <ScoreBar key={part.key} label={part.label} value={part.value} weight={part.weight} />
        ))}
      </div>
      <div className="card five">
        <div><b>What?</b> {type.name} in {ward.name}</div>
        <div><b>Why?</b> {competitionLine} Gap {s.facts.gapPercent}%.</div>
        <div><b>{ward.confidence === "sample" ? "Sample dataset:" : "Evidence:"}</b> {s.facts.count} similar places found (OSM / licences), population {ward.population.toLocaleString("en-IN")}, wholesale at {s.facts.nearestMarket} ({s.facts.nearestKm} km).</div>
        <div><b>Uncertain:</b> street carts are often missing from data; rent and exact footfall need a ground check.</div>
        <div><b>Next:</b> do two 10-minute counts at the best spot, then a 7-day pilot.</div>
      </div>
      <div className="kv"><span>Startup cost (template)</span><b>{rupees(startupTotal(type))}</b></div>
      <button className="big-btn green small-btn" onClick={choose}>Choose this business →</button>
    </div>
  );
}
