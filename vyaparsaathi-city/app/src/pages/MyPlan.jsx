import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { unitCost, rupees, startupTotal } from "../lib/money.js";
import { readStore, writeStore, planKey, downloadJson, localDate } from "../lib/storage.js";
import Icon from "../components/Icon.jsx";

export default function MyPlan(props) {
  return <Plan key={planKey(props.profile)} {...props} />;
}

function Plan({ profile: p, common, cityData }) {
  const type = common.types.find((t) => t.id === p.businessId) || common.types[0];
  const ward = cityData.stats.wards.find((w) => w.ward_id === p.wardId);
  const key = planKey(p);
  const cost = unitCost(common.recipes[type.recipe], common.mandi[p.city]);
  const assumptions = readStore(key + "_cost", {
    price: type.price,
    units: type.typical_units_per_day,
    fixed: type.monthly_fixed,
    days: 30,
  });

  const [khata, setKhata] = useState(() => readStore(key + "_khata", []));
  const [date, setDate] = useState(localDate());
  const [sales, setSales] = useState("");
  const [units, setUnits] = useState("");
  const [error, setError] = useState("");
  const [steps, setSteps] = useState(() => readStore(key + "_steps", {}));
  const papers = readStore(key + "_papers", {});

  useEffect(() => {
    writeStore(key + "_khata", khata);
  }, [khata, key]);

  useEffect(() => {
    writeStore(key + "_steps", steps);
  }, [steps, key]);

  function addDay(e) {
    e.preventDefault();
    if (khata.length >= 7) {
      setError("Your 7-day pilot trial is complete! Review or remove an entry to adjust.");
      return;
    }
    if (
      !date ||
      units === "" ||
      sales === "" ||
      Number(units) < 0 ||
      Number(sales) < 0 ||
      !Number.isInteger(Number(units))
    ) {
      setError("Enter valid date, integer units sold, and non-negative gross sales.");
      return;
    }
    if (khata.some((x) => x.date === date)) {
      setError("That date is already recorded. Remove existing entry first to update.");
      return;
    }
    setKhata((old) =>
      [...old, { date, sales: Number(sales), units: Number(units) }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setUnits("");
    setSales("");
    setError("");
  }

  const forecast = assumptions.units;
  const maxUnits = Math.max(1, forecast, ...khata.map((k) => k.units));
  const total = khata.reduce((a, k) => a + k.units, 0);
  const revenue = khata.reduce((a, k) => a + k.sales, 0);
  const avg = khata.length ? total / khata.length : 0;
  const ratio = forecast > 0 ? avg / forecast : null;

  let verdict = "Log at least 3 pilot operating days to benchmark actual sales with your forecast.";
  if (khata.length >= 3) {
    verdict =
      ratio === null
        ? "Add a positive daily forecast in Cost & Profit to benchmark your pilot."
        : ratio >= 1
        ? "At or above forecast volume! Strong early commercial signal — maintain quality and track peak hours."
        : ratio >= 0.7
        ? "Slightly below forecast. Optimize rush hour presence or adjust stall position before scaling."
        : "Significantly below forecast. Test a secondary corridor before committing further savings.";
  }

  const roadmap = [
    ["Profile Ready", p.money > 0 && !!p.skill, "/advisor"],
    ["Business Blueprint Selected", !!p.businessId, "/advisor"],
    ["Spot & Rush Hours Checked", !!steps.spot, "/spot"],
    ["Unit Economics Verified", !!steps.cost, "/cost"],
    ["Permits & Licences Prepped", type.licences.every((id) => papers[id]), "/schemes"],
    ["7-Day Pilot Completed", khata.length === 7, "/plan"],
  ];

  const exportPlan = () =>
    downloadJson("vyaparsaathi-business-plan.json", {
      created_at: new Date().toISOString(),
      profile: p,
      business: type.name,
      ward: ward?.name || null,
      data_status: "Business pilot record with sample planning assumptions",
      assumptions,
      unit_cost: cost.total,
      funding_gap: Math.max(0, startupTotal(type) + assumptions.fixed - p.money),
      pilot: khata,
      checklist: steps,
      papers,
    });

  return (
    <div className="screen">
      {/* Page Heading & Action Buttons */}
      <div className="page-heading anim-fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            LAUNCH TRACKER & FIELD VALIDATION
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            My Business Plan & Pilot Log
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            Run a seven-day pilot, record actual costs and sales, and keep your next steps in one place.
          </p>
        </div>

        <div className="button-row no-print" style={{ display: "flex", gap: "10px" }}>
          <button className="button secondary" onClick={exportPlan}>
            <Icon name="download" size={16} /> Export JSON
          </button>
          <button className="button primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {!p.businessId && (
        <div
          className="anim-fade-up"
          style={{
            background: "var(--z-amber-light)",
            border: "1px solid #FDE68A",
            borderRadius: "var(--z-radius-md)",
            padding: "12px 18px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#B45309",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Previewing a default momo cart blueprint. Personalize your concept with Saathi.</span>
          <Link to="/advisor" style={{ color: "var(--z-red)", fontWeight: 700, textDecoration: "none" }}>
            Open Advisor →
          </Link>
        </div>
      )}

      <div className="two-column">
        {/* Left Column: Plan at a Glance & Path to Beginning */}
        <div>
          {/* Summary Card */}
          <section className="card anim-fade-up anim-stagger-1" style={{ marginBottom: "24px" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span> Active Business Summary</span>
              <span className="badge">{p.city === "pune" ? "Pune" : "Bengaluru"}</span>
            </div>

            {[
              ["Target Concept", type.name],
              ["Location Zone", ward?.name || "Choose your neighbourhood"],
              ["Committed Savings", rupees(p.money)],
              ["Cost per " + type.unit, "₹" + cost.total.toFixed(2)],
              ["Selling Price", rupees(assumptions.price)],
              ["Sales Target", assumptions.units + " " + type.unit + "s / day"],
              ["Capital Deficit", rupees(Math.max(0, startupTotal(type) + assumptions.fixed - p.money))],
            ].map(([label, value]) => (
              <div className="kv" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </section>

          {/* Path to Beginning Roadmap */}
          <section className="card anim-fade-up anim-stagger-2">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px", color: "var(--z-dark)" }}>
               Launch Milestones Tracker
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {roadmap.map(([label, done, path], i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    background: done ? "var(--z-green-light)" : "#FAFAFA",
                    border: `1px solid ${done ? "var(--z-green-border)" : "var(--z-border)"}`,
                    borderRadius: "var(--z-radius-md)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: done ? "var(--z-green)" : "#E2E8F0",
                      color: done ? "#FFFFFF" : "var(--z-dark)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {done ? "" : i + 1}
                  </div>

                  <Link to={path} style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--z-dark)", textDecoration: "none" }}>
                    {label}
                  </Link>

                  {["Spot & Rush Hours Checked", "Unit Economics Verified"].includes(label) ? (
                    <input
                      type="checkbox"
                      aria-label={label}
                      checked={done}
                      onChange={(e) =>
                        setSteps((old) => ({
                          ...old,
                          [i === 2 ? "spot" : "cost"]: e.target.checked,
                        }))
                      }
                      style={{ cursor: "pointer", width: "18px", height: "18px" }}
                    />
                  ) : (
                    <Link to={path} style={{ fontSize: "12px", color: "var(--z-red)", fontWeight: 700, textDecoration: "none" }}>
                      {done ? "Review" : "Start"} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: 7-Day Pilot Khata */}
        <div>
          <section className="card anim-fade-up anim-stagger-2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--z-dark)" }}>
                   7-Day Pilot Khata
                </h2>
                <span style={{ fontSize: "12px", color: "var(--z-gray-muted)" }}>
                  Validate before heavy investment
                </span>
              </div>
              <span className="badge green" style={{ fontSize: "12px" }}>
                {khata.length} of 7 Days Logged
              </span>
            </div>

            {/* Visual Bar Chart for Pilot Khata */}
            <div className="khata-bars" role="img" aria-label={`Pilot trial: ${khata.length} days logged`}>
              {Array.from({ length: 7 }, (_, i) => {
                const k = khata[i];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                      gap: "6px",
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: "10px", fontWeight: 700, color: k ? "var(--z-dark)" : "var(--z-gray-muted)" }}>
                      {k?.units ?? "—"}
                    </span>
                    <div
                      className="kb-bar"
                      style={{
                        height: k ? `${(k.units / maxUnits) * 90}px` : "4px",
                        opacity: k ? 1 : 0.25,
                      }}
                    />
                    <span style={{ fontSize: "10px", color: "var(--z-gray-muted)", fontWeight: 600 }}>
                      D{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Verdict Note */}
            <div
              style={{
                background: "#F8F9FA",
                border: "1px solid var(--z-border)",
                borderRadius: "var(--z-radius-md)",
                padding: "14px 16px",
                margin: "16px 0",
                fontSize: "13px",
                color: "var(--z-dark)",
                lineHeight: 1.5,
              }}
            >
              <b>Pilot Feedback:</b> {verdict}
            </div>

            {/* Metrics */}
            <div className="kv">
              <span>Total Recorded Revenue</span>
              <b style={{ color: "var(--z-green-dark)", fontSize: "15px" }}>{rupees(revenue)}</b>
            </div>
            <div className="kv">
              <span>Average Volume Sold</span>
              <b>{avg.toFixed(1)} {type.unit}s / day</b>
            </div>

            {/* Log Table */}
            {khata.length > 0 && (
              <div style={{ overflowX: "auto", margin: "16px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#F4F5F7", textAlign: "left", color: "var(--z-gray-body)" }}>
                      <th style={{ padding: "8px 10px", borderRadius: "6px 0 0 6px" }}>Date</th>
                      <th style={{ padding: "8px 10px" }}>Units</th>
                      <th style={{ padding: "8px 10px" }}>Sales</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderRadius: "0 6px 6px 0" }} className="no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khata.map((k) => (
                      <tr key={k.date} style={{ borderBottom: "1px solid var(--z-border-subtle)" }}>
                        <td style={{ padding: "8px 10px" }}>{k.date}</td>
                        <td style={{ padding: "8px 10px" }}>{k.units}</td>
                        <td style={{ padding: "8px 10px" }}>{rupees(k.sales)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }} className="no-print">
                          <button
                            onClick={() => setKhata(khata.filter((x) => x.date !== k.date))}
                            style={{ background: "transparent", border: "none", color: "var(--z-red)", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add New Day Form */}
            {khata.length < 7 && (
              <form onSubmit={addDay} className="no-print" style={{ background: "#FAFAFA", border: "1px solid var(--z-border)", borderRadius: "var(--z-radius-md)", padding: "16px", marginTop: "16px" }}>
                <label className="field" style={{ marginBottom: "12px" }}>
                  Operating Date
                  <input type="date" value={date} max={localDate()} required onChange={(e) => setDate(e.target.value)} />
                </label>

                <div className="emi">
                  <label>
                    Total Sales (₹)
                    <input type="number" min="0" step="0.01" required value={sales} placeholder="e.g. 2400" onChange={(e) => setSales(e.target.value)} />
                  </label>
                  <label>
                    {type.unit}s Sold
                    <input type="number" min="0" step="1" required value={units} placeholder="e.g. 40" onChange={(e) => setUnits(e.target.value)} />
                  </label>
                </div>

                <button className="button primary" type="submit" style={{ width: "100%", padding: "12px", marginTop: "14px" }}>
                  Save Pilot Day ({khata.length + 1}/7)
                </button>
              </form>
            )}

            {error && <p style={{ color: "var(--z-red)", fontSize: "12px", marginTop: "8px", fontWeight: 600 }}>{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
