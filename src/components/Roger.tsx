import { thresholds } from '../simulation/thresholds'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSim } from '../stores/simulationStore'
import { detect, isLocal, reading } from '../simulation/sensorModel'
import type { RunContext } from '../../server/roger'

type Message={role:'user'|'model';text:string;sources?:{id:string;title:string;url:string}[];sample?:number}
export function RogerAvatar({busy=false}:{busy?:boolean}) {
  return <svg className={'roger-avatar'+(busy?' thinking':'')} viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id="roger-skin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c5f4df"/><stop offset=".55" stopColor="#78cfc2"/><stop offset="1" stopColor="#518dbe"/></linearGradient></defs>
    <ellipse cx="60" cy="108" rx="32" ry="5" fill="#74cabe" opacity=".15"/>
    <g className="roger-body">
      <path d="M60 30q-5-13 3-19" stroke="#a3e6d2" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="65" cy="10" r="5" fill="#d7fbbe"/>
      <path d="M24 67c0-27 14-42 36-42s37 14 38 41c1 13 12 21 5 29-5 6-13 1-19 4-14 9-37 9-50 1-7-4-16 3-20-4-5-10 10-15 10-29Z" fill="url(#roger-skin)" stroke="#c4f3e2" strokeWidth="1.5"/>
      <path d="M34 45q8-12 22-12" stroke="#f1fff8" opacity=".55" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <g className="roger-eyes"><ellipse cx="45" cy="63" rx="10" ry="14" fill="#172b39" transform="rotate(-12 45 63)"/><ellipse cx="77" cy="63" rx="10" ry="14" fill="#172b39" transform="rotate(12 77 63)"/><circle cx="47" cy="58" r="3.5" fill="#f7ffff"/><circle cx="79" cy="58" r="3.5" fill="#f7ffff"/></g>
      <path d="M54 83q7 7 14-1" stroke="#244653" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="31" cy="79" rx="7" ry="3" fill="#dfedc4" opacity=".55"/><ellipse cx="90" cy="79" rx="7" ry="3" fill="#dfedc4" opacity=".55"/>
    </g>
  </svg>
}
export function runSnapshot():RunContext {
  const s=useSim.getState(), point=s.points[s.points.length-1], rule=thresholds[s.thresholdId], metrics=detect(s.points,s.sensors,s.noise,rule.ppm,rule.windowSeconds)
  return {scenario:s.scenario,elapsedSeconds:point.t,cabinPpm:Math.round(point.cabin),ventilationPercent:s.settings.ventilation*100,removalPercent:s.settings.scrubber*100,activity:s.settings.activity,thresholdPpm:rule.ppm,averagingSeconds:rule.windowSeconds,masked:s.masked,
    sensors:s.sensors.filter(sensor=>!s.masked||!isLocal(sensor)).map(sensor=>({id:sensor.id,location:isLocal(sensor)?'Breathing zone':'Cabin',ppm:Math.round(reading(point,sensor,s.noise))})),
    ...(!s.masked?{localPpm:Math.round(point.local),peakLocalPpm:Math.round(Math.max(...s.points.map(p=>p.local))),firstLocalCrossingSeconds:metrics.truth??null,firstSensorAlertSeconds:metrics.alert??null}:{})}
}
const questions=['Explain this run','What should I try next?','What is NASA data here?']
export function Roger() {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const masked=useSim(s=>s.masked)
  const launcher=useRef<HTMLButtonElement>(null),input=useRef<HTMLTextAreaElement>(null),bottom=useRef<HTMLDivElement>(null),request=useRef<AbortController|null>(null)
  function close(){setOpen(false);launcher.current?.focus()}
  useEffect(()=>{if(open)input.current?.focus()},[open])
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'})},[messages,busy])
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true)},[open])
  useEffect(()=>()=>request.current?.abort(),[])
  useEffect(()=>{request.current?.abort();setBusy(false);setMessages([]);setError('')},[masked])
  async function ask(question:string){
    if(busy||!question.trim())return
    const context=runSnapshot(),controller=new AbortController();request.current=controller
    const history=messages.slice(-6).map(({role,text})=>({role,text}))
    setMessages(previous=>[...previous.slice(-11),{role:'user',text:question,sample:context.elapsedSeconds}]);setDraft('');setError('');setBusy(true)
    const timeout=window.setTimeout(()=>controller.abort(),50000)
    try{
      const response=await fetch('/api/roger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,context,history}),signal:controller.signal})
      const data=await response.json().catch(()=>{throw new Error('Roger’s server is restarting or unavailable. Please try again shortly.')})
      if(!response.ok)throw new Error(data.error||'Roger is unavailable. Please try again.')
      if(typeof data.answer!=='string')throw new Error('Roger received an incomplete answer. Please try again.')
      if(request.current!==controller||controller.signal.aborted)return
      setMessages(previous=>[...previous,{role:'model',text:data.answer,sources:data.sources,sample:context.elapsedSeconds}])
    }catch(e){if(request.current===controller)setError(controller.signal.aborted?'The request was interrupted. Try again when you’re ready.':e instanceof Error?e.message:'Roger is offline. The simulator still works.')}
    finally{clearTimeout(timeout);if(request.current===controller)setBusy(false)}
  }
  function submit(e:FormEvent){e.preventDefault();void ask(draft.trim())}
  return <div className="roger-companion">
    {open && <section className="roger-panel" role="dialog" aria-modal="false" aria-labelledby="roger-title">
      <header className="roger-header"><RogerAvatar busy={busy}/><div><h2 id="roger-title">Roger</h2><span>NASA research AI guide</span></div><button className="roger-close" onClick={close} aria-label="Close Roger">×</button></header>
      <div className="roger-context"><span className="roger-dot"/> {masked?'Masked exercise · local values withheld':'Connected to your main workbench'}</div>
      <div className="roger-conversation" role="log" aria-label="Conversation with Roger" aria-live="polite">
        {!messages.length && <div className="roger-welcome"><h3>Roger that. Let’s make sense of it.</h3><p>I’m your alien lab partner. Ask me about the graphs, a missed detection, or the NASA references.</p><p>I explain the latest main-workbench sample, not the separate guided demo.</p></div>}
        {messages.map((message,index)=><article className={'roger-message '+message.role} key={index}><div className="roger-message-label">{message.role==='user'?'You':'Roger · AI'}{message.role==='model'&&<span>Run snapshot: {message.sample} s</span>}</div><p>{message.text}</p>{message.sources?.length ? <div className="roger-sources">References{message.sources.map(source=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>:null}</article>)}
        {busy&&<p className="roger-thinking" role="status">Roger is examining your run<span>…</span></p>}
        {error&&<div className="roger-error" role="alert"><p>{error}</p><button disabled={busy} onClick={()=>void ask([...messages].reverse().find(m=>m.role==='user')?.text??questions[0])}>Try again</button></div>}
        <div ref={bottom}/>
      </div>
      <div className="roger-questions">{questions.map(question=><button key={question} disabled={busy} onClick={()=>void ask(question)}>{question}</button>)}</div>
      <form onSubmit={submit} className="roger-form"><label className="sr-only" htmlFor="roger-question">Ask Roger</label><textarea ref={input} id="roger-question" rows={2} maxLength={1200} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ask about your experiment…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(draft.trim())void ask(draft.trim())}}}/><button type="submit" disabled={busy||!draft.trim()} aria-label="Send question to Roger">↑</button></form>
      <div className="roger-footer"><span>AI-generated, may be inaccurate. Not NASA-affiliated.<br/>Question + run summary sent to Google Gemini.</span><button disabled={busy||!messages.length} onClick={()=>{setMessages([]);setError('');input.current?.focus()}}>Clear</button></div>
    </section>}
    <button ref={launcher} className="roger-launcher" aria-label={open?'Close Roger AI guide':'Ask Roger AI guide'} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><RogerAvatar busy={busy}/><span><strong>Ask Roger</strong><small>AI lab partner</small></span><span className="roger-launch-arrow" aria-hidden="true">{open?'×':'↗'}</span></button>
  </div>
}
