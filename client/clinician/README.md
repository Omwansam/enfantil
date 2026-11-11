# Enfantil Clinician Portal

The staff web app for Enfantil, a children's health record for Kenyan clinics. It shows clinicians their authorised patients, today's schedule, KEPI immunization records and messages from caregivers. It follows the "Enfantil — UI/UX Design" PDF (clinician portal, frames 10–16 and 24–27).

The caregiver app lives in `frontend/enfantil`. The two apps share the same palette, but the portal frames it in deep teal so staff screens look clearly different.

## Setup

Requires Node 20 or later.

```bash
cd client/clinician
npm install
npm run dev          # http://localhost:5174
```

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Development server on port 5174 (the family app uses 5173) |
| `npm run build`   | Production build in `dist/`                                |
| `npm run preview` | Serves the production build on port 4174                   |
| `npm run lint`    | ESLint                                                     |

Copy `.env.example` to `.env` to change where the "family sign-in" link points (`VITE_FAMILY_APP_URL`, default `http://localhost:5173`).

## Demo login

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| Staff ID or email | `KL4-PAED-0217` or `achieng.otieno@example.co.ke` |
| Password          | `Clinic2026!`                                     |

You are signed in as Dr. Achieng Otieno, Paediatrician, Kiambu Level 4 Hospital (Paediatrics · MCH clinic).

- "Keep me signed in on this clinic computer for 8 hours" keeps the session in `localStorage` with an 8-hour expiry; without it the session ends when the browser closes.
- Signing in with the caregiver demo account (`0712 345 678` / `Amani2026!`) creates a caregiver session, and the portal sends it to the family sign-in.
- "Reset password" always gives the same answer, so staff IDs can't be probed.

## Things to know about the demo

- **Today is fixed** at Monday 9 November 2026, 09:45 (`src/utils/dates.js`), so every screen matches the design. The clock then moves forward in real time, so messages you send and drafts you save get sensible times.
- **Overdue status is calculated, not stored.** Due dates, overdue doses, days late ("Overdue · 92 d"), the "Due this week" tab and the defaulter list all come from each child's date of birth and recorded doses, run through the KEPI rules in `src/utils/kepi.js`.
- **248 authorised patients.** The 15 children named in the design are hand-written in `src/data/mockData.js`. The other 233 are generated from a fixed seed, so they are identical on every load and search, tabs and pagination work on real records. Generated children are up to date with their doses.
- **Changes last until you reload.** Everything you do (recording a dose, booking, rescheduling, cancelling, signing a note, sending messages and reminders, registering a child) changes the in-memory data, and every screen and sidebar count updates. A page reload starts fresh. Your sign-in survives the reload.
- **Coverage figures are report data.** The four stat cards and the dose bars on Coverage come from monthly facility reports (labelled "sample data" on screen, as in the design). The defaulter list below them is live.
- **To see error states,** run `localStorage.setItem('enfantil-clinic:failRate', '0.3')` in the browser console and reload; 30% of API calls will then fail and show the retry state. Remove the key to go back to normal.

### KEPI rules used

- Birth: BCG, OPV 0. At 6, 10 and 14 weeks: OPV, Pentavalent and PCV; Rotavirus at 6 and 10 weeks; IPV at 14 weeks.
- Vitamin A at 6 months, then every 6 months up to 54 months. Measles-Rubella at 9 and 18 months.
- The 10- and 14-week visits are due at that age, or 4 weeks after the previous visit, whichever is later; MR 2 is at least 4 weeks after MR 1. A baby whose 10-week doses were late is therefore due for the 14-week doses 4 weeks later (Sifa Nyambura: 19 days late, as in frame 26).
- "Planned doses" shows the next two doses of each vaccine. Status is Overdue once the due date has passed, Due when the next dose falls this week, and Up to date otherwise.

## Screens and routes

| Route                                    | Screen (PDF frame)                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `/clinic/sign-in`                        | Doctor sign-in (10)                                                                |
| `/clinic`                                | Dashboard (11)                                                                     |
| `/clinic/patients`                       | Patient list (24), with `?q=`, `?tab=` and `?page=` in the URL                     |
| `/clinic/patients/new`                   | Register child and link caregiver (27)                                             |
| `/clinic/patients/:id`                   | Patient profile (12)                                                               |
| `/clinic/patients/:id/immunizations/new` | Record immunization (15)                                                           |
| `/clinic/appointments`                   | Appointment management (13), with `?week=`, `?view=day`, `?clinician=`, `?status=` |
| `/clinic/appointments/new`               | Appointment creation (16), with optional `?patient=` and `?date=`                  |
| `/clinic/messages/:id?`                  | Professional conversations (14)                                                    |
| `/clinic/visits`                         | Opens the first unfinished visit note                                              |
| `/clinic/visits/:id/note`                | Visit note (25)                                                                    |
| `/clinic/coverage`                       | Coverage and defaulter tracing (26)                                                |
| anything else                            | 404 in the portal style                                                            |

