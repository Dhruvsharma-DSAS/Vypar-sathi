"use client";
import { useEffect, useState, lazy, Suspense, Component } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { loadJson } from "./lib/api.js";
import Shell from "./components/Shell.jsx";
const Settings = lazy(()=>import("./pages/Settings.jsx"));
import { readStore, writeStore } from "./lib/storage.js";
const Home = lazy(()=>import("./pages/Home.jsx"));
const Advisor = lazy(()=>import("./pages/Advisor.jsx"));
const IdeaDetail = lazy(()=>import("./pages/IdeaDetail.jsx"));
const GapFinder = lazy(()=>import("./pages/GapFinder.jsx"));
const SpotTime = lazy(()=>import("./pages/SpotTime.jsx"));
const CostProfit = lazy(()=>import("./pages/CostProfit.jsx"));
const Schemes = lazy(()=>import("./pages/Schemes.jsx"));
const MyPlan = lazy(()=>import("./pages/MyPlan.jsx"));
const DataWorkspace = lazy(()=>import("./pages/DataWorkspace.jsx"));

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

class ToolBoundary extends Component {
 constructor(props){super(props);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 render(){if(this.state.failed)return <div className="screen market-empty" role="alert"><h1>This tool couldn’t load.</h1><p>Reconnect and retry. Tools you previously visited remain available offline.</p><button className="button primary" onClick={()=>window.location.reload()}>Retry</button> <a className="button secondary" href="/">Back to Discover</a></div>;return this.props.children}
}

function LoadingScreen({ label }) {
  return (
    <div className="screen loading-workspace" role="status">
      <p className="app-loading-label">{label}</p>
      <div className="skeleton skeleton-heading" aria-hidden="true" />
      <div className="skeleton skeleton-hero" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [profile, setProfile] = useState(() => {
    const saved = readStore("profile", {});
    const city = ['bengaluru','pune'].includes(saved.city) ? saved.city : 'bengaluru';
    return {...EMPTY_PROFILE, ...saved, city};
  });
  const [common, setCommon] = useState(null);
  const [cityData, setCityData] = useState(null);
  const [commonError, setCommonError] = useState("");
  const [cityError, setCityError] = useState("");
  const error = commonError || cityError;

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
      .catch((error) => setCommonError(error.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCityError("");
    setCityData(null);
    const c = profile.city;
    Promise.all([
      loadJson("/data/" + c + "/ward_stats.json"),
      loadJson("/data/" + c + "/wards.geojson"),
      loadJson("/data/" + c + "/rush_clock.json"),
    ])
      .then((all) => {
        if (!cancelled) setCityData({ city: c, stats: all[0], shapes: all[1], rush: all[2] });
      })
      .catch((error) => { if (!cancelled) setCityError(error.message); });
    return () => { cancelled = true; };
  }, [profile.city]);

  function updateProfile(changes) {
    setProfile((old) => ({ ...old, ...changes }));
  }

  if (error !== "") {
    return <Shell profile={profile} updateProfile={updateProfile}><div className="screen"><div className="designed-error" role="alert"><span className="eyebrow">LET’S TRY THAT AGAIN</span><h1>Your workspace couldn’t load.</h1><p>We couldn’t retrieve the city data. Check your connection and try again.</p><button className="button primary" onClick={()=>window.location.reload()}>Reload workspace</button><details><summary>View details</summary>{error}</details></div></div></Shell>;
  }
  if (!common || cityData?.city !== profile.city) {
    return (
      <Shell profile={profile} updateProfile={updateProfile}>
        <LoadingScreen label={common ? "Loading city data…" : "Preparing VyaparSaathi…"} />
      </Shell>
    );
  }

  const shared = { profile: profile, updateProfile: updateProfile, common: common, cityData: cityData };

  return (
    <Shell profile={profile} updateProfile={updateProfile}>
      <ToolBoundary key={pathname}><Suspense fallback={<LoadingScreen label="Opening this screen…" />}><Routes key={profile.city}>
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
      </Routes></Suspense></ToolBoundary>
    </Shell>
  );
}
