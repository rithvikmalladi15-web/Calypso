import { useState, type FormEvent } from 'react'

const groups = [
  {name:'Energy and hydration', nutrients:[['Energy','kcal'],['Water','mL'],['Protein','g'],['Carbohydrate','g'],['Fat','g'],['Fiber','g']]},
  {name:'Essential amino acids', nutrients:[['Histidine','mg'],['Isoleucine','mg'],['Leucine','mg'],['Lysine','mg'],['Methionine','mg'],['Phenylalanine','mg'],['Threonine','mg'],['Tryptophan','mg'],['Valine','mg']]},
  {name:'Minerals', nutrients:[['Calcium','mg'],['Iron','mg'],['Magnesium','mg'],['Phosphorus','mg'],['Potassium','mg'],['Sodium','mg'],['Zinc','mg'],['Copper','mg'],['Manganese','mg'],['Iodine','µg'],['Selenium','µg']]},
  {name:'Vitamins', nutrients:[['Vitamin A','µg RAE'],['Vitamin C','mg'],['Vitamin D','µg'],['Vitamin E','mg'],['Vitamin K','µg'],['Thiamin (B1)','mg'],['Riboflavin (B2)','mg'],['Niacin (B3)','mg NE'],['Pantothenic acid (B5)','mg'],['Vitamin B6','mg'],['Biotin (B7)','µg'],['Folate (B9)','µg DFE'],['Vitamin B12','µg']]},
]
type Entry = {id:string; day:number; food:string; source:string; servings:number; amounts:Record<string,number>}
const storageKey = 'calypso.nutrition.v1'

function loadEntries():Entry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function NutritionPage() {
  const [entries,setEntries] = useState(loadEntries)
  const [day,setDay] = useState(1)
  const [notice,setNotice] = useState('')
  const meals = entries.filter(entry=>entry.day===day)
  function save(next:Entry[]) {
    setEntries(next)
    try {
      localStorage.setItem(storageKey,JSON.stringify(next))
      setNotice('')
    } catch {
      setNotice('Browser storage is unavailable. Entries are visible until you reload.')
    }
  }
  function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const food = String(values.get('food')??'').trim()
    const amounts:Entry['amounts'] = {}
    for (const {nutrients} of groups) for (const [name] of nutrients) {
      const value = String(values.get(name)??'').trim()
      if (value && Number.isFinite(Number(value)) && Number(value)>=0) amounts[name] = Number(value)
    }
    if (!food || !Object.keys(amounts).length) {
      setNotice('Enter a food name and at least one nutrient value.')
      return
    }
    save([...entries,{id:crypto.randomUUID(),day,food,source:String(values.get('source')??'').trim(),servings:Number(values.get('servings')),amounts}])
    form.reset()
  }

  return <>
    <header className="page-heading">
      <h1>Crew Nutrition</h1>
      <p>Log a mission day’s food and water. Compare documented intake across energy, amino acids, vitamins, and minerals.</p>
    </header>
    <label className="field">Mission day <input type="number" min="1" max="9999" value={day} onChange={event=>{const value=event.target.valueAsNumber;if(Number.isInteger(value)&&value>=1&&value<=9999)setDay(value)}}/></label>
    {notice && <p role="status">{notice}</p>}
    <div className="crew-workbench">
      <section className="panel section">
        <h2>Add food or drink</h2>
        <p>Enter amounts per serving. Leave unknown amounts blank and enter zero only when the source reports zero.</p>
        <form onSubmit={add}>
          <label className="field">Food or drink <input name="food" required maxLength={120}/></label>
          <label className="field">Servings <input name="servings" type="number" min="0.01" max="1000" step="any" defaultValue="1" required/></label>
          <label className="field">Source or label notes <input name="source" maxLength={250}/></label>
          {groups.map(({name,nutrients},index)=><details className="nutrition-group" key={name} open={index===0 || undefined}>
            <summary>{name}</summary>
            <div className="nutrition-fields">{nutrients.map(([nutrient,unit])=><label className="field" key={nutrient}>{nutrient} ({unit})<input name={nutrient} type="number" min="0" max="1000000" step="any" inputMode="decimal"/></label>)}</div>
          </details>)}
          <button className="primary">Add to mission day</button>
        </form>
      </section>
      <div>
        <section className="panel section">
          <h2>Day {day} food log</h2>
          <p>Entries are saved in this browser. Totals multiply each per-serving amount by the servings logged. A partial total has missing values for one or more entries.</p>
          {meals.length ? <ul>{meals.map(entry=><li key={entry.id}>
            <strong>{entry.food}</strong> · {entry.servings} serving{entry.servings===1?'':'s'}
            {entry.source && <p>Source: {entry.source}</p>}
            <button type="button" aria-label={`Remove ${entry.food}`} onClick={()=>save(entries.filter(item=>item.id!==entry.id))}>Remove</button>
          </li>)}</ul> : <p>No food or drink logged for this day.</p>}
        </section>
        <section className="panel section">
          <h2>Daily nutrient totals</h2>
          {groups.map(({name,nutrients},index)=><details className="nutrition-group" key={name} open={index===0 || undefined}>
            <summary>{name}</summary>
            <dl className="nutrition-totals">{nutrients.map(([nutrient,unit])=>{
              const known = meals.filter(entry=>Object.hasOwn(entry.amounts,nutrient))
              const total = known.reduce((sum,entry)=>sum+entry.amounts[nutrient]*entry.servings,0)
              return <div key={nutrient}><dt>{nutrient}</dt><dd>{known.length?total.toLocaleString(undefined,{maximumFractionDigits:3})+' '+unit:'—'}{known.length>0&&known.length<meals.length&&<small>Partial · {known.length}/{meals.length} entries</small>}</dd></div>
            })}</dl>
          </details>)}
        </section>
      </div>
    </div>
  </>
}
