import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavLink, useLocation } from "react-router-dom";
import BrandLogo from "./BrandLogo.jsx";
import Icon from "./Icon.jsx";
import InstallApp from "./InstallApp.jsx";

const tabs = [
  { path: "/", label: "Discover", icon: "shop", related: ["/idea/"] },
  { path: "/gap", label: "Explore", icon: "map", related: ["/spot"] },
  { path: "/cost", label: "Money", icon: "money", related: ["/schemes"] },
  { path: "/advisor", label: "Saathi", icon: "spark", related: [] },
  { path: "/plan", label: "My plan", icon: "plan", related: [] },
];

const websiteLinks = [
  ["/", "Discover", "shop"], ["/gap", "Locality lab", "map"],
  ["/cost", "Money planner", "money"], ["/advisor", "Ask Saathi", "spark"],
  ["/plan", "My plan", "plan"], ["/data", "Data library", "survey"],
];
const compactQuery = "(max-width: 600px)";

function subscribeWidth(callback) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function readView() {
  const shared = new URLSearchParams(window.location.search).get("view");
  if (shared === "app" || shared === "website") return shared;
  return localStorage.getItem("vyapar_view") || "auto";
}

export default function Shell({ profile, updateProfile, children }) {
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  const [viewPreference, setViewPreference] = useState(readView);
  const compact = useSyncExternalStore(subscribeWidth, () => window.matchMedia(compactQuery).matches, () => false);
  const appView = viewPreference === "app" || (viewPreference !== "website" && compact);
  const switchLabel = appView ? "Switch to Website view" : "Switch to App view";

  function switchView() {
    const next = appView ? "website" : "app";
    localStorage.setItem("vyapar_view", next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
    setViewPreference(next);
    setMore(false);
  }
  const [paused, setPaused] = useState(() => localStorage.getItem("motion_paused") === "true");
  const menu = useRef(null);
  const menuButton = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setMore(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "active";
    localStorage.setItem("motion_paused", String(paused));
  }, [paused]);

  useEffect(() => {
    if (!more) return;
    function dismiss(event) {
      if (event.key === "Escape") {
        setMore(false);
        menuButton.current?.focus();
      }
      if (event.type === "pointerdown" && !menu.current?.contains(event.target) &&
          !menuButton.current?.contains(event.target)) setMore(false);
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [more]);

  return (
    <div className="market-frame" data-view={appView ? "app" : "website"}>
      <div className="market-app">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <header className="market-header">
          <div className="market-header-inner">
            <NavLink to="/" className="market-brand" aria-label="VyaparSaathi home">
              <BrandLogo size={36} />
              <span>vyapar<span>saathi</span></span>
            </NavLink>
            <label className="market-city">
              <Icon name="pin" size={16} />
              <span>
                <small>Your city</small>
                <select aria-label="City" value={profile.city} onChange={(event) => {
                  updateProfile({ city: event.target.value, wardId: "" });
                }}>
                  <option value="bengaluru">Bengaluru</option>
                  <option value="pune">Pune</option>
                </select>
              </span>
            </label>
            <button type="button" className="market-view-toggle" aria-label={switchLabel} title={switchLabel} onClick={switchView}>
              <Icon name={appView ? "shop" : "plan"} size={17} />
              <span>{appView ? "Website view" : "App view"}</span>
            </button>
            <button
              ref={menuButton}
              type="button"
              className="market-account"
              aria-label="More tools"
              aria-expanded={more}
              aria-controls={more ? "app-tools" : undefined}
              onClick={() => setMore((open) => !open)}
            >
              <Icon name="menu" size={21} />
            </button>
            {more && (
              <nav ref={menu} id="app-tools" className="market-more" aria-label="More tools">
                <button type="button" className="market-motion" onClick={switchView}>
                  <Icon name={appView ? "shop" : "plan"} size={16} /> {switchLabel}
                </button>
                <NavLink to="/data" onClick={() => setMore(false)}>Data library</NavLink>
                <NavLink to="/schemes" onClick={() => setMore(false)}>Funding & documents</NavLink>
                <NavLink to="/spot" onClick={() => setMore(false)}>Spot & time</NavLink>
                <NavLink to="/settings" onClick={() => setMore(false)}>Profile & settings</NavLink>
                <label>
                  Language
                  <select aria-label="Language" value={profile.language} onChange={(event) => {
                    updateProfile({ language: event.target.value });
                  }}>
                    <option value="en-IN">English</option>
                    <option value="hi-IN">हिन्दी</option>
                    <option value="mr-IN">मराठी</option>
                    <option value="kn-IN">ಕನ್ನಡ</option>
                  </select>
                </label>
                <button type="button" className="market-motion" aria-pressed={paused} onClick={() => setPaused(!paused)}>
                  <Icon name="clock" size={16} /> {paused ? "Resume motion" : "Pause motion"}
                </button>
                <InstallApp />
              </nav>
            )}
          </div>
          {!appView && (
            <nav className="market-nav" aria-label="Main navigation">
              {websiteLinks.map(([path, label, icon]) => (
                <NavLink key={path} to={path} end={path === "/"}><Icon name={icon} size={18} />{label}</NavLink>
              ))}
            </nav>
          )}
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="market-screen-content" key={pathname}>{children}</div>
        </main>
        {appView && <nav className="market-tabbar" aria-label="Main navigation">
          {tabs.map(({ path, label, icon, related }) => {
            const active = pathname === path || related.some((route) => pathname.startsWith(route));
            return (
              <NavLink key={path} to={path} end className={active ? "is-current" : undefined}
                aria-current={active ? "page" : undefined}>
                <Icon name={icon} size={20} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>}
        {!appView && (
          <footer className="market-footer">
            <div className="market-brand"><BrandLogo size={30} /><b>vyaparsaathi</b></div>
            <NavLink to="/data">Sources & CSVs</NavLink>
            <NavLink to="/settings">Data settings</NavLink>
          </footer>
        )}
      </div>
    </div>
  );
}
