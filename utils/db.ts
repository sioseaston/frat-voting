import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not configured.')
}

interface CachedConnection {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: CachedConnection }

const cache = globalForMongoose.mongooseCache ?? { conn: null, promise: null }
globalForMongoose.mongooseCache = cache

export async function connectDb() {
  if (cache.conn) return cache.conn
  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

  cache.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: 'fraternity-voting',
  })

  cache.conn = await cache.promise
  return cache.conn
}
