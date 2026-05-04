import mongoose from 'mongoose';

// Cache the connection promise so Vercel serverless functions
// reuse the existing connection instead of creating a new one
// on every cold start / warm invocation.
let connectionPromise = null;

const connectDB = async () => {
    // Already connected — reuse
    if (mongoose.connection.readyState === 1) {
        return;
    }

    // Connection in progress — wait for it
    if (connectionPromise) {
        return connectionPromise;
    }

    try {
        connectionPromise = mongoose.connect(`${process.env.MONGODB_URI}/apnagpt`, {
            serverSelectionTimeoutMS: 10000, // fail fast instead of hanging
        });

        mongoose.connection.on('connected', () =>
            console.log('[DB] MongoDB connected')
        );
        mongoose.connection.on('error', (err) =>
            console.error('[DB] MongoDB error:', err.message)
        );
        mongoose.connection.on('disconnected', () => {
            console.warn('[DB] MongoDB disconnected — resetting cache');
            connectionPromise = null;
        });

        await connectionPromise;
    } catch (error) {
        connectionPromise = null; // allow retry on next request
        console.error('[DB] Connection failed:', error.message);
        throw error;
    }
};

export default connectDB;