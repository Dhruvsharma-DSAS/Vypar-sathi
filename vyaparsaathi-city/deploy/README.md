# Published app

Frontend: https://vypar-sathi.vercel.app/

Backend: https://vypar-sathi-api.onrender.com/ (API documentation at /docs).

Both services are deployed from Dhruvsharma-DSAS/Vypar-sathi, branch main. The frontend has VITE_BACKEND_URL configured; Render permits its exact production origin. OpenStreetMap remains the default; Google Maps is optional and its browser key is stored in Vercel configuration, not Git.

# Vercel frontend + Render backend

The repository root is the contents of Dhruv's D- vyparsathi/Code folder. Root-level vercel.json, render.yaml and api/chat.js are copied from this directory when preparing the repository. Deploy the repository root to avoid needing Vercel access to files outside an app root.

## 1. Frontend: Vercel

Import Dhruvsharma-DSAS/Vypar-sathi, branch main. Keep Root Directory at the repository root. Framework is Other; the checked-in configuration installs/builds app/ and publishes its dist folder.

Initially leave VITE_BACKEND_URL empty. The website works with static city map previews, source metadata, rules-based advice, on-device finance, CSV downloads and model evaluation. The optional API is independent of installation.

## 2. Backend: Render

Create a Blueprint from the same repository's root render.yaml. It specifies a free Python web service, build/start commands, a health check and disabled external APIs. Free services can sleep and have ephemeral storage. Private observation writes are disabled; there is no reliance on that disk for your real CSVs, which are tracked in Git.

After deployment, open `https://YOUR-SERVICE.onrender.com/api/v1/health` and `/docs`. Set CORS_ORIGINS to the exact Vercel production origin, for example `https://YOUR-PROJECT.vercel.app`. Keep localhost origins too if needed, separated by commas. Do not put a trailing slash on origins.

## 3. Connect them

Add VITE_BACKEND_URL on Vercel with the Render service's HTTPS origin, then redeploy the frontend. This URL is public configuration, not a secret. Exact record lookup, server finance checks and model inference then reach Render. The browser shows a preview subset if the record API is unavailable; full CSV downloads stay available from Vercel.

VYAPAR_EXTERNAL_APIS_ENABLED stays false on both services until Dhruv supplies the chosen provider configuration. Groq or Gemini keys belong in Vercel server environment variables, never VITE_ variables. The weather adapter is in Render's backend. No credentials are bundled.

## Install the mobile app

Visit the HTTPS frontend once, then use Install app. Android/desktop compatible browsers offer native PWA installation. On iPhone/iPad, use Safari > Share > Add to Home Screen. This is an installable web app, not a signed APK or App Store package. Its screens, maps and source previews are cached; fresh API calls need connectivity. Large CSV files download on demand and are not precached.

## Local production check

From vyaparsaathi-city/app run `npm run build && npm run preview`. For backend services, run the command in the main README in a second terminal.

Official deployment references: https://vercel.com/docs/projects/overview and https://render.com/docs/blueprint-spec . A working authenticated Vercel/Render account is required to create and verify hosted services.

## Map providers and preserved layers

OpenStreetMap is the default on every new page load. Google Maps is optional and only loads when selected. Set VITE_GOOGLE_MAPS_API_KEY in the ignored app/.env.local locally and as a Vercel environment variable for deployment. This is a public browser Maps key: restrict its allowed website referrers and API scope in Google Cloud. The Maps JavaScript API must be enabled on the key's project; billing or referrer restrictions can block a demo key.

Available views: OpenStreetMap streets; Google roadmap/satellite/hybrid/terrain plus optional Google traffic; the original coordinate analysis map. Toggle ward boundaries, mapped places and mapped density separately. The ward-gap lab is retained. Density cells aggregate all CSV place records; pins show a 1,200-place subset for rendering. Neither is a live demand or sales feed. Google traffic is a separate provider layer. No street tiles are bulk-downloaded or added to service-worker precaching.
