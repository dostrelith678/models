# Model Showcase

A static showcase for machine learning models I have trained and deployed. Each model gets a
detail page explaining what it does plus an interactive demo that calls the hosted model directly
from the browser.

**Live site:** https://dostrelith678.github.io/models/

## Models

| Model | Task | Demo |
| --- | --- | --- |
| [Flower Classification](https://huggingface.co/spaces/dostrelith/flower-classification-17-categories) | 17-class flower image classification | Upload a photo, get the top-3 species with confidences |

## How it works

The site is a fully static Vite + React + TypeScript application — no server of its own. Model
inference happens against the hosted Hugging Face Space, called straight from the browser.

```
Browser ──► gradio_api/upload              POST the image, get a server-side path
        ──► gradio_api/call/v2/{endpoint}  queue the job, get an event id
        ──► gradio_api/call/{endpoint}/{id} stream the result back (SSE)
```

### Architecture

```
src/
├── registry.tsx            the model catalogue — one entry per model
├── lib/
│   ├── types.ts            the ImageClassifier interface every demo codes against
│   ├── gradioClient.ts     the only file that knows Gradio exists
│   └── image.ts            browser-side resizing before upload
├── demos/
│   └── FlowerClassifier.tsx
└── pages/                  home gallery, model detail, 404
```

Model backends are hidden behind the `ImageClassifier` interface in `src/lib/types.ts`. A demo
never touches HTTP itself, so a model served by something other than Gradio only needs a new
implementation of that interface — no component changes.

`src/lib/gradioClient.ts` implements the Gradio HTTP protocol directly rather than depending on
`@gradio/client`. The protocol is three small requests, and a hand-written client keeps the bundle
lean, returns properly typed results, and gives full control over timeouts and error messages.

## Adding a model

1. Add an entry to the `models` array in `src/registry.tsx`.
2. If it needs a new backend shape, implement `ImageClassifier` in `src/lib/`.
3. Add the demo component under `src/demos/`.

The home gallery, routing and detail page all derive from the registry, so nothing else changes.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173/models/
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm run typecheck
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/`
to GitHub Pages.

One-time setup: in the repository, go to **Settings → Pages** and set **Source** to
**GitHub Actions**.

The site is a *project* page served from `/models/`, so `base` in `vite.config.ts` must match the
repository name. Routing uses a hash router, which means deep links like
`#/model/flower-classification` work on Pages without any rewrite rules.

## Notes and constraints

- **No secrets.** The app is fully static and public, so it holds no credentials. The Space is
  called anonymously.
- **ZeroGPU quota.** The flower Space runs on ZeroGPU, which grants anonymous visitors a limited
  number of GPU runs. Once exhausted, inference fails until the quota resets. Errors are translated
  into a plain-language message, but if the demo is meant to be used publicly and heavily, running
  the Space on CPU hardware removes the limit entirely — a small vision model infers in well under a
  second on CPU.
- **Privacy.** Selected images are resized in the browser (max 1024px, re-encoded as JPEG) and then
  uploaded to Hugging Face for inference.

## Licence

See [LICENSE](./LICENSE).
