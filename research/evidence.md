# Model methods and evidence

## Educational mass balance

Let Cb and Cc be breathing-zone and cabin CO₂ in ppm, with effective volumes Vb = 1 m³ and Vc = 30 m³. Equal air density and constant pressure are assumed. Time is measured in seconds.

```text
Vb dCb/dt = S − Q(Cb − Cc)
Vc dCc/dt = Q(Cb − Cc) − R Cc
```

S = 22 × relative activity in ppm·m³/s. Q = 0.006 + 0.074 × ventilation in m³/s. R = 0.15 × removal setting in m³/s. Ventilation and removal are dimensionless fractions between zero and one. The source multiplier ranges from zero to three. The initial state is 650 ppm in each compartment. These demonstration values were chosen to make local and cabin behavior distinguishable on short runs. They have no calibration to RR-1 or an astronaut.

The engine integrates with forward Euler and substeps of at most one second. Under the supported controls this leaves positive diagonal update weights and nonnegative exchange weights. Summing the two volume-weighted equations cancels exchange exactly in the mathematical model, leaving S − R Cc. Tests exercise exchange-only conservation, source and removal accounting, positivity, and long-step subdivision. The schematic shows a discrete breathing-zone ellipse and qualitatively animated flow lines.

## Virtual measurements

A sensor inside the displayed ellipse samples Cb. A sensor outside samples Cc. Optional noise adds A sin(2.37t + phase), where A is set in ppm and the deterministic phase comes from the sensor ID. Negative noisy readings are clamped to zero. Halos mark placement and have no physical coverage radius.

A local crossing is the first simulated sample at or above 1,250 ppm. A sensor alert is the first sample at or above that value from any sensor in the evaluated layout. The reported delay is alert time minus local crossing time when both occur. A negative delay indicates an early crossing and an alert without a local crossing is a false alert within the run. Mean absolute error averages the absolute difference between Cb and the highest sensor reading at each sample. Layout, relocation, and noise changes recompute detection against the full trajectory. Saved runs preserve the sampled series, configuration, model version, and initial state.

## NASA references

- **Background.** OCHMO-TB-004 covers CO₂ and spacecraft monitoring considerations. [NASA Carbon Dioxide Technical Brief](https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/)
- **Habitat standard.** NASA-STD-3001 Volume 2 §6.2.1.3 [V2 6004] defines a one-hour average partial-pressure requirement for the habitable volume. Its rationale discusses generation, scrubbing, and ventilation to prevent localized accumulation. Calypso's instantaneous ppm demonstration threshold is an independent model convention. [Natural and Induced Environments](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/)
- **Spacesuit standard and guidance.** Volume 2 §11.3.5 [V2 11039] addresses inspired CO₂ partial pressure in suits. NASA's February 2025 companion bulletin, p. 1, discusses ventilation, helmet shape, metabolic rate, and standardized testing. [Spacesuits](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) · [Suited CO₂ bulletin](https://www.nasa.gov/wp-content/uploads/2025/02/suited-co2-technical-bulletin-02182025.pdf)
- **Observed data.** NASA OSDR publishes flight and ground telemetry and describes its data tables and comparison workflow. RR-1 observations provide environmental context. [Environmental Data App](https://visualization.osdr.nasa.gov/eda/) · [Download tutorial](https://github.com/nasa/OSDR_Tutorials/blob/main/source/pages/guides/environmental_data_application.md)

## Spatial workbench model

The Simulation route uses a separate educational spatial model. The original guided comparison and its saved experiments use the two-compartment model above.

The cabin section contains 32 × 18 cells in grid coordinates. With time in seconds and concentration C in ppm, the model solves ∂C/∂t = −∇·(uC) + D∇²C + S − k max(C − Cfloor, 0). A discrete streamfunction supplies recirculating face velocities with zero wall-normal flux. The finite-volume update uses upwind advection and centered diffusion with a 0.5-second step. D is 0.055 cells²/s. The illustrative crew source is 210 ppm/s at 1× activity in one cell. The sink acts in the three rightmost columns with a rate of 0.022/s at full removal and a 420 ppm model floor.

The model starts uniformly at 2,641 ppm, the first ISS CO₂ measurement in the bundled RR-1 table (2014-09-20 03:59 GMT). That single environmental observation supplies an initial condition. The airflow, crew source, sink and geometry are illustrative assumptions. The solver has no calibrated ISS flow field. [NASA OSDR Environmental Data Application](https://visualization.osdr.nasa.gov/eda/)

The placement map shows each cell’s first sampled crossing of the **3,100 ppm demonstration trigger**. It recommends the earliest eligible cell, excluding the crew source cell, with ties resolved in grid order. Real installation constraints and detector response times are outside the model.

**NASA context.** NASA-STD-3001 Volume 2 §6.2.1.3 [V2 6004] states a 3 mmHg one-hour average habitable-volume requirement. The optional plot line is its concentration equivalent at an assumed 760 mmHg total pressure (approximately 3,947 ppm). The 120-second simulation cannot assess that one-hour criterion. [NASA standard](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/) · [ISS CO₂ operations study](https://ntrs.nasa.gov/citations/20150019624)
