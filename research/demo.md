# CALYPSO live demo

## 60 seconds

1. Open Simulation and select **Start 60-second demo**. The reduced-ventilation preset calculates 300 seconds of simulated data with one cabin sensor and noise off.
2. Point out that the cabin sensor never reaches the 1,250 ppm demonstration threshold. Select **Reveal modeled breathing zone**. The local model first crosses the threshold at 36 seconds.
3. Select **Move S1 to the breathing zone**. The relocated sensor detects the crossing at 36 seconds, with zero modeled delay. Both placements evaluate the same samples.
4. Select **Save comparison runs**. In **Experiments**, select the baseline from the comparison menu.

## Three minutes

Scrub to the first crossing and compare readings at that timestamp. Explain the two well-mixed compartments, the illustrative threshold, and why relocating a sensor changes its readings. Open Sensor Lab to demonstrate hands-on placement and adjustable noise. Open NASA Data to show RR-1 flight and ground observations, then open Reports for the saved comparison.

## Scope by prompt item

- Implemented in this pass: 01–12, 14, 16–19, 38, 50. Start computes the run instantly and the comparison saves as two named records. The scrubber and event overlays are in the guided demo.
- Existing features used by the demo: 20, 23–24, 26–30, 32, 36–37, 41–43, 46, 49.
- Deferred or partial: 13, 15, 21–22, 25, 31, 33–35, 39–40, 44–45, 47–48. These cover report page layout, fresh-session and accessibility checks, further telemetry detail, CSV download and regression tests, viewport selection and nudging, and design consistency. The browser checks covered the guided flow, named records, RR-1, and Reports. Screenshots were captured at desktop and 390 px.

## Final submission checklist

- Open the production URL in a signed-out window. Visit Overview, Simulation, Sensor Lab, NASA Data, Research, Experiments, Reports, and About.
- Run the guided demo through both placements and its download. Start a worker solve, check the measured solve time, then scrub the viewport and both workbench charts.
- Verify Play/Pause, step, reset, speed, and the parameter sliders. Paste the shared scenario into a fresh tab and compare settings.
- Download result CSV, chart PNG, and cabin PNG. Open each file. Save two runs, reopen them in Experiments, and preview a report.
- On a phone, test the controls sheet, settings drawer, reduced motion, and keyboard navigation. Enable sound after a click, try mute, switch tabs, and refresh to test persistence.
- Run Lighthouse against the production URL. Record the actual scores and address findings.
- Fill in the About team details and the methodology model revision date. Add documented empirical validation if available.

## Spatial workbench script (60 seconds)

1. Open CALYPSO. Select **Run demo** and let the default reduced-ventilation run play. “This model tracks CO₂ in 576 cabin cells.”
2. Pause and scrub forward. “CO₂ passes the demo trigger at the crew cell by 3 seconds. The wall sensor misses it during the full 120-second run.”
3. Select **Best sensor placement**, then **Move sensor here**. “This virtual mounting cell detects the crossing at 31 seconds using the same modeled trajectory.”
4. Show the traces and open **Model & evidence**. “We start from a real RR-1 observation. The field and placements are simulated.” Export the CSV or use the scenario link to replay the comparison.

Spatial checks: verify drag, coordinate sliders, second-sensor add/remove, play/step/reset and every speed. Reopen a shared link and compare settings and cell coordinates. Verify canvas PNG and CSV downloads, the NASA reference toggle, the optional audio controls, and both models on mobile. Run Lighthouse against the deployed build. The older guided comparison is available under Sensor Lab.
