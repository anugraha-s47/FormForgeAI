import mongoose from 'mongoose'

let dbReady = false

const buildMongoUriFromParts = () => {
  const hosts = process.env.MONGODB_HOSTS?.trim()

  if (!hosts) {
    return process.env.MONGODB_URI?.trim()
  }

  const username = process.env.MONGODB_USERNAME?.trim()
  const password = process.env.MONGODB_PASSWORD?.trim()
  const database = process.env.MONGODB_DATABASE?.trim() || 'typeform-clone'
  const options =
    process.env.MONGODB_OPTIONS?.trim() || 'authSource=admin&retryWrites=true&w=majority&tls=true'

  const credentials =
    username && password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : ''

  return `mongodb://${credentials}${hosts}/${database}?${options}`
}

const formatMongoError = (error, uri) => {
  const message = error?.message || 'Unknown MongoDB error'

  if (!uri) {
    return 'MongoDB connection is not configured. Set MONGODB_URI or provide MONGODB_HOSTS with the related credentials in server/.env.'
  }

  if (message.includes('_mongodb._tcp') || message.includes('querySrv')) {
    return 'MongoDB SRV lookup failed. Check your Atlas URI, whitelist your IP in Atlas Network Access, or use a standard mongodb:// connection string instead of mongodb+srv://.'
  }

  if (message.includes('bad auth') || message.includes('Authentication failed')) {
    return 'MongoDB authentication failed. Recheck the username/password in MONGODB_URI and URL-encode special characters in the password.'
  }

  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return 'MongoDB host could not be reached. Verify the cluster hostname, internet connection, and Atlas IP access list.'
  }

  return message
}

export const connectDb = async () => {
  const uri = buildMongoUriFromParts()

  if (!uri) {
    dbReady = false
    throw new Error(formatMongoError(new Error(''), uri))
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    })
    dbReady = true
    console.log('MongoDB connected')
    return true
  } catch (error) {
    dbReady = false
    throw new Error(formatMongoError(error, uri))
  }
}

mongoose.connection.on('disconnected', () => {
  dbReady = false
  console.warn('MongoDB disconnected')
})

mongoose.connection.on('connected', () => {
  dbReady = true
})

export const isDbReady = () => dbReady