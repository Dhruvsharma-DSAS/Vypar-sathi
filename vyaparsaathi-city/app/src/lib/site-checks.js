export function siteEstimate({ people, minutes, hours, buyingRate, sellingPrice, days, rent }) {
  const values = { people, minutes, hours, buyingRate, sellingPrice, days, rent };
  const number = (key) => {
    const value = values[key];
    return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : null;
  };

  const count = number("people");
  const period = number("minutes");
  const openHours = number("hours");
  const rate = number("buyingRate");
  if (count === null || count < 0 || !(period > 0) || !(openHours > 0 && openHours <= 24) ||
      rate === null || rate < 0 || rate > 100) return null;

  const hourly = (count / period) * 60;
  const dailyUnits = hourly * openHours * rate / 100;
  const price = number("sellingPrice");
  const operatingDays = number("days");
  const monthlyRent = number("rent");
  const monthlySales = price > 0 && Number.isInteger(operatingDays) && operatingDays >= 1 && operatingDays <= 31
    ? dailyUnits * price * operatingDays
    : null;
  return {
    hourly,
    dailyUnits,
    monthlySales,
    rentShare: monthlySales > 0 && monthlyRent !== null && monthlyRent >= 0
      ? monthlyRent / monthlySales * 100
      : null,
  };
}

export function medianObservedPrice(prices) {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
