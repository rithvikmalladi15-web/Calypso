import type { Settings } from './engine'

export const columns = 32
export const rows = 18
export const crew = {x:13,y:9}
export const wall = {x:3,y:9}
export const initialPpm = 2641
export const demoThresholdPpm = 3100
export const fieldDuration = 120
export type Cell = {x:number;y:number}
export type FieldResult = {frames:Float32Array[]; firstCrossing: Int16Array; recommendation:Cell|null; milliseconds:number}
export const cellIndex = ({x,y}:Cell) => y*columns+x
export const valueAt = (frame:Float32Array, cell:Cell) => frame[cellIndex(cell)]

// Illustrative transport on a rectangular section, with no flow across the walls:
// ∂C/∂t = −∇·(uC) + D∇²C + S − k(C − Cfloor).
// Upwind advection and centered diffusion use equal and opposite face fluxes.
export function solveField(settings:Settings, seconds=fieldDuration):FieldResult {
  const start = performance.now()
  let field = new Float32Array(columns*rows).fill(initialPpm)
  let next = field.slice()
  const frames = [field.slice()]
  const firstCrossing = new Int16Array(field.length).fill(-1)
  const diffusion = .055
  const velocity = .16*settings.ventilation
  const dt = .5
  // Discrete streamfunction gives zero net face flow per cell and zero wall flux.
  const stream = (x:number,y:number) => velocity*3*Math.sin(Math.PI*x/columns)*Math.sin(Math.PI*y/rows)
  for (let second=1;second<=seconds;second++) {
    for (let substep=0;substep<2;substep++) {
      for (let y=0;y<rows;y++) {
        for (let x=0;x<columns;x++) {
          const index = y*columns+x
          const c = field[index]
          const west = x>0 ? field[index-1] : c
          const east = x<columns-1 ? field[index+1] : c
          const north = y>0 ? field[index-columns] : c
          const south = y<rows-1 ? field[index+columns] : c
          const left = stream(x,y+1)-stream(x,y)
          const right = stream(x+1,y+1)-stream(x+1,y)
          const top = stream(x,y)-stream(x+1,y)
          const bottom = stream(x,y+1)-stream(x+1,y+1)
          const transport = left*(left>=0 ? west : c)-right*(right>=0 ? c : east)
            + top*(top>=0 ? north : c)-bottom*(bottom>=0 ? c : south)
          const source = x===crew.x && y===crew.y ? 210*settings.activity : 0
          const sink = x>=columns-3 ? .022*settings.scrubber*Math.max(0,c-420) : 0
          next[index] = c + dt*(diffusion*(west+east+north+south-4*c)+transport+source-sink)
        }
      }
      ;[field,next] = [next,field]
    }
    frames.push(field.slice())
    for (let i=0;i<field.length;i++) {
      if (firstCrossing[i]<0 && field[i]>=demoThresholdPpm) firstCrossing[i]=second
    }
  }
  let best = -1
  firstCrossing.forEach((time,index)=>{
    // The crew source cell is excluded as a mounting position.
    if (index!==cellIndex(crew) && time>=0 && (best<0 || time<firstCrossing[best])) best=index
  })
  return {frames,firstCrossing,recommendation:best<0 ? null : {x:best%columns,y:Math.floor(best/columns)},milliseconds:performance.now()-start}
}
