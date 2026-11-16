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

it('shows 100 derived metrics and hides local signals during masked exercises', () => {
  render(<Workbench lab/>)
  const summary = screen.getByText('Measurement catalog · 100 metrics')
  fireEvent.click(summary)
  const signal = screen.getByRole('combobox', {name:'Signal'})
  fireEvent.change(signal, {target:{value:'9'}})
  expect(screen.getAllByText('Unavailable')).toHaveLength(10)
  fireEvent.click(screen.getByRole('button', {name:'Start masked exercise'}))
  expect(screen.queryByRole('option', {name:'Breathing-zone CO₂ rate of change'})).toBeNull()
  expect(screen.getByText('Measurement catalog · 50 metrics')).toBeTruthy()
  useSim.getState().select('Routine operations')
})

it('focuses the editable settings from Custom and applies changes to a fresh run', () => {
  useSim.getState().select('Routine operations')
  render(<Workbench/>)
  fireEvent.click(screen.getByRole('button',{name:'Run 300 s'}))
  fireEvent.change(screen.getByRole('combobox',{name:'Scenario'}),{target:{value:'Custom'}})
  const ventilation = screen.getByRole('slider',{name:/Ventilation/})
  expect(document.activeElement).toBe(ventilation)
  expect(useSim.getState().points).toHaveLength(301)
  fireEvent.change(ventilation,{target:{value:'23'}})
  expect(useSim.getState().settings.ventilation).toBe(.23)
  expect(useSim.getState().points).toHaveLength(1)
  useSim.getState().select('Routine operations')
})
