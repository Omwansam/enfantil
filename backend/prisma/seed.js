/**
 * Loads the demo data for both apps into an empty (or existing) database:
 *   npm run db:seed
 * Everything already in the tables is replaced. Set SEED_SHIFT=off to keep
 * the design's dates (week of Mon 9 Nov 2026) instead of moving them to the
 * current week.
 */
import '../src/config/env.js'
import { prisma } from '../src/config/db.js'
import { buildDemoState, shiftToThisWeek } from '../src/services/seed/buildState.js'
import { apply, deriveLinks, diff, flatten, TABLES } from '../src/services/store/mapping.js'

const started = Date.now()
const state = await buildDemoState()
const weeks = process.env.SEED_SHIFT === 'off' ? 0 : shiftToThisWeek(state)
deriveLinks(state)
const ops = diff({}, flatten(state, {}))

await prisma.$transaction(
  async (tx) => {
    await tx.otpCode.deleteMany({})
    for (const tbl of [...TABLES].reverse()) await tx[tbl].deleteMany({})
    await apply(tx, ops)
    await tx.revision.upsert({ where: { id: 1 }, create: { id: 1, value: 1 }, update: { value: { increment: 1 } } })
  },
  { timeout: 180_000, maxWait: 20_000 },
)

const count = (tbl) => ops.find((o) => o.tbl === tbl)?.creates.length ?? 0
console.log(
  `Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s: ${count('patient')} infants, ${count('mother')} mothers, ` +
    `${count('dose')} doses, ${count('appointment')} appointments, ${count('request')} requests, ${count('account')} family accounts.` +
    (weeks ? ` Dates moved ${weeks} week(s) to the current week.` : ''),
)
console.log('Portal: TFH-PAED-0217 or TFH-OBG-0105 / Clinic2026!   Family: 0712 345 678 / Amani2026!, 0723 118 406 / Njeri2026!')
await prisma.$disconnect()
