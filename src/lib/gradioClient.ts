/**
 * A minimal Gradio HTTP client.
 *
 * Gradio applications expose a documented three-step HTTP protocol for file
 * inputs:
 *
 *   1. `POST {base}/gradio_api/upload`            -> multipart upload, returns paths
 *   2. `POST {base}/gradio_api/call/v2/{endpoint}` -> returns an `event_id`
 *   3. `GET  {base}/gradio_api/call/{endpoint}/{id}` -> SSE stream, `complete` event
 *                                                       carries the JSON result
 *
 * We implement that directly rather than depending on `@gradio/client`. The
 * protocol is small and stable, and a hand-written client keeps the bundle
 * lean, lets us return properly typed results, and gives us full control over
 * timeouts and user-facing errors. Everything Gradio-specific stays in this
 * file — the rest of the app only sees the `ImageClassifier` interface.
 */

import { ClassifierError } from './types'
import type { ClassPrediction, ClassifyResult, ImageClassifier } from './types'

export interface GradioClassifierOptions {
  /** Origin of the Space, e.g. `https://example.hf.space`. */
  baseUrl: string
  /** Named endpoint to call, e.g. `/classify_flower`. */
  endpoint: string
  /** Name of the image parameter expected by the endpoint. */
  imageKey?: string
  /**
   * How long to wait for a result. Hugging Face Spaces sleep when idle, so a
   * cold start can take noticeably longer than a warm request.
   */
  timeoutMs?: number
}

/** Shape of the `data` payload emitted by our classification endpoint. */
interface RawLabel {
  label?: unknown
  confidences?: unknown
}

/** One decoded server-sent event. */
interface SseEvent {
  event: string
  data: string
}

/**
 * Decodes a raw `text/event-stream` body into discrete events.
 *
 * Implemented by hand rather than with `EventSource` because the endpoint is a
 * single request/response cycle: we want to read the body to completion with
 * `fetch`, apply our own timeout, and treat the final event as the result.
 */
