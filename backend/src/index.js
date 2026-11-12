/**
 * Enfantil API — one backend for the family app (/api/family) and the
 * clinician portal (/api/clinic), sharing one PostgreSQL database.
 */
import config from './config/env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB, disconnectDB, prisma } from './config/db.js'
import errorHandler from './middleware/error.middleware.js'
import { globalLimiter } from './middleware/rate-limit.middleware.js'
import clinicRoutes from './routes/clinic.routes.js'
import familyRoutes from './routes/family.routes.js'
import { read } from './services/store/state.js'

const app = express()
app.disable('x-powered-by')
if (config.TRUST_PROXY) app.set('trust proxy', Number(config.TRUST_PROXY) || config.TRUST_PROXY)

// Only the two frontends may call the API from a browser. Tokens travel in the
// Authorization header, so no cookies (and no credentials mode) are needed.
app.use(
  cors({
    origin: (origin, done) => done(null, !origin || config.CORS_ORIGINS.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
)
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }))
app.use(globalLimiter)
app.use(express.json({ limit: '200kb' }))

if (config.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const started = Date.now()
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`))
    next()
  })
}

app.get('/', (_req, res) => res.json({ name: 'Enfantil API', family: '/api/family', clinic: '/api/clinic', health: '/api/health' }))
// Liveness and database check.
app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok', uptime: Math.round(process.uptime()) })
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' })
  }
})

app.use('/api/clinic', clinicRoutes)
app.use('/api/family', familyRoutes)
app.use((req, res) => res.status(404).json({ message: `No API route for ${req.method} ${req.path}.` }))
app.use(errorHandler)

async function start() {
  await connectDB()
  await read() // load the data now, so the first request is fast and a missing seed shows up at once
  const server = app.listen(config.PORT, () => {
    console.log(`Enfantil API on http://localhost:${config.PORT}  (family: /api/family, portal: /api/clinic)`)
  })
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`)
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch(async (err) => {
  console.error(err.message)
  await disconnectDB().catch(() => {})
  process.exit(1)
})

export default app
