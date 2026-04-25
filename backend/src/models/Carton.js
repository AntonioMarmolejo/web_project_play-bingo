import mongoose from 'mongoose'

// grid: array 5x5. null en posición [2][2] = FREE
const cartonSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    grid:       { type: [[mongoose.Schema.Types.Mixed]], required: true },
    markedNumbers: { type: [Number], default: [] },
    sourceType: { type: String, enum: ['photo', 'pdf', 'manual'], required: true },
    imageUrl:   { type: String, default: null },
    name:       { type: String, default: 'Mi cartón' },
  },
  { timestamps: true }
)

export default mongoose.model('Carton', cartonSchema)
