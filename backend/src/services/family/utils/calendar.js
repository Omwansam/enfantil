import { addDays, toDate } from './dates'

const stamp = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(
    d.getHours(),
  ).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`

const escape = (text) => String(text ?? '').replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/** Builds and downloads an .ics file for an appointment (works with Google, Apple and Outlook calendars). */
export function downloadAppointmentIcs(appointment) {
  const start = toDate(appointment.start)
  const end = new Date(start.getTime() + 45 * 60_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Enfantil//Family web//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.ref}@enfantil`,
    `DTSTAMP:${stamp(addDays(start, -1))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`${appointment.title} · ${appointment.child.firstName}`)}`,
    `LOCATION:${escape([appointment.facility.name, appointment.location].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${escape(
      [`With ${appointment.clinician.name}`, appointment.note && `Note from your clinic: ${appointment.note}`, `Ref ${appointment.ref}`]
        .filter(Boolean)
        .join('\n'),
    )}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(appointment.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${appointment.ref}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
