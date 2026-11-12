import { useEffect, useState } from "react";
import { readStore, writeStore } from "../lib/storage.js";
import { medianObservedPrice, siteEstimate } from "../lib/site-checks.js";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const footfallFields = [
  ["people", "People counted", 0, 100000, "1"],
  ["minutes", "Minutes counted", 1, 1440, "1"],
  ["hours", "Selling hours per day", 0.25, 24, "0.25"],
  ["buyingRate", "Expected buyers (%)", 0, 100, "0.1"],
];

const rentFields = [
  ["sellingPrice", "Price per item (₹)", 0.01, 1000000, "0.01"],
  ["days", "Operating days per month", 1, 31, "1"],
  ["rent", "Monthly rent (₹)", 0, 10000000, "0.01"],
];

export default function SiteChecks({ storageKey, spot, suggestedPrice }) {
  const [saved, setSaved] = useState(() => ({
    inputs: { people: "", minutes: "", hours: "", buyingRate: "", sellingPrice: suggestedPrice, days: "26", rent: "" },
    prices: [],
    ...readStore(storageKey, {}),
  }));
  const [observedPrice, setObservedPrice] = useState("");
  const [savedLocally, setSavedLocally] = useState(true);
  const { inputs, prices } = saved;

  useEffect(() => {
    setSavedLocally(writeStore(storageKey, saved));
  }, [storageKey, saved]);

  const estimate = siteEstimate(inputs);
  const median = medianObservedPrice(prices);

  function field([id, label, min, max, step]) {
    return (
      <label key={id} className="field">
        {label}
        <input type="number" min={min} max={max} step={step} inputMode="decimal" value={inputs[id]}
          onChange={(event) => {
            const value = event.target.value;
            if (value !== "" && (Number(value) < 0 || Number(value) > max)) return;
            setSaved((previous) => ({ ...previous, inputs: { ...previous.inputs, [id]: value } }));
          }}
        />
      </label>
    );
  }

  return (
    <section className="card site-checks" id="site-checks" aria-labelledby="site-checks-title">
      <h2 id="site-checks-title">Check your spot</h2>
      <p>Use counts and prices you record near {spot}. Estimates depend on the times and buying rate you enter.</p>

      <h3>Footfall</h3>
      <div className="site-check-fields">{footfallFields.map(field)}</div>
      <p className="site-check-result" role="status">
        {estimate
          ? `${number.format(estimate.hourly)} people per hour · ${number.format(estimate.dailyUnits)} estimated items per day`
          : "Add your count, observation time, selling hours, and expected buying rate."}
      </p>

      <h3>Nearby prices</h3>
      <p>Compare prices for the same item and portion.</p>
      <form className="site-price-form" onSubmit={(event) => {
        event.preventDefault();
        const value = Number(observedPrice);
        if (!Number.isFinite(value) || value <= 0 || value > 1000000 || prices.length >= 20) return;
        setSaved((previous) => ({ ...previous, prices: [...previous.prices, value] }));
        setObservedPrice("");
      }}>
        <label className="field">Observed price (₹)
          <input type="number" min=".01" max="1000000" step=".01" required value={observedPrice}
            onChange={(event) => setObservedPrice(event.target.value)} />
        </label>
        <button className="button secondary" type="submit" disabled={prices.length >= 20}>Add price</button>
      </form>
      {prices.length > 0 && (
        <>
          <ul className="site-observed-prices">
            {prices.map((price, index) => (
              <li key={index}>
                <button type="button" aria-label={`Remove observed price ${index + 1}, ${money.format(price)}`}
                  onClick={() => setSaved((previous) => ({ ...previous, prices: previous.prices.filter((_, at) => at !== index) }))}>
                  {money.format(price)} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="site-check-result" role="status">Median nearby price: {money.format(median)}</p>
        </>
      )}
      {prices.length >= 20 && <p>20 prices saved. Remove a price to add another.</p>}

      <h3>Rent compared with sales</h3>
      <div className="site-check-fields">{rentFields.map(field)}</div>
      <p className="site-check-result" role="status">
        {estimate?.rentShare != null
          ? `Rent is ${number.format(estimate.rentShare)}% of estimated monthly sales of ${money.format(estimate.monthlySales)}.`
          : "Enter rent and a selling price, then complete the footfall estimate with projected sales above zero."}
      </p>
      <p>{savedLocally ? "Your checks are saved on this device." : "Your browser could not save these checks."}</p>
    </section>
  );
}
