import mongoose from 'mongoose'
import getConfig from './config'

const isDevelopment = process.env.NODE_ENV === 'development'

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = (global as any).mongoose

if (!cached) {
	cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
	if (cached.conn) {
		return cached.conn
	}

	if (!cached.promise) {
		try {
			const config = getConfig()
			const opts = {
				bufferCommands: false,
				serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
			}

			if (isDevelopment) {
				console.info('Development mode: attempting MongoDB connection')
			}

			cached.promise = mongoose
				.connect(config.MONGODB_URI, opts)
				.then((mongoose) => {
					return mongoose
				})
				.catch((error) => {
					console.error('MongoDB connection error:', error)
					if (isDevelopment) {
						console.info('Development mode: proceeding without database connection')
						cached.conn = mongoose
						return mongoose
					}
					throw error
				})
		} catch (error) {
			console.error('MongoDB connection setup error:', error)
			if (isDevelopment) {
				console.info('Development mode: proceeding without database connection')
				cached.conn = mongoose
				return cached.conn
			}
			throw error
		}
	}

	try {
		cached.conn = await cached.promise
		return cached.conn
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error)
		if (isDevelopment) {
			console.info('Development mode: proceeding without database connection')
			cached.conn = mongoose
			return cached.conn
		}
		throw error
	}
}

export default connectToDatabase
