"use client";
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { loadJson } from "./lib/api.js";
import Shell from "./components/Shell.jsx";
import Settings from "./pages/Settings.jsx";
import { readStore, writeStore } from "./lib/storage.js";
import Home from "./pages/Home.jsx";
import Advisor from "./pages/Advisor.jsx";
import IdeaDetail from "./pages/IdeaDetail.jsx";
import GapFinder from "./pages/GapFinder.jsx";
import SpotTime from "./pages/SpotTime.jsx";
import CostProfit from "./pages/CostProfit.jsx";
import Schemes from "./pages/Schemes.jsx";
import MyPlan from "./pages/MyPlan.jsx";
import DataWorkspace from "./pages/DataWorkspace.jsx";

export const PILOT_WARDS = {
  bengaluru: ["BLR-186", "BLR-192", "BLR-185", "BLR-178", "BLR-191"],
  pune: ["PUN-007", "PUN-006", "PUN-005"],
};

const EMPTY_PROFILE = {
  name: "",
  city: "bengaluru",
  language: "en-IN",
  mode: "",
  businessId: "",
  money: 0,
  skill: "",
  wardId: "",
  hours: "",
  loan: null,
};

export default function App() {
  const [profile, setProfile] = useState(() => {
    const saved = readStore("profile", {});
    const city = ['bengaluru','pune'].includes(saved.city) ? saved.city : 'bengaluru';
    return {...EMPTY_PROFILE, ...saved, city};
  });
  const [common, setCommon] = useState(null);
  const [cityData, setCityData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    writeStore("profile", profile);
  }, [profile]);

  useEffect(() => {
    Promise.all([
      loadJson("/data/common/business_types.json"),
      loadJson("/data/common/recipes.json"),
      loadJson("/data/common/schemes.json"),
      loadJson("/data/common/licences.json"),
      loadJson("/data/daily/mandi_today.json"),
      loadJson("/data/daily/news_today.json"),
    ])
      .then((all) => {
        setCommon({ types: all[0], recipes: all[1], schemes: all[2], licences: all[3], mandi: all[4], news: all[5] });
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setCityData(null);
    const c = profile.city;
    Promise.all([
      loadJson("/data/" + c + "/ward_stats.json"),
      loadJson("/data/" + c + "/wards.geojson"),
      loadJson("/data/" + c + "/rush_clock.json"),
    ])
      .then((all) => {
        if (!cancelled) setCityData({ stats: all[0], shapes: all[1], rush: all[2] });
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [profile.city]);

  function updateProfile(changes) {
    setProfile((old) => ({ ...old, ...changes }));
  }

  if (error !== "") {
    return <Shell profile={profile} updateProfile={updateProfile}><div className="screen"><div className="designed-error" role="alert"><span className="eyebrow">LET’S TRY THAT AGAIN</span><h1>Your workspace couldn’t load.</h1><p>We couldn’t retrieve the city data. Check your connection and try again.</p><button className="button primary" onClick={()=>window.location.reload()}>Reload workspace</button><details><summary>View details</summary>{error}</details></div></div></Shell>;
  }
  if (common === null || cityData === null) {
    return <Shell profile={profile} updateProfile={updateProfile}><div className="screen loading-workspace" role="status" aria-label="Loading your workspace"><div className="skeleton skeleton-heading"/><div className="skeleton skeleton-hero"/><div className="skeleton-grid">{[0,1,2,3].map(i=><div key={i} className="skeleton skeleton-stat"/>)}</div><span className="muted small">Preparing your workspace…</span></div></Shell>;
  }

  const shared = { profile: profile, updateProfile: updateProfile, common: common, cityData: cityData };

  return (
    <Shell profile={profile} updateProfile={updateProfile}>
      <Routes key={profile.city}>
        <Route path="/" element={<Home {...shared} />} />
        <Route path="/advisor" element={<Advisor {...shared} />} />
        <Route path="/idea/:typeId" element={<IdeaDetail {...shared} />} />
        <Route path="/gap" element={<GapFinder {...shared} />} />
        <Route path="/spot" element={<SpotTime {...shared} />} />
        <Route path="/cost" element={<CostProfit {...shared} />} />
        <Route path="/schemes" element={<Schemes {...shared} />} />
        <Route path="/plan" element={<MyPlan {...shared} />} />
        <Route path="/data" element={<DataWorkspace {...shared} />} />
        <Route path="/settings" element={<Settings {...shared} />} />
        <Route path="*" element={<div className="screen"><h1>Page not found</h1><a href="/">Back to overview</a></div>} />
      </Routes>
    </Shell>
  );
}
