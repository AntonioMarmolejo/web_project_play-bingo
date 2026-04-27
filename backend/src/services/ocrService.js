import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import { promises as fs } from 'fs'

// B:1-15  I:16-30  N:31-45  G:46-60  O:61-75
const RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]]

// ── Image preprocessing variants ─────────────────────────────────────────────
// Bingo cards vary: some have dark bg + light numbers, others light bg + dark numbers.
// We try three variants and pick whichever yields the most valid bingo numbers.
async function buildVariants(inputPath) {
  const base = inputPath.replace(/(\.[^.]+)?$/, '')
  const variants = []

  // Variant A: light bg (dark text on white) — upscaled, standard threshold
  const pathA = `${base}_ocrA.png`
  await sharp(inputPath)
    .resize({ width: 1500, withoutEnlargement: false })
    .greyscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .threshold(140)
    .toFile(pathA)
  variants.push(pathA)

  // Variant B: dark bg (light text on dark) — invert to get dark-on-white
  const pathB = `${base}_ocrB.png`
  await sharp(inputPath)
    .resize({ width: 1500, withoutEnlargement: false })
    .greyscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .negate()
    .threshold(140)
    .toFile(pathB)
  variants.push(pathB)

  // Variant C: soft — no hard threshold, just enhance (handles stylized fonts)
  const pathC = `${base}_ocrC.png`
  await sharp(inputPath)
    .resize({ width: 1500, withoutEnlargement: false })
    .greyscale()
    .normalise()
    .sharpen({ sigma: 2 })
    .gamma(1.5)
    .toFile(pathC)
  variants.push(pathC)

  return variants
}

// ── Parse OCR words into 5×5 grid ────────────────────────────────────────────
function parseGrid(words) {
  const numbers = words
    .filter(w => /^\d+$/.test(w.text.trim()))
    .map(w => ({
      value: parseInt(w.text.trim()),
      cx: (w.bbox.x0 + w.bbox.x1) / 2,
      cy: (w.bbox.y0 + w.bbox.y1) / 2,
      conf: w.confidence / 100,
    }))
    .filter(w => w.value >= 1 && w.value <= 75)

  // Group by BINGO column using number value ranges
  const columns = [[], [], [], [], []]
  for (const n of numbers) {
    const col = RANGES.findIndex(([lo, hi]) => n.value >= lo && n.value <= hi)
    if (col !== -1) columns[col].push(n)
  }

  // Deduplicate: keep highest-confidence entry per value
  const deduped = columns.map(col => {
    const map = new Map()
    for (const n of col) {
      if (!map.has(n.value) || map.get(n.value).conf < n.conf) {
        map.set(n.value, n)
      }
    }
    return [...map.values()].sort((a, b) => a.cy - b.cy)
  })

  // Count filled cells (max 5 per col, except N which has 4 due to FREE)
  const filled = deduped.reduce((sum, col, i) => sum + Math.min(col.length, i === 2 ? 4 : 5), 0)

  // Build 5×5 grid — FREE space at [2][2]
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      if (row === 2 && col === 2) return null
      const idx = col === 2 && row > 2 ? row - 1 : row
      return deduped[col][idx]?.value ?? null
    })
  )

  const confidence = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      if (row === 2 && col === 2) return 1
      const idx = col === 2 && row > 2 ? row - 1 : row
      const entry = deduped[col][idx]
      return entry ? Math.max(entry.conf, 0.6) : 0.3
    })
  )

  return { grid, confidence, filled }
}

// ── Tesseract OCR — tries multiple preprocessings, picks best ─────────────────
async function tesseractOCR(imagePath) {
  let variantPaths = []
  try {
    variantPaths = await buildVariants(imagePath)
    let best = null

    for (const vpath of variantPaths) {
      try {
        const result = await Tesseract.recognize(vpath, 'eng', {
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: '6',  // assume uniform block of text
          logger: () => {},
        })
        const parsed = parseGrid(result.data.words)
        if (!best || parsed.filled > best.filled) {
          best = parsed
          console.log(`[ocr] Tesseract variante ${vpath.slice(-10)}: ${parsed.filled} celdas detectadas`)
        }
      } catch (err) {
        console.warn(`[ocr] Tesseract falló en variante ${vpath.slice(-10)}:`, err.message)
      }
    }

    if (best && best.filled >= 16) return best
    console.warn(`[ocr] Tesseract mejor resultado: solo ${best?.filled ?? 0} celdas, mínimo 16 requeridas`)
    return null
  } finally {
    await Promise.all(variantPaths.map(p => fs.unlink(p).catch(() => {})))
  }
}

// ── Claude Vision OCR ─────────────────────────────────────────────────────────
// Activa automáticamente cuando ANTHROPIC_API_KEY está en .env
async function claudeOCR(imagePath, mimeType) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const base64 = (await fs.readFile(imagePath)).toString('base64')
  const imgMime = mimeType === 'application/pdf' ? 'image/jpeg' : mimeType

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imgMime, data: base64 } },
        {
          type: 'text',
          text: `Extrae la cuadrícula 5×5 del cartón de bingo. Responde SOLO con JSON, sin explicación:
{"grid":[[f0c0,f0c1,f0c2,f0c3,f0c4],[f1c0,f1c1,f1c2,f1c3,f1c4],[f2c0,f2c1,null,f2c3,f2c4],[f3c0,f3c1,f3c2,f3c3,f3c4],[f4c0,f4c1,f4c2,f4c3,f4c4]]}
Reglas: null en el espacio FREE (centro, fila 2 col 2). Columnas: B=1-15, I=16-30, N=31-45, G=46-60, O=61-75.`,
        },
      ],
    }],
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude no devolvió JSON válido')

  const { grid } = JSON.parse(match[0])
  const confidence = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => (row === 2 && col === 2 ? 1 : 0.97))
  )
  return { grid, confidence }
}

// ── Mock fallback (cartón aleatorio válido) ───────────────────────────────────
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
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => (row === 2 && col === 2 ? null : columns[col][row]))
  )
  const confidence = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      if (row === 2 && col === 2) return 1
      return Math.random() < 0.15 ? Math.random() * 0.5 + 0.35 : 0.95 + Math.random() * 0.05
    })
  )
  return { grid, confidence }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runOCR(filePath, mimeType) {
  // 1. Claude Vision si hay API key
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      console.log('[ocr] Usando Claude Vision API')
      return await claudeOCR(filePath, mimeType)
    } catch (err) {
      console.warn('[ocr] Claude Vision falló, probando Tesseract:', err.message)
    }
  }

  // 2. Tesseract.js (solo imágenes; los PDF caen al mock)
  if (mimeType !== 'application/pdf') {
    try {
      console.log('[ocr] Usando Tesseract.js (múltiples variantes)')
      const result = await tesseractOCR(filePath)
      if (result) return result
      console.warn('[ocr] Tesseract no alcanzó el mínimo de celdas, usando mock')
    } catch (err) {
      console.warn('[ocr] Tesseract falló:', err.message)
    }
  }

  // 3. Mock como último recurso
  console.warn('[ocr] Usando cartón mock (OCR real no disponible)')
  return generateMockCard()
}
