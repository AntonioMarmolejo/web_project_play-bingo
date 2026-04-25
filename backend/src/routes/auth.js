import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = Router()

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) return res.status(409).json({ error: 'El email ya está registrado.' })

    const user = await User.create({ name: name.trim(), email, password })
    const token = signToken(user)
    res.status(201).json({ token, user: user.toPublic() })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' })
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas.' })

    const match = await user.comparePassword(password)
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas.' })

    const token = signToken(user)
    res.json({ token, user: user.toPublic() })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
})

// GET /api/auth/me  — valida token y devuelve usuario
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sin token.' })

  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.json({ user: user.toPublic() })
  } catch {
    res.status(401).json({ error: 'Token inválido.' })
  }
})

export default router
