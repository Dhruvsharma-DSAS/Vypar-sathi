import { boundsOf, makeProjector, pathOf, blueScale } from "../lib/geo.js";

export default function WardMap(props) {
  const width = 340;
  const height = 300;
  const features = props.shapes.features;
  const bounds = boundsOf(features);
  const project = makeProjector(bounds, width, height);

  return (
    <svg role="group" aria-label="Ward opportunity map. Select a ward to explore." className="ward-map" viewBox={"0 0 " + width + " " + height}>
      {features.map((f) => {
        const id = f.properties.ward_id;
        let value = 0;
        if (props.values[id] !== undefined) {
          value = props.values[id];
        }
        let stroke = "#ffffff";
        let strokeWidth = 0.5;
        if (props.pilot.includes(id)) {
          stroke = "#eb6834";
          strokeWidth = 1.2;
        }
        if (props.selected === id) {
          stroke = "#0f172a";
          strokeWidth = 2.2;
        }
        return (
          <path
            key={id}
            d={pathOf(f.geometry, project)}
            fill={blueScale(value)}
            stroke={stroke}
            strokeWidth={strokeWidth}
            role="button" tabIndex={0} aria-label={f.properties.name || id} aria-pressed={props.selected===id}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();props.onSelect(id)}}}
            onClick={() => props.onSelect(id)}
          />
        );
      })}
      {props.points.map((p) => {
        const xy = project(p.lng, p.lat);
        return (
          <g key={p.name}>
            <circle cx={xy[0]} cy={xy[1]} r="4.5" fill="#eb6834" stroke="#fff" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}
