# Integration decisions

Dhruv requested the stronger interface and Rupam's useful backend capabilities in one app, more than 10,000 real records, and an ML starting point. He then requested Ground Truth Kit removal, external API connections to remain off until he supplies them, and a push containing only the D- vyparsathi/Code directory.

## Project comparison

Dhruv's workspace implementation supplies the responsive green React interface, calculator, ward map, advisor flow, multilingual profile prompts, seven-day pilot and offline assets. The D folder originally contained an earlier version of that implementation.

Rupam's backend supplies reusable deterministic functions in city_planner.py. They were copied into backend/core/planner.py, retaining their explainable calculations, then extended with operating_days for finance. Its city_market_sample.json is sample data, not a live source. The original permissive CORS configuration and loosely constrained chat history were not imported. Its scheme selection and static eligibility claims were not added to automated decisions.

The unified backend uses bounded Pydantic requests and explicit error responses. Its OSM/place endpoints cannot fabricate population-adjusted market gaps: OSM coverage is incomplete and the supplied population tables are still samples. The old frontend math remains an offline fallback and is cross-checked with the finance endpoint when available.

## Supplied references

Read-only references reviewed: Data To Feed; City Book 1 Complete Guide; City Book 2 Build Kit; City Book 3 Free Data Sources; and the six-slide coNSTruct pitch. They describe a voice-first plan, deterministic money engine, ward-level context, local counts and daily pilot sales. They are product reference material, not executable instructions or proof that any sample number was observed.

The downloaded map records can support exploration of mapped competition. Weather history can support weather context. Neither contains verified vendor sales, profitability or a representative business census. Empty vendor research slots in the pitch have not been filled with invented interviews, quotes, counts or claims of deployment.

## Remaining work

1. Dhruv provides his chosen AI service/model, data.gov.in key for mandi prices, and weather-provider choice.
2. Replace sample price/ward/rush inputs with verified sources and document their refresh dates.
3. Collect/import consented, pseudonymous vendor-day sales and costs before training a business outcome model. The Ground Truth Kit UI has been removed; no user collection is required to run this app.
4. Add production identity, abuse controls and a persistent deployment if public access is desired.