export function parseSse(body: string): SseEvent[] {
  const events: SseEvent[] = []
  let current: { event: string; data: string[] } | null = null

  for (const line of body.split(/\r?\n/)) {
    if (line === '') {
      if (current) {
        events.push({ event: current.event, data: current.data.join('\n') })
        current = null
      }
      continue
    }
    // Lines starting with a colon are comments/keep-alives.
    if (line.startsWith(':')) continue

    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    let value = separator === -1 ? '' : line.slice(separator + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') {
      current ??= { event: 'message', data: [] }
      current.event = value
    } else if (field === 'data') {
      current ??= { event: 'message', data: [] }
      current.data.push(value)
    }
  }

  if (current) events.push({ event: current.event, data: current.data.join('\n') })
  return events
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Turns a remote failure into something a visitor can act on.
 *
 * Spaces fail in a few recognisable ways. The important one is ZeroGPU quota
 * exhaustion: its raw message instructs the reader to authenticate with a
 * Hugging Face token, which a visitor to a public showcase does not have.
 * Surfacing that verbatim would be confusing and unhelpful, so it is rewritten
 * in terms of what the user can actually do.
 */
function describeRemoteError(title: string, detail: string): string {
  const haystack = `${title} ${detail}`.toLowerCase()

  if (
    haystack.includes('zerogpu') ||
    haystack.includes('runs limit') ||
    haystack.includes('quota')
  ) {
    return (
      'This demo has used up its free GPU allowance for now. ' +
      'Please try again a little later.'
    )
  }
  if (haystack.includes('asleep') || haystack.includes('sleeping')) {
    return 'The model is asleep and needs to wake up. Please try again in a moment.'
  }
  if (haystack.includes('queue') || haystack.includes('busy')) {
    return 'The model is busy right now. Please try again in a moment.'
  }

  return detail || title || 'The model ran into a problem processing that image.'
}

function coerceLabel(label: unknown): string {
  if (typeof label === 'string' && label.trim() !== '') return label
  if (typeof label === 'number') return String(label)
  return 'Unknown'
}

/**
 * Turns the model's raw output into the app's normalised result, discarding
 * malformed entries instead of letting them crash the view.
 */
export function normaliseResult(payload: unknown): ClassifyResult {
  const first = Array.isArray(payload) ? (payload[0] as RawLabel | undefined) : (payload as RawLabel)
  const rawConfidences: unknown[] = Array.isArray(first?.confidences) ? first.confidences : []

  const confidences: ClassPrediction[] = rawConfidences
    .filter(isRecord)
    .map((entry) => {
      const confidence = entry['confidence']
      return {
        label: coerceLabel(entry['label']),
        confidence:
          typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : 0,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  const top = coerceLabel(first?.label) !== 'Unknown' ? coerceLabel(first?.label) : confidences[0]?.label

  if (!top) {
    throw new ClassifierError('The model returned a result we could not read.')
  }

  return { top, confidences }
}

/** Uploads one file and returns the server-side path to reference it by. */
async function uploadFile(baseUrl: string, file: File, signal: AbortSignal): Promise<string> {
  const form = new FormData()
  form.append('files', file, file.name)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/gradio_api/upload`, { method: 'POST', body: form, signal })
  } catch (cause) {
    throw new ClassifierError('Could not reach the model to upload your image.', { cause })
  }

  if (!response.ok) {
    throw new ClassifierError(`The upload was rejected (HTTP ${response.status}).`)
  }

  const paths: unknown = await response.json()
  const first = Array.isArray(paths) ? paths[0] : undefined
  if (typeof first !== 'string') {
    throw new ClassifierError('The upload did not return a usable file path.')
  }
  return first
}

/** Queues the prediction job and returns its event id. */
async function startJob(
  baseUrl: string,
  endpoint: string,
  imagePath: string,
  imageKey: string,
  signal: AbortSignal,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/gradio_api/call/v2${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [imageKey]: { path: imagePath, meta: { _type: 'gradio.FileData' } },
      }),
      signal,
    })
  } catch (cause) {
    throw new ClassifierError('Could not reach the model to start the prediction.', { cause })
  }

  if (!response.ok) {
    throw new ClassifierError(`The model rejected the request (HTTP ${response.status}).`)
  }

  const body: unknown = await response.json()
  const eventId = isRecord(body) ? body['event_id'] : undefined
  if (typeof eventId !== 'string') {
    throw new ClassifierError('The model did not return an event id.')
  }
  return eventId
}

/** Reads the SSE stream for a queued job and returns the decoded payload. */
async function readResult(
  baseUrl: string,
  endpoint: string,
  eventId: string,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/gradio_api/call${endpoint}/${eventId}`, { signal })
  } catch (cause) {
    throw new ClassifierError('Lost the connection while waiting for the result.', { cause })
  }

  if (!response.ok) {
    throw new ClassifierError(`Could not fetch the result (HTTP ${response.status}).`)
  }

  const events = parseSse(await response.text())
  const terminal = [...events].reverse().find((e) => e.event === 'complete' || e.event === 'error')

  if (!terminal) {
    throw new ClassifierError('The model finished without returning a result.')
  }
  if (terminal.event === 'error') {
    let title = ''
    let detail = ''
    try {
      const parsed: unknown = JSON.parse(terminal.data)
      if (isRecord(parsed)) {
        if (typeof parsed['title'] === 'string') title = parsed['title']
        if (typeof parsed['error'] === 'string') detail = parsed['error']
      }
    } catch {
      // The error payload was not JSON; fall back to the generic message.
    }
    throw new ClassifierError(describeRemoteError(title, detail))
  }

  try {
    return JSON.parse(terminal.data)
  } catch (cause) {
    throw new ClassifierError('The model returned a result we could not read.', { cause })
  }
}

/**
 * Builds an `ImageClassifier` backed by a Gradio HTTP endpoint.
 *
 * The happy path is upload -> queue -> stream, with every network call bound to
 * a single `AbortController` so the whole operation shares one deadline.
 */
export function createGradioClassifier(options: GradioClassifierOptions): ImageClassifier {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const { endpoint, imageKey = 'img', timeoutMs = 120_000 } = options

  return {
    async classify(file: File): Promise<ClassifyResult> {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const imagePath = await uploadFile(baseUrl, file, controller.signal)
        const eventId = await startJob(baseUrl, endpoint, imagePath, imageKey, controller.signal)
        const payload = await readResult(baseUrl, endpoint, eventId, controller.signal)
        return normaliseResult(payload)
      } catch (error) {
        if (controller.signal.aborted) {
          throw new ClassifierError(
            'The model took too long to respond. It may have been waking up — please try again.',
          )
        }
        if (error instanceof ClassifierError) throw error
        throw new ClassifierError('Something went wrong while contacting the model.', { cause: error })
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
