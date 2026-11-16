import { expect, it } from 'vitest'
import { parseCsv, measurement } from '../data/nasaCsvParser'
it('recognizes RR-1 header semantics and preserves missing measurements',()=>{
  const parsed=parseCsv('Controller_Time_GMT,Temp_degC_Ground,RH_percent_ISS,CO2_ppm_ISS\n2014-09-20 03:59,24.10,,2641')
  expect(parsed.time).toBe('Controller_Time_GMT')
  expect(parsed.columns.map(c=>[c.metric,c.unit,c.location])).toEqual([['Temperature','°C','Ground control'],['Humidity','%','ISS flight'],['CO₂','ppm','ISS flight']])
  expect(measurement(parsed.rows[0]['RH_percent_ISS'],parsed.columns[1])).toBeNull()
  expect(measurement(parsed.rows[0]['CO2_ppm_ISS'],parsed.columns[2])).toBe(2641)
})
it('validates and converts units before charting',()=>{
  expect(measurement('68',{header:'t',metric:'Temperature',unit:'°F',location:''})).toBe(20)
  expect(measurement('0.4',{header:'rh',metric:'Humidity',unit:'fraction',location:''})).toBe(40)
  expect(measurement('2000000',{header:'c',metric:'CO₂',unit:'ppb',location:''})).toBe(2000)
  expect(measurement('2',{header:'c',metric:'CO₂',unit:'',location:''})).toBeNull()
  expect(()=>parseCsv('unsupported')).toThrow()
})

it('normalizes mapped pressure and air speed while rejecting impossible oxygen fractions', () => {
  expect(measurement('101325', {header:'pressure', metric:'Pressure', unit:'Pa', location:''})).toBeCloseTo(101.325)
  expect(measurement('25', {header:'air speed', metric:'Air speed', unit:'cm/s', location:''})).toBeCloseTo(.25)
  expect(measurement('1.1', {header:'oxygen', metric:'Oxygen', unit:'fraction', location:''})).toBeNull()
})
