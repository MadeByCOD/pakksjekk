const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.72

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kunne ikke behandle bildet')
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kunne ikke komprimere bildet'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

const objectUrlCache = new WeakMap<Blob, string>()

export function blobToObjectUrl(blob: Blob): string {
  const cached = objectUrlCache.get(blob)
  if (cached) return cached
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(blob, url)
  return url
}
