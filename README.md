# CALYPSO

**A spacecraft cabin CO₂ simulator and sensor placement workbench.** CALYPSO asks whether a cabin sensor can miss CO₂ building up in the air near an astronaut’s face. Move a virtual sensor and compare both placements against the same modeled conditions.

**[Open CALYPSO](https://calypso-tan.vercel.app/)** · **[Start the guided demo](https://calypso-tan.vercel.app/#/simulation)** · **[Presenter script](research/demo.md)**

## Reproduce the result in about one minute

1. In **Simulation**, select **Start 60-second demo**. It opens a 300-second reduced-ventilation run with one cabin sensor.
2. Select **Reveal modeled breathing zone**. The local concentration first crosses the 1,250 ppm experiment rule at **36 s**. The cabin sensor never crosses it in this run.
3. Select **Move S1 to the breathing zone**. The same sensor now detects the crossing at **36 s**. Ventilation, activity, removal, and the simulated samples stay fixed.
4. Select **Download comparison data** for the settings, sampled readings, and results, or **Save comparison runs** to reopen both placements in **Experiments**.

## What judges can inspect

- **Cabin Simulation and Sensor Lab** let you change ventilation, CO₂ removal, activity, and sensor position. The measurement catalog calculates ten statistics for each of ten model signals.
- **NASA Data** charts measured CO₂, temperature, and relative humidity for RR-1 ISS and ground-control observations. [Dataset provenance and import notes](public/data/README.md)
- **Research** gives the equations and the role of each source. The illustrative two-compartment model exchanges CO₂ between cabin air and the breathing zone and removes CO₂ from the cabin. The 1,250 ppm line is an experiment rule. The demo does not establish an astronaut safety limit or validate the model against ISS airflow measurements. [Model and equations](research/evidence.md)
- **Crew Health and Crew Nutrition** add a NASA-sourced body map and a mission-day nutrition log with food-source notes. The log totals values entered by the user. Organ effects are explained through research.
- **Roger** is an optional Gemini-powered AI guide for the latest main-workbench run. The app identifies AI assistance, and Roger has no NASA affiliation. The core experiment and exports run independently of Gemini.

## Run and verify locally

Use Node.js 22.12 or later. Install dependencies and open the local URL printed by Vite.

```sh
npm install
npm run dev
```

Run `npm run test` for the regression suite and `npm run build` for the production build. CALYPSO uses React, TypeScript, Vite, and a deterministic simulation engine. Saved runs and nutrition entries are stored in the browser.

## Hosting and credits

Vercel builds with `npm run build` and serves `dist`. To enable Roger, set `GEMINI_API_KEY` as a server-side environment variable. `GEMINI_MODEL` optionally overrides the default Gemini model. On requests to Roger, the app sends the question, recent chat, and a bounded run summary to Gemini. Masked breathing-zone values are withheld.

See [data credits](public/data/README.md), [illustration credits](public/images/ATTRIBUTION.md), and [audio credits](public/audio/ATTRIBUTION.txt). Design and development used AI assistance.
