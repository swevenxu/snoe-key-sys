import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { testConnection } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import validateRoutes from './routes/validate.js';
import adminRoutes from './routes/admin.js';
import checkpointRoutes from './routes/checkpoint.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Security middleware (disable CSP for static pages)
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
// Body parsing
app.use(express.json());
// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);
// Rate limiting - general
const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: 'Too Many Requests', message: 'Please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting - stricter for validation endpoint
const validateLimiter = rateLimit({
    windowMs: config.validateRateLimit.windowMs,
    max: config.validateRateLimit.max,
    message: { error: 'Too Many Requests', message: 'Too many validation attempts' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply rate limiters
app.use('/api/admin', generalLimiter);
app.use('/api/validate', validateLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API info endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Key System API',
        version: '1.0.0',
        endpoints: {
            validate: 'POST /api/validate',
            resetHwid: 'POST /api/validate/reset-hwid',
            admin: '/api/admin/* (requires X-API-Key header)',
        },
    });
});
// Serve static files (checkpoint page) - check both possible locations
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
// Routes
app.use('/api/validate', validateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkpoint', checkpointRoutes);
// Serve the checkpoint page at /getkey
app.get('/getkey', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});
// Error handling
app.use(notFoundHandler);
app.use(errorHandler);
// Start server
async function start() {
    console.log('🔑 Key System Server Starting...\n');
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('Failed to connect to database. Please check your DATABASE_URL.');
        process.exit(1);
    }
    app.listen(config.port, () => {
        console.log(`\n🚀 Server running on http://localhost:${config.port}`);
        console.log(`📝 Environment: ${config.nodeEnv}`);
        console.log('\nEndpoints:');
        console.log(`  - POST /api/validate          (key validation)`);
        console.log(`  - POST /api/validate/reset-hwid (user HWID reset)`);
        console.log(`  - GET  /api/admin/stats       (admin)`);
        console.log(`  - GET  /api/admin/keys        (admin)`);
        console.log(`  - POST /api/admin/keys        (admin)`);
        console.log(`  - POST /api/admin/keys/batch  (admin)`);
        console.log('\n✨ Ready to accept connections!\n');
    });
}
start().catch(console.error);
//# sourceMappingURL=index.js.map