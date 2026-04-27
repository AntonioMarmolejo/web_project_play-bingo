import mongoose from 'mongoose'

const playerSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  socketId: { type: String, default: null },
  cardId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Carton', default: null },
  hasBingo: { type: Boolean, default: false },
}, { _id: false })

const roomSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true },
  hostId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players:       { type: [playerSchema], default: [] },
  status:        { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  calledNumbers: { type: [Number], default: [] },
  winners:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  endedAt:       { type: Date, default: null },
}, { timestamps: true })

export default mongoose.model('Room', roomSchema)
