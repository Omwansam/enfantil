/**
 * Date helpers. TODAY is the moment the portal loaded; the API works out
 * overdue status, days late and the KEPI schedule against the server's
 * clock, and the screens use TODAY for week views, "today" labels and date
 * limits. `now()` is the current moment.
 */
export const TODAY = new Date()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_MS = 86_400_000

export function now() {
  return new Date()
}

/** Parses 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' as a local date (no timezone shifts). */
export function toDate(value) {
  if (value instanceof Date) return new Date(value)
  if (typeof value === 'number') return new Date(value)
  const [datePart, timePart = '00:00'] = String(value).split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, h || 0, min || 0)
}

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(value) {
  const d = toDate(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toISODateTime(value) {
  const d = toDate(value)
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const TODAY_ISO = toISODate(TODAY)

export function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const d = toDate(value)
  return !Number.isNaN(d.getTime()) && toISODate(d) === value
}

export function startOfDay(value) {
  const d = toDate(value)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(value, n) {
  const d = toDate(value)
  d.setDate(d.getDate() + n)
  return d
}

export function addMonths(value, n) {
  const d = toDate(value)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

/** Monday of the week that contains the date. */
export function startOfWeek(value) {
  const d = startOfDay(value)
  const offset = (d.getDay() + 6) % 7
  return addDays(d, -offset)
}

export function isWeekend(value) {
  const day = toDate(value).getDay()
  return day === 0 || day === 6
}

/** Whole calendar days from a to b (positive when b is later). */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)
}

export function isSameDay(a, b) {
  return daysBetween(a, b) === 0
}

/** 'Today' | 'Tomorrow' | 'Yesterday' | null */
export function relativeDay(value, ref = TODAY) {
  const diff = daysBetween(ref, value)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return null
}

/**
 * medium  → 9 Feb 2026          short       → 9 Feb
 * weekday → Tue 9 Feb           weekdayYear → Tue 9 Feb 2027
 * long    → Monday, 9 November 2026
 * dayHeading → Monday, 9 November          dayLong → Friday, 6 Nov
 * monthYear → October 2026      auto → 9 Feb (this year) or 9 Feb 2027
 */
export function formatDate(value, style = 'medium', ref = TODAY) {
  if (!value) return ''
  const d = toDate(value)
  const day = d.getDate()
  const mon = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  const wd = DAYS[d.getDay()]
  switch (style) {
    case 'short':
      return `${day} ${mon}`
    case 'weekday':
      return `${wd} ${day} ${mon}`
    case 'weekdayYear':
      return `${wd} ${day} ${mon} ${year}`
    case 'long':
      return `${DAYS_LONG[d.getDay()]}, ${day} ${MONTHS_LONG[d.getMonth()]} ${year}`
    case 'dayHeading':
      return `${DAYS_LONG[d.getDay()]}, ${day} ${MONTHS_LONG[d.getMonth()]}`
    case 'dayLong':
      return `${DAYS_LONG[d.getDay()]}, ${day} ${mon}`
    case 'monthYear':
      return `${MONTHS_LONG[d.getMonth()]} ${year}`
    case 'auto':
      return year === ref.getFullYear() ? `${day} ${mon}` : `${day} ${mon} ${year}`
    case 'medium':
    default:
      return `${day} ${mon} ${year}`
  }
}

/** 24-hour '10:00' by default; '10:00 AM' / '8:05 PM' with { twelveHour: true }. */
export function formatTime(value, { twelveHour = false } = {}) {
  const d = toDate(value)
  const h = d.getHours()
  const m = pad(d.getMinutes())
  if (!twelveHour) return `${pad(h)}:${m}`
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${suffix}`
}

/** 'Today' or '12 Oct' / '2 Jun 2025' — last-visit style. */
export function formatDayOrDate(value, ref = TODAY) {
  if (!value) return '—'
  return isSameDay(value, ref) ? 'Today' : formatDate(value, 'auto', ref)
}

/** 'Today 10:00', 'Tomorrow 09:00', 'Tue 9 Feb 09:30' — appointment slots in tables. */
export function formatSlot(value, ref = TODAY) {
  const rel = relativeDay(value, ref)
  const day = rel === 'Today' || rel === 'Tomorrow' ? rel : formatDate(value, 'weekday')
  return `${day} ${formatTime(value)}`
}

/** Conversation lists: '7:15 AM' in the last 24 hours, then 'Yesterday', 'Fri', '2 Nov'. */
export function formatListTime(value, ref = now()) {
  const hours = (toDate(ref) - toDate(value)) / 3_600_000
  if (hours < 24) return formatTime(value, { twelveHour: true })
  const diff = daysBetween(value, ref)
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return DAYS[toDate(value).getDay()]
  return formatDate(value, 'auto', toDate(ref))
}

/** Message thread day separators: 'Today', 'Yesterday' or 'Friday, 6 Nov'. */
export function formatDaySeparator(value, ref = TODAY) {
  const rel = relativeDay(value, ref)
  if (rel === 'Today') return 'Today'
  return formatDate(value, 'dayLong')
}

/** Fractional age in months, e.g. 8.97. */
export function ageInMonths(dob, at = TODAY) {
  const b = toDate(dob)
  const a = toDate(at)
  const months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
  const daysInMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()
  return months + (a.getDate() - b.getDate()) / daysInMonth
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Age as clinics say it: completed weeks up to 16 weeks, completed months until
 * 2 years (12 months reads as 1 year), then whole years.
 * long → '14 weeks', '9 months', '1 year', '2 years'; short → '14 wks', '9 mo', '1 yr', '2 yrs'.
 */
export function formatAge(dob, at = TODAY, { short = false } = {}) {
  const days = daysBetween(dob, at)
  if (days < 0) return short ? 'unborn' : 'Not born yet'
  if (days < 7) return short ? `${days} d` : plural(days, 'day')
  if (days < 112) {
    const w = Math.floor(days / 7)
    return short ? `${w} wk${w === 1 ? '' : 's'}` : plural(w, 'week')
  }
  const months = ageInMonths(dob, at)
  if (months < 24) {
    const m = Math.max(1, Math.floor(months + 1e-9))
    if (m === 12) return short ? '1 yr' : '1 year'
    return short ? `${m} mo` : plural(m, 'month')
  }
  const y = Math.floor(months / 12)
  return short ? `${y} yr${y === 1 ? '' : 's'}` : plural(y, 'year')
}

/** 'Good morning' / 'Good afternoon' / 'Good evening' for the demo clock. */
export function greeting(at = TODAY) {
  const h = toDate(at).getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Hours (rounded down) between two moments. */
export function hoursBetween(a, b) {
  return Math.floor((toDate(b) - toDate(a)) / 3_600_000)
}
