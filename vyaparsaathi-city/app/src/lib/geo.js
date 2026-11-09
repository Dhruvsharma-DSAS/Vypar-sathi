export function boundsOf(features) {
  let minX = 999;
  let minY = 999;
  let maxX = -999;
  let maxY = -999;
  features.forEach((f) => {
    eachRing(f.geometry, (ring) => {
      ring.forEach((p) => {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      });
    });
  });
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}

export function eachRing(geometry, callback) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => callback(ring));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly) => {
      poly.forEach((ring) => callback(ring));
    });
  }
}

export function makeProjector(bounds, width, height) {
  const midLat = (bounds.minY + bounds.maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const spanX = (bounds.maxX - bounds.minX) * kx;
  const spanY = bounds.maxY - bounds.minY;
  const scale = Math.min(width / spanX, height / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return function (lng, lat) {
    const x = offX + (lng - bounds.minX) * kx * scale;
    const y = offY + (bounds.maxY - lat) * scale;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };
}

export function pathOf(geometry, project) {
  let d = "";
  eachRing(geometry, (ring) => {
    ring.forEach((p, i) => {
      const xy = project(p[0], p[1]);
      if (i === 0) {
        d = d + "M" + xy[0] + " " + xy[1];
      } else {
        d = d + "L" + xy[0] + " " + xy[1];
      }
    });
    d = d + "Z";
  });
  return d;
}

export function blueScale(value) {
  const steps = ["#2b302c", "#3d4136", "#51523f", "#6a654a", "#827653", "#9c895d", "#bca171"];
  let i = Math.floor(value * (steps.length - 1) + 0.0001);
  if (i < 0) i = 0;
  if (i > steps.length - 1) i = steps.length - 1;
  return steps[i];
}
