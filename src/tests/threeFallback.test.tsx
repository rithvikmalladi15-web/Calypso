// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CabinView } from '../components/CabinView'
import { cabinSensor } from '../simulation/sensorModel'
import { initial } from '../simulation/engine'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('falls back to the interactive schematic when WebGL is unavailable',async()=>{
 vi.stubGlobal('WebGL2RenderingContext',undefined)
 const move=vi.fn()
 render(<CabinView point={initial} sensors={[cabinSensor]} hidden={false} heat coverage airflow={false} playing={false} ventilation={.65} onMove={move}/>)
 fireEvent.click(screen.getByRole('button',{name:'3D cabin'}))
 await waitFor(()=>expect(screen.getByText(/3D is unavailable on this device/)).toBeTruthy())
 expect(screen.getByRole('button',{name:'2D schematic'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByRole('img',{name:/Two-compartment schematic/})).toBeTruthy()
 expect(move).not.toHaveBeenCalled()
})
