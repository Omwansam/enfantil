/**
 * Date helpers. The demo's "now" is fixed at Sunday 8 November 2026, 20:30 so
 * that every screen matches the design. Overdue status, days late, ages and
 * "Tomorrow" labels are all calculated against TODAY, never hard-coded.
 */
export const TODAY = new Date(2026, 10, 8, 20, 30)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_MS = 86_400_000

export function now() {
  return new Date(TODAY)
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

/** Whole calendar days from a to b (positive when b is later). */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)
}

export function daysOverdue(dueOn, ref = TODAY) {
  return Math.max(0, daysBetween(dueOn, ref))
}

export function isBeforeToday(value, ref = TODAY) {
  return daysBetween(value, ref) > 0
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
 * medium  → 9 Feb 2026        short     → 9 Feb
 * weekday → Mon 9 Nov         weekdayYear → Mon 9 Nov 2026
 * long    → Sunday, 8 November 2026
 * dayLong → Friday, 6 Nov     monthYear → Feb 2026
 */
export function formatDate(value, style = 'medium') {
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
    case 'dayLong':
      return `${DAYS_LONG[d.getDay()]}, ${day} ${mon}`
    case 'monthYear':
      return `${mon} ${year}`
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

/** Conversation lists: '8:05 PM' today, 'Yesterday', 'Fri' this week, otherwise '2 Nov'. */
export function formatListTime(value, ref = TODAY) {
  const diff = daysBetween(value, ref)
  if (diff <= 0) return formatTime(value, { twelveHour: true })
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return DAYS[toDate(value).getDay()]
  return formatDate(value, toDate(value).getFullYear() === ref.getFullYear() ? 'short' : 'medium')
}

/** Notifications: 'Today, 8:05 PM', 'Yesterday, 4:12 PM', 'Fri 6 Nov', '12 Oct'. */
export function formatFeedTime(value, ref = TODAY) {
  const diff = daysBetween(value, ref)
  const time = formatTime(value, { twelveHour: true })
  if (diff <= 0) return `Today, ${time}`
  if (diff === 1) return `Yesterday, ${time}`
  if (diff < 5) return formatDate(value, 'weekday')
  return formatDate(value, toDate(value).getFullYear() === ref.getFullYear() ? 'short' : 'medium')
}

/** Message thread day separators: 'Today', 'Yesterday' or 'Friday, 6 Nov'. */
export function formatDaySeparator(value, ref = TODAY) {
  const rel = relativeDay(value, ref)
  if (rel === 'Today' || rel === 'Yesterday') return rel
  return formatDate(value, 'dayLong')
}

export function dateTileParts(value) {
  const d = toDate(value)
  return { month: MONTHS[d.getMonth()].toUpperCase(), day: d.getDate(), weekday: DAYS[d.getDay()] }
}

/** Fractional age in months, e.g. 8.97 for 9 Feb → 8 Nov. */
export function ageInMonths(dob, at = TODAY) {
  const b = toDate(dob)
  const a = toDate(at)
  const months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
  const daysInMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()
  return months + (a.getDate() - b.getDate()) / daysInMonth
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Age as caregivers and clinics say it: weeks up to 16 weeks, then months
 * (rounded, so a baby a day short of 9 months is "9 months") until 2 years,
 * then whole years.
 */
export function formatAge(dob, at = TODAY, { short = false } = {}) {
  const days = daysBetween(dob, at)
  if (days < 0) return short ? 'due' : 'Not born yet'
  if (days < 7) return short ? `${days} d` : plural(days, 'day')
  if (days < 112) {
    const w = Math.floor(days / 7)
    return short ? `${w} wk` : plural(w, 'week')
  }
  const months = ageInMonths(dob, at)
  if (months < 24) {
    const m = Math.max(1, Math.round(months))
    return short ? `${m} mo` : plural(m, 'month')
  }
  const y = Math.floor(months / 12)
  return short ? `${y} yr${y === 1 ? '' : 's'}` : plural(y, 'year')
}

/** Same as formatAge, but 'Birth' on the day of birth (growth tables). */
export function formatAgeAt(dob, at) {
  return daysBetween(dob, at) === 0 ? 'Birth' : formatAge(dob, at)
}

/** Monday on or after the given date. */
export function nextMonday(value) {
  const d = startOfDay(value)
  const offset = (8 - d.getDay()) % 7
  return addDays(d, offset)
}
