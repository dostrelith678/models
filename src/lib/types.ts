/**
 * Framework-agnostic contracts shared by every model demo.
 *
 * The UI only ever talks to these interfaces. Whatever transports a model
 * actually uses (Gradio, FastAPI, Replicate, a bespoke server, ...) lives
 * behind an implementation of `ImageClassifier`, so swapping backends never
 * reaches into component code.
 */

/** A single label/score pair returned by a classifier. */
export interface ClassPrediction {
  label: string
  confidence: number
}

/** A normalised classification result, independent of any given API shape. */
export interface ClassifyResult {
  /** The highest-confidence label. */
  top: string
  /** All returned predictions, sorted by descending confidence. */
  confidences: ClassPrediction[]
}

/**
 * A model that accepts an image and returns ranked class predictions.
 *
 * Implementations are responsible for their own transport concerns: uploads,
 * authentication, polling, retries and error shaping.
 */
export interface ImageClassifier {
  classify(file: File): Promise<ClassifyResult>
}

/**
 * Error thrown by a classifier implementation when the remote model rejects a
 * request or fails while producing a result. Carries a message that is safe to
 * display to the user.
 */
export class ClassifierError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ClassifierError'
  }
}
