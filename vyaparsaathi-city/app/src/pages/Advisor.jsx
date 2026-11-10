import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { askAI } from "../lib/api.js";
import { readMoney, readBusiness, readSkill, readHours, readYesNo, readWard } from "../lib/parse.js";
import { advisorText } from "../lib/i18n.js";
import { rankBusinesses } from "../lib/score.js";
import { rupees } from "../lib/money.js";
import { PILOT_WARDS } from "../App.jsx";
import Icon from "../components/Icon.jsx";
import SaathiBot from "../components/SaathiBot.jsx";

export default function Advisor({ profile: p, updateProfile, common, cityData }) {
  const navigate = useNavigate();
  const t = advisorText(p.language);
  const wards = cityData.stats.wards;
  const order =
    p.mode === "discover"
      ? ["money", "skill", "wardId", "hours", "loan"]
      : ["businessId", "money", "skill", "wardId", "hours", "loan"];
  const missing = (profile) =>
    order.find((k) =>
      k === "money"
        ? !(profile.money > 0)
        : k === "loan"
        ? typeof profile.loan !== "boolean"
        : k === "wardId"
        ? !wards.some((w) => w.ward_id === profile.wardId)
        : !profile[k]
    ) || null;

  const field = missing(p);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const chatRef = useRef(null);
  const busy = useRef(false);

  useEffect(() => () => {
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function handleAnswer(answer, direct) {
    if (!answer.trim() || busy.current || !field) return;
    busy.current = true;
    setError("");
    setThinking(true);
    setMessages((old) => [...old, { from: "user", text: answer }]);
    setText("");

    let changes = { ...direct };
    if (!direct) {
      const b = readBusiness(answer),
        m = readMoney(answer),
        s = readSkill(answer),
        h = readHours(answer),
        w = readWard(answer, wards);
      if (b) changes.businessId = b;
      if (
        m !== null &&
        (field === "money" ||
          /hazaar|hazar|thousand|lakh|हजार|हज़ार|लाख|ಸಾವಿರ|rupees|₹|rs\b|\d+k\b/i.test(answer))
      )
        changes.money = m;
      if (s) changes.skill = s;
      if (h) changes.hours = h;
      if (w) changes.wardId = w;
      if (field === "loan") {
        const yn = readYesNo(answer);
        if (yn !== null) changes.loan = yn;
      }
      if (!Object.keys(changes).length) {
        const ai = await askAI("extract_profile", {
          text: answer,
          asked: field,
          wards: wards.map((w) => w.name),
          language: p.language,
        });
        if (ai?.profile) {
          changes = { ...ai.profile };
          if (changes.wardName) {
            changes.wardId = readWard(changes.wardName, wards);
            delete changes.wardName;
          }
        }
      }
    }

    const valid = {};
    for (const [k, v] of Object.entries(changes)) {
      if (k === "businessId" && common.types.some((x) => x.id === v)) valid[k] = v;
      if (k === "wardId" && wards.some((x) => x.ward_id === v)) valid[k] = v;
      if (k === "money" && Number.isFinite(v) && v >= 0 && v <= 10000000) valid[k] = v;
      if (k === "skill" && ["cooking", "tailoring", "repair", "none"].includes(v)) valid[k] = v;
      if (k === "hours" && ["morning", "lunch", "evening", "both"].includes(v)) valid[k] = v;
      if (k === "loan" && typeof v === "boolean") valid[k] = v;
    }

    updateProfile(valid);
    const next = missing({ ...p, ...valid });
    setMessages((old) => [
      ...old,
      { from: "ai", prefix: Object.keys(valid).length ? "ok" : "retry", field: next },
    ]);
    setThinking(false);
    busy.current = false;
  }

  function voice() {
    setError("");
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      setError(t.unavailable);
      return;
    }
    try {
      const rec = new Rec();
      recRef.current = rec;
      rec.lang = p.language;
      rec.onresult = (e) => {
        setListening(false);
        handleAnswer(e.results[0][0].transcript);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => {
        setListening(false);
        setError(t.voiceError);
      };
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setError(t.voiceError);
    }
  }

  const english = p.language === "en-IN";
  let chips = [];
  if (field === "businessId")
    chips = common.types.map((x) => [english ? x.name : x.hindi, { businessId: x.id }]);
  if (field === "money")
    chips = [20000, 35000, 50000, 100000].map((n) => [rupees(n), { money: n }]);
  if (field === "skill")
    chips = (english
      ? ["Cooking & Food Carts", "Tailoring & Boutique", "Device Repair", "No Specific Skill"]
      : ["Khana banana", "Silai", "Repair", "No specific skill"]
    ).map((label, i) => [label, { skill: ["cooking", "tailoring", "repair", "none"][i] }]);
  if (field === "wardId")
    chips = wards
      .filter((w) => PILOT_WARDS[p.city].includes(w.ward_id))
      .map((w) => [w.name, { wardId: w.ward_id }]);
  if (field === "hours")
    chips = (english
      ? ["Morning", "Afternoon", "Evening", "All Day"]
      : ["Subah", "Dopahar", "Shaam", "Poora din"]
    ).map((label, i) => [label, { hours: ["morning", "lunch", "evening", "both"][i] }]);
  if (field === "loan")
    chips = (english
      ? ["Yes, explore credit schemes", "No, use my own savings"]
      : ["Haan", "Nahi"]
    ).map((label, i) => [label, { loan: i === 0 }]);

  const ward = wards.find((w) => w.ward_id === p.wardId);
  const business = common.types.find((x) => x.id === p.businessId);
  const complete = order.filter((k) =>
    k === "loan" ? typeof p[k] === "boolean" : !!p[k]
  ).length;

  return (
    <div className="screen">
      {/* Page Heading */}
      <div className="page-heading anim-fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            INTELLIGENT BUSINESS GUIDE
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            Saathi AI Advisor
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            Speak in your own words or click suggested options. Let’s configure your plan step-by-step.
          </p>
        </div>

        <div
          style={{
            background: complete === order.length ? "var(--z-green-light)" : "var(--z-red-light)",
            border: `1px solid ${complete === order.length ? "var(--z-green-border)" : "var(--z-red-border)"}`,
            color: complete === order.length ? "var(--z-green-dark)" : "var(--z-red)",
            padding: "8px 16px",
            borderRadius: "var(--z-radius-full)",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {complete}/{order.length} Steps Completed
        </div>
      </div>

      <div className="advisor-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", marginTop: "16px" }}>
        {/* Left: Chat Screen */}
        <div className="anim-fade-up anim-stagger-1">
          <div
            ref={chatRef}
            className="chat"
            role="log"
            aria-live="polite"
            style={{
              height: "420px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              padding: "20px",
              background: "#FFFFFF",
              border: "1px solid var(--z-border)",
              borderRadius: "var(--z-radius-xl)",
              boxShadow: "var(--z-shadow-sm)",
            }}
          >
            <div className="bubble ai">
              {p.mode === "discover" ? t.discover : t.intro}
              <br />
              {messages.length === 0 ? (field ? t[field] : t.done) : null}
            </div>

            {messages.map((m, i) => (
              <div className={"bubble " + m.from} key={i}>
                {m.text || t[m.prefix] + (m.field ? t[m.field] : t.done)}
              </div>
            ))}

            {thinking && (
              <div className="bubble ai" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Saathi is analyzing data…</span>
              </div>
            )}
          </div>

          {/* Quick Choice Chips */}
          <div className="chip-row" style={{ margin: "16px 0 10px" }}>
            {chips.map(([label, value]) => (
              <button
                className="chip"
                disabled={thinking}
                key={label}
                onClick={() => handleAnswer(label, value)}
              >
                {label}
              </button>
            ))}
          </div>

          {field === "wardId" && (
            <label className="field" style={{ margin: "10px 0" }}>
              Or choose any neighbourhood in {p.city === "pune" ? "Pune" : "Bengaluru"}
              <select
                value=""
                onChange={(e) => {
                  const w = wards.find((w) => w.ward_id === e.target.value);
                  if (w) handleAnswer(w.name, { wardId: w.ward_id });
                }}
              >
                <option value="">Select from all wards</option>
                {wards.map((w) => (
                  <option key={w.ward_id} value={w.ward_id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Composer */}
          {field && (
            <div style={{ marginTop: "12px" }}>
              <form className="composer" onSubmit={(e) => { e.preventDefault(); handleAnswer(text); }}>
                <input
                  aria-label="Message to Saathi"
                  value={text}
                  disabled={thinking}
                  placeholder={t.placeholder}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                />
                <button className="send" disabled={thinking || !text.trim()} aria-label="Send message">
                  <Icon name="arrow" size={16} />
                </button>
              </form>

              <button
                className="mic"
                disabled={thinking}
                onClick={voice}
                style={{
                  width: "100%",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Icon name="mic" size={16} />
                <span>{listening ? t.listening : t.voice}</span>
              </button>
            </div>
          )}

          {error && <p className="input-error" role="status" style={{ color: "var(--z-red)", fontSize: "12px", marginTop: "8px" }}>{error}</p>}
        </div>

        {/* Right: Profile Plan Taking Shape */}
        <aside className="card advisor-profile anim-fade-up anim-stagger-2" style={{ display: "flex", flexDirection: "column" }}>
          <div className="advisor-bot" style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <SaathiBot mood={thinking ? "thinking" : field ? "listening" : "celebrate"} />
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "8px 0 4px", color: "var(--z-dark)" }}>
            Your Blueprint Summary
          </h2>
          <p style={{ fontSize: "12px", color: "var(--z-gray-muted)", marginBottom: "14px" }}>
            Your profile, updated during this conversation.
          </p>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {[
              ["Target Business", business?.name],
              ["Starting Capital", p.money ? rupees(p.money) : null],
              ["Skill Domain", p.skill],
              ["Neighbourhood", ward?.name],
              ["Shift / Hours", p.hours],
              ["Funding Support", p.loan === null ? null : p.loan ? "Explore Micro-Loans" : "Own Savings Only"],
            ].map(([label, value]) => (
              <div className="kv" key={label}>
                <span>{label}</span>
                <b>{value || "Pending answer"}</b>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--z-border)" }}>
            <Link to="/settings" style={{ fontSize: "12px", color: "var(--z-red)", fontWeight: 700, textDecoration: "none" }}>
              Edit Profile Settings Directly →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
