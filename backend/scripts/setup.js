/**
 * One-time setup for the API, in any terminal (PowerShell, cmd, Terminal, bash):
 *   npm run setup
 *
 * 1. Creates backend/.env from .env.example (with a new random JWT_SECRET) if it is missing.
 * 2. Stops and asks you to set DATABASE_URL if it still has the placeholder.
 * 3. Generates the Prisma client, creates the database tables and loads the demo data.
 *
 * Safe to run again: it never overwrites your .env, and re-running reloads the demo data.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(backend, '.env')
const examplePath = path.join(backend, '.env.example')
const secret = () => randomBytes(32).toString('hex')

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(examplePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret()}`))
  console.log('Created backend/.env (with a new JWT_SECRET).')
}

let env = readFileSync(envPath, 'utf8')
if (!/^JWT_SECRET=\S{32,}/m.test(env)) {
  env = /^JWT_SECRET=.*$/m.test(env) ? env.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret()}`) : `${env.trimEnd()}\nJWT_SECRET=${secret()}\n`
  writeFileSync(envPath, env)
  console.log('Added a JWT_SECRET to backend/.env.')
}

const url = /^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(env)?.[1]?.trim()
if (!url || url.includes('USER:PASSWORD')) {
  console.log(`
One more step: tell the API where PostgreSQL is.

  1. Open backend/.env in a text editor (Windows: notepad backend\\.env).
  2. Change the DATABASE_URL line, for example:
       DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/enfantil"
     (The "enfantil" database is created for you if it does not exist.)
  3. Save the file and run the setup command again.
`)
  process.exit(1)
}

function run(label, args) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync('npx', args, { cwd: backend, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(`\n✖ "${label}" failed. Read the message above; "Troubleshooting" in the main README.md covers the usual causes.`)
    process.exit(result.status ?? 1)
  }
}

run('Generating the Prisma client', ['prisma', 'generate'])
run('Creating the database tables', ['prisma', 'migrate', 'deploy'])
run('Loading the demo data', ['prisma', 'db', 'seed'])

console.log(`
✔ The API is set up. Start it with:  npm run dev
  (or, from the project folder, start everything with:  npm run dev)
`)
