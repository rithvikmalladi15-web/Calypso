import { useEffect, useRef, type RefObject } from 'react'
import { columns, rows, crew, cellIndex, valueAt, initialPpm, type Cell } from '../simulation/fieldModel'

const palette = [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]]
const cellSize = 20
export function fieldColor(fraction:number) {
  const scaled = Math.max(0,Math.min(1,fraction))*(palette.length-1)
  const low = palette[Math.floor(scaled)]
  const high = palette[Math.ceil(scaled)]
  return 'rgb('+low.map((value,i)=>Math.round(value+(high[i]-value)*(scaled%1))).join(',')+')'
}
export function ConcentrationField({frame, positions, recommendation, detection, canvas, onMove, upperPpm}:{
  frame:Float32Array; positions:Cell[]; recommendation:Cell|null; detection:Int16Array|null
  canvas:RefObject<HTMLCanvasElement|null>; onMove?:(index:number, cell:Cell)=>void; upperPpm:number
}) {
  const dragging = useRef<number|null>(null)
  useEffect(()=>{
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle='#081019'
    ctx.fillRect(0,0,columns*cellSize,rows*cellSize+46)
    for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
      const index=cellIndex({x,y})
      const time=detection?.[index]
      ctx.fillStyle=detection ? time===undefined || time<0 ? '#141e2a' : fieldColor(1-time/120)
        : fieldColor((frame[index]-initialPpm)/(upperPpm-initialPpm))
      ctx.fillRect(x*cellSize,y*cellSize,cellSize,cellSize)
    }
    ctx.strokeStyle='#e4edf4'
    ctx.lineWidth=1.5
    ctx.strokeRect(1,1,638,358)
    ctx.strokeRect(584,112,55,137)
    ctx.strokeRect(1,119,27,115)
    ctx.fillStyle='#fff'
    ctx.font='bold 14px system-ui'
    ctx.fillText('Hatch',8,105)
    ctx.fillText('Scrubber',558,100)
    ctx.fillText('Vents',277,30)
    ctx.setLineDash([6,7])
    ctx.lineWidth=1
    ctx.beginPath()
    ctx.ellipse(320,180,244,116,0,0,Math.PI*2)
    ctx.stroke()
    ctx.setLineDash([])
    const mark = (cell:Cell,label:string,stroke:string) => {
      const x=(cell.x+.5)*cellSize,y=(cell.y+.5)*cellSize
      ctx.fillStyle='#071018';ctx.strokeStyle=stroke;ctx.lineWidth=2
      ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle='#fff';ctx.fillText(label,x>525 ? x-104 : x+14,y+5)
    }
    mark(crew,'Crew','#fff')
    if (recommendation) mark(recommendation,'','#ffdf77')
    positions.forEach((position,index)=>mark(position,'S'+(index+1),'#8eedff'))
    for(let i=0;i<240;i++) {
      ctx.fillStyle=fieldColor(i/239)
      ctx.fillRect(16+i,371,1,10)
    }
    ctx.fillStyle='#fff'
    ctx.font='13px system-ui'
    ctx.fillText(detection ? '120 s' : initialPpm+' ppm',16,397)
    ctx.fillText(detection ? '0 s' : upperPpm+' ppm',205,397)
    ctx.fillText(detection ? 'First alert · dark = no alert' : 'Modeled CO₂ · scale clips below '+initialPpm+' ppm',275,382)
  },[canvas,frame,positions,recommendation,detection,upperPpm])
  return <canvas ref={canvas} className="concentration-field" width={640} height={406}
    role="img" aria-label={`Modeled CO₂ field. Breathing zone ${Math.round(valueAt(frame,crew))} ppm. Sensor coordinates are available below.`}
    onPointerDown={event=>{
      if (!onMove) return
      const rect=event.currentTarget.getBoundingClientRect()
      const x=(event.clientX-rect.left)/rect.width*640
      const y=(event.clientY-rect.top)/rect.height*406
      const index=positions.findIndex(cell=>Math.hypot(x-(cell.x+.5)*20,y-(cell.y+.5)*20)<=22)
      if(index>=0){dragging.current=index;event.currentTarget.setPointerCapture(event.pointerId)}
    }}
    onPointerMove={event=>{
      if(dragging.current===null || !onMove)return
      const rect=event.currentTarget.getBoundingClientRect()
      onMove(dragging.current,{
        x:Math.max(0,Math.min(columns-1,Math.floor((event.clientX-rect.left)/rect.width*columns))),
        y:Math.max(0,Math.min(rows-1,Math.floor((event.clientY-rect.top)/rect.height*406/cellSize))),
      })
    }}
    onLostPointerCapture={()=>{dragging.current=null}}
  />
}
