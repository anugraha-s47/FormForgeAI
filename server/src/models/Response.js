import mongoose from 'mongoose'

// answerSchema (_id: false) → questionId (String, required), value (Mixed, required)
const answerSchema = new mongoose.Schema(
  {
    questionId: {type: String, required: true},
    value: {type: mongoose.Schema.Types.Mixed, required: true}
  },
  {_id: false}
)

// responseSchema (timestamps: true) →
//   form (ObjectId, ref: 'Form', required),
//   answers ([answerSchema], default: []),
//   submittedAt (Date, default: Date.now)
const responseSchema = new mongoose.Schema(
  {
    form: {type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true},
    answers: {type: [answerSchema], default: []},
    submittedAt: {type: Date, default: Date.now}
  },
  {timestamps: true}
)

export const Response = mongoose.model('Response', responseSchema)