import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import connectDB from './configs/db.js';
import userRouter from './routes/userRoute.js';
import chatRouter from './routes/chatRoute.js';
import messageRouter from './routes/messageRoute.js';
import creditRouter from './routes/creditRoute.js';
import { stripeWebhooks } from './controllers/webhooks.js';

// ─── Environment Variable Validation ──────────────────────────────────────────
// Runs before anything else. If a required variable is missing on Vercel (or
// locally), the server refuses to start with a clear, actionable error message
// instead of silently starting and failing on every request with cryptic errors.
const REQUIRED_ENV_VARS = [
    'JWT_SECRET',
    'MONGODB_URI',
    'GEMINI_API_KEY',
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'IMAGEKIT_URL_ENDPOINT',
];

const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter(
        key => !process.env[key] || process.env[key].trim() === ''
    );

    if (missing.length > 0) {
        console.error('\n❌ [Startup] Missing required environment variables:');
        missing.forEach(key => console.error(`   • ${key}`));
        console.error('\n   Set these in your .env file (local) or Vercel dashboard (production).\n');
        process.exit(1); // hard stop — do not serve any requests with broken config
    }

    console.log('[Startup] ✅ All environment variables present.');
};

validateEnv();

const app = express();

// Connect to DB (cached — safe for Vercel serverless)
await connectDB();

// ─── Stripe Webhook (MUST be before express.json()) ──────────────────────────
// Stripe requires the raw body to validate the webhook signature.
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Explicitly allow the Authorization header and the frontend origin.
// Without this the browser's pre-flight OPTIONS request is blocked and the
// Authorization header never reaches the backend.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173'];   // Vite default dev port

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server calls (no origin) and whitelisted origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Quick GPT server is live!' });
});

app.use('/api/user',    userRouter);
app.use('/api/chat',    chatRouter);
app.use('/api/message', messageRouter);
app.use('/api/credit',  creditRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route '${req.originalUrl}' not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown in route handlers / middleware.
// Without this, Express 5 will crash the serverless function on unhandled errors.
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack || err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

const PORT = process.env.PORT || 8080;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`[Server] Listening on port ${PORT}`);
    });
}

export default app;