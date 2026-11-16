import { sources } from '../data/sourceRegistry'

export function ResearchPage() {
  return <>
    <div className="page-heading">
      <h1>Evidence and sources</h1>
      <p>Read the original NASA references and see how each one informs CALYPSO.</p>
    </div>
    <ul className="evidence-directory" aria-label="NASA sources">
      {sources.map(source => <li key={source.id}>
        <div>
          <h2><a href={source.url} target="_blank" rel="noreferrer">{source.title} <span aria-hidden="true">↗</span></a></h2>
          <p className="source-reference">{source.section}</p>
        </div>
        <p>{source.detail}</p>
      </li>)}
    </ul>
  </>
}
