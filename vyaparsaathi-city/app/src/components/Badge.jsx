export default function Badge(props) {
  let cls = "badge";
  let text = props.level;
  if (props.level === "high") {
    cls = "badge high";
    text = "High confidence";
  } else if (props.level === "medium") {
    cls = "badge medium";
    text = "Medium confidence";
  } else if (props.level === "low") {
    cls = "badge low";
    text = "Low confidence";
  } else if (props.level === "sample") {
    cls = "badge sample";
    text = "Sample data";
  } else if (props.level === "prelim") {
    cls = "badge prelim";
    text = "Preliminary match";
  }
  return <span className={cls}>{text}</span>;
}
