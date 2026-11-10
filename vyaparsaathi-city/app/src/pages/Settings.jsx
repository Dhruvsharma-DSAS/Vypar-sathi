import { useState } from "react";
import { Link } from "react-router-dom";
import { readStore, writeStore, downloadJson } from "../lib/storage.js";
import Icon from "../components/Icon.jsx";

export default function Settings({ profile: p, updateProfile, common, cityData }) {
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(false);

  function exportData() {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === "profile" || k === "pending_rows" || k.startsWith("plan_")) {
        entries[k] = readStore(k, null);
      }
    }
    downloadJson("vyaparsaathi-backup.json", { version: 1, entries });
    setStatus(" Backup downloaded successfully. Keep it private; it contains your business records.");
  }

  function clear() {
    const keys = Object.keys(localStorage).filter(
      (k) => k === "profile" || k === "pending_rows" || k.startsWith("plan_")
    );
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  }

  return (
    <div className="screen settings">
      {/* Page Heading */}
      <div className="page-heading anim-fade-up">
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            PROFILE & DATA PREFERENCES
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            Workspace Settings & Backups
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            Update your business profile, manage data saved in this browser, and export your plan.
          </p>
        </div>
      </div>

      <div className="two-column" style={{ marginTop: "20px" }}>
        {/* Left: Profile Form */}
        <section className="card anim-fade-up anim-stagger-1">
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px", color: "var(--z-dark)" }}>
             Your Business Profile
          </h2>

          <label className="field" style={{ marginBottom: "14px" }}>
            What should we call you?
            <input
              maxLength={40}
              value={p.name}
              placeholder="e.g. Ramesh"
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </label>

          <label className="field" style={{ marginBottom: "14px" }}>
            Active Business Blueprint
            <select
              value={p.businessId}
              onChange={(e) => updateProfile({ businessId: e.target.value })}
            >
              <option value="">Not decided yet (explore ideas)</option>
              {common.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category.replaceAll("_", " ")})
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginBottom: "14px" }}>
            Available Starting Savings (₹)
            <input
              type="number"
              min="0"
              max="10000000"
              value={p.money || ""}
              placeholder="e.g. 30000"
              onChange={(e) => updateProfile({ money: Math.max(0, Number(e.target.value)) })}
            />
          </label>

          <label className="field" style={{ marginBottom: "14px" }}>
            Primary Skillset
            <select value={p.skill} onChange={(e) => updateProfile({ skill: e.target.value })}>
              <option value="">Choose a skill</option>
              <option value="cooking">Cooking & Food Prep</option>
              <option value="tailoring">Tailoring & Boutique Design</option>
              <option value="repair">Mobile & Tech Device Repair</option>
              <option value="none">Open to Any High-Margin Opportunity</option>
            </select>
          </label>

          <label className="field" style={{ marginBottom: "14px" }}>
            Neighbourhood / Target Ward ({p.city === "pune" ? "Pune" : "Bengaluru"})
            <select value={p.wardId} onChange={(e) => updateProfile({ wardId: e.target.value })}>
              <option value="">Choose a ward</option>
              {cityData.stats.wards.map((w) => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginBottom: "14px" }}>
            Available Operating Shift
            <select value={p.hours} onChange={(e) => updateProfile({ hours: e.target.value })}>
              <option value="">Choose hours</option>
              <option value="morning">Morning Rush (6:00 – 12:00)</option>
              <option value="lunch">Lunch Hours (11:00 – 16:00)</option>
              <option value="evening">Evening Rush (16:00 – 23:00)</option>
              <option value="both">Full Day (6:00 – 23:00)</option>
            </select>
          </label>

          <p style={{ fontSize: "11px", color: "var(--z-gray-muted)", margin: "10px 0 0" }}>
             Changes are automatically synchronized to local encrypted browser storage.
          </p>
        </section>

        {/* Right: Data Privacy & Reset */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Data Backup Card */}
          <section className="card anim-fade-up anim-stagger-2">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "var(--z-dark)" }}>
               On-Device Private Storage
            </h2>
            <p style={{ fontSize: "13px", color: "var(--z-gray-body)", margin: "0 0 16px" }}>
              Your financial assumptions, customer logs, and profile remain strictly on your device.
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
              <button className="button primary" onClick={exportData}>
                <Icon name="download" size={16} /> Download Backup (JSON)
              </button>
            </div>

            {status && (
              <p style={{ fontSize: "12px", color: "var(--z-green-dark)", fontWeight: 600, margin: "6px 0 12px" }}>
                {status}
              </p>
            )}

            <details style={{ marginTop: "12px", borderTop: "1px solid var(--z-border)", paddingTop: "12px" }}>
              <summary style={{ fontSize: "12px", fontWeight: 700, color: "var(--z-dark)", cursor: "pointer" }}>
                Restore Backup File
              </summary>
              <input
                type="file"
                accept="application/json"
                aria-label="Restore backup"
                style={{ marginTop: "8px", fontSize: "12px" }}
                onChange={async (e) => {
                  try {
                    const d = JSON.parse(await e.target.files[0].text());
                    if (d.version !== 1 || !d.entries || typeof d.entries !== "object") throw Error();
                    for (const [k, v] of Object.entries(d.entries)) {
                      if (k === "pending_rows") {
                        if (!Array.isArray(v)) throw Error();
                      } else if (k === "profile") {
                        if (!v || !["bengaluru", "pune"].includes(v.city)) throw Error();
                      } else if (!k.startsWith("plan_")) throw Error();
                    }
                    for (const [k, v] of Object.entries(d.entries)) writeStore(k, v);
                    window.location.reload();
                  } catch {
                    setStatus("Could not restore backup. Please upload a valid JSON backup file.");
                  }
                }}
              />
            </details>
          </section>

          {/* Reset Workspace */}
          <section className="card anim-fade-up anim-stagger-3">
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "var(--z-dark)" }}>
               Reset Workspace
            </h2>
            <p style={{ fontSize: "12px", color: "var(--z-gray-muted)", margin: "0 0 16px" }}>
              Permanently clear your active profile, pilot logs, and custom assumptions.
            </p>

            {confirm ? (
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="button" style={{ background: "var(--z-red)", color: "#FFFFFF" }} onClick={clear}>
                  Confirm Reset & Clear
                </button>
                <button className="button secondary" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--z-red)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Reset all stored data →
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
