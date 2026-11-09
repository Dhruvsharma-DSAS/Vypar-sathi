export default function HourBars(props) {
  const hours = [];
  for (let h = 6; h <= 23; h++) {
    hours.push(h);
  }
  const barW = 16;
  const gap = 2.6;
  const height = 120;
  const width = hours.length * (barW + gap);
  return (
    <svg role="img" aria-label={`Hourly rush index. Best window ${props.best.start}:00 to ${props.best.end}:00. Index ${props.best.avg} out of 100.`} className="hour-bars" viewBox={"0 0 " + width + " " + (height + 18)}>
      {hours.map((h, i) => {
        const v = props.values[h];
        const barH = Math.max(2, (v / 100) * height);
        let fill = "#d7e2c5";
        if (h >= props.best.start && h < props.best.end) {
          fill = "#839d68";
        }
        let rain = null;
        if (props.rain && props.rain[h] >= 60) {
          rain = <circle cx={i * (barW + gap) + barW / 2} cy={height - barH - 6} r="3" fill="#2a78d6" />;
        }
        return (
          <g key={h}>
            <rect x={i * (barW + gap)} y={height - barH} width={barW} height={barH} rx="3" fill={fill} />
            {rain}
            <text x={i * (barW + gap) + barW / 2} y={height + 13} fontSize="8" textAnchor="middle" fill="#52514e">
              {h}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
