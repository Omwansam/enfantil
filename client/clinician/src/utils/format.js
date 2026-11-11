/** Digits of a Kenyan mobile number without the leading 0 or country code: '712345678'. */
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

/** 'tel:+254712345678' */
export function telHref(value) {
  return `tel:+254${normalizeKenyanPhone(value)}`
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

export function possessive(name) {
  return name.endsWith('s') ? `${name}'` : `${name}'s`
}

export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function pluralize(n, word, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`
}

/** Lower-cased text with punctuation and extra spaces removed, for search. */
export function searchable(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Builds a CSV file and starts the download. */
export function downloadCsv(filename, rows) {
  const escape = (cell) => {
    const text = String(cell ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
