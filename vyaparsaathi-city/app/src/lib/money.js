export const MANDI_MARKUP = 1.3;

export function startupTotal(type) {
  let total = 0;
  type.startup.forEach((s) => {
    total = total + s.cost;
  });
  return total;
}

export function fundingGap(type, ownMoney) {
  const need = startupTotal(type) + type.monthly_fixed;
  const gap = need - ownMoney;
  if (gap < 0) {
    return 0;
  }
  return gap;
}

export function unitCost(recipe, mandiPrices) {
  const lines = [];
  let total = 0;
  recipe.items.forEach((item) => {
    let cost = 0;
    let basis = "";
    if (item.fixed !== undefined) {
      cost = item.fixed;
      basis = "fixed estimate";
    } else if (item.mandi && mandiPrices[item.mandi] !== undefined) {
      cost = (item.grams / 1000) * mandiPrices[item.mandi] * MANDI_MARKUP;
      basis = item.grams + " g x Rs " + mandiPrices[item.mandi] + "/kg mandi x " + MANDI_MARKUP;
    } else if (item.retail_per_kg !== undefined) {
      cost = (item.grams / 1000) * item.retail_per_kg;
      basis = item.grams + " g x Rs " + item.retail_per_kg + "/kg retail";
    }
    total = total + cost;
    lines.push({ name: item.name, cost: Math.round(cost * 100) / 100, basis: basis });
  });
  return { total: Math.round(total * 100) / 100, lines: lines };
}

export function breakEvenUnitsPerDay(monthlyFixed, price, cost) {
  const margin = price - cost;
  if (margin <= 0) {
    return null;
  }
  return Math.ceil(monthlyFixed / margin / 30);
}

export function emi(principal, yearlyRatePercent, months) {
  if (principal <= 0 || months <= 0) {
    return 0;
  }
  const r = yearlyRatePercent / 12 / 100;
  if (r === 0) {
    return Math.round(principal / months);
  }
  const factor = Math.pow(1 + r, months);
  return Math.round((principal * r * factor) / (factor - 1));
}

export function rupees(value) {
  return "Rs " + Math.round(value).toLocaleString("en-IN");
}
