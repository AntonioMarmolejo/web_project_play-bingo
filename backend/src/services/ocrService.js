/*
 * ocrService.js
 *
 * Implementación actual: mock que genera un cartón válido y marca algunas celdas
 * como "inseguras" para que el usuario las revise — simula el comportamiento real.
 *
 * Para activar Google Vision API real:
 *   1. npm install @google-cloud/vision
 *   2. Descomentar la función realOCR() abajo
 *   3. Asignar GOOGLE_VISION_API_KEY en .env
 *   4. Cambiar el export para llamar a realOCR si la key existe
 */

// Rangos estándar de bingo (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75)
const RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
]

function pickUnique(min, max, count) {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function generateMockCard() {
  const columns = RANGES.map(([min, max]) => pickUnique(min, max, 5))

  // grid[row][col] — posición [2][2] es FREE (null)
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      if (row === 2 && col === 2) return null
      return columns[col][row]
    })
  )

  // Simula confianza OCR: ~15% de celdas con baja confianza
  const confidence = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      if (row === 2 && col === 2) return 1
      return Math.random() < 0.15 ? Math.random() * 0.5 + 0.35 : 0.95 + Math.random() * 0.05
    })
  )

  return { grid, confidence }
}

export async function runOCR(filePath, mimeType) {
  // Simula latencia de API real (800ms – 1.8s)
  const delay = 800 + Math.random() * 1000
  await new Promise((r) => setTimeout(r, delay))

  /* ── Google Vision real (descomentar cuando tengas API key) ────────────────
  if (process.env.GOOGLE_VISION_API_KEY) {
    return await realOCR(filePath, mimeType)
  }
  ─────────────────────────────────────────────────────────────────────────── */

  return generateMockCard()
}

/*
async function realOCR(filePath, mimeType) {
  const { ImageAnnotatorClient } = await import('@google-cloud/vision')
  const client = new ImageAnnotatorClient({ keyFilename: process.env.GOOGLE_VISION_KEY_FILE })
  const [result] = await client.textDetection(filePath)
  const text = result.fullTextAnnotation?.text ?? ''
  // TODO: parsear la tabla 5x5 del texto extraído
  // Por ahora retorna mock si el parsing falla
  return generateMockCard()
}
*/
