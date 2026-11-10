export default function Badge(props) {
  let cls = "badge";
  let text = props.level;
  let style = {
    padding: "3px 8px",
    borderRadius: "var(--z-radius-full)",
    fontSize: "11px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  };

  if (props.level === "high") {
    cls = "badge green";
    text = "High confidence";
  } else if (props.level === "medium") {
    cls = "badge";
    text = "Medium confidence";
  } else if (props.level === "low") {
    cls = "badge orange";
    text = "Low confidence";
  } else if (props.level === "sample") {
    cls = "badge";
    text = "Sample data";
  } else if (props.level === "prelim") {
    cls = "badge green";
    text = "Preliminary match";
  }

  return (
    <span className={cls} style={style}>
      {text}
    </span>
  );
}
