import { useEffect, useState } from "react";
import HourBars from "../components/HourBars.jsx";
import { bestWindow } from "../lib/score.js";
import { getWeather } from "../lib/api.js";

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
  const spot = spots.find((s) => s.name === spotName);
  const type = props.common.types.find((t) => t.id === p.businessId);

  useEffect(() => {
    setWeather(null);
    let cancelled=false;
    getWeather(p.city).then((w) => {if(!cancelled)setWeather(w)});
    return ()=>{cancelled=true};
  }, [spotName,p.city]);

  let peakKey = "evening";
  if (type) {
    peakKey = type.peak;
  }
  if (p.hours !== "" && p.hours !== "both") {
    peakKey = p.hours;
  }
  const range = WINDOWS[peakKey];
  const values = spot[dayType];
  const best = bestWindow(values, range[0], range[1], 3);

  let rain = [];
  let rainLine = "Live weather is not configured. Add your chosen weather service to enable it.";
  if (weather && weather.hourly) {
    rain = weather.hourly.precipitation_probability;
    const temps = weather.hourly.temperature_2m;
    let maxRain = 0;
    for (let h = best.start; h < best.end; h++) {
      if (rain[h] > maxRain) {
        maxRain = rain[h];
      }
    }
    const temp = Math.round(temps[best.start]);
    if (maxRain >= 60) {
      rainLine = "Rain chance " + maxRain + "% in your best hours. Stand under a covered exit, carry a plastic sheet, push hot items.";
    } else if (temp >= 34) {
      rainLine = temp + "°C - hot. Push cold drinks, keep water and shade.";
    } else {
      rainLine = "Rain chance " + maxRain + "%, about " + temp + "°C. Normal day.";
    }
  }

  const news = props.common.news[p.city];
  let sampleTag = null;
  if (props.common.news.sample) {
    sampleTag = <span className="badge sample">Sample data</span>;
  }

  return (
    <div className="screen">
      <div className="topbar"><b>Spot and Time</b><span className="muted small">Rush Clock</span></div>
      <p className="page-intro">Sample rush curves show the shape of a day, not actual pedestrian counts. Confirm your chosen spot with a field survey.</p>
      <select aria-label="Footfall hub" className="select" value={spotName} onChange={(e) => setSpotName(e.target.value)}>
        {spots.map((s) => (
          <option key={s.name} value={s.name}>{s.name}</option>
        ))}
      </select>
      <div className="seg-row">
        <button className={segClass(dayType, "weekday")} onClick={() => setDayType("weekday")}>Weekday</button>
        <button className={segClass(dayType, "weekend")} onClick={() => setDayType("weekend")}>Weekend</button>
      </div>
      <div className="card">
        <div className="card-title">Rush index by hour (0-100)</div>
        <HourBars values={values} best={best} rain={rain} />
        <div className="best">Best for you: <b>{best.start}:00 - {best.end}:00</b> (avg rush {best.avg})</div>
        <div className="muted small">{spot.source}</div>
      </div>
      <div className="card blue">
        <div className="card-title">Weather</div>
        <p>{rainLine}</p>{weather&&<p className="source-line">{weather.stale?"Last saved forecast (may be outdated)":"Forecast fetched"}: {new Date(weather.cached_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST. Forecast date: {weather.hourly?.time?.[0]?.slice(0,10)}.</p>}
      </div>
      <div className="card">
        <div className="card-title">City Pulse · saved {props.common.news.date} {sampleTag}</div>
        <p className="small">{news.summary}</p>
        {news.items.slice(0, 3).map((n) => (
          <div key={n.title} className={"news " + n.tag}>{n.link && /^https?:\/\//.test(n.link) ? <a href={n.link} target="_blank" rel="noreferrer">{n.title} ↗</a> : n.title}</div>
        ))}
      </div>
    </div>
  );
}

function segClass(current, value) {
  if (current === value) {
    return "seg on";
  }
  return "seg";
}
