import { useState, useEffect } from "react";
import { fundingGap, rupees } from "../lib/money.js";
import {readStore,writeStore,planKey} from "../lib/storage.js";
import Badge from "../components/Badge.jsx";

export default function Schemes(props) {
  const p = props.profile;
  let type = props.common.types.find((t) => t.id === p.businessId);
  if (!type) {
    type = props.common.types[0];
  }
  const costs=readStore(planKey(p)+"_cost",{});
  const gap = Math.max(0, fundingGap(type, p.money) + (costs.fixed??type.monthly_fixed) - type.monthly_fixed);
  const key = planKey(p)+"_papers";
  const [done, setDone] = useState(()=>readStore(key,{}));
  useEffect(()=>{setDone(readStore(key,{}))},[key]);

  const matches = props.common.schemes
    .map((s) => {
      let score = 0;
      const reasons = [];
      if (s.active === false) return {scheme:s,score:0,reasons:[]};
      if (s.for_models.includes(type.model)) {
        score = score + 50;
        reasons.push("fits a " + type.model + " business");
      }
      if (type.schemes.includes(s.id)) {
        score = score + 20;
        reasons.push("commonly used for " + type.name.toLowerCase());
      }
      if (gap > 0 && s.max_amount >= gap) {
        score = score + 20;
        reasons.push("can cover your gap of " + rupees(gap));
      } else if (gap > 0) {
        score = score + 5;
        reasons.push("covers part of your gap (up to " + rupees(s.max_amount) + ")");
      }
      if (p.loan === true) {
        score = score + 10;
      }
      return { scheme: s, score: Math.min(score, 95), reasons: reasons };
    })
    .filter((m) => m.score >= 50)
    .sort((a, b) => b.score - a.score);

  const papers = props.common.licences.filter((l) => type.licences.includes(l.id));

  function toggle(id) {
    const copy = { ...done };
    copy[id] = !copy[id];
    setDone(copy);
    writeStore(key,copy);
  }

  return (
    <div className="screen">
      <div className="topbar"><b>Schemes and Papers</b><span className="muted small">{type.name}</span></div>
      <p className="page-intro">Explore support for your business. Review the official rules and confirm details with the bank or city office.</p>
      <div className="notice">These are preliminary matches based on business type and funding gap. Age, category, repayment history and other eligibility conditions have not been checked. The bank or government office makes the final decision.</div>
      {matches.map((m) => (
        <div key={m.scheme.id} className="card scheme">
          <div className="card-title">{m.scheme.name} <span className="match">{m.score}%</span></div>
          <Badge level="prelim" />
          <p className="small">{m.scheme.detail}</p>
          <div className="small"><b>Why matched:</b> {m.reasons.join("; ")}.</div>
          <div className="small"><b>Keep ready:</b> {m.scheme.needs.join(", ")}.</div>
          <a className="link" href={m.scheme.url} target="_blank" rel="noreferrer">Official site →</a>
          <div className="muted tiny">Reference date: {m.scheme.checked_on}. {m.scheme.source_url && <a href={m.scheme.source_url} target="_blank" rel="noreferrer">Verified source ↗</a>}</div>
        </div>
      ))}
      <div className="card">
        <div className="card-title">Papers checklist</div>
        {papers.map((l) => {
          let mark = "☐";
          if (done[l.id]) {
            mark = "☑";
          }
          return (
            <button key={l.id} className="check-row" aria-pressed={!!done[l.id]} onClick={() => toggle(l.id)}>
              <span className="check">{mark}</span>
              <span><b>{l.name}</b><br /><small>{l.why} Where: {l.where}</small>{l.url && <small> · Official guidance available below</small>}</span>
            </button>
          );
        })}
        {papers.filter(l=>l.url).map(l=><div key={l.id}><a className="link" href={l.url} target="_blank" rel="noreferrer">{l.name} — official portal ↗</a></div>)}
        {papers.filter(l=>l.source_url).map(l=><p className="source-line" key={l.id}><a href={l.source_url} target="_blank" rel="noreferrer">FSSAI reform guidance · verified {l.checked_on} ↗</a></p>)}
        <p className="source-line">Confirm the permitted vending zone with the Town Vending Committee before choosing a spot. A registration does not grant permission for every location.</p>
      </div>
    </div>
  );
}
