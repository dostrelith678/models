import type { ComponentType } from 'react'

import { FlowerClassifier } from './demos/FlowerClassifier'

/**
 * The single source of truth for the showcase.
 *
 * Adding a model means adding one entry here plus its demo component — the
 * home gallery, routing and detail pages all derive from this list.
 */

export interface ModelFact {
  label: string
  value: string
}

export interface ModelEntry {
  /** URL segment, e.g. `/model/flower-classification`. */
  id: string
  name: string
  /** One-line summary shown on the gallery card. */
  tagline: string
  /** Longer description shown on the model page. */
  summary: string
  /** Grouping label, e.g. `Computer vision`. */
  category: string
  /** Free-form keywords rendered as chips. */
  tags: string[]
  /** Key/value facts rendered as a spec list. */
  facts: ModelFact[]
  /** Accent colour used for the card and detail page. */
  accent: string
  /** Where the hosted model lives. */
  sourceUrl?: string
  /** The interactive component rendered on the detail page. */
  Demo: ComponentType
}

export const models: ModelEntry[] = [
  {
    id: 'flower-classification',
    name: 'Flower Classification',
    tagline: 'Identifies 17 flower species from a single photo.',
    summary:
      'A vision classifier built with fastai and trained on flower photographs. Give it a ' +
      'picture and it returns the three species it considers most likely, each with a ' +
      'confidence score.',
    category: 'Computer vision',
    tags: ['Image classification', '17 classes', 'fastai', 'Vision'],
    facts: [
      { label: 'Task', value: 'Single-label image classification' },
      { label: 'Classes', value: '17 flower species' },
      { label: 'Input', value: 'One image (JPG, PNG, WebP)' },
      { label: 'Output', value: 'Top-3 predictions with confidences' },
      { label: 'Framework', value: 'fastai vision learner' },
      { label: 'Serving', value: 'Hugging Face Space · Gradio API · ZeroGPU' },
    ],
    accent: '#f472b6',
    sourceUrl: 'https://huggingface.co/spaces/dostrelith/flower-classification-17-categories',
    Demo: FlowerClassifier,
  },
]

export function getModel(id: string | undefined): ModelEntry | undefined {
  return models.find((model) => model.id === id)
}
