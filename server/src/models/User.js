import mongoose from 'mongoose'

// userSchema (timestamps: true) →
//   name (String, required, trim),
//   email (String, required, unique, lowercase, trim),
//   password (String, required)

const userSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    password: {type: String, required: true}
  },
  {timestamps: true}
)

export const User = mongoose.model('User', userSchema)