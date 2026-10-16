import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getModel } from '../registry'
import { NotFound } from './NotFound'

export function ModelPage() {
  const { id } = useParams()
  const model = getModel(id)

  if (!model) return <NotFound />

  const { Demo } = model

  return (
    <article
      className="model-page"
      style={{ '--card-accent': model.accent } as CSSProperties}
    >
      <Link to="/" className="backlink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All models
      </Link>

      <header className="model-header">
        <span className="eyebrow">{model.category}</span>
        <h1 className="model-header__title">{model.name}</h1>
        <p className="model-header__summary">{model.summary}</p>
        <ul className="model-header__tags">
          {model.tags.map((tag) => (
            <li key={tag} className="chip">
              {tag}
            </li>
          ))}
        </ul>
      </header>

      <Demo />

      <section className="spec" aria-labelledby="spec-heading">
        <h2 id="spec-heading" className="section-heading">
          Model details
        </h2>
        <dl className="spec__list">
          {model.facts.map((fact) => (
            <div className="spec__row" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        {model.sourceUrl && (
          <a className="spec__link" href={model.sourceUrl} target="_blank" rel="noreferrer">
            View the hosted model
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path
                d="M7 17 17 7m0 0h-8m8 0v8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}
      </section>
    </article>
  )
}
