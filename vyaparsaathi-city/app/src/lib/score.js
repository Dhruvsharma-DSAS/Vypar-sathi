import { startupTotal } from "./money.js";

export const WEIGHTS = {
  demand: 0.25,
  lowCompetition: 0.2,
  skill: 0.2,
  budget: 0.15,
  supply: 0.1,
  timing: 0.1,
};

export const WHOLESALE = {
  bengaluru: [
    { name: "KR Market", lat: 12.9647, lng: 77.5778 },
    { name: "Yeshwanthpur APMC", lat: 13.0237, lng: 77.553 },
  ],
  pune: [{ name: "Market Yard APMC", lat: 18.484, lng: 73.865 }],
};

export function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function clamp(v) {
  if (v < 0) {
    return 0;
  }
  if (v > 100) {
    return 100;
  }
  return Math.round(v);
}

export function skillScore(type, skill) {
  if (type.skills.includes(skill)) {
    return 100;
  }
  if (type.skills.includes("none")) {
    return 60;
  }
  return 20;
}

export function timingScore(type, hours) {
  if (hours === "both" || hours === type.peak) {
    return 100;
  }
  if (type.peak === "lunch") {
    return 50;
  }
  return 30;
}

export function scoreBusiness(type, ward, wardStats, profile, city) {
  let maxDensity = 1;
  wardStats.wards.forEach((w) => {
    const d = w.population / Math.max(w.area_km2, 0.1);
    if (d > maxDensity) {
      maxDensity = d;
    }
  });
  const density = ward.population / Math.max(ward.area_km2, 0.1);
  const gap = ward.gap[type.category];
  const demand = clamp((density / maxDensity) * 50 + gap * 50);

  const median = wardStats.medians_per10k[type.category];
  let competition = 50;
  if (median > 0) {
    competition = clamp((ward.per10k[type.category] / median) * 50);
  }
  const lowCompetition = 100 - competition;

  const skill = skillScore(type, profile.skill);
  const budget = clamp((profile.money / startupTotal(type)) * 100);

  let nearest = 999;
  let nearestName = "";
  WHOLESALE[city].forEach((m) => {
    const km = distanceKm(ward.lat, ward.lng, m.lat, m.lng);
    if (km < nearest) {
      nearest = km;
      nearestName = m.name;
    }
  });
  const supply = clamp(100 - nearest * 6);
  const timing = timingScore(type, profile.hours);

  const total = Math.round(
    WEIGHTS.demand * demand +
      WEIGHTS.lowCompetition * lowCompetition +
      WEIGHTS.skill * skill +
      WEIGHTS.budget * budget +
      WEIGHTS.supply * supply +
      WEIGHTS.timing * timing
  );

  return {
    typeId: type.id,
    total: total,
    parts: [
      { key: "demand", label: "Demand in ward", value: demand, weight: WEIGHTS.demand },
      { key: "lowCompetition", label: "Low competition", value: lowCompetition, weight: WEIGHTS.lowCompetition },
      { key: "skill", label: "Skill match", value: skill, weight: WEIGHTS.skill },
      { key: "budget", label: "Budget fit", value: budget, weight: WEIGHTS.budget },
      { key: "supply", label: "Supply ease", value: supply, weight: WEIGHTS.supply },
      { key: "timing", label: "Timing fit", value: timing, weight: WEIGHTS.timing },
    ],
    facts: {
      gapPercent: Math.round(gap * 100),
      per10k: ward.per10k[type.category],
      median: Math.round(median * 100) / 100,
      count: ward.counts[type.category],
      nearestMarket: nearestName,
      nearestKm: Math.round(nearest * 10) / 10,
    },
  };
}

export function rankBusinesses(types, ward, wardStats, profile, city) {
  const results = types.map((t) => scoreBusiness(t, ward, wardStats, profile, city));
  results.sort((a, b) => b.total - a.total);
  return results;
}

export function bestWindow(values, startHour, endHour, length) {
  let best = { start: startHour, sum: -1 };
  for (let h = startHour; h <= endHour - length + 1; h++) {
    let sum = 0;
    for (let k = 0; k < length; k++) {
      sum = sum + values[h + k];
    }
    if (sum > best.sum) {
      best = { start: h, sum: sum };
    }
  }
  return { start: best.start, end: best.start + length, avg: Math.round(best.sum / length) };
}
