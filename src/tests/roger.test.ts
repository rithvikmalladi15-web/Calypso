import { afterEach, expect, it, vi } from 'vitest'
import { askGemini, parseInput } from '../../server/roger'
import handler from '../../api/roger'
const input={question:'Explain this run',history:[],context:{scenario:'Reduced ventilation',elapsedSeconds:300,cabinPpm:368,localPpm:1869,peakLocalPpm:1885,ventilationPercent:12,removalPercent:65,activity:1,thresholdPpm:1250,masked:false,firstLocalCrossingSeconds:36,firstSensorAlertSeconds:null,sensors:[{id:'S1',location:'Cabin',ppm:368},{id:'S2',location:'Breathing zone',ppm:1869}]}}
afterEach(()=>vi.unstubAllEnvs())
it('strips local values, local sensors and prior answers in a masked exercise',()=>{
  const safe=parseInput({...input,history:[{role:'model',text:'Local is 1869 ppm'}],context:{...input.context,masked:true}})
  expect(safe.context).not.toHaveProperty('localPpm')
  expect(safe.context).not.toHaveProperty('firstLocalCrossingSeconds')
  expect(safe.context.sensors).toEqual([{id:'S1',location:'Cabin',ppm:368}])
  expect(safe.history).toEqual([])
})
it('rejects oversized questions and invalid numeric settings',()=>{
  expect(()=>parseInput({...input,question:'x'.repeat(1201)})).toThrow()
  expect(()=>parseInput({...input,context:{...input.context,activity:NaN}})).toThrow()
  expect(()=>parseInput({...input,context:{...input.context,ventilationPercent:101}})).toThrow()
})
it('uses server credentials, grounds the request and returns only registered source links',async()=>{
  const upstream=vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({answer:'The wall sensor missed the local crossing.',sourceIds:['CO2','SUIT','WASH','invented']})}]}}]})))
  const response=await askGemini(parseInput(input),'server-test-key','gemini-3.1-flash-lite',upstream)
  expect(response.sources.map(s=>s.id)).toEqual(['CO2'])
  const options=upstream.mock.calls[0][1]
  expect(options.headers['x-goog-api-key']).toBe('server-test-key')
  expect(JSON.parse(options.body).systemInstruction.parts[0].text).toContain('not a NASA employee')
  expect(JSON.stringify(response)).not.toContain('server-test-key')
})
it('fails clearly for provider throttling rather than inventing an answer',async()=>{
  await expect(askGemini(parseInput(input),'test','gemini-3.1-flash-lite',vi.fn().mockResolvedValue(new Response('{}',{status:429})))).rejects.toThrow('RATE_LIMIT')
})
it('rejects cross-origin use and handles a missing key without exposing configuration',async()=>{
  vi.stubEnv('GEMINI_API_KEY','')
  const res={statusCode:0,setHeader:vi.fn(),end:vi.fn()}
  await handler({method:'POST',headers:{host:'calypso.test',origin:'https://other.test'}} as never,res as never)
  expect(res.statusCode).toBe(403)
  await handler({method:'POST',headers:{host:'calypso.test'}} as never,res as never)
  expect(res.statusCode).toBe(503)
  expect(res.end.mock.calls.at(-1)?.[0]).toContain('NOT_CONFIGURED')
})
it('limits repeated requests before calling the provider',async()=>{
 vi.stubEnv('GEMINI_API_KEY','test-only')
 const fetcher=vi.spyOn(globalThis,'fetch')
 try {
  for(let i=0;i<11;i++) {
   const res={statusCode:0,setHeader:vi.fn(),end:vi.fn()}
   await handler({method:'POST',headers:{host:'calypso.test'},socket:{remoteAddress:'rate-limit-test'},body:{}} as never,res as never)
   expect(res.statusCode).toBe(i<10?400:429)
  }
  expect(fetcher).not.toHaveBeenCalled()
 } finally {fetcher.mockRestore()}
})
it('constrains the assistant to model evidence and explicit uncertainty',async()=>{
 const {instructions}=await import('../../server/roger')
 expect(instructions).toContain('Answer ONLY')
 expect(instructions).toContain('I don\'t know')
 expect(instructions).toContain('one-hour time-weighted average')
})
