// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { CrewHealthPanel } from '../components/CrewHealthPanel'
import { useSim } from '../stores/simulationStore'
import { initial } from '../simulation/engine'
afterEach(()=>{cleanup();useSim.setState({points:[initial],masked:false,thresholdId:'demo'})})
it('shares current run values and selected reference while withholding masked local output',()=>{
 useSim.setState({points:[{t:36,cabin:600,local:1300}],masked:true,thresholdId:'nasa'})
 render(<CrewHealthPanel/>)
 expect(screen.getByText('36 s')).toBeTruthy()
 expect(screen.getByText('600 ppm')).toBeTruthy()
 expect(screen.getByText('Masked')).toBeTruthy()
 expect(screen.queryByText('1,300 ppm')).toBeNull()
 expect(screen.getByText('NASA cabin reference · 3 mmHg, 1 h average')).toBeTruthy()
 act(()=>useSim.setState({masked:false,points:[{t:37,cabin:599,local:1320}]}))
 expect(screen.getByText('37 s')).toBeTruthy()
 expect(screen.getByText('1,320 ppm')).toBeTruthy()
})
it('lets users explore body systems and research phases without changing the simulation',()=>{
 const before=useSim.getState().points
 render(<CrewHealthPanel/>)
 fireEvent.click(screen.getByRole('button',{name:'Bones'}))
 expect(screen.getByRole('heading',{name:'Bones'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'After landing'}))
 expect(screen.getByText(/The crew readapts to gravity/)).toBeTruthy()
 expect(useSim.getState().points).toBe(before)
})
