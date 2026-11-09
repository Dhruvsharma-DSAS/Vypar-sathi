# VyaparSaathi

A friendly business-planning companion for Bengaluru and Pune, with a light blue financial workspace, expressive Saathi guidebook mascot, interactive maps and an installable mobile web app.

[Application setup](vyaparsaathi-city/README.md) · [Vercel + Render deployment](vyaparsaathi-city/deploy/README.md)

## Maps

OpenStreetMap is the default. Google Maps is an optional view, configured with your own browser key. The original coordinate analysis map and ward opportunity lab are preserved. Toggle boundaries, business places and density independently. Google adds street, satellite, hybrid, terrain and optional traffic layers.

## Real CSV downloads

- [32,307 mapped place records](vyaparsaathi-city/data/real/business_pois.csv)
- [17,520 hourly weather records](vyaparsaathi-city/data/real/weather_hourly.csv)
- [Source manifest and timestamps](vyaparsaathi-city/data/real/manifest.json)

The frontend build also bundles these CSVs for direct downloading without the backend. They are dated snapshots, not live sales or profits. Live weather/AI/mandi integrations remain disabled pending provider configuration. OpenStreetMap tiles are enabled; Google loads only when selected.

## Installable mobile version

Open the HTTPS website in a compatible browser and choose Install app. iPhone/iPad: Safari > Share > Add to Home Screen. This is a PWA, not a signed native APK/App Store package.

## Hosting

Vercel hosts the frontend using root vercel.json; Render hosts the Python API using root render.yaml. Set VITE_BACKEND_URL on Vercel to the Render origin, and CORS_ORIGINS on Render to the Vercel origin. See the deployment guide. Account sign-in is required before live publishing.

Only the contents of Dhruv's D- vyparsathi/Code folder are tracked. Credentials, build caches, private runtime databases and dependency folders are excluded.
