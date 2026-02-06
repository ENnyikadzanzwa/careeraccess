import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-sessions',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },
  platform: {
    name: process.env.PLATFORM_NAME || 'CareerAccess Zimbabwe',
    url: process.env.PLATFORM_URL || 'http://localhost:3001',
    currency: process.env.CURRENCY || 'USD',
  },
};
