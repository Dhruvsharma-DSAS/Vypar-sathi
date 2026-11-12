"use client";
import { useEffect, useState } from "react";
import { backend } from "../lib/api.js";
import { Link } from "react-router-dom";
import { unitCost, startupTotal, emi, rupees } from "../lib/money.js";
import { readStore, writeStore, planKey } from "../lib/storage.js";
import Icon from "../components/Icon.jsx";

export default function CostProfit(props) {
  const type =
    props.common.types.find((t) => t.id === props.profile.businessId) ||
    props.common.types[0];
  return <Calculator key={planKey(props.profile)} {...props} type={type} />;
}

function Calculator({ profile: p, updateProfile, common, type }) {
  const key = planKey(p) + "_cost";
  const saved = readStore(key, {});
  const [price, setPrice] = useState(saved.price ?? type.price);
  const [units, setUnits] = useState(saved.units ?? type.typical_units_per_day);
  const [fixed, setFixed] = useState(saved.fixed ?? type.monthly_fixed);
  const [days, setDays] = useState(saved.days ?? 30);
  const [rate, setRate] = useState(12);
  const [months, setMonths] = useState(12);
  const [quotes, setQuotes] = useState([
    { supplier: "Wholesale Mandi A", price: 500, transport: 40, quantity: 10 },
    { supplier: "Local Vendor B", price: 520, transport: 10, quantity: 10 },
  ]);
  const [status, setStatus] = useState("");

  const cost = unitCost(common.recipes[type.recipe], common.mandi[p.city]);
  const valid =
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(units) &&
    units >= 0 &&
    Number.isFinite(fixed) &&
    fixed >= 0 &&
    days > 0 &&
    days <= 31;
  const margin = price - cost.total;
  const percent = price > 0 ? Math.round((margin / price) * 100) : 0;
  const be = valid && margin > 0 ? Math.ceil(fixed / margin / days) : null;
  const profit = valid ? Math.round(margin * units * days - fixed) : 0;
  const gap = Math.max(0, startupTotal(type) + fixed - p.money);
  const monthly = rate >= 0 && months >= 1 ? emi(gap, rate, months) : null;

  function save() {
    if (!valid) {
      setStatus("Please enter positive price, operating days, and non-negative values.");
      return;
    }
    writeStore(key, { price, units, fixed, days });
    setStatus(" Business economics saved to your active plan.");
  }

  const [serverPlan, setServerPlan] = useState(null);
  const [serverState, setServerState] = useState("");

  useEffect(() => {
    let cancelled = false;
    setServerPlan(null);
    setServerState("");
    if (!valid) return;
    const timer = setTimeout(() => {
      backend("/planner/finance", {
        method: "POST",
        body: JSON.stringify({
          selling_price: price,
          unit_cost: cost.total,
          fixed_monthly_cost: fixed,
          startup_cost: startupTotal(type),
          available_capital: p.money,
          daily_units: units,
          annual_interest_rate: rate,
          loan_term_months: months,
          operating_days: days,
        }),
      })
        .then((plan) => {
          if (!cancelled) {
            setServerPlan(plan);
            setServerState("Checked by planning backend");
          }
        })
        .catch(() => {
          if (!cancelled) setServerState("Calculated on this device");
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [price, units, fixed, days, rate, months, cost.total, p.money, type.id, valid]);

  const num = (setter, min, max) => (e) =>
    setter(e.target.value === "" ? "" : Math.min(max, Math.max(min, Number(e.target.value))));

  return (
    <div className="screen cost-screen">
      {/* Page Heading */}
      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            FINANCIAL INTELLIGENCE & UNIT ECONOMICS
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            Cost & Profit Calculator
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            See what goes into each unit, test sales volumes and understand the point at which costs are covered.
          </p>
        </div>
      </div>

      {/* Business Selector Pill */}
      <div className="cost-business-select">
        <Icon name="shop" size={20} style={{ color: "var(--z-red)" }} />
        <div style={{ flex: 1 }}>
          <label htmlFor="cost-business">Business blueprint</label>
          <select id="cost-business"
            value={type.id}
            onChange={(e) => updateProfile({ businessId: e.target.value })}
          >
            {common.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category.replaceAll("_", " ")})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Key Metric Cards */}
      <div className="comparison cost-metrics">
        <div>
          <small>Unit cost</small>
          <strong>₹{cost.total.toFixed(2)}</strong>
          <span style={{ fontSize: "11px", color: "var(--z-gray-muted)" }}>Per {type.unit}</span>
        </div>
        <div>
          <small>Contribution per unit</small>
          <strong style={{ color: "var(--z-green)" }}>₹{margin.toFixed(2)}</strong>
          <span style={{ fontSize: "11px", color: "var(--z-green)", fontWeight: 700 }}>{percent}% Contribution</span>
        </div>
        <div>
          <small>Daily break-even</small>
          <strong>{be ?? "—"}</strong>
          <span style={{ fontSize: "11px", color: "var(--z-gray-muted)" }}>{type.unit}s / day needed</span>
        </div>
      </div>

      {/* 2-Column Details */}
      <div className="two-column" style={{ marginTop: "24px" }}>
        {/* Left Column: Cost Itemization & Capital */}
        <div>
          {/* Bill-Style Cost Itemization */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="file" size={18} />
              <span> Itemized Cost Breakdown (1 {type.unit})</span>
            </div>
            {cost.lines.map((l) => (
              <div className="kv" key={l.name}>
                <span>
                  <b>{l.name}</b> <small style={{ color: "var(--z-gray-muted)" }}>({l.basis})</small>
                </span>
                <b>₹{l.cost.toFixed(2)}</b>
              </div>
            ))}
            <div className="kv total">
              <span>Total Landed Unit Cost</span>
              <b>₹{cost.total.toFixed(2)}</b>
            </div>
            <p style={{ fontSize: "11px", color: "var(--z-gray-muted)", marginTop: "12px", lineHeight: 1.6 }}>
              Sample ingredient prices and recipe quantities. Replace these assumptions with supplier quotes before investing.
            </p>
          </section>

          {/* Startup Capex & Funding */}
          <section className="card">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="money" size={18} />
              <span> Starting Capex & Capital Gap</span>
            </div>
            {type.startup.map((s) => (
              <div className="kv" key={s.item}>
                <span>{s.item}</span>
                <b>{rupees(s.cost)}</b>
              </div>
            ))}
            <div className="kv total">
              <span>Total Initial Capital Needed</span>
              <b>{rupees(startupTotal(type) + Number(fixed))}</b>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label className="field">
                Your Available Savings (₹)
                <input
                  type="number"
                  min="0"
                  value={p.money || ""}
                  placeholder="e.g. 30000"
                  onChange={(e) => updateProfile({ money: Math.max(0, Number(e.target.value)) })}
                />
              </label>

              <div className="kv" style={{ marginTop: "12px" }}>
                <span>Remaining Funding Gap</span>
                <b style={{ color: gap > 0 ? "var(--z-red)" : "var(--z-green)", fontSize: "15px" }}>
                  {gap > 0 ? rupees(gap) : " Fully Funded"}
                </b>
              </div>

              {gap > 0 && (
                <div style={{ background: "#FFF5F5", border: "1px solid var(--z-red-border)", borderRadius: "var(--z-radius-md)", padding: "14px", marginTop: "14px" }}>
                  <small style={{ fontWeight: 700, color: "var(--z-red)", display: "block", marginBottom: "6px" }}>
                    Explore Mudra / PM SVANidhi Micro-Credit:
                  </small>
                  <div className="emi">
                    <label>
                      Interest Rate (%)
                      <input type="number" min="0" max="60" value={rate} onChange={num(setRate, 0, 60)} />
                    </label>
                    <label>
                      Loan Term (Months)
                      <input type="number" min="1" max="120" value={months} onChange={num(setMonths, 1, 120)} />
                    </label>
                  </div>
                  <div className="kv" style={{ border: "none" }}>
                    <span>Estimated Monthly EMI</span>
                    <b style={{ color: "var(--z-dark)" }}>{monthly === null ? "—" : rupees(monthly)}</b>
                  </div>
                  <Link to="/schemes" style={{ fontSize: "12px", color: "var(--z-red)", fontWeight: 700, textDecoration: "none", display: "inline-block", marginTop: "6px" }}>
                    View Eligibility for Govt Credit Schemes →
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Live Volume Simulator & Supplier Comparison */}
        <div>
          {/* Interactive Profit Simulator */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="spark" size={18} />
                <span> Net Monthly Profit Simulator</span>
              </div>
              <span className="badge green">{serverState || "Scenario calculator"}</span>
            </div>

            <div className="emi">
              <label>
                Selling Price per {type.unit} (₹)
                <input type="number" min="1" value={price} onChange={num(setPrice, 0, 1000000)} />
              </label>
              <label>
                Expected Sales / Day ({type.unit}s)
                <input type="number" min="0" value={units} onChange={num(setUnits, 0, 100000)} />
              </label>
            </div>

            <div className="emi">
              <label>
                Monthly Fixed Costs (Rent/Kiosk) (₹)
                <input type="number" min="0" value={fixed} onChange={num(setFixed, 0, 10000000)} />
              </label>
              <label>
                Working Days / Month
                <input type="number" min="1" max="31" value={days} onChange={num(setDays, 1, 31)} />
              </label>
            </div>

            {/* Simulated Results Box */}
            <div style={{ background: profit >= 0 ? "var(--z-green-light)" : "#FFF1F2", border: `1px solid ${profit >= 0 ? "var(--z-green-border)" : "var(--z-red-border)"}`, borderRadius: "var(--z-radius-md)", padding: "16px", margin: "18px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <small style={{ fontSize: "11px", fontWeight: 700, color: profit >= 0 ? "var(--z-green-dark)" : "var(--z-red)", textTransform: "uppercase" }}>
                    Estimated Net Monthly Profit
                  </small>
                  <strong style={{ fontSize: "28px", color: profit >= 0 ? "var(--z-green-dark)" : "var(--z-red)", display: "block" }}>
                    {valid ? rupees(profit) : "Check inputs"}
                  </strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge" style={{ background: "#FFFFFF" }}>{percent}% Margin</span>
                </div>
              </div>

              {valid && monthly !== null && gap > 0 && (
                <div className="kv" style={{ border: "none", paddingTop: "10px", marginTop: "10px", borderTop: "1px dashed rgba(0,0,0,0.1)" }}>
                  <span>Profit After Paying Loan EMI:</span>
                  <b>{rupees(profit - monthly)} / mo</b>
                </div>
              )}
            </div>

            <button className="button primary" style={{ width: "100%", padding: "12px", fontSize: "13px" }} onClick={save}>
              Save Assumptions to Business Plan
            </button>
            {status && (
              <p style={{ fontSize: "12px", color: "var(--z-green-dark)", fontWeight: 600, textAlign: "center", marginTop: "10px" }}>
                {status}
              </p>
            )}
          </section>

          {/* Supplier Comparison */}
          <section className="card">
            <div className="card-title">
               Landed Cost Supplier Comparison
            </div>
            <p style={{ fontSize: "12px", color: "var(--z-gray-muted)", marginBottom: "14px" }}>
              Always compute total transport and logistics cost before finalizing ingredient supply.
            </p>
            {quotes.map((q, i) => (
              <div key={i} style={{ background: "#F8F9FA", border: "1px solid var(--z-border)", borderRadius: "var(--z-radius-md)", padding: "14px", marginBottom: "12px" }}>
                <label className="field" style={{ marginBottom: "8px" }}>
                  Supplier Name
                  <input
                    value={q.supplier}
                    onChange={(e) =>
                      setQuotes((old) =>
                        old.map((x, j) => (j === i ? { ...x, supplier: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <div className="emi">
                  <label>
                    Item Cost (₹)
                    <input
                      type="number"
                      value={q.price}
                      onChange={(e) =>
                        setQuotes((old) =>
                          old.map((x, j) => (j === i ? { ...x, price: Math.max(0, Number(e.target.value)) } : x))
                        )
                      }
                    />
                  </label>
                  <label>
                    Transport (₹)
                    <input
                      type="number"
                      value={q.transport}
                      onChange={(e) =>
                        setQuotes((old) =>
                          old.map((x, j) => (j === i ? { ...x, transport: Math.max(0, Number(e.target.value)) } : x))
                        )
                      }
                    />
                  </label>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <small style={{ color: "var(--z-gray-muted)" }}>Landed Cost / Unit:</small>
                  <b style={{ color: "var(--z-green-dark)", fontSize: "14px" }}>
                    {rupees((q.price + q.transport) / (q.quantity || 1))}
                  </b>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
