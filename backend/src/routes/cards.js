import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import Carton from '../models/Carton.js'
import { runOCR } from '../services/ocrService.js'

const router = Router()

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
    res.json({
      grid,
      confidence,
      fileUrl: `/uploads/${req.file.filename}`,
      sourceType: req.file.mimetype === 'application/pdf' ? 'pdf' : 'photo',
    })
  } catch (err) {
    console.error('[cards/ocr]', err)
    res.status(500).json({ error: 'Error al procesar el archivo.' })
  }
})

// POST /api/cards  — guarda un cartón (manual o revisado tras OCR)
router.post('/', requireAuth, async (req, res) => {
  const { grid, sourceType, imageUrl, name } = req.body

  if (!grid || !Array.isArray(grid) || grid.length !== 5) {
    return res.status(400).json({ error: 'Grid inválido. Se esperan 5 filas.' })
  }

  try {
    const carton = await Carton.create({
      userId: req.user.id,
      grid,
      sourceType: sourceType ?? 'manual',
      imageUrl: imageUrl ?? null,
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
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar.' })
  }
})

export default router
