export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),

  // Supabase Configuration
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    datasets: {
      projectId: process.env.SUPABASE_DATA_PROJECT_ID,
      url: process.env.SUPABASE_DATA_URL,
      anonKey: process.env.SUPABASE_DATA_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_DATA_SERVICE_ROLE_KEY,
    },
  },

  // JWT Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION ?? '24h',
  },

  seed: {
    admin: {
      email: process.env.DEFAULT_ADMIN_EMAIL,
      password: process.env.DEFAULT_ADMIN_PASSWORD,
      name: process.env.DEFAULT_ADMIN_NAME ?? 'DataPulse Admin',
      role: process.env.DEFAULT_ADMIN_ROLE ?? 'admin',
    },
    experimentalUsers: {
      enabled: false, // Disabled for production - using fixed production users instead
      users: [],
    },
  },

  // File Uploads
  uploads: {
    maxFileSize: parseInt(process.env.FILE_MAX_SIZE ?? '5242880', 10), // 5MB
    previewLimit: parseInt(process.env.FILE_PREVIEW_LIMIT ?? '50', 10),
    storageType: process.env.STORAGE_TYPE ?? 'memory', // memory | s3
  },

  // AWS S3 Configuration (Optional)
  aws: {
    s3: {
      enabled: process.env.AWS_S3_ENABLED === 'true',
      region: process.env.AWS_REGION ?? 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET ?? 'datapulse-files',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },

  // Email Configuration (Optional)
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER ?? 'smtp', // smtp | sendgrid | ses
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM ?? 'noreply@datapulse.com',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM ?? 'noreply@datapulse.com',
    },
  },

  // Redis Configuration (Optional)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL ?? 'info', // debug | info | warn | error
    enableFile: process.env.LOG_FILE_ENABLED === 'true',
    logDir: process.env.LOG_DIR ?? './logs',
  },

  // Security
  security: {
    enableHelmet: process.env.HELMET_ENABLED !== 'false',
    enableCors: process.env.CORS_ENABLED !== 'false',
    corsOrigin: process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:5174'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW ?? '900000', 10), // 15 min
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },

  // Analytics & Monitoring (Optional)
  monitoring: {
    sentryEnabled: process.env.SENTRY_ENABLED === 'true',
    sentryDsn: process.env.SENTRY_DSN,
  },

  // Application Environment
  env: process.env.NODE_ENV ?? 'development',
  isDevelopment: (process.env.NODE_ENV ?? 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
});
