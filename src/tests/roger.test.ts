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
  vi.stubEnv('MISTRAL_API_KEY','')
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

it('keeps Gemini primary without calling Mistral on success',async()=>{
 const {askRoger}=await import('../../server/roger')
 const upstream=vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({answer:'Primary answer',sourceIds:[]})}]}}]})))
 expect((await askRoger(parseInput(input),{geminiKey:'primary',mistralKey:'backup'},upstream)).answer).toBe('Primary answer')
 expect(upstream).toHaveBeenCalledTimes(1)
})
it.each(['http','timeout','invalid'])('falls back securely after Gemini %s failure',async failure=>{
 const {askRoger}=await import('../../server/roger')
 const upstream=vi.fn()
 if(failure==='timeout')upstream.mockRejectedValueOnce(new DOMException('Timed out','TimeoutError'))
 else upstream.mockResolvedValueOnce(new Response(failure==='invalid'?'{}':'unavailable',{status:failure==='http'?503:200}))
 upstream.mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'Backup answer',sourceIds:['CO2','invented']})}}]})))
 const safe=parseInput({...input,context:{...input.context,masked:true}})
 const result=await askRoger(safe,{geminiKey:'primary',mistralKey:'backup'},upstream)
 expect(result.answer).toBe('Backup answer')
 expect(result.sources.map(s=>s.id)).toEqual(['CO2'])
 const [url,options]=upstream.mock.calls[1]
 expect(url).toBe('https://api.mistral.ai/v1/chat/completions')
 expect(options.headers.Authorization).toBe('Bearer backup')
 const payload=JSON.parse(options.body)
 expect(payload.messages[0].content).toContain('I don\'t know')
 expect(JSON.parse(payload.messages[1].content).context).not.toHaveProperty('localPpm')
 expect(JSON.stringify(result)).not.toContain('primary')
})
it('supports backup-only configuration and rejects invalid backup responses',async()=>{
 const {askRoger}=await import('../../server/roger')
 const upstream=vi.fn().mockResolvedValue(new Response('{}'))
 await expect(askRoger(parseInput(input),{mistralKey:'backup'},upstream)).rejects.toThrow('EMPTY_REPLY')
 expect(upstream).toHaveBeenCalledTimes(1)
 await expect(askRoger(parseInput(input),{})).rejects.toThrow('NOT_CONFIGURED')
})
it('does not retry Gemini when no backup is configured',async()=>{
 const {askRoger}=await import('../../server/roger')
 const upstream=vi.fn().mockResolvedValue(new Response('{}',{status:429}))
 await expect(askRoger(parseInput(input),{geminiKey:'primary'},upstream)).rejects.toThrow('RATE_LIMIT')
 expect(upstream).toHaveBeenCalledTimes(1)
})
it('uses fallback through the endpoint and sanitizes total provider failure',async()=>{
 vi.stubEnv('GEMINI_API_KEY','primary-test')
 vi.stubEnv('MISTRAL_API_KEY','backup-test')
 const upstream=vi.spyOn(globalThis,'fetch')
 try {
  upstream.mockResolvedValueOnce(new Response('{}',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'Fallback worked',sourceIds:[]})}}]})))
  const req={method:'POST',headers:{host:'calypso.test'},socket:{remoteAddress:'fallback-test'},body:input}
  const res={statusCode:0,setHeader:vi.fn(),end:vi.fn()}
  await handler(req as never,res as never)
  expect(res.statusCode).toBe(200)
  expect(JSON.parse(res.end.mock.calls.at(-1)![0]).answer).toBe('Fallback worked')
  upstream.mockRejectedValue(new Error('secret-provider-details'))
  await handler(req as never,res as never)
  expect(res.statusCode).toBe(502)
  expect(res.end.mock.calls.at(-1)![0]).not.toContain('secret-provider-details')
 } finally {upstream.mockRestore()}
})
