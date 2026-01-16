import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/keysystem',
  
  // Admin
  adminApiKey: process.env.ADMIN_API_KEY || 'change-me-in-production',
  
  // Key generation
  keyPrefix: process.env.KEY_PREFIX || 'KEY',
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // Validation rate limit (stricter for key checks)
  validateRateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 validation attempts per minute per IP
  },
  
  // Checkpoint settings
  requiredCheckpoints: parseInt(process.env.REQUIRED_CHECKPOINTS || '1', 10),
  checkpointKeyDuration: parseInt(process.env.CHECKPOINT_KEY_DURATION || '1', 10), // days
};
