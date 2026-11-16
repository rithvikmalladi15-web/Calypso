import { askGemini, parseInput } from '../server/roger'
import type { IncomingMessage, ServerResponse } from 'node:http'
const buckets=new Map<string,{count:number;until:number}>()
let total={count:0,until:0}
export default async function handler(req:IncomingMessage & {body?:unknown},res:ServerResponse) {
  res.setHeader('Cache-Control','no-store')
  const send=(code:number,value:unknown)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))}
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'Use POST.'})}
  const origin=req.headers.origin
  if(origin){try{if(new URL(origin).host!==req.headers.host)return send(403,{error:'This assistant is available from CALYPSO.'})}catch{return send(403,{error:'Invalid origin.'})}}
  const key=process.env.GEMINI_API_KEY
  if(!key)return send(503,{error:'Roger’s AI connection is not configured yet. You can still use all simulation features.',code:'NOT_CONFIGURED'})
  const now=Date.now(),ip=String(req.headers['x-vercel-forwarded-for']??req.socket?.remoteAddress??'local').split(',')[0]
  for(const [id,bucket]of buckets)if(bucket.until<=now)buckets.delete(id)
  if(total.until<=now)total={count:0,until:now+60000}
  const bucket=buckets.get(ip)??{count:0,until:now+60000}
  if(bucket.count>=10||total.count>=60){res.setHeader('Retry-After','60');return send(429,{error:'Roger needs a short break. Try again in a minute.'})}
  let body=req.body
  try{
    if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)return send(413,{error:'This message is too long.'})}body=JSON.parse(raw)}
    else if(typeof body==='string'){if(body.length>16000)return send(413,{error:'This message is too long.'});body=JSON.parse(body)}
    if(JSON.stringify(body).length>16000)return send(413,{error:'This message is too long.'})
    const input=parseInput(body)
    bucket.count++;buckets.set(ip,bucket);total.count++
    try{return send(200,await askGemini(input,key,process.env.GEMINI_MODEL))}
    catch(error){return send(error instanceof Error&&error.message==='RATE_LIMIT'?429:502,{error:'Roger couldn’t reach Gemini. Please try again shortly. Your simulation is unaffected.'})}
  }catch{return send(400,{error:'Please send a short question with a valid run snapshot.'})}
}
