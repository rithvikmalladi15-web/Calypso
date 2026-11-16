import { Component, type ReactNode } from 'react'
import { useSim } from '../stores/simulationStore'

export class SimulationBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = {failed:false}
  static getDerivedStateFromError() { return {failed:true} }
  render() {
    if (!this.state.failed) return this.props.children
    return <section className="panel section" role="alert">
      <h1>The simulator couldn’t open</h1>
      <p>Reload the simulation to start with baseline settings.</p>
      <button onClick={()=>{
        useSim.getState().select('Baseline')
        history.replaceState(null,'',location.pathname+location.search+'#/simulation')
        location.reload()
      }}>Reload simulation</button>
    </section>
  }
}
