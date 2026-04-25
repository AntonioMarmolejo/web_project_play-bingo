import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI

  mongoose.connection.on('connected', () =>
    console.log('[DB] Conectado a MongoDB:', uri)
  )
  mongoose.connection.on('error', (err) =>
    console.error('[DB] Error:', err.message)
  )

  await mongoose.connect(uri)
}
