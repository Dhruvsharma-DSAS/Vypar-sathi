export default function HourBars(props) {
  const hours = [];
  for (let h = 6; h <= 23; h++) {
    hours.push(h);
  }
  const barW = 16;
  const gap = 3.5;
  const height = 120;
  const width = hours.length * (barW + gap);

  return (
    <svg
      role="img"
      aria-label={`Hourly rush index. Best window ${props.best.start}:00 to ${props.best.end}:00. Index ${props.best.avg} out of 100.`}
      className="hour-bars"
      viewBox={"0 0 " + width + " " + (height + 22)}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E23744" />
          <stop offset="100%" stopColor="#FF7A85" />
        </linearGradient>
        <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      {hours.map((h, i) => {
        const v = props.values[h] || 0;
        const barH = Math.max(4, (v / 100) * height);
        const isPeak = h >= props.best.start && h < props.best.end;
        const fill = isPeak ? "url(#peakGradient)" : "url(#normalGradient)";

        let rain = null;
        if (props.rain && props.rain[h] >= 60) {
          rain = (
            <circle
              cx={i * (barW + gap) + barW / 2}
              cy={height - barH - 8}
              r="3.5"
              fill="#2563EB"
            />
          );
        }

        return (
          <g key={h} className="hour-bar-group" style={{ cursor: "pointer" }}>
            <rect
              x={i * (barW + gap)}
              y={height - barH}
              width={barW}
              height={barH}
              rx="4"
              fill={fill}
              style={{
                transition: "all 0.3s ease",
              }}
            />
            {rain}
            <text
              x={i * (barW + gap) + barW / 2}
              y={height + 16}
              fontSize="9"
              textAnchor="middle"
              fill={isPeak ? "#E23744" : "#64748B"}
              fontWeight={isPeak ? "800" : "600"}
            >
              {h}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
