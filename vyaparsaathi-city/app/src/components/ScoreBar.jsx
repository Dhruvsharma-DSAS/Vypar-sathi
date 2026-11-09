export default function ScoreBar(props) {
  let color = "#2a78d6";
  if (props.value >= 70) {
    color = "#1baf7a";
  } else if (props.value < 40) {
    color = "#eb6834";
  }
  return (
    <div className="score-row">
      <div className="score-label">
        <span>{props.label}</span>
        <span className="muted small">x {props.weight}</span>
        <b>{props.value}</b>
      </div>
      <div className="score-track">
        <div className="score-fill" style={{ width: props.value + "%", background: color }} />
      </div>
    </div>
  );
}
