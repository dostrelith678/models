import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { models } from '../registry'

function ModelCard({ index }: { index: number }) {
  const model = models[index]
  if (!model) return null

  return (
    <Link
      to={`/model/${model.id}`}
      className="card"
      style={{ '--card-accent': model.accent } as CSSProperties}
    >
      <span className="card__accent" aria-hidden="true" />
      <div className="card__body">
        <span className="card__category">{model.category}</span>
        <h2 className="card__title">{model.name}</h2>
        <p className="card__tagline">{model.tagline}</p>
        <ul className="card__tags">
          {model.tags.slice(0, 3).map((tag) => (
            <li key={tag} className="chip">
              {tag}
            </li>
          ))}
        </ul>
      </div>
      <span className="card__cta">
        Open demo
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}

export function Home() {
  return (
    <div className="home">
      <section className="hero">
        <span className="eyebrow">Portfolio</span>
        <h1 className="hero__title">Models I&rsquo;ve trained, running live</h1>
        <p className="hero__lede">
          Each model below is deployed and callable straight from this page. Pick one to read what
          it does and try it with your own input.
        </p>
      </section>

      <section aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className="section-heading">
          {models.length === 1 ? '1 model' : `${models.length} models`}
        </h2>
        <div className="model-grid">
          {models.map((model, index) => (
            <ModelCard key={model.id} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
