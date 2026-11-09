# VyaparSaathi City web app

See the parent README for full setup, features, provenance and integration notes.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

No keys are needed. The private static preview uses local rules, sample snapshots and browser-local plans. Optional serverless AI lives in `api/chat.js`; deploy this directory to Vercel and supply server environment variables for live AI. Supabase survey sync is optional and uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time.
