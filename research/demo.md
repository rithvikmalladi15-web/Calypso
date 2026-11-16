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
