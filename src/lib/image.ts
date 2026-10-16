/**
 * Client-side image preparation.
 *
 * Phone cameras produce 4MB+ photos. Uploading those straight to a Space is
 * slow and needlessly private-data-heavy, so images are decoded, scaled down
 * and re-encoded in the browser before they ever leave the device.
 */

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.9
/** Files already smaller than this are passed through untouched. */
const PASSTHROUGH_BYTES = 1_000_000

function renameToJpeg(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image'
  return `${base}.jpg`
}

/**
 * Returns an upload-ready `File` no larger than `maxEdge` on its longest side.
 *
 * Falls back to the original file whenever decoding is unavailable (for
 * example SVG in some browsers) so that resize support never becomes a hard
 * requirement for classifying an image.
 */
export async function prepareImage(file: File, maxEdge = MAX_EDGE): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Please choose a photo of a flower.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= PASSTHROUGH_BYTES) return file

    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) return file

    return new File([blob], renameToJpeg(file.name), { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

/** Object URLs created for previews must be released explicitly. */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}
