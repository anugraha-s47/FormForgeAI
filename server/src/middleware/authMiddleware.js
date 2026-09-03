import jwt from 'jsonwebtoken'
import {User} from '../models/User.js'

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({message: 'Authentication required'})
  }

  const token = header.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me')
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({message: 'User not found'})
    }

    req.user = user
    return next()
  } catch (_error) {
    return res.status(401).json({message: 'Invalid or expired token'})
  }
}