# CALYPSO: local detection at 36 s; cabin sensor misses the 300 s demo

In the reduced-ventilation **illustrative two-volume model**, the breathing zone first reaches the **1,250 ppm demo rule at 36 seconds**. A sensor in that zone detects it at 36 s; a cabin-only sensor does not detect it within 300 s. This is a reproducible software result, **not a measured astronaut result or a NASA safety claim**.

[Open CALYPSO](https://calypso-tan.vercel.app/) · [Sensor Lab](https://calypso-tan.vercel.app/#/sensor-lab) · [Research & Methods](https://calypso-tan.vercel.app/#/research)

> **GIF placeholder — TODO (project owner):** add a short recording showing cabin-only → run 300 s → Reveal → add breathing-zone sensor. Do not label the recording as measured flight data.

## Reproduce the headline result

1. Open **Sensor Lab**, select **Start masked exercise**, then **Run 300 s**.
2. The cabin sensor reads below the demo rule. Select **Reveal modeled zone**.
3. Inspect the first local crossing at 36 s. Select **Cabin + breathing zone**: the large readout becomes **Detected at 36 s**.
4. Save the experiment; reopen it using **Extras → Saved experiments**. Reports exports the settings, reference, samples and results as JSON or print/PDF.

The primary navigation is Simulation, Sensor Lab, NASA Data, Research & Methods, and Reports. Crew Nutrition was removed, including its route, page, test and styles. Crew Health is integrated into Simulation with a shared live cabin snapshot; it is not a physiology simulator. Saved experiments and About are also under Extras. The 100-item catalog contains derived statistics of ten signals, not 100 independently modeled variables.

## Motivation

NASA's cabin CO₂ requirement discusses generation, scrubbing and ventilation to avoid localized buildup. CALYPSO uses that distinction to teach why sensor location matters. NASA does **not** provide or endorse this app's coefficients. [NASA-STD-3001 Vol. 2, §6.2.1.3, V2 6004](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/)

## Model equations

With concentration C in ppm and time t in seconds:

```text
Vb dCb/dt = S − Q(Cb − Cc)
Vc dCc/dt = Q(Cb − Cc) − R Cc

Vb = 1 m³; Vc = 30 m³
Q = 0.006 + 0.074 × ventilation   [m³/s]
R = 0.15 × removal              [m³/s]
S = 22 × relative activity      [ppm·m³/s]
Cb(0) = Cc(0) = 650 ppm
```

All coefficients, volumes and initial conditions are illustrative assumptions. Ventilation and removal range from 0 to 1; activity from 0 to 3. Forward Euler uses steps of at most one second. Exchange cancels in the summed balance: `d(VbCb + VcCc)/dt = S − RCc`. With Q and R positive, equilibrium is `Cc = S/R`, `Cb = S/R + S/Q`.

A marker chooses either the uniform cabin or uniform breathing-zone concentration. Its precise position within that volume does not change its reading. Optional synthetic noise is deterministic and readings are clipped at zero. The illustration is a **conceptual schematic, not a spatial simulation**. [Full methods](research/evidence.md)

### Threshold references

- **Demo rule:** first recorded sample at or above 1,250 ppm. This has no safety-limit status.
- **NASA cabin reference:** one-hour average partial pressure no greater than 3 mmHg in the habitable volume. At the assumed total pressure of 760 mmHg, the concentration equivalent is approximately 3,947 ppm. The app uses complete 3,600-second time-weighted windows with trapezoidal integration and interpolated window boundaries. Shorter runs display insufficient duration; the raw plot line alone is not an averaged assessment. Applying this reference to the illustrative local volume does not establish compliance. [NASA requirement](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/)
- **TODO:** verify mission-specific off-nominal requirements before adding further limits. No unsupported limits are guessed. Consult the [NASA standards registry](https://standards.nasa.gov/node/237) for current revisions.

The guided demo and robustness sweep deliberately retain the demo rule; their labels state this. Saved workbench runs retain the selected reference; older saved records default to the original demo rule.

## Robustness

Expand **Robustness** in Simulation or Sensor Lab. A Web Worker runs the complete 6 × 6 grid: ventilation 0–100% in 20% steps and activity 0–3× in 0.6× steps. Removal stays at 65%, noise at zero, initial conditions at 650 ppm and duration at 300 s. The grid is visible and exportable as CSV, including settings, crossing times, detection times, delay and outcome labels.

On this exact grid, the cabin sensor misses a local crossing in **20 of 36 settings**. “Never” means a local crossing occurred but the sensor did not detect it within the run; “—” means no local crossing. These are deterministic sensitivity results, not a probability of failure or flight reliability estimate.

## Validation

**Numerical verification is available; experimental validation is not.** NASA Data places the current model cabin range beside the complete bundled RR-1 CO₂ ranges, calculated from the CSV:

- ISS flight: **1,862–4,667 ppm**, 12,087 valid readings.
- Ground control: **438–4,690 ppm**, 12,087 valid readings.
- Both CO₂ columns contain zero missing/invalid values under the parser's rules. Timestamp gaps and other channels are handled separately in the explorer.

The reduced-ventilation 300-second model cabin range is approximately **367.5–650 ppm**: it overlaps the ground range but not the flight range. Range overlap does not validate dynamics. RR-1 describes an experiment environment; no matched human breathing-zone trace, aligned timestamps, parameter fit or instrument-placement study is supplied here. Initial conditions and coefficients were not calibrated to RR-1. [Dataset provenance and SHA-256](public/data/README.md)

**TODO (project owner):** obtain matched cabin/breathing-zone measurements, documented source and exchange conditions, and an independent evaluation dataset before claiming predictive accuracy.

## Limitations

- Two perfectly mixed volumes; no spatial airflow, CFD, anatomy, suit atmosphere or breathing-cycle dynamics.
- Illustrative constant coefficients, pressure and volumes; no parameter uncertainty estimates.
- Ideal sensor response with optional deterministic noise; no drift, lag or installation constraints.
- First crossings use recorded sample times. Raw time-above-reference uses interpolation; it is distinct from the NASA averaged criterion.
- The sweep covers only its displayed finite grid and fixed conditions.
- NASA measurements are separate from simulation output. The app is educational and not flight software, a medical tool, or a compliance assessment.
- Optional AI explanations can be inaccurate. Source links and deterministic results take precedence.

## Run locally

Use Node.js 22.12 or later:

```sh
npm install
npm run dev
npm run test
npm run build
```

Open the local address printed by Vite. Saved experiments are stored in this browser; imported CSVs are held in memory. No account or paid service is required for the model, sweep, NASA explorer, or exports.

### Optional Roger

Roger calls `/api/roger`; Gemini and Mistral credentials remain on the server. Never use a `VITE_` API-key variable. For local use, put `GEMINI_API_KEY` in an untracked `.env.local`; on Vercel use its server environment settings. `GEMINI_MODEL` optionally overrides the configured model. Add server-only `MISTRAL_API_KEY` to enable automatic backup when Gemini fails, times out, returns invalid output or is unconfigured. `MISTRAL_MODEL` defaults to `mistral-small-latest`. Each provider has a 20-second timeout, keeping sequential attempts within the serverless request budget. Both use the same evidence instructions, masked-context filtering and source allowlist. [Mistral API documentation](https://docs.mistral.ai/api) Without a key the simulation still works and Roger explains that its connection is unavailable.

Roger is instructed to answer only model/reference questions, say “I don't know” when evidence is missing, and avoid medical or operational claims. Prompts are not a guarantee of factual accuracy. The UI says **“AI-generated, may be inaccurate.”** Questions, recent conversation, and bounded current-run summaries are sent to Google Gemini, or to Mistral on fallback; masked local values and prior chat are withheld during the exercise. Roger cannot see the separate guided demo, uploaded CSV contents or saved reports.

The endpoint permits 10 requests/IP/minute and 60 total/minute **per server instance**. Invalid requests count too. These in-memory guards reset on cold starts and do not provide a distributed quota. **TODO (deployment owner):** configure provider quotas and, if needed, a durable shared limit within a confirmed free allowance before unrestricted public use. No paid infrastructure was added; Provider availability and free quota depend on the owner's account. Provider calls are mocked in automated tests.

## Tech stack

React 19, TypeScript, Vite, Zustand, Recharts, Three.js, Papa Parse, Web Workers, Vitest, Testing Library and a Vercel Node serverless endpoint. Hash routing preserves existing links.

## Tests

Verified **2026-11-15: 44 tests passed across 11 files; production build passed**. Checks cover exchange-only conservation, source/removal mass balance, positivity, analytic steady state and convergence, zero-source behavior, the exact 36-second regression, averaging windows, sweep outcomes, saved references, CSV parsing, workbench controls and mocked Roger safeguards and Gemini-to-Mistral failover. Historical spatial-engine tests remain for unused legacy code; the active simulator is the two-volume engine.

Chrome checks on the production build cover run/pause/reset, tutorial Escape, mocked Roger replies, the masked exercise, local sensor placement, save/load, worker sweep and CSV download, NASA threshold selection and one-hour run, RR-1 comparison, and routes at desktop, 390 px and 360 px widths. No console errors or horizontal page overflow were observed in those checks. These checks do not establish scientific validation or guarantee behavior in every browser. Live provider output and distributed rate limiting were not verified.

## License

**TODO (project owner): choose and add a code LICENSE before granting reuse rights.** No open-source license is assumed. NASA data and third-party dependencies retain their applicable terms. Dataset provenance is documented separately; NASA source links do not imply NASA endorsement.

## Credits

NASA OSDR Environmental Data Application and the user-supplied RR-1 export; NASA environmental standards and technical briefs; dependency authors. [Data provenance](public/data/README.md) · [Illustration attribution](public/images/ATTRIBUTION.md) · [Audio attribution](public/audio/ATTRIBUTION.txt).

**TODO (project owner):** confirm contributor names/roles, competition/challenge details, submission requirements, and the GIF. No awards, NASA affiliation or judge endorsements are claimed.

## AI-use disclosure

Design, code, documentation and testing were developed with AI assistance. The visible cartoon is an AI-assisted code illustration and is labeled in the app. The optional Roger assistant generates text via Gemini with optional Mistral backup and displays an accuracy notice. An earlier generated crew asset remains attributed separately; it is not the active diagram. Original ambient audio was synthesized with AI assistance. Model trajectories and sweep values come from deterministic equations; RR-1 observations come from the supplied CSV, not generated data. Human review and scientific validation remain necessary.


## Interactive 3D views

Simulation and Sensor Lab offer a rotatable, zoomable conceptual cabin and crew figure. Crew Health provides a selectable 3D body illustration. Drag or pinch on touchscreens, use the view buttons, or focus the canvas and use left/right arrows, +/−, and Home. Blue sensor markers can be selected; Sensor Lab provides Cabin/Breathing zone placement presets. Body-system buttons remain keyboard accessible.

The same two-volume equations, zone boundary, run clock and masked exercise drive the 3D cabin. No spatial airflow or physiological simulation was added. The body is a simplified research illustration, not anatomical validation. The optional 2D views remain available, with automatic fallback when WebGL is unsupported or its context is lost. 3D resources load separately and render only on interaction or model updates; there is no automatic spin. Both scenes and exported PNGs carry “Made by AI” labels. Three.js is free/open-source; no paid assets or rendering service is used.
