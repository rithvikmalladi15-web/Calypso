export function AboutPage() {
  return <>
    <div className="page-heading"><h1>About CALYPSO</h1><p>An educational workbench for investigating spacecraft cabin CO₂ and sensor placement.</p></div>
    <section className="panel section">
      <h2>The problem</h2>
      <p>A cabin sensor can report a lower concentration than a poorly mixed breathing zone. CALYPSO lets a judge compare the two readings, move the virtual sensor, and replay the same simulated samples.</p>
      <h2>What you can reproduce</h2>
      <p>The guided run compares two sensor locations with identical model settings. Download the data or save both runs and open them in Experiments.</p>
      <h2>Team</h2>
      <p>TODO: Add team member names, roles, and the registered competition event.</p>
      <h2>Roadmap</h2>
      <p>Compare the simplified model against a documented chamber experiment and report agreement and uncertainty across operating conditions.</p>
      <div className="actions"><a className="button primary" href="#/simulation">Launch workbench</a><a className="button" href="#/research">Review evidence</a></div>
    </section>
  </>
}
