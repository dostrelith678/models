import { useCallback, useEffect, useRef, useState } from 'react'

import { createGradioClassifier } from '../lib/gradioClient'
import { createPreviewUrl, prepareImage } from '../lib/image'
import type { ClassifyResult } from '../lib/types'

const SPACE_URL = 'https://dostrelith-flower-classification-17-categories.hf.space'

const classifier = createGradioClassifier({
  baseUrl: SPACE_URL,
  endpoint: '/classify_flower',
  imageKey: 'img',
})

type Status = 'idle' | 'loading' | 'done' | 'error'

/** `crocus` / `tiger_lily` -> `Crocus` / `Tiger Lily` */
function prettifyLabel(label: string): string {
  return label
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatPercent(value: number): string {
  const percent = value * 100
  if (percent > 0 && percent < 0.1) return '<0.1%'
  return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function FlowerClassifier() {
  const [status, setStatus] = useState<Status>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSlow, setIsSlow] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  /** Guards against a stale response overwriting a newer request. */
  const requestId = useRef(0)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  // Cold Space instances can take a while; say so instead of looking frozen.
  useEffect(() => {
    if (status !== 'loading') {
      setIsSlow(false)
      return
    }
    const timer = setTimeout(() => setIsSlow(true), 6000)
    return () => clearTimeout(timer)
  }, [status])

  const runPrediction = useCallback(async (file: File) => {
    const id = ++requestId.current

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const prepared = await prepareImage(file)
      const prediction = await classifier.classify(prepared)
      if (requestId.current !== id) return
      setResult(prediction)
      setStatus('done')
    } catch (caught) {
      if (requestId.current !== id) return
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
      setStatus('error')
    }
  }, [])

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      setPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return createPreviewUrl(file)
      })
      void runPrediction(file)
    },
    [runPrediction],
  )

  const reset = useCallback(() => {
    requestId.current += 1
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
    setStatus('idle')
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const hasImage = preview !== null

  const dropzoneClasses = ['dropzone']
  if (isDragging) dropzoneClasses.push('dropzone--active')
  if (hasImage) dropzoneClasses.push('dropzone--compact')

  return (
    <section className="demo" aria-label="Flower classification demo">
      <div className="demo__head">
        <h2 className="demo__title">Try it</h2>
        <span className="demo__note">
          Runs on a Hugging Face Space — your image is resized in the browser, then uploaded for
          inference
        </span>
      </div>

      <label
        className={dropzoneClasses.join(' ')}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) {
            acceptFile(file)
            return
          }
          // Dropped a link rather than a file.
          const url = event.dataTransfer.getData('text/uri-list')
          if (url) setError('Drop an image file from your computer, not a link.')
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="dropzone__input"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        <span className="dropzone__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              d="M12 16V4m0 0L8 8m4-4 4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="dropzone__label">
          {hasImage ? 'Choose a different photo' : 'Drop a flower photo, or click to browse'}
        </span>
        <span className="dropzone__hint">JPG, PNG or WebP</span>
      </label>

      {hasImage && (
        <div className="demo__stage">
          <figure className="preview">
            <img src={preview} alt="The image you selected" />
          </figure>

          <div className="results">
            {status === 'loading' && (
              <div className="results__state">
                <Spinner />
                <p className="results__state-title">Analyzing your image…</p>
                {isSlow && (
                  <p className="results__state-note">
                    The model may be waking up from sleep, which can take a moment.
                  </p>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="alert" role="alert">
                <p className="alert__title">Could not classify that image</p>
                <p className="alert__body">{error}</p>
                <button type="button" className="button" onClick={reset}>
                  Try another image
                </button>
              </div>
            )}

            {status === 'done' && result && (
              <>
                <div className="verdict">
                  <span className="verdict__eyebrow">Most likely</span>
                  <span className="verdict__label">{prettifyLabel(result.top)}</span>
                  {result.confidences[0] && (
                    <span className="verdict__confidence">
                      {formatPercent(result.confidences[0].confidence)} confidence
                    </span>
                  )}
                </div>

                <ul className="bars">
                  {result.confidences.slice(0, 5).map((prediction, index) => (
                    <li className="bar" key={prediction.label}>
                      <span className="bar__label">{prettifyLabel(prediction.label)}</span>
                      <span className="bar__value">{formatPercent(prediction.confidence)}</span>
                      <span className="bar__track">
                        <span
                          className="bar__fill"
                          style={{
                            width: `${Math.max(prediction.confidence * 100, 1)}%`,
                            animationDelay: `${index * 70}ms`,
                          }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
