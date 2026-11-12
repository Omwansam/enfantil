# Enfantil Clinician Portal

The staff web app of the **Infant and Maternal Health Management System** (v1) at
**Tumaini Family Hospital, Kiambu Road, Kiambu**. Doctors, nurse-midwives and
paediatricians see the hospital's mothers and infants, record antenatal, delivery,
postnatal and immunization visits, edit health records with an audit trail, answer
appointment requests from the family app and message families. It follows the
"Enfantil — UI/UX Design" PDF (clinician portal, frames 10–16 and 24–27) and the
maternal-care design brief (D1–D8).

The family app lives in `frontend/enfantil`. The two apps share the same palette, but
the portal frames it in deep teal so staff screens look clearly different. Both apps
use the **Enfantil API** (`backend/`, Express + Prisma + PostgreSQL) and **one shared
database**: requests from the family app arrive in the Requests queue, and what you do
here (confirm or propose a time, record doses and visits, edit a record, reply) shows
up in the mother's app.

## Setup

Requires Node 20 or later, and the API running (see `backend/README.md`:
`npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`).

```bash
cd client/clinician
npm install
npm run dev          # http://localhost:5174 (calls the API on http://localhost:5000)
```

| Command           | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Development server on port 5174 (the family app uses 5173) |
| `npm run build`   | Production build in `dist/`                                |
| `npm run preview` | Serves the production build on port 4174                   |
| `npm run lint`    | ESLint                                                     |

Copy `.env.example` to `.env` to change where the portal finds the API (`VITE_API_URL`, default `http://localhost:5000/api/clinic`) and where the "family sign-in" link points (`VITE_FAMILY_APP_URL`, default `http://localhost:5173`).

## Demo logins

| Staff ID or email                                 | Password      | Signed in as                                  |
| ------------------------------------------------- | ------------- | --------------------------------------------- |
| `TFH-PAED-0217` or `achieng.otieno@example.co.ke` | `Clinic2026!` | Dr. Achieng Otieno, Paediatrician             |
| `TFH-OBG-0105` or `grace.wanjala@example.co.ke`   | `Clinic2026!` | Dr. Grace Wanjala, Obstetrician-Gynaecologist |

Both work at Tumaini Family Hospital (Mother & child clinic). Nurse Joseph Mwangi
(Nurse-Midwife, `TFH-NUR-0142`) appears in the data as a colleague but has no login.

- "Keep me signed in on this clinic computer for 8 hours" keeps the session in `localStorage` with an 8-hour expiry; without it the session ends when the browser closes.
- Signing in with a family demo account (`0712 345 678` / `Amani2026!` or `0723 118 406` / `Njeri2026!`) is recognised as a caregiver, and the portal sends them to the family sign-in.
- Sessions are 8-hour tokens from the API. When one expires, the next request returns you to the sign-in page.
- "Reset password" always gives the same answer, so staff IDs can't be probed.

## Things to know about the demo

