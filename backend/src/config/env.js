import 'dotenv/config'

// The hospital's local time. Dates and times are stored and compared as
// Africa/Nairobi wall-clock time, so the process must run in that zone.
process.env.TZ = process.env.TZ || 'Africa/Nairobi'

const list = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const config = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  STAFF_TOKEN_TTL: process.env.STAFF_TOKEN_TTL || '8h',
  FAMILY_TOKEN_TTL: process.env.FAMILY_TOKEN_TTL || '30d',
  CORS_ORIGINS: list(process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174'),
  /** Proxy hops in front of Express (1 = one reverse proxy). Needed for correct client IPs in rate limits. */
  TRUST_PROXY: process.env.TRUST_PROXY,
  /** No SMS provider yet: accept any 6-digit code except 000000. Must be false in production. */
  OTP_DEMO: process.env.OTP_DEMO === 'true',
}

if (!config.DATABASE_URL) throw new Error('DATABASE_URL is not set. Add it to backend/.env.')
if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is missing or shorter than 32 characters. Add a long random value to backend/.env.')
}
if (config.NODE_ENV === 'production' && config.OTP_DEMO) {
  throw new Error('OTP_DEMO must be false in production: connect an SMS provider in src/services/sms.js first.')
}

export default config
