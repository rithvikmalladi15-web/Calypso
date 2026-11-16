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