- **Real dates.** The API works out overdue doses, visits due and ages against today's date. `npm run db:seed` moves the demo dates by whole weeks so the designed week (Mon 9 Nov 2026) is the current week; the dashboard therefore shows that week's schedule.
- **One facility.** Every patient belongs to Tumaini Family Hospital, so there is no facility switcher. The sidebar shows the hospital, address and clinic.
- **Overdue status is calculated, not stored.** Due dates, overdue doses, days late ("Overdue · 92 d"), the "Due this week" tab and the defaulter list all come from each child's date of birth and recorded doses, run through the KEPI rules in `backend/src/services/clinic/utils/kepi.js` (the portal keeps a copy in `src/utils/kepi.js` for labels).
- **248 infants and 8 mothers.** The children named in the design (plus Baraka Mwangi, Njeri's son) come from the design; the rest are generated from a fixed seed by `npm run db:seed` (`backend/src/services/clinic/data/`). Generated children are up to date with their doses. The mothers:
  - **Wanjiru Kamau**: delivered Amani on 9 Feb 2026 (SVD, 3.2 kg, 39+2); postnatal care complete.
  - **Njeri Mwangi**: 26 weeks, due 13 Feb 2027, next antenatal visit 5 Dec 2026.
  - **Faith Wambui** (34 weeks, visit today), **Mercy Achieng** (28 weeks, high blood pressure at the last visit), **Amina Yusuf** (19 weeks, Rh negative), **Lucy Njeri** (postnatal visit today), **Catherine Mbugua** (caesarean, postnatal) and **Grace Wafula**.
- **Appointment requests** come from the family app's booking flow. The queue starts with 4 pending requests and 1 time proposed to a parent.
- **Everything is saved** in PostgreSQL: doses, antenatal, delivery and postnatal visits, record edits (with the audit trail), answered requests, bookings, signed notes, messages, reminders and new registrations. Every screen and sidebar count updates after a change.
- **Your inbox is yours.** Each doctor sees only their own message threads and their own unread notifications.
- **Registering a child for an app user**: if a caregiver's phone matches a family account, the child appears in that family's app straight away.
- **Coverage figures are report data.** The four stat cards and the dose bars on Coverage come from monthly facility reports (labelled "sample data" on screen, as in the design). The defaulter list below them is live.
- **Error states** show when the API is unreachable (stop it to see the retry state) or answers with an error.

### KEPI rules used

- Birth: BCG, OPV 0. At 6, 10 and 14 weeks: OPV, Pentavalent and PCV; Rotavirus at 6 and 10 weeks; IPV at 14 weeks.
- Vitamin A at 6 months, then every 6 months up to 54 months. Measles-Rubella at 9 and 18 months.
- The 10- and 14-week visits are due at that age, or 4 weeks after the previous visit, whichever is later; MR 2 is at least 4 weeks after MR 1. A baby whose 10-week doses were late is therefore due for the 14-week doses 4 weeks later (Sifa Nyambura: 19 days late, as in frame 26).
- "Planned doses" shows the next two doses of each vaccine. Status is Overdue once the due date has passed, Due when the next dose falls this week, and Up to date otherwise.

### Maternal care rules used

- Gestational age and due date come from the last period (`src/utils/pregnancy.js`); the due date is LMP + 280 days.
- Eight antenatal contacts at 12, 20, 26, 30, 34, 36, 38 and 40 weeks, each with its checks. A contact is Overdue more than 7 days after its week.
- Postnatal visits within 48 hours, at 1–2 weeks and at 4–6 weeks after delivery.
- Blood pressure of 140/90 or more is flagged as high. Hb below 11 g/dL, a fetal heart rate outside 110–160 and urine protein or glucose of +2 or more are also flagged, and saving a visit with any flagged value asks you to confirm first.
- The ANC form offers the next planned Td dose; ticking it records the dose with its batch number on the visit.

## Screens and routes

| Route                                     | Screen                                                                                                                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/clinic/sign-in`                         | Doctor sign-in (frame 10)                                                                                                                                                                                                         |
| `/clinic`                                 | Dashboard (11): patients, due today, appointment requests, pregnant patients due this week, overdue doses, notes to sign; a schedule mixing antenatal, postnatal and child visits; the request queue preview; a notification bell |
| `/clinic/patients`                        | Patients (24, D1) with **All / Mothers / Infants** tabs (`?group=`), plus `?q=`, `?tab=` and `?page=`                                                                                                                             |
| `/clinic/patients/new`                    | Register child and link caregiver (27)                                                                                                                                                                                            |
| `/clinic/patients/:id`                    | Infant profile (12): edit record, growth chart with editable measurements (D6), link to the mother's record                                                                                                                       |
| `/clinic/patients/:id/immunizations/new`  | Record immunization (15)                                                                                                                                                                                                          |
| `/clinic/mothers/:motherId`               | Mother profile (D2): pregnancy, ANC contacts, BP and weight charts, Td, delivery, postnatal visits, children, health record, audit trail                                                                                          |
| `/clinic/mothers/:motherId/anc/new`       | Record antenatal visit (D3), with abnormal values flagged and a confirmation step                                                                                                                                                 |
| `/clinic/mothers/:motherId/postnatal/new` | Record delivery (creates and links the baby's record and KEPI schedule) or a postnatal visit (D4)                                                                                                                                 |
| `/clinic/requests`                        | Appointment requests (D7): Confirm, Propose new time or Decline with a reason; amber sidebar badge                                                                                                                                |
| `/clinic/notifications`                   | Notifications (D8): filters, Mark all as read; coral sidebar badge                                                                                                                                                                |
| `/clinic/appointments`                    | Appointment management (13), with `?week=`, `?view=day`, `?clinician=`, `?status=`                                                                                                                                                |
| `/clinic/appointments/new`                | Appointment creation (16), for a mother or a child, with optional `?patient=` and `?date=`                                                                                                                                        |
| `/clinic/messages/:id?`                   | Conversations with families and colleagues (14)                                                                                                                                                                                   |
| `/clinic/visits`                          | Opens the first unfinished visit note                                                                                                                                                                                             |
| `/clinic/visits/:id/note`                 | Visit note (25)                                                                                                                                                                                                                   |
| `/clinic/coverage`                        | Coverage and defaulter tracing (26)                                                                                                                                                                                               |
| anything else                             | 404 in the portal style                                                                                                                                                                                                           |

The **Edit health record** side panel (D5) opens from the mother and infant profiles. It edits allergies, conditions, medicines, diagnoses and the blood group, needs a reason for every change, and adds an entry to the record's audit trail. The family app shows those items as read-only, "Updated by Dr. … on …".

`/clinic/*` is protected: signed-out visitors go to `/clinic/sign-in` and return to the page they wanted after signing in.

## Folder structure

```text
src/
  api/            One function per API call; client.js does the HTTP (token, errors, refresh)
    client.js       http(): API base URL, token, ApiError, change notifications
    helpers.js      Small date helpers the forms use (nowISO …)
    auth.js  patients.js  caregivers.js  appointments.js  immunizations.js
    visitNotes.js  messages.js  coverage.js  reminders.js  dashboard.js
    mothers.js      mother profile, ANC visit, delivery, postnatal visit, record edits
    requests.js     appointment requests: confirm, propose a time, decline
    notifications.js  staff notifications
    growth.js       infant measurements
  components/     Reusable UI: Button, Input, Select, Textarea, Checkbox,
                  Switch, SegmentedControl, Tabs, Card, StatCard, Badge,
                  Avatar, Modal, ConfirmDialog, Drawer, SidePanel, DataTable,
                  FilterBar, Pagination, EmptyState, ErrorState, Skeleton,
                  Sidebar, ChatBubble, Breadcrumb, Banner, BarChart,
                  GrowthChart, MaternalCharts, EditRecordPanel, TimeSlotGrid,
                  SearchInput, SectionCard, ProtectedRoute …
  context/        AuthContext (session, sign-in, sign-out)
  hooks/          useAsync, useDataVersion, useNavCounts, useDebouncedValue,
                  useDocumentTitle, useMediaQuery, useElementWidth
  layouts/        ClinicLayout (sidebar + drawer), AuthLayout (split sign-in)
  pages/clinic/   One file per screen
  utils/          dates.js, kepi.js (schedule + status), pregnancy.js (gestational
                  age, ANC/PNC schedules, danger signs), format.js, storage.js, cx.js
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
- **Status badges:** Upcoming, Completed, Cancelled, Overdue, Given, Planned, Due, Up to date, Pending (amber), Proposed and Declined, in the PDF colours.
- **Shape:** 12px radius on inputs and buttons, 16px on cards, pills fully rounded, and the card shadow from the PDF.
- **Monospace:** batch numbers, patient IDs and staff IDs.
- **Accessibility:**
  - A visible teal focus ring (light on the deep-teal sidebar), a skip link, and labels on every field.
  - Modals use native `<dialog>`, so focus is trapped and Escape closes them. Confirmations are `role="alertdialog"`.
  - `role="tab"`, `"switch"` and `"radio"` where the design shows tabs, toggles and choice chips.
  - Click targets are at least 40px.
  - The coverage chart has a screen-reader table underneath it.

## The API

Screens only call functions in `src/api/`. Each one is a single request to the
Enfantil API (`/api/clinic`) through `http()` in `src/api/client.js`, which adds the
session token, turns error responses into `ApiError` (`err.fields` holds the
per-field messages forms show inline, from `422 { message, fields }`), sends you back
to the sign-in page when the session has expired, and tells `useDataVersion` after
every change so lists and sidebar counts refresh.

Validation used for instant form errors (`validateBooking`, `validateRecord`,
`validateRegistration`, `validateNote`, `validateAnc`, `validateDelivery`,
`validatePostnatal`, `validateRecordEdit`, `validateSlot`, `validateMeasurement`) stays
in the portal; the API runs the same checks again. The signed-in clinician always
comes from the token, never from the request. Routes are listed in `backend/README.md`.

## Where this differs from the PDF

- **Navigation:** the sidebar uses one nav list everywhere (Dashboard, Patients, Requests, Appointments, Messages, Visit notes, Coverage, Notifications). Some frames show "Immunizations" instead.
- **Count pills:** the coral (Messages) and amber (Visit notes) pills use the darker coral-700 and amber-700. White digits on coral-500 don't meet WCAG AA. Unread dots keep coral-500.
- **Patient list:** the list holds all 248 authorised children, so its first page also shows Sifa, Jabali and Daudi, who are overdue but appear only on the Coverage frame. The tab counts come from the full list.
- **Neema Wafula's date of birth:** it is recorded as 9 Feb 2026, so that her Measles-Rubella 1 falls due today, as frames 11 and 24 show. Her patient ID is unchanged.
- **Single facility:** the facility switcher from the PDF is removed because the system serves one private hospital. Patient and staff IDs use the `TFH-` prefix (the PDF used `KL4-`). "Reset password" sends a link to the work email.
- **Exports:** Export (patients) and Export report (coverage) download CSV files.
