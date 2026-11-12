import { test } from "node:test";
import assert from "node:assert/strict";
import { medianObservedPrice, siteEstimate } from "../src/lib/site-checks.js";

test("site checks use the entered conversion and operating days", () => {
  const inputs = { people: "60", minutes: "15", hours: "5", buyingRate: "2", sellingPrice: "50", days: "25", rent: "6000" };
  assert.deepEqual(siteEstimate(inputs), { hourly: 240, dailyUnits: 24, monthlySales: 30000, rentShare: 20 });
  assert.equal(siteEstimate({ ...inputs, people: "0" }).rentShare, null);
  assert.equal(siteEstimate({ ...inputs, minutes: "0" }), null);
  assert.equal(siteEstimate({ ...inputs, buyingRate: "" }), null);
  assert.equal(medianObservedPrice([70, 40, 55, 60]), 57.5);
});
