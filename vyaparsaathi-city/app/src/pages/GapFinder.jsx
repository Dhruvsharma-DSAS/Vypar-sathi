import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WardMap from "../components/WardMap.jsx";
import Badge from "../components/Badge.jsx";
import { PILOT_WARDS } from "../App.jsx";

const LABELS = {
  fast_food: "Fast food / carts",
  tea_stall: "Chai / juice",
  restaurant: "Meals / tiffin",
  pharmacy: "Pharmacy",
  grocery: "Kirana",
  tailor: "Tailor",
  phone_repair: "Phone repair",
  salon: "Salon",
  bakery: "Bakery",
  fruit_veg: "Fruit / veg",
  stationery: "Stationery",
  laundry: "Laundry",
};

export default function GapFinder(props) {
  const navigate = useNavigate();
  const p = props.profile;
  const stats = props.cityData.stats;
  let startCat = "fast_food";
  const t = props.common.types.find((x) => x.id === p.businessId);
  if (t) {
    startCat = t.category;
  }
  const [category, setCategory] = useState(startCat);
  let startWard = stats.wards[0].ward_id;
  if (stats.wards.some(w=>w.ward_id===p.wardId)) {
    startWard = p.wardId;
  }
  const [selected, setSelected] = useState(startWard);

  const values = {};
  stats.wards.forEach((w) => {
    values[w.ward_id] = w.gap[category];
  });
  const ward = stats.wards.find((w) => w.ward_id === selected);
  const top = [...stats.wards].sort((a, b) => b.gap[category] - a.gap[category]).slice(0, 4);
  const points = Object.values(props.cityData.rush);
  const median = Math.round(stats.medians_per10k[category] * 100) / 100;

  let gapText = "Normal supply";
  let gapCls = "pill";
  if (ward.gap[category] >= 0.5) {
    gapText = "Larger gap - " + Math.round(ward.gap[category] * 100) + "% below city";
    gapCls = "pill green";
  } else if (ward.gap[category] >= 0.2) {
    gapText = "Some gap - " + Math.round(ward.gap[category] * 100) + "% below city";
    gapCls = "pill blue";
  } else if (ward.per10k[category] > median * 1.5) {
    gapText = "Crowded - many already here";
    gapCls = "pill orange";
  }

  return (
    <div className="screen">
      <div className="topbar"><b>Gap Finder</b><Badge level={ward.confidence} /></div>
      <p className="page-intro">A gap is a clue, not a guarantee. Compare listed businesses per resident, then check the street yourself.</p>
      <label className="field">Neighbourhood<select aria-label="Select ward" value={selected} onChange={e=>setSelected(e.target.value)}>{stats.wards.map(w=><option key={w.ward_id} value={w.ward_id}>{w.name}</option>)}</select></label>
      <select aria-label="Business category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
        {Object.keys(LABELS).map((k) => (
          <option key={k} value={k}>{LABELS[k]}</option>
        ))}
      </select>
      <div className="map-box">
        <WardMap shapes={props.cityData.shapes} values={values} selected={selected} onSelect={setSelected} pilot={PILOT_WARDS[p.city]} points={points} />
        <div className="legend"><span className="lg lo" />fewer gaps<span className="lg hi" />bigger gap<span className="lg pin" />footfall hub</div>
      </div>
      <div className="card">
        <div className="card-title">{ward.name}</div>
        <span className={gapCls}>{gapText}</span>
        <div className="kv"><span>People (est.)</span><b>{ward.population.toLocaleString("en-IN")}</b></div>
        <div className="kv"><span>At least this many {LABELS[category]} listed</span><b>{ward.counts[category]}</b></div>
        <div className="kv"><span>Per 10,000 people</span><b>{ward.per10k[category]}</b></div>
        <div className="kv"><span>City median</span><b>{median}</b></div>
        <button className="button primary" onClick={()=>props.updateProfile({wardId:ward.ward_id})}>{p.wardId===ward.ward_id?"Selected for your plan":"Use this neighbourhood"}</button>
        <br/><button className="link" onClick={() => { props.updateProfile({ wardId: ward.ward_id }); navigate("/data"); }}>Explore real data →</button>
      </div>
      <div className="card">
        <div className="card-title">Biggest gaps in the city</div>
        <p className="small muted">Population and counts in this build are sample data. Unlisted street carts may be missing.</p>
        {top.map((w) => (
          <button key={w.ward_id} className="rank-row" onClick={() => setSelected(w.ward_id)}>
            <span className="rank-name">{w.name}</span>
            <span className="rank-score">{Math.round(w.gap[category] * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
