# NASA environmental telemetry

The included `nasa-iss-telemetry.csv` is a byte-for-byte copy of the user-supplied `RR-1_EDA_Telemetry_table.csv`. Its SHA-256 is `1117dd51b7e869119b0426dd1a57c7c42a0a4edf502b7b18a8a280f0b7d0c531`. The app uses that fingerprint to identify the bundled original.

Use the [NASA OSDR Environmental Data App](https://visualization.osdr.nasa.gov/eda/) Data Tables tab to choose the mission and download its telemetry table. Check the mission selection, recorded environment, timestamps, and header units against the dashboard before interpreting the export. See the [NASA download tutorial](https://github.com/nasa/OSDR_Tutorials/blob/main/source/pages/guides/environmental_data_application.md).

To replace the default dataset, copy your export to `public/data/nasa-iss-telemetry.csv`. You can also select or drop a CSV on the NASA Data page. Temporary browser imports are held in memory. In **Column mapping and units**, confirm the measurement, unit, timestamp, and flight or ground label. Offset-free ISO timestamps are interpreted as UTC. Choose the source-row axis for other timestamp formats. Blank and invalid values are represented as missing.

RR-1 has paired ISS and ground-control columns for temperature in °C, relative humidity in percent, and CO₂ in ppm. It has 12,087 data rows. The channels describe reported environmental conditions. The breathing-zone chart elsewhere in Calypso represents a separate hypothetical compartment experiment.

For the RR-1 controller time column, the explorer counts intervals longer than five minutes and breaks the plot across those gaps. Chart windows limit the number of plotted points. The usable-row count covers the entire dataset for the selected measurement.
