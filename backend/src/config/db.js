import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'
import config from './env.js'

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL })

/** One Prisma client (and connection pool) for the whole process. */
export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
})

export async function connectDB() {
  await prisma.$connect()
}

export async function disconnectDB() {
  await prisma.$disconnect()
}
