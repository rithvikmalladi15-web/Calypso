# CALYPSO

Crew Air & Life-support Yield Prediction and Sensor Observatory

A browser-based educational research prototype for investigating how localized CO₂ can differ from cabin averages and how sensor placement affects detection.

## Run locally

Use Node.js 22.12 or later.

```sh
npm install
npm run dev
npm run test
npm run build
```

Open the local URL printed by Vite. The dev server opens the cabin simulation.

## Five-minute demo

1. Open **Sensor Lab**, start the masked exercise, and run 300 seconds with the cabin-only layout.
2. Reveal the modeled zone. Compare first crossings and mean absolute error.
3. Switch to **Cabin + breathing zone** or drag a sensor into the dashed zone. Observe how detection changes over the same run. Add simulated noise to see measurement error.
4. Save the experiment. Repeat with routine ventilation, save again, and compare the two records in **Experiments**. **Reports** exports JSON or prints to PDF.
5. Open **NASA Data** and switch among CO₂, temperature, and relative humidity to examine paired RR-1 ISS and ground-control observations.

## Data

The supplied RR-1 CSV is bundled unchanged at `public/data/nasa-iss-telemetry.csv`. Replace that file to change the default dataset. For a temporary import, use **NASA Data → Browse CSV** or drop a CSV onto the import panel. See [data documentation](public/data/README.md) for provenance and supported mappings.

## Model and implementation

The deterministic simulator uses two well-mixed effective volumes with a local CO₂ source, symmetric exchange, and cabin removal. It assumes constant pressure and equal air density for the two compartments. Volumes, rates, the concentration overlay, and the demonstration threshold are illustrative. See the [equations and evidence](research/evidence.md).

Implemented features include seven views, three deterministic presets, parameter controls, a model clock, animated qualitative airflow, a schematic CO₂ overlay, movable sensors with keyboard alternatives, a masked investigation, two candidate layouts, deterministic noise, detection statistics, CSV mapping and charting, local experiment snapshots, replay and comparison, ventilation sensitivity, a fictional observation log, evidence search, deterministic interpretation, and JSON and printable reporting.

Future capabilities include a dedicated helmet washout model, cross-mission overlay, broader sensor-layout search, and additional geometry or environmental modes. The app uses a deterministic explainer. It requires no API keys or server.

## Deploy to Vercel

Push the project to a Git repository, import it in Vercel, and select the **Vite** framework preset. Use the repository root, `npm run build` as the build command, and `dist` as the output directory. There are no environment variables. The routes use URL hashes. Vite copies the contents of `public` into the production bundle. [Vercel Vite setup](https://vercel.com/docs/frameworks/frontend/vite)

### Roger, the AI lab partner
Roger is an optional alien assistant, not affiliated with NASA. He explains a snapshot of the latest main-workbench run using Gemini and a curated NASA reference directory. He cannot control the simulation or inspect the separate guided demo, imported CSV contents, or saved reports. Source links describe supporting references; they are not live retrieval or proof of model validation. Masked exercises exclude local results and previous chat from API requests.

Set `GEMINI_API_KEY` as a **server-side** Vercel environment variable for Production and Preview, then redeploy. Optional `GEMINI_MODEL` defaults to `gemini-2.5-flash-lite`. Never use a `VITE_` prefix or commit a key. For local development, launch Vite with these variables provided securely by your shell; `.env.example` documents the names (Vite does not automatically expose `.env` entries to this server handler).

`/api/roger` accepts bounded POST requests, uses a 25-second upstream timeout, returns curated source links only, and sends no raw provider errors or credentials to the browser. Limits are 10 requests per IP and 60 total per minute **per server instance**, not a durable global quota. Configure Google project quotas/budgets and Vercel firewall rate limits for a public launch; distributed instances can exceed these local limits. Chat stays in tab memory, but questions, recent conversation, and a run summary are sent to Google when asking Roger. No API requests occur merely by opening the panel. The simulator remains usable if AI is unavailable.
