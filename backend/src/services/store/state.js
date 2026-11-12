/**
 * The data both apps work on, loaded from Postgres into memory.
 *
 * - Reads run against the loaded state (one facility: a few thousand rows).
 * - Writes run on a copy of the state; the changed rows are written to
 *   Postgres in one transaction, and only then does the copy become the state.
 *   Writes are queued one at a time per process.
 * - A Revision row is bumped on every write. Each request checks it (one tiny
 *   query), so a second API process, a seed or a manual change is picked up.
 */
import { prisma } from '../../config/db.js'
import { apply, deriveLinks, diff, flatten, inflate, readAll, rowsToMaps } from './mapping.js'

let state = null
let persisted = null
let revision = null
let loading = null

/** A simple async queue so writes in this process never overlap. */
let queue = Promise.resolve()
function exclusive(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

export class ConflictError extends Error {}

async function currentRevision(db = prisma) {
  const row = await db.revision.findUnique({ where: { id: 1 } })
  return row?.value ?? 0
}

async function load() {
  const [rows, rev] = await Promise.all([readAll(prisma), currentRevision()])
  if (!rows.facility.length) {
    throw new Error('The database has no data yet. Run `npm run db:seed` in backend/ to load the demo data.')
  }
  const next = inflate(rows)
  persisted = flatten(next, rowsToMaps(rows))
  state = next
  revision = rev
}

/** Loads the state on first use, or again when another process changed the data. */
async function fresh() {
  if (loading) return loading
  if (state && (await currentRevision()) === revision) return state
  loading = load().finally(() => {
    loading = null
  })
  await loading
  return state
}

/** The current state for reads. Treat it as read-only. */
export async function read() {
  return fresh()
}

/**
 * Runs `change(draft)` on a copy of the state, writes what changed and
 * returns the function's result. If the function throws, nothing is written.
 */
export function mutate(change) {
  return exclusive(async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await fresh()
      const draft = structuredClone(state)
      const result = await change(draft)
      deriveLinks(draft)
      const next = flatten(draft, persisted)
      const ops = diff(persisted, next)
      if (!ops.length) {
        state = draft
        return result
      }
      try {
        await prisma.$transaction(
          async (tx) => {
            const bumped = await tx.revision.updateMany({ where: { id: 1, value: revision }, data: { value: { increment: 1 } } })
            if (bumped.count !== 1) throw new ConflictError('The data changed in another process.')
            await apply(tx, ops)
          },
          { timeout: 30_000, maxWait: 10_000 },
        )
      } catch (err) {
        if (err instanceof ConflictError && attempt === 0) {
          state = null // reload and run the change again on the newer data
          continue
        }
        throw err
      }
      revision += 1
      state = draft
      persisted = next
      return result
    }
    throw new ConflictError('The data is changing too quickly. Try again.')
  })
}

/** Forces a reload on the next request (used by the seed script and tests). */
export function invalidate() {
  state = null
}
