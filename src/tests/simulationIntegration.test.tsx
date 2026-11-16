// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Workbench } from '../components/Workbench'
import { serializeReport } from '../lib/exportReport'
import { run, presets } from '../simulation/engine'
import { cabinSensor } from '../simulation/sensorModel'
import { snapshot } from '../stores/experimentStore'
import { useSim } from '../stores/simulationStore'
vi.mock('../components/TelemetryChart',()=>({TelemetryChart:()=>null}))
afterEach(cleanup)
it('runs, pauses, and resets from the normal workbench controls',()=>{
  render(<Workbench/>)
  fireEvent.click(screen.getByRole('button',{name:'Run simulation'}))
  expect(useSim.getState().running).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Pause'}))
  expect(useSim.getState().running).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'Run 300 s'}))
  expect(useSim.getState().points).toEqual(run(presets['Routine operations']))
  fireEvent.click(screen.getByRole('button',{name:'Reset simulation'}))
  expect(useSim.getState().points).toHaveLength(1)
})
it('exports the configuration and full deterministic time series as JSON',()=>{
  const settings=presets['Routine operations']
  const points=run(settings)
  const record=snapshot('Routine operations',settings,[cabinSensor],points,0)
  const serialized=JSON.parse(serializeReport(record))
  expect(serialized.points).toEqual(run(serialized.settings))
  expect(serialized.sensors).toEqual([cabinSensor])
  expect(serialized.version).toBe('1.0')
})