`/clinic/*` is protected: signed-out visitors go to `/clinic/sign-in` and return to the page they wanted after signing in.

## Folder structure

```text
src/
  api/            Async data functions (swap these for Express calls)
    client.js       request(): simulated delay, failures, change notifications
    helpers.js      Shapes records for screens (patient rows, appointments…)
    auth.js  patients.js  caregivers.js  appointments.js  immunizations.js
    visitNotes.js  messages.js  coverage.js  reminders.js  dashboard.js
  components/     Reusable UI: Button, Input, Select, Textarea, Checkbox,
                  Switch, SegmentedControl, Tabs, Card, StatCard, Badge,
                  Avatar, Modal, ConfirmDialog, Drawer, DataTable, FilterBar,
                  Pagination, EmptyState, ErrorState, Skeleton, Sidebar,
                  FacilitySwitcher, ChatBubble, Breadcrumb, Banner, BarChart,
                  TimeSlotGrid, SearchInput, SectionCard, ProtectedRoute …
  context/        AuthContext (session, sign-in, sign-out)
  data/           mockData.js: staff, patients, doses, appointments,
                  visit notes, conversations, coverage reports
  hooks/          useAsync, useDataVersion, useNavCounts, useDebouncedValue,
                  useDocumentTitle, useMediaQuery, useElementWidth
  layouts/        ClinicLayout (sidebar + drawer), AuthLayout (split sign-in)
  pages/clinic/   One file per screen
  utils/          dates.js, kepi.js (schedule + status), format.js, storage.js, cx.js
  config.js       Family app URL
  App.jsx         Routes (each page is lazy-loaded)
  main.jsx
tailwind.config.js  Design tokens
```

## Design system

Tokens are in `tailwind.config.js`. Tailwind v4 loads that file through `@config` in `src/index.css`.

- **Font:** Inter 400/500/600/700. Sizes are `display` 32, `h1` 28, `h2` 18, `body` 15, `small` 13 and `caption` 12 (semibold uppercase, for table headers and labels).
- **Colours:**
  - `portal` #0B3B37 for the sidebar and sign-in panel, with `portal-text` #B7D3CF.
  - Teal 700/800/50/100.
  - Coral 500/700/50 and amber 700 on 50.
  - `ink`, `slate-600`, `muted`, `line` and `page`.
- **Status badges:** Upcoming, Completed, Cancelled, Overdue, Given, Planned, Due and Up to date, in the PDF colours.
- **Shape:** 12px radius on inputs and buttons, 16px on cards, pills fully rounded, and the card shadow from the PDF.
- **Monospace:** batch numbers, patient IDs and staff IDs.
- **Accessibility:**
  - A visible teal focus ring (light on the deep-teal sidebar), a skip link, and labels on every field.
  - Modals use native `<dialog>`, so focus is trapped and Escape closes them. Confirmations are `role="alertdialog"`.
  - `role="tab"`, `"switch"` and `"radio"` where the design shows tabs, toggles and choice chips.
  - Click targets are at least 40px.
  - The coverage chart has a screen-reader table underneath it.

## Connecting the Express API

Screens only call functions in `src/api/`. Each one returns a promise of plain JSON, and each documents the endpoint it stands for (for example `GET /api/patients?q=&tab=&page=`). To use a real backend:

1. Add a small fetch helper, for example in `src/api/http.js`:

   ```js
   import { ApiError } from './client'

   const BASE = import.meta.env.VITE_API_URL ?? '/api'

   export async function http(path, { method = 'GET', body } = {}) {
     const res = await fetch(`${BASE}${path}`, {
       method,
       credentials: 'include',
       headers: body ? { 'Content-Type': 'application/json' } : undefined,
       body: body ? JSON.stringify(body) : undefined,
     })
     const data = res.status === 204 ? null : await res.json().catch(() => null)
     if (!res.ok) {
       const err = new ApiError(data?.message ?? 'Something went wrong. Try again.', { status: res.status })
       err.fields = data?.fields // { batch: 'Enter the batch number printed on the vial.' }
       throw err
     }
     return data
   }
   ```

