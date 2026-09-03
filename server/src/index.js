import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import {connectDb, isDbReady} from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import formRoutes from './routes/formRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const host = process.env.HOST || '127.0.0.1'
const configuredClientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

const allowedOrigins = new Set([configuredClientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'])

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    }
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: isDbReady() ? 'connected' : 'disconnected'
  })
})

app.use('/api/auth', authRoutes)

app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next()
  }

  if (req.path.startsWith('/auth/')) {
    return next()
  }

  if (!isDbReady()) {
    return res.status(503).json({
      message: 'Database is not connected. Check server/.env and MongoDB Atlas network access settings.'
    })
  }

  return next()
})

app.use('/api', formRoutes)

const server = app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Server startup failed: port ${port} is already in use.`)
    return
  }

  if (error.code === 'EPERM') {
    console.error(`Server startup failed: permission denied while binding to ${host}:${port}.`)
    return
  }

  console.error('Server startup failed:', error.message)
})

connectDb().catch((error) => {
  console.error('Database connection failed:', error.message)
  console.error('The API will stay up, but form routes will return 503 until MongoDB connects successfully.')
})