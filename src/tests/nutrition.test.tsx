// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { NutritionPage } from '../pages/NutritionPage'

afterEach(()=>{cleanup();localStorage.clear()})
it('scales nutrient values by servings and flags missing data after reloading the log',()=>{
  const page = render(<NutritionPage/>)
  fireEvent.change(screen.getByLabelText('Food or drink'),{target:{value:'Meal'}})
  fireEvent.change(screen.getByLabelText('Servings'),{target:{value:'2'}})
  fireEvent.change(screen.getByLabelText('Protein (g)'),{target:{value:'12'}})
  fireEvent.click(screen.getByRole('button',{name:'Add to mission day'}))
  fireEvent.change(screen.getByLabelText('Food or drink'),{target:{value:'Water'}})
  fireEvent.change(screen.getByLabelText('Water (mL)'),{target:{value:'250'}})
  fireEvent.click(screen.getByRole('button',{name:'Add to mission day'}))
  page.unmount()
  render(<NutritionPage/>)
  expect(screen.getByText('24 g')).toBeTruthy()
  expect(screen.getByText('250 mL')).toBeTruthy()
  expect(screen.getAllByText('Partial · 1/2 entries')).toHaveLength(2)
})