2. Replace each function body with an `http()` call, keeping its name and arguments:

   ```js
   // before
   export function listPatients({ q = '', tab = 'all', page = 1 } = {}) {
     return request((db) => {
       /* … */
     })
   }
   // after
   export function listPatients({ q = '', tab = 'all', page = 1 } = {}) {
     return http(`/patients?${new URLSearchParams({ q, tab, page })}`)
   }
   ```

3. After a write (recording a dose, sending a message and so on), call `emitChange()` from `client.js`, or replace `useDataVersion` with your own cache invalidation, so that lists and sidebar counts refresh.
4. Move the KEPI calculations (`src/utils/kepi.js`) and the validation in `api/*.js` (`validateBooking`, `validateRecord`, `validateRegistration`, `validateNote`) to the server too. The forms can keep using them for instant inline errors.
5. Delete `src/data/mockData.js`. In `src/utils/dates.js`, replace the fixed `TODAY` with `new Date()`.

The server should return validation errors as `422 { message, fields: { fieldName: message } }`. The forms already show `fields` inline and in their error summaries.

### Endpoints

| Function                                           | Endpoint                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `signIn`, `requestPasswordReset`                   | `POST /api/auth/sign-in`, `POST /api/auth/password-reset`                             |
| `getDashboard`, `getNavCounts`                     | `GET /api/dashboard`, `GET /api/nav-counts`                                           |
| `listPatients`, `exportPatients`, `searchPatients` | `GET /api/patients`, `/api/patients/export`, `/api/patients/search`                   |
| `getPatient`                                       | `GET /api/patients/:id`                                                               |
| `checkDuplicate`, `registerPatient`                | `POST /api/patients/duplicate-check`, `POST /api/patients`                            |
| `suggestFirstVisit`                                | `GET /api/patients/first-visit-suggestion?dob=`                                       |
| `getCaregivers`, `sendFamilyInvite`                | `GET /api/patients/:id/caregivers`, `POST …/caregivers/:cid/invite`                   |
| `getRecordForm`, `recordImmunization`              | `GET /api/patients/:id/immunizations/form`, `POST /api/patients/:id/immunizations`    |
| `getSchedule`, `getBookingOptions`                 | `GET /api/appointments?from=&to=&clinician=&status=`, `GET /api/appointments/options` |
| `getAvailability`                                  | `GET /api/appointments/availability?date=&clinician=`                                 |
| `createAppointment`                                | `POST /api/appointments`                                                              |
| `rescheduleAppointment`, `cancelAppointment`       | `PATCH /api/appointments/:id/reschedule`, `PATCH /api/appointments/:id/cancel`        |
| `getConversations`, `getConversation`              | `GET /api/conversations`, `GET /api/conversations/:id`                                |
| `markConversationRead`, `sendMessage`              | `POST /api/conversations/:id/read`, `POST /api/conversations/:id/messages`            |
| `openConversationWithCaregiver`                    | `POST /api/conversations`                                                             |
| `getNotesQueue`, `getVisitNote`                    | `GET /api/visit-notes/queue`, `GET /api/visit-notes/:id`                              |
| `saveDraft`, `signNote`                            | `PATCH /api/visit-notes/:id`, `POST /api/visit-notes/:id/sign`                        |
| `getCoverage`, `getDefaulters`                     | `GET /api/coverage?period=`, `GET /api/coverage/defaulters`                           |
| `sendReminder`, `sendReminders`                    | `POST /api/reminders`, `POST /api/reminders/bulk`                                     |

Every endpoint should return only the signed-in clinician's authorised patients at their facility, and should log each record view to match the promise on the sign-in screen.

## Where this differs from the PDF

- **Navigation:** the sidebar uses one nav list everywhere (Dashboard, Patients, Appointments, Messages, Visit notes, Coverage), as the brief asks. Some frames show "Immunizations" instead.
- **Count pills:** the coral (Messages) and amber (Visit notes) pills use the darker coral-700 and amber-700. White digits on coral-500 don't meet WCAG AA. Unread dots keep coral-500.
- **Patient list:** the list holds all 248 authorised children, so its first page also shows Sifa, Jabali and Daudi, who are overdue but appear only on the Coverage frame. The tab counts come from the full list.
- **Neema Wafula's date of birth:** it is recorded as 9 Feb 2026, so that her Measles-Rubella 1 falls due today, as frames 11 and 24 show. Her patient ID is unchanged.
- **Admin-controlled features:** the facility switcher explains that access to other facilities comes from the health records officer. "Reset password" sends a link to the work email.
- **Exports:** Export (patients) and Export report (coverage) download CSV files.
