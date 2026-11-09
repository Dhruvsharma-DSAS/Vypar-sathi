# VyaparSaathi City

A business-planning application for micro-entrepreneurs in Bengaluru and Pune. This version combines Dhruv's React interface with adapted planning functions from Rupam's Python backend, a unified FastAPI service, real CSV snapshots, and an evaluated weather ML prototype.

External service integrations are **disabled by default**. No credentials are supplied, copied from another project, or committed. Ground Truth Kit has been removed from the application at Dhruv's request.

## Run locally

Use Python 3.12+ and Node 22.12+ (or Node 24). From this directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
cd app
npm ci
npm run dev
```

Open the URL printed by Vite. The Vite server forwards `/api/v1` to the local Python backend. API documentation is available at `http://127.0.0.1:8000/docs`. Planning calculations, the rules advisor, downloaded business records, CSV exports and model evaluation work without external API credentials. Live weather displays an unconfigured state.

## Included real data

Collected on 9 November 2026, with provenance in `data/real/manifest.json`:

| File | Records | Meaning |
| --- | ---: | --- |
| `data/real/business_pois.csv` | 32,307 | Unique OpenStreetMap objects: 24,665 in the Bengaluru bounding box and 7,642 in the Pune bounding box |
| `data/real/weather_hourly.csv` | 17,520 | 365 days of hourly ERA5 weather reanalysis for two city grids, 3 November 2025–2 November 2026 |

These are two different tables, not 49,827 interchangeable vendor training examples. They contain no fabricated records, vendor earnings, success labels, or interview evidence. Missing map fields remain blank. OSM object edit time does not mean the business was field-verified on that date. Area boxes include suburbs; separate nodes/polygons can describe the same real business.

The **Real data & ML** page supports city/category/name filters, pagination, source links, category counts, CSV downloads, and a model evaluation. Downloaded snapshots stay usable when external services are disabled. See `data/real/README.md` for columns and licensing.

## Backend integration

- Tested planning functions adapted from Rupam's `city_planner.py`: transparent opportunity scores, finance, EMI, market gaps, sales-window selection, landed costs and pilot evaluation. Exposed finance/score/pilot endpoints use validated schemas.
- Finance now supports actual operating days instead of a fixed 30-day assumption. The Cost & Profit screen cross-checks its numbers with the backend and works locally if the backend is unavailable.
- Validated CSV catalogue, fixed download paths, cached city/category lookup and source metadata.
- Optional weather adapter is blocked before any external request unless explicitly enabled.
- A device-scoped SQLite observation API remains as backend infrastructure. Its old Ground Truth screen and upload UI have been removed. It is not used to populate public data or ML labels.
- Optional AI stays behind `/api/chat`; extraction uses rules when external AI is disabled or unavailable. Provider keys remain server-only.

Profiles, checklists and the seven-day pilot ledger remain local to the browser. Their export/restore functionality is retained. SQLite data and device tokens are private runtime data, excluded from Git.

## ML prototype

Run `python3 scripts/train_weather_model.py` to reproduce the weather-context model. It trains on real ERA5 rows, targeting the next hour's temperature. Both cities share an 80/20 chronological split by target timestamp; adjacent hours are not shuffled into train and test.

The included model has 14,014 training pairs and 3,504 holdout pairs. Holdout MAE: **0.3276°C**; persistence baseline: **0.6894°C**. The report and holdout predictions are in `models/`. `/api/v1/ml/weather-next-hour` supports validated inference.

This is a weather-context prototype. Vendor revenue/profit prediction still needs actual vendor-day outcomes, operating hours, prices, stockouts, costs and location joins. Reanalysis-trained model error can differ on live forecast inputs. Do not train success predictions on the app's sample opportunity scores.

## APIs to provide yourself

Configure only services you choose. Put credentials in your own ignored environment file or deployment secret manager; do not paste keys into source code.

| Capability | What you need to provide |
| --- | --- |
| AI advisor | Your own `GROQ_API_KEY` **or** `GEMINI_API_KEY`, plus a model identifier enabled on your account. One provider is sufficient. |
| Current mandi prices | Your own `DATA_GOV_API_KEY` for the data.gov.in AGMARKNET resource. The supplied daily importer is separate from the app's sample price file. |
| Live weather | Confirm your chosen weather service. An Open-Meteo adapter is included but disabled; its public non-commercial endpoint needs no key. A different provider needs an adapter matching its response. |

When ready, explicitly set `VYAPAR_EXTERNAL_APIS_ENABLED=true` in the relevant server environment. The Python backend reads exported environment variables; it does not automatically read `.env` files. For Vite AI, copy `app/.env.example` to `app/.env.local` and restart Vite. Until then, existing environment keys cannot activate AI calls by themselves. Never use `VITE_` for secrets.

No automatic dataset refresh is enabled. After you approve the public sources, you can manually run:

```sh
python3 scripts/collect_real_data.py --allow-network
python3 scripts/train_weather_model.py
```

The collector downloads into local raw files and atomically replaces each completed CSV; it does not pad small results. If one source fails, inspect the manifest before using a partially refreshed collection. The bundled map/weather snapshots have source timestamps; they are not continuous real-time feeds.

## Data that is still sample data

Existing ward populations/business counts used by Gap Finder, rush curves, recipe/equipment estimates, mandi prices, and saved news remain explicitly labelled sample estimates. Real OSM place counts are shown separately; they have not silently replaced population-adjusted opportunity scores. Current lender/scheme summaries are preliminary references, not eligibility decisions.

## Verification

```sh
python3 -m pytest backend/tests -q
cd app
npm test
npm run build
```

Tests cover ownership isolation, duplicate retries, input validation, operating-day finance, invalid pilot inputs, source CSV checksums/unique IDs, filtering, provider failures, inference, and external APIs being disabled by default. Frontend tests cover parsing, scoring, finance, city/ward/business plan isolation and AI fallback.

## Deployment limits

This is a local hackathon implementation, not a public production service. Deploy the Python API with persistent private storage and route `/api/v1` to it. Vite's development proxy does not become a production reverse proxy. A static or Vercel-only frontend deployment will not run this Python backend; `/api/chat` is a separate Vercel function. Add real account authentication, rate limits, retention, backups and HTTPS before exposing private writes publicly. No hosting deployment was requested or performed.

The optional geospatial scripts use the separate root `requirements.txt`. They are not required to run the application/backend or train the weather model.
