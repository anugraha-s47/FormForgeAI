import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {User} from '../models/User.js'

const signToken = (userId) =>
  jwt.sign({userId}, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: '7d'
  })

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email
})

export const signup = async (req, res) => {
  const {name, email, password} = req.body

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({message: 'Name, email, and password are required'})
  }

  if (password.trim().length < 6) {
    return res.status(400).json({message: 'Password must be at least 6 characters long'})
  }

  const existingUser = await User.findOne({email: email.trim().toLowerCase()})

  if (existingUser) {
    return res.status(409).json({message: 'An account with this email already exists'})
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10)
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword
  })

  return res.status(201).json({
    user: sanitizeUser(user),
    token: signToken(user._id)
  })
}

export const login = async (req, res) => {
  const {email, password} = req.body

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({message: 'Email and password are required'})
  }

  const user = await User.findOne({email: email.trim().toLowerCase()})

  if (!user) {
    return res.status(401).json({message: 'Invalid email or password'})
  }

  const passwordMatches = await bcrypt.compare(password.trim(), user.password)

  if (!passwordMatches) {
    return res.status(401).json({message: 'Invalid email or password'})
  }

  return res.json({
    user: sanitizeUser(user),
    token: signToken(user._id)
  })
}

export const getCurrentUser = async (req, res) => {
  return res.json({user: sanitizeUser(req.user)})
}