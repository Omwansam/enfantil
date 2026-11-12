/** Digits of a Kenyan mobile number without the country code: '712345678'. */
export function normalizeKenyanPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('254')) return digits.slice(3)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function isValidKenyanMobile(value) {
  return /^(7|1)\d{8}$/.test(normalizeKenyanPhone(value))
}

/** '0712 345 678' */
export function formatLocalPhone(value) {
  const d = normalizeKenyanPhone(value)
  if (d.length !== 9) return value
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

/** '+254 712 345 678' */
export function formatInternationalPhone(value) {
  const d = normalizeKenyanPhone(value)
  if (d.length !== 9) return value
  return `+254 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())
}

export function initials(name) {
  return String(name)
    .replace(/^(Dr|Nurse|Mr|Mrs|Ms)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/** Returns { score 0-3, label, tone } for the password hint under the field. */
export function passwordStrength(password) {
  if (!password) return { score: 0, label: '', tone: 'muted' }
  if (password.length < 8) return { score: 1, label: 'Too short — use at least 8 characters', tone: 'error' }
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (password.length >= 10 && variety >= 3) return { score: 3, label: 'Strong password', tone: 'success' }
  if (variety >= 2) return { score: 2, label: 'Fair password — add a number or symbol to make it stronger', tone: 'muted' }
  return { score: 1, label: 'Weak password — mix letters, numbers and symbols', tone: 'error' }
}

export function validateNewPassword(password) {
  if (!password) return 'Enter a password'
  if (password.length < 8) return 'Use at least 8 characters'
  if (passwordStrength(password).score < 2) return 'Mix letters with numbers or symbols'
  return ''
}

export function possessive(name) {
  return name.endsWith('s') ? `${name}'` : `${name}'s`
}

export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
