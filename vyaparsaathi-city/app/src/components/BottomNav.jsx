import { useNavigate } from "react-router-dom";

const ITEMS = [
  { path: "/", label: "Home", icon: "⌂" },
  { path: "/advisor", label: "Saathi", icon: "◉" },
  { path: "/gap", label: "Map", icon: "▦" },
  { path: "/spot", label: "Time", icon: "◷" },
  { path: "/cost", label: "Money", icon: "₹" },
  { path: "/plan", label: "Plan", icon: "✓" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => {
        let cls = "nav-item";
        if (window.location.pathname === item.path) {
          cls = "nav-item active";
        }
        return (
          <button key={item.path} className={cls} onClick={() => navigate(item.path)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
