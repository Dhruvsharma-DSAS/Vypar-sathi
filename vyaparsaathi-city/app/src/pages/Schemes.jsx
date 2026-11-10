import { useState, useEffect } from "react";
import { fundingGap, rupees } from "../lib/money.js";
import { readStore, writeStore, planKey } from "../lib/storage.js";
import Badge from "../components/Badge.jsx";
import Icon from "../components/Icon.jsx";

export default function Schemes(props) {
  const p = props.profile;
  let type = props.common.types.find((t) => t.id === p.businessId);
  if (!type) {
    type = props.common.types[0];
  }
  const costs = readStore(planKey(p) + "_cost", {});
  const gap = Math.max(
    0,
    fundingGap(type, p.money) + (costs.fixed ?? type.monthly_fixed) - type.monthly_fixed
  );
  const key = planKey(p) + "_papers";
  const [done, setDone] = useState(() => readStore(key, {}));
  useEffect(() => {
    setDone(readStore(key, {}));
  }, [key]);

  const matches = props.common.schemes
    .map((s) => {
      let score = 0;
      const reasons = [];
      if (s.active === false) return { scheme: s, score: 0, reasons: [] };
      if (s.for_models.includes(type.model)) {
        score = score + 50;
        reasons.push("Fits a " + type.model + " business model");
      }
      if (type.schemes.includes(s.id)) {
        score = score + 20;
        reasons.push("Commonly sanctioned for " + type.name.toLowerCase());
      }
      if (gap > 0 && s.max_amount >= gap) {
        score = score + 20;
        reasons.push("Can completely cover your capital gap of " + rupees(gap));
      } else if (gap > 0) {
        score = score + 5;
        reasons.push("Subsidizes your funding gap (up to " + rupees(s.max_amount) + ")");
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
    writeStore(key, copy);
  }

  const completedCount = papers.filter((l) => done[l.id]).length;

  return (
    <div className="screen">
      {/* Page Heading */}
      <div className="page-heading anim-fade-up">
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            GOVERNMENT SUPPORT & FORMALIZATION
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            Funding Schemes & Permits
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            Compare sample scheme criteria, document checklists and official portals for <b>{type.name}</b>.
          </p>
        </div>
      </div>

      {/* Disclaimers & Info Banner */}
      <div
        className="anim-fade-up anim-stagger-1"
        style={{
          background: "linear-gradient(135deg, #FFF0F2 0%, #FFFFFF 100%)",
          border: "1px solid var(--z-red-border)",
          borderRadius: "var(--z-radius-lg)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <Icon name="info" size={24} style={{ color: "var(--z-red)", flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: "12px", color: "var(--z-gray-dark)", lineHeight: 1.5 }}>
          Preliminary eligibility matched on your business model and capital gap ({gap > 0 ? rupees(gap) : "No deficit"}).
          Final sanction criteria and interest subventions are determined by the participating bank or municipal office.
        </p>
      </div>

      <div className="two-column">
        {/* Left: Matched Govt Schemes */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--z-dark)" }}>
               Matched Financial Schemes ({matches.length})
            </h2>
            <span style={{ fontSize: "12px", color: "var(--z-gray-muted)" }}>Ranked by fit</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {matches.map((m, idx) => (
              <div
                key={m.scheme.id}
                className={`scheme-card-zomato anim-fade-up anim-stagger-${Math.min(idx + 1, 6)}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--z-dark)", margin: "0 0 4px" }}>
                      {m.scheme.name}
                    </h3>
                    <Badge level="prelim" />
                  </div>
                  <div className="scheme-match-pill">
                     {m.score}% Match
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "var(--z-gray-body)", lineHeight: 1.5, margin: "10px 0" }}>
                  {m.scheme.detail}
                </p>

                <div style={{ background: "#F8F9FA", borderRadius: "var(--z-radius-md)", padding: "12px", marginBottom: "14px" }}>
                  <div style={{ fontSize: "12px", marginBottom: "6px", color: "var(--z-dark)" }}>
                    <b style={{ color: "var(--z-green-dark)" }}>Why matched:</b> {m.reasons.join("; ")}.
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--z-gray-body)" }}>
                    <b>Documents required:</b> {m.scheme.needs.join(", ")}.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--z-border)", paddingTop: "12px" }}>
                  <a
                    className="button primary"
                    style={{ padding: "8px 16px", fontSize: "12px", textDecoration: "none" }}
                    href={m.scheme.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official Portal ↗
                  </a>
                  <span style={{ fontSize: "11px", color: "var(--z-gray-muted)" }}>
                    Verified on {m.scheme.checked_on}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Papers & Permits Checklist */}
        <div>
          <div className="card anim-fade-up anim-stagger-2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px", color: "var(--z-dark)" }}>
                   Permits & Licences Checklist
                </h2>
                <span style={{ fontSize: "12px", color: "var(--z-gray-muted)" }}>
                  {completedCount} of {papers.length} documents ready
                </span>
              </div>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: completedCount === papers.length ? "var(--z-green)" : "var(--z-red-light)",
                  color: completedCount === papers.length ? "#FFFFFF" : "var(--z-red)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                {completedCount}/{papers.length}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              {papers.map((l) => (
                <button
                  key={l.id}
                  className={`check-item-zomato ${done[l.id] ? "done" : ""}`}
                  aria-pressed={!!done[l.id]}
                  onClick={() => toggle(l.id)}
                >
                  <div className="check-box-icon">
                    {done[l.id] ? "" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: "14px", color: "var(--z-dark)", display: "block" }}>{l.name}</b>
                    <small style={{ color: "var(--z-gray-muted)", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      {l.why} • <b>Where:</b> {l.where}
                    </small>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--z-border)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {papers.filter((l) => l.url).map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "12px", color: "var(--z-red)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>{l.name} — Direct Portal</span>
                  <Icon name="arrow" size={13} />
                </a>
              ))}
            </div>

            <p style={{ fontSize: "11px", color: "var(--z-gray-muted)", marginTop: "16px", lineHeight: 1.5 }}>
              Confirm your designated vending area with the Town Vending Committee (TVC) before placing equipment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
