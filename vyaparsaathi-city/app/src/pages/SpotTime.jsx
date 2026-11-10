import { useEffect, useState } from "react";
import HourBars from "../components/HourBars.jsx";
import { bestWindow } from "../lib/score.js";
import { getWeather } from "../lib/api.js";
import Icon from "../components/Icon.jsx";

const WINDOWS = {
  morning: [6, 12],
  lunch: [11, 16],
  evening: [16, 23],
  both: [6, 23],
};

export default function SpotTime(props) {
  const p = props.profile;
  const spots = Object.values(props.cityData.rush);
  const [spotName, setSpotName] = useState(spots[0].name);
  const [dayType, setDayType] = useState("weekday");
  const [weather, setWeather] = useState(null);
  const spot = spots.find((s) => s.name === spotName) || spots[0];
  const type = props.common.types.find((t) => t.id === p.businessId);

  useEffect(() => {
    setWeather(null);
    let cancelled = false;
    getWeather(p.city).then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, [spotName, p.city]);

  let peakKey = "evening";
  if (type) {
    peakKey = type.peak;
  }
  if (p.hours !== "" && p.hours !== "both") {
    peakKey = p.hours;
  }
  const range = WINDOWS[peakKey] || [16, 23];
  const values = spot[dayType];
  const best = bestWindow(values, range[0], range[1], 3);

  let rain = [];
  let rainLine = "Live weather is not configured. Add your chosen weather service to enable it.";
  let maxRainProb = 0;
  let currTemp = null;
  if (weather && weather.hourly) {
    rain = weather.hourly.precipitation_probability;
    const temps = weather.hourly.temperature_2m;
    for (let h = best.start; h < best.end; h++) {
      if (rain[h] > maxRainProb) {
        maxRainProb = rain[h];
      }
    }
    currTemp = Math.round(temps[best.start]);
    if (maxRainProb >= 60) {
      rainLine = "Rain chance " + maxRainProb + "% during your prime window. Plan a covered kiosk or umbrella setup.";
    } else if (currTemp >= 34) {
      rainLine = currTemp + "°C — hot day. High beverage and cooling dessert demand. Ensure shaded waiting area.";
    } else {
      rainLine = "Rain probability " + maxRainProb + "%, ~" + currTemp + "°C. Excellent footfall conditions predicted.";
    }
  }

  const news = props.common.news[p.city];

  return (
    <div className="screen">
      {/* Header */}
      <div className="page-heading anim-fade-up">
        <div>
          <span className="eyebrow" style={{ color: "var(--z-red)", fontWeight: 700 }}>
            FOOTFALL TIMING & RUSH PATTERNS
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>
            Peak Demand & Spot Timing
          </h1>
          <p style={{ fontSize: "13px", color: "var(--z-gray-muted)" }}>
            Explore sample rush patterns and check weather when a provider is configured. Validate timing at your exact location.
          </p>
        </div>
      </div>

      {/* Spot Selector & Day Switcher Bar */}
      <div
        className="anim-fade-up anim-stagger-1"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--z-border)",
          borderRadius: "var(--z-radius-xl)",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          boxShadow: "var(--z-shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--z-radius-md)",
              background: "var(--z-red-light)",
              display: "grid",
              placeItems: "center",
              color: "var(--z-red)",
            }}
          >
            <Icon name="pin" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <small style={{ fontSize: "11px", color: "var(--z-gray-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Active Commercial Hub
            </small>
            <select
              aria-label="Footfall hub"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--z-dark)",
                cursor: "pointer",
                outline: "none",
                padding: "2px 0",
              }}
            >
              {spots.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.source})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weekday / Weekend Switcher */}
        <div style={{ display: "flex", background: "#F4F5F7", padding: "4px", borderRadius: "var(--z-radius-full)", gap: "4px" }}>
          <button
            onClick={() => setDayType("weekday")}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--z-radius-full)",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              background: dayType === "weekday" ? "#FFFFFF" : "transparent",
              color: dayType === "weekday" ? "var(--z-red)" : "var(--z-gray-body)",
              boxShadow: dayType === "weekday" ? "var(--z-shadow-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
             Weekday Traffic
          </button>
          <button
            onClick={() => setDayType("weekend")}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--z-radius-full)",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              background: dayType === "weekend" ? "#FFFFFF" : "transparent",
              color: dayType === "weekend" ? "var(--z-red)" : "var(--z-gray-body)",
              boxShadow: dayType === "weekend" ? "var(--z-shadow-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
             Weekend Rush
          </button>
        </div>
      </div>

      {/* Main Rush Curve Section */}
      <div className="card anim-fade-up anim-stagger-2" style={{ marginBottom: "24px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "var(--z-dark)" }}>
              24-Hour Pedestrian Rush Index (0–100)
            </h3>
            <span style={{ fontSize: "12px", color: "var(--z-gray-muted)" }}>
              Calibrated hourly density curve for {spot.name}
            </span>
          </div>

          <div
            style={{
              background: "var(--z-green-light)",
              border: "1px solid var(--z-green-border)",
              color: "var(--z-green-dark)",
              padding: "6px 14px",
              borderRadius: "var(--z-radius-full)",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span> Prime Window:</span>
            <b>{best.start}:00 – {best.end}:00</b>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div style={{ padding: "16px 0", background: "#F8F9FA", borderRadius: "var(--z-radius-md)", marginBottom: "16px" }}>
          <HourBars values={values} best={best} rain={rain} />
        </div>

        {/* Recommendation Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #FFF0F2 0%, #FFFFFF 100%)",
            border: "1px solid var(--z-red-border)",
            borderRadius: "var(--z-radius-md)",
            padding: "14px 18px",
          }}
        >
          <div>
            <b style={{ color: "var(--z-red)", fontSize: "14px", display: "block" }}>
              Optimal Operating Shift: {best.start}:00 – {best.end}:00
            </b>
            <small style={{ color: "var(--z-gray-muted)", fontSize: "11px" }}>
              Average rush rating: <b>{best.avg}/100</b>. Open 30 mins early to prep for the incoming surge.
            </small>
          </div>
          <span style={{ fontSize: "12px", color: "var(--z-gray-muted)" }}>{spot.source}</span>
        </div>
      </div>

      {/* 2-Column: Weather Guidance & City News Pulse */}
      <div className="two-column">
        {/* Weather Card */}
        <div className="card anim-fade-up anim-stagger-3">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="sun" size={18} style={{ color: "var(--z-amber)" }} />
            <span> Weather & Outdoor Operating Conditions</span>
          </div>

          <div
            style={{
              background: "#F8F9FA",
              border: "1px solid var(--z-border)",
              borderRadius: "var(--z-radius-md)",
              padding: "16px",
              marginTop: "12px",
              marginBottom: "16px",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "var(--z-dark)", lineHeight: 1.6, fontWeight: 500 }}>
              {rainLine}
            </p>
          </div>

          {weather && (
            <div style={{ fontSize: "11px", color: "var(--z-gray-muted)", lineHeight: 1.6 }}>
              {weather.stale ? "Last saved forecast (offline mode)" : "Live forecast retrieved"}:{" "}
              {new Date(weather.cached_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.
              Forecast date: {weather.hourly?.time?.[0]?.slice(0, 10)}.
            </div>
          )}
        </div>

        {/* City Pulse & News */}
        <div className="card anim-fade-up anim-stagger-4">
          <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="spark" size={18} style={{ color: "var(--z-red)" }} />
              <span> City Pulse & Local Developments</span>
            </div>
            {props.common.news.sample && <span className="badge">Sample data</span>}
          </div>

          <p style={{ fontSize: "13px", color: "var(--z-gray-body)", margin: "10px 0 16px" }}>
            {news.summary}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {news.items.slice(0, 3).map((n) => (
              <div
                key={n.title}
                style={{
                  background: "#FAFAFA",
                  border: "1px solid var(--z-border)",
                  borderRadius: "var(--z-radius-md)",
                  padding: "12px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                {n.link && /^https?:\/\//.test(n.link) ? (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--z-red)", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>{n.title}</span>
                    <Icon name="arrow" size={14} />
                  </a>
                ) : (
                  <span style={{ color: "var(--z-dark)" }}>{n.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
