import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'

import { Home } from './pages/Home'
import { ModelPage } from './pages/ModelPage'
import { NotFound } from './pages/NotFound'

/**
 * A hash router keeps deep links working on GitHub Pages without any server
 * rewrite rules — every route resolves to `index.html` by construction.
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="shell">
        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__text">Model Showcase</span>
          </Link>
          <a
            className="site-header__link"
            href="https://github.com/dostrelith678/models"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </header>

        <main className="site-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/model/:id" element={<ModelPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <p>
            Trained, deployed and demonstrated by hand — models served from Hugging Face and
            rendered as a static site on GitHub Pages.
          </p>
        </footer>
      </div>
    </HashRouter>
  )
}
