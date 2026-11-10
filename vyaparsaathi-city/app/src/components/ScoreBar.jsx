export default function ScoreBar(props) {
  let color = "var(--z-red)";
  if (props.value >= 70) {
    color = "var(--z-green)";
  } else if (props.value < 40) {
    color = "var(--z-amber)";
  }

  return (
    <div className="score-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        className="score-label"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--z-dark)",
        }}
      >
        <span>{props.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "var(--z-gray-muted)" }}>weight {props.weight}x</span>
          <b style={{ color: "var(--z-dark)", fontSize: "13px" }}>{props.value}/100</b>
        </div>
      </div>
      <div
        className="score-track"
        style={{
          height: "8px",
          background: "#E2E8F0",
          borderRadius: "var(--z-radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          className="score-fill"
          style={{
            width: props.value + "%",
            background: color,
            height: "100%",
            borderRadius: "var(--z-radius-full)",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}
