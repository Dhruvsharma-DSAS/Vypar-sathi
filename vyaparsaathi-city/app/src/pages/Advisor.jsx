import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { advisorStatus, advisorReply } from "../lib/api.js";
import { readMoney, readBusiness, readSkill, readHours, readYesNo, readWard } from "../lib/parse.js";
import { advisorText } from "../lib/i18n.js";
import { economics } from "../lib/analyser.js";
import { rupees } from "../lib/money.js";
import { PILOT_WARDS } from "../App.jsx";
import Icon from "../components/Icon.jsx";
import SaathiBot from "../components/SaathiBot.jsx";

function SearchSuggestions({ html }) {
  const policy = "default-src 'none'; style-src 'unsafe-inline'; img-src data: https://www.gstatic.com; form-action 'none'; base-uri 'none'";
  return <iframe
    className="advisor-search-suggestions"
    title="Google Search suggestions"
    sandbox="allow-popups allow-popups-to-escape-sandbox"
    referrerPolicy="no-referrer"
    srcDoc={`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><base target="_blank"><style>body{margin:0}</style>${html}`}
  />;
}

export default function Advisor({ profile: p, updateProfile, common, cityData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const research = searchParams.get("research") === "1";
  const [modelStatus, setModelStatus] = useState(undefined);
  const [showChoices, setShowChoices] = useState(false);
  const city = p.city === "pune" ? "Pune" : "Bengaluru";
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

  useEffect(() => {
    let active = true;
    advisorStatus().then((status) => {
      if (active) setModelStatus(status);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function handleAnswer(answer, direct) {
    answer = answer.trim();
    if (!answer || busy.current) return;
    busy.current = true;
    setError("");
    setThinking(true);
    setMessages((old) => [...old, { from: "user", text: answer, research }]);
    setText("");

    try {
      const question = /[?？]|^(what|which|where|when|why|how|can|could|should|would|is|are)\b/i.test(answer);
      const parsers = {
        businessId: () => {
          const exact = common.types.find((item) =>
            [item.name, item.hindi].some((name) => name.toLowerCase() === answer.toLowerCase())
          );
          if (exact) return exact.id;
          const match = readBusiness(answer);
          if (match === "phone_repair" && !/^(repair)$|\b(phone|mobile|device)\b/i.test(answer)) return null;
          return match;
        },
        money: () => readMoney(answer),
        skill: () => readSkill(answer),
        hours: () => readHours(answer),
        wardId: () => readWard(answer, wards),
        loan: () => readYesNo(answer),
      };
      const value = field && !research && !question ? parsers[field]() : null;
      const validValue = value != null && value !== "" &&
        (field !== "money" || (value > 0 && value <= 10000000)) &&
        (field !== "businessId" || common.types.some((item) => item.id === value));
      const changes = direct || (validValue ? { [field]: value } : null);
      if (changes) {
        updateProfile(changes);
        setShowChoices(false);
        setMessages((old) => [...old, { from: "ai", prefix: "ok", field: missing({ ...p, ...changes }) }]);
        return;
      }

      const history = messages
        .filter((entry) => Boolean(entry.research) === research &&
          (entry.from === "user" || ["gemini", "ollama", "cloud"].includes(entry.provider)))
        .slice(-6)
        .map((entry) => ({ role: entry.from === "user" ? "user" : "assistant", text: entry.text.slice(0, 1000) }));
      const templates = common.types.map((item) => `${item.name} (${rupees(economics(item, common, p.city).cashNeeded)})`);
      const context = research
        ? `Default city: ${city}. If the user specifies a different location, use that location.`
        : `City: ${city}. Selected idea: ${business?.name ?? "undecided"}. Budget: ${p.money ? rupees(p.money) : "unspecified"}. Sample startup cash, including one month of fixed costs: ${templates.join(", ")}.`;
      const reply = await advisorReply({
        text: answer, language: p.language, context, history, research,
      });
      if (reply?.text && (!research || reply.sources?.length)) {
        setMessages((old) => [...old, { from: "ai", ...reply, research }]);
        return;
      }

      const budget = readMoney(answer);
      const suggestions = !research && budget > 0 ? common.types
        .map((item) => ({ name: item.name, cash: economics(item, common, p.city).cashNeeded }))
        .filter((item) => item.cash <= budget)
        .sort((a, b) => a.cash - b.cash)
        .slice(0, 3) : [];
      let fallback = "Tell me the business you have in mind or your starting budget. I can suggest a few of our templates and show you what to check before spending.";
      if (research) {
        fallback = "I couldn’t retrieve cited web results right now. Try again with your business idea and city.";
      } else if (suggestions.length) {
        fallback = `Sample setups within ${rupees(budget)} include ${suggestions.map(({ name, cash }) => `${name} (${rupees(cash)})`).join(", ")}. Check local quotes before choosing.`;
      } else if (/^(hello|hi|hey|namaste)\b/i.test(answer)) {
        fallback = `Hello! What are you thinking of starting in ${city}? Share your idea or tell me how much you can set aside.`;
      }
      setMessages((old) => [...old, { from: "ai", text: fallback, provider: research ? "unavailable" : "built-in" }]);
    } finally {
      setThinking(false);
      busy.current = false;
    }
  }

  function toggleResearch() {
    const params = new URLSearchParams(searchParams);
    if (research) params.delete("research");
    else params.set("research", "1");
    setSearchParams(params, { replace: true, preventScrollReset: true });
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

  const providerLabels = {
    gemini: "Gemini",
    ollama: "Local model",
    cloud: "Hosted model",
    "built-in": "Built-in guidance",
    unavailable: "Web research unavailable",
  };

  return (
    <div className="screen advisor-screen">
      <header className="advisor-heading">
        <SaathiBot compact planner mood={thinking ? "thinking" : research ? "curious" : field ? "friendly" : "celebrate"} />
        <div>
          <h1>Ask Saathi</h1>
          <p>Your small-business planning companion</p>
          <span className="advisor-provider">{modelStatus === undefined ? "Checking model…" : modelStatus?.provider ? `${providerLabels[modelStatus.provider]} configured` : "Built-in guidance available"}</span>
        </div>
      </header>

      <div className="advisor-grid">
        <section className="advisor-workspace" aria-label="Chat with Saathi">
          <div className="advisor-mode">
            <button type="button" aria-pressed={!research} disabled={thinking} onClick={research ? toggleResearch : undefined}>Plan a business</button>
            <button type="button" aria-pressed={research} disabled={thinking} onClick={!research ? toggleResearch : undefined}>Research another idea</button>
          </div>
          {research && <p className="research-note">
            Describe your idea and where you want to start it. Saathi searches for sources and suggests what to verify locally.
            {modelStatus !== undefined && !modelStatus?.research && " Web research requires a configured Gemini connection."}
          </p>}

          <div ref={chatRef} className="chat advisor-log" role="log" aria-label="Messages">
            <div className="bubble ai">
              {research ? "What idea should we research? For example, bicycle repair near a college in Pune." : p.mode === "discover" ? t.discover : t.intro}
              {!research && messages.length === 0 && <><br />{field ? t[field] : t.done}</>}
            </div>
            {messages.map((message, i) => (
              <div className={`bubble ${message.from}`} key={i}>
                {message.provider && <small className="message-provider">{message.sources?.length ? "Web research · Gemini" : providerLabels[message.provider]}</small>}
                {message.text || t[message.prefix] + (message.field ? t[message.field] : t.done)}
                {message.sources?.length > 0 && <ul className="advisor-sources" aria-label="Web sources">
                  {message.sources.map(({ url, title }) => (
                    <li key={url}><a href={url} target="_blank" rel="noreferrer">{title} ↗</a></li>
                  ))}
                </ul>}
                {message.searchSuggestions && <SearchSuggestions html={message.searchSuggestions} />}
              </div>
            ))}
            {thinking && <div className="bubble ai" role="status">{research ? "Looking for sources…" : "Saathi is thinking…"}</div>}
          </div>

          <form className="composer advisor-composer" onSubmit={(e) => { e.preventDefault(); handleAnswer(text); }}>
            <button type="button" className="advisor-voice" aria-label={listening ? t.listening : t.voice} aria-pressed={listening} disabled={thinking} onClick={voice}>
              <Icon name="mic" size={17} />
            </button>
            <input
              aria-label="Message to Saathi"
              value={text}
              readOnly={thinking}
              placeholder={research ? "Describe your business idea…" : "Ask a question or give an answer…"}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
            />
            <button className="send" disabled={thinking || !text.trim()} aria-label="Send message">
              <Icon name="arrow" size={17} />
            </button>
          </form>
          {error && <p className="input-error" role="status">{error}</p>}

          {!research && chips.length > 0 && <div className="advisor-choices">
            <span>Quick answers</span>
            <div className="chip-row">
              {(showChoices ? chips : chips.slice(0, 4)).map(([label, value]) => (
                <button className="chip" disabled={thinking} key={label} onClick={() => handleAnswer(label, value)}>{label}</button>
              ))}
              {chips.length > 4 && <button className="chip" aria-expanded={showChoices} onClick={() => setShowChoices(!showChoices)}>{showChoices ? "Show fewer" : `Show all ${chips.length}`}</button>}
              {field === "businessId" && <button className="chip advisor-other-chip" disabled={thinking} onClick={toggleResearch}>Other business idea</button>}
            </div>
          </div>}

          {!research && field === "wardId" && <label className="field advisor-ward">
            Choose any neighbourhood in {city}
            <select value="" onChange={(e) => {
              const chosen = wards.find((item) => item.ward_id === e.target.value);
              if (chosen) handleAnswer(chosen.name, { wardId: chosen.ward_id });
            }}>
              <option value="">Select from all wards</option>
              {wards.map((item) => <option key={item.ward_id} value={item.ward_id}>{item.name}</option>)}
            </select>
          </label>}
        </section>

        <aside className="card advisor-profile">
          <h2>Your business plan</h2>
          <p>{complete} of {order.length} setup steps complete</p>
          <progress value={complete} max={order.length} aria-label="Plan setup progress" />
          {[
            ["Business idea", business?.name],
            ["Starting capital", p.money ? rupees(p.money) : null],
            ["Skill", p.skill],
            ["Neighbourhood", ward?.name],
            ["Hours", p.hours],
            ["Funding", typeof p.loan === "boolean" ? p.loan ? "Explore loans" : "Own savings" : null],
          ].map(([label, value]) => <div className="kv" key={label}><span>{label}</span><b>{value || "Pending"}</b></div>)}
          <Link to="/settings">Edit profile <Icon name="arrow" size={15} /></Link>
        </aside>
      </div>
    </div>
  );
}
