import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import Carton from '../models/Carton.js'
import { runOCR } from '../services/ocrService.js'
import { isCloudinaryConfigured, uploadFile, deleteFile } from '../config/cloudinary.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '../../../uploads')

const router = Router()

// B=1-15  I=16-30  N=31-45  G=46-60  O=61-75
const BINGO_RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]]
const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O']

function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 5) return 'El grid debe tener 5 filas.'
  for (let row = 0; row < 5; row++) {
    if (!Array.isArray(grid[row]) || grid[row].length !== 5)
      return 'Cada fila debe tener 5 columnas.'
  }
  if (grid[2][2] !== null) return 'La celda central (FREE) debe ser null.'
  for (let col = 0; col < 5; col++) {
    const [lo, hi] = BINGO_RANGES[col]
    const seen = new Set()
    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) continue
      const val = grid[row][col]
      if (val === null) continue
      if (!Number.isInteger(val) || val < lo || val > hi)
        return `Valor ${val} en columna ${BINGO_LETTERS[col]} fuera de rango (${lo}–${hi}).`
      if (seen.has(val))
        return `Número duplicado ${val} en columna ${BINGO_LETTERS[col]}.`
      seen.add(val)
    }
  }
  return null
}

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

// POST /api/cards/ocr  — sube archivo, ejecuta OCR, devuelve grid + confianza
router.post('/ocr', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo no válido. Solo imágenes o PDF.' })
  }

  try {
    const { grid, confidence } = await runOCR(req.file.path, req.file.mimetype)

    let fileUrl = `/uploads/${req.file.filename}`
    let imagePublicId = null

    if (isCloudinaryConfigured()) {
      const uploaded = await uploadFile(req.file.path)
      fileUrl = uploaded.url
      imagePublicId = uploaded.publicId
      await fs.unlink(req.file.path).catch(() => {})
    }

    res.json({
      grid,
      confidence,
      fileUrl,
      imagePublicId,
      sourceType: req.file.mimetype === 'application/pdf' ? 'pdf' : 'photo',
    })
  } catch (err) {
    console.error('[cards/ocr]', err)
    res.status(500).json({ error: 'Error al procesar el archivo.' })
  }
})

// POST /api/cards  — guarda un cartón (manual o revisado tras OCR)
router.post('/', requireAuth, async (req, res) => {
  const { grid, sourceType, imageUrl, imagePublicId, name } = req.body

  const gridError = validateGrid(grid)
  if (gridError) return res.status(400).json({ error: gridError })

  try {
    const carton = await Carton.create({
      userId: req.user.id,
      grid,
      sourceType: sourceType ?? 'manual',
      imageUrl: imageUrl ?? null,
      imagePublicId: imagePublicId ?? null,
      name: name ?? 'Mi cartón',
    })
    res.status(201).json({ carton })
  } catch (err) {
    console.error('[cards/save]', err)
    res.status(500).json({ error: 'Error al guardar el cartón.' })
  }
})

// GET /api/cards  — lista cartones del usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const cards = await Carton.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json({ cards })
  } catch (err) {
    console.error('[cards/list]', err)
    res.status(500).json({ error: 'Error al obtener cartones.' })
  }
})

// DELETE /api/cards/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const carton = await Carton.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    })
    if (!carton) return res.status(404).json({ error: 'Cartón no encontrado.' })

    // Borrar imagen: Cloudinary si tiene publicId, disco local si tiene ruta /uploads/
    if (carton.imagePublicId) {
      await deleteFile(carton.imagePublicId)
    } else if (carton.imageUrl?.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(carton.imageUrl))
      await fs.unlink(filePath).catch(() => {})
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar.' })
  }
})

export default router
