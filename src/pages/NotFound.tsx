import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow">404</span>
      <h1 className="hero__title">That page doesn&rsquo;t exist</h1>
      <p className="hero__lede">The model you were looking for may have been renamed or removed.</p>
      <Link to="/" className="button button--primary">
        Back to all models
      </Link>
    </div>
  )
}
