/**
 * Quick check that a running API answers both apps:
 *   npm run dev            (in one terminal)
 *   npm test               (in another; API_URL defaults to http://localhost:5000)
 * Signs in with the demo logins and reads the main screens. It only reads, so
 * it is safe to run against the demo data at any time.
 */
const BASE = (process.env.API_URL ?? 'http://localhost:5000').replace(/\/$/, '')
let failed = 0

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

async function check(label, promise, test = (r) => r.status === 200) {
  try {
    const r = await promise
    const ok = test(r)
    if (!ok) failed += 1
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${r.status})${ok ? '' : ` ${JSON.stringify(r.data)?.slice(0, 160)}`}`)
    return r
  } catch (err) {
    failed += 1
    console.log(`FAIL ${label}: ${err.message}`)
    return { status: 0, data: null }
  }
}

await check('health', call('GET', '/api/health'))

const staff = await check('portal sign-in', call('POST', '/api/clinic/auth/sign-in', { body: { identifier: 'TFH-PAED-0217', password: 'Clinic2026!' } }), (r) => r.status === 200 && r.data?.token)
const s = { token: staff.data?.token }
await check('portal dashboard', call('GET', '/api/clinic/dashboard', s), (r) => r.status === 200 && r.data?.stats?.authorised > 0)
await check('portal patients (mothers)', call('GET', '/api/clinic/patients?group=mothers', s), (r) => r.status === 200 && r.data?.rows?.length > 0)
await check('portal mother profile', call('GET', '/api/clinic/mothers/m-njeri', s))
await check('portal infant profile', call('GET', '/api/clinic/patients/amani', s))
await check('portal requests', call('GET', '/api/clinic/requests', s))
await check('portal wrong password is refused', call('POST', '/api/clinic/auth/sign-in', { body: { identifier: 'TFH-PAED-0217', password: 'wrong' } }), (r) => r.status === 401)

const fam = await check('family sign-in', call('POST', '/api/family/auth/sign-in', { body: { identifier: '0723 118 406', password: 'Njeri2026!' } }), (r) => r.status === 200 && r.data?.token)
const f = { token: fam.data?.token }
await check('family profiles', call('GET', '/api/family/me/profiles', f), (r) => r.status === 200 && r.data?.me?.isMe)
await check('family pregnancy', call('GET', '/api/family/me/pregnancy', f))
await check('family appointments', call('GET', '/api/family/appointments?when=upcoming', f))
await check('family token cannot open the portal', call('GET', '/api/clinic/dashboard', f), (r) => r.status === 403)
await check('family cannot open another family’s child', call('GET', '/api/family/children/amani', f), (r) => r.status === 404)

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
