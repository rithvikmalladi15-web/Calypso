import { expect, it } from 'vitest'
import { defaultSweep, sweep, sweepCsv } from '../simulation/robustness'
it('sweeps every grid setting and distinguishes misses from no crossing',()=>{
 const cells=sweep(defaultSweep)
 expect(cells).toHaveLength(36)
 expect(cells.filter(c=>c.activity===0).every(c=>c.crossing===undefined)).toBe(true)
 expect(cells.some(c=>c.crossing!=null&&c.cabin==null)).toBe(true)
 expect(cells.filter(c=>c.crossing!=null).every(c=>c.localDelay===0)).toBe(true)
 expect(sweepCsv(defaultSweep,cells).split('\n')).toHaveLength(37)
 expect(sweepCsv(defaultSweep,cells)).toContain('never detected')
})
it('rejects unbounded sweep work',()=>expect(()=>sweep({...defaultSweep,seconds:100000})).toThrow())
