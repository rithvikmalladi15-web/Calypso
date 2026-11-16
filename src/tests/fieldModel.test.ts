import { expect, it } from 'vitest'
import { cellIndex, columns, crew, fieldDuration, initialPpm, rows, solveField, wall } from '../simulation/fieldModel'
import { presets } from '../simulation/engine'
import { readFieldSensors } from '../simulation/scenarioLink'

it('keeps uniform concentration under closed-wall transport with no source or sink',()=>{
  const result = solveField({ventilation:1,scrubber:0,activity:0})
  expect(result.frames).toHaveLength(fieldDuration+1)
  expect(result.frames.at(-1)?.every(value=>value === initialPpm)).toBe(true)
  expect(result.recommendation).toBeNull()
})
it('reproduces the reduced-ventilation sensor blind spot and ranks an eligible cell',()=>{
  const result = solveField(presets['Reduced ventilation'])
  expect(result.frames.every(frame=>frame.length===columns*rows && frame.every(value=>Number.isFinite(value)&&value>=0))).toBe(true)
  expect(result.firstCrossing[cellIndex(crew)]).toBe(3)
  expect(result.firstCrossing[cellIndex(wall)]).toBe(-1)
  expect(result.recommendation).not.toEqual(crew)
  expect(result.firstCrossing[cellIndex(result.recommendation!)]).toBe(31)
})
it('restores both sensor locations and rejects invalid grid coordinates',()=>{
  expect(readFieldSensors('#/simulation?sensors=3%2C9%3B13%2C8',columns,rows)).toEqual([wall,{x:13,y:8}])
  expect(readFieldSensors('#/simulation?sensors=32%2C0',columns,rows)).toBeNull()
})
