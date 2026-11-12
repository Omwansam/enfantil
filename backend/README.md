# Enfantil API

The backend of the **Infant and Maternal Health Management System** (v1) at Tumaini
Family Hospital, Kiambu Road, Kiambu. One Express 5 + Prisma 7 + PostgreSQL service
serves both frontends from **one shared database**:

| App                                   | Folder              | API base      |
| ------------------------------------- | ------------------- | ------------- |
| Family app (mothers and caregivers)   | `frontend/enfantil` | `/api/family` |
| Clinician portal (doctors and nurses) | `client/clinician`  | `/api/clinic` |

The two apps see the same records. A booking request sent in the family app lands in
the portal's Requests queue; when a doctor confirms it, proposes a new time, records a
dose, an antenatal or postnatal visit, edits the health record or replies to a
message, the mother gets a notification in her app. Messages and record changes from
the family show up in the portal the same way.

## Setup

Requires Node 20.19+ (24 recommended) and PostgreSQL 14+.

```bash
cd backend
npm install
cp .env.example .env        # then set DATABASE_URL and JWT_SECRET
npm run db:migrate          # creates the tables (prisma migrate dev)
npm run db:seed             # loads the demo data for both apps
npm run dev                 # http://localhost:5000, restarts on changes
```

Then start the frontends (each in its own terminal):

```bash
cd frontend/enfantil && npm run dev     # family app, http://localhost:5173
cd client/clinician && npm run dev      # clinician portal, http://localhost:5174
```

Both frontends call `http://localhost:5000` by default. Set `VITE_API_URL` in their
`.env` files to point them elsewhere.

### Scripts

| Command               | What it does                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run dev`         | API with reload on change (`tsx watch`)                                 |
| `npm start`           | API without reload                                                      |
| `npm run db:migrate`  | Apply schema changes in development (`prisma migrate dev`)              |
| `npm run db:deploy`   | Apply migrations on a server (`prisma migrate deploy`)                  |
| `npm run db:seed`     | Replace all data with the demo data                                     |
| `npm run db:reset`    | Drop, re-migrate and re-seed the database                               |
| `npm run db:studio`   | Browse the tables in Prisma Studio                                      |
| `npm run db:generate` | Regenerate the Prisma client after editing the schema                   |
| `npm test`            | Smoke test against a running API (sign-ins, main screens, access rules) |

### Settings (`.env`)

| Variable                              | Meaning                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                        | PostgreSQL connection string                                                      |
| `PORT`                                | Port to listen on (5000)                                                          |
| `JWT_SECRET`                          | Signs the login tokens; at least 32 random characters                             |
| `STAFF_TOKEN_TTL`, `FAMILY_TOKEN_TTL` | Session length for staff (8h) and families (30d)                                  |
| `CORS_ORIGINS`                        | Comma-separated browser origins allowed to call the API                           |
| `OTP_DEMO`                            | `true`: any 6-digit SMS code except `000000` works. Must be `false` in production |
| `TRUST_PROXY`                         | Proxy hops in front of the API, for correct IPs in rate limits                    |
| `TZ`                                  | `Africa/Nairobi`: dates and times are the hospital's local time                   |

## Demo logins

| App    | Login                                                                                           | Password      |
| ------ | ----------------------------------------------------------------------------------------------- | ------------- |
| Portal | `TFH-PAED-0217` or `achieng.otieno@example.co.ke` (Dr. Achieng Otieno, Paediatrician)           | `Clinic2026!` |
| Portal | `TFH-OBG-0105` or `grace.wanjala@example.co.ke` (Dr. Grace Wanjala, Obstetrician-Gynaecologist) | `Clinic2026!` |
| Family | `0712 345 678` or `wanjiru.kamau@example.co.ke` (Wanjiru, postnatal, baby Amani)                | `Amani2026!`  |
| Family | `0723 118 406` or `njeri.mwangi@example.co.ke` (Njeri, 26 weeks pregnant, son Baraka)           | `Njeri2026!`  |

The seed has 248 infants, 8 mothers, about 4,800 doses, 61 appointments, 6 requests
and the message threads and notifications from both apps' designs. Its dates are
moved by whole weeks so the design's "today" (Mon 9 Nov 2026) falls in the current
week; set `SEED_SHIFT=off` to keep the original dates. Everything else works against
the real date: overdue doses, ANC visits due, ages and "due this week" are worked out
on each request.

SMS codes: no SMS provider is connected. With `OTP_DEMO=true` any 6 digits work
(except `000000`). With `OTP_DEMO=false` the server creates real codes (10 minutes,
5 tries), stores only their hash, and prints the text it would send to the console.
Connect a provider in `src/services/otp.js` → `sendSms()`.

## How it works

```text
frontend/enfantil ─┐                      ┌─ services/family  (account view: projection.js)
                   ├─ HTTP + JWT ─ routes ─┤
client/clinician ──┘   controllers        └─ services/clinic  (facility view)
                                                    │
                                          services/store (state.js, mapping.js)
                                                    │
                                              PostgreSQL (Prisma)
```

- **Services.** `src/services/clinic/api` and `src/services/family/api` hold the same
  business rules the screens were designed against: the KEPI schedule and due dates
  (`clinic/utils/kepi.js`), ANC and postnatal timing (`utils/pregnancy.js`), the
  validation messages, and the response shapes each screen expects.
- **One state, two views.** `services/store` loads the facility's records into memory
  at start-up. The portal works on it directly. The family app gets a per-account
  view (`family/api/projection.js`): the mother's record, pregnancy and visits, her
  children (the patients whose caregiver list includes her account), their doses and
  growth, her appointments and requests, threads and notifications.
- **Writes.** Every change runs on a copy of the state. The rows that changed are
  written to Postgres in one transaction (`mapping.js` → `diff()` / `apply()`); only
  then does the copy become the state. Writes are queued one at a time.
- **Several processes.** A `Revision` row is bumped on every write and checked on
  every request, so a second API process, a re-seed or an edit in Prisma Studio is
  picked up on the next request. Two processes writing at once get a conflict and
  the second write is retried on the newer data.
- **Cross-app notifications.** `services/notify.js` creates family notifications for
  what clinicians do, and staff notifications for what families do.

This in-memory design suits one hospital (a few thousand rows). For many facilities,
move the heaviest reads (patient list, coverage) to direct Prisma queries.

## Database

`prisma/schema.prisma`, 34 tables. The main ones:

| Area               | Tables                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Facility and staff | `Facility`, `Room`, `Staff` (clinicians and the reception desk, bcrypt password hashes)                                                       |
| Family accounts    | `Account` (settings, reminders, consent), `OtpCode`, `ShareLink`, `FamilyNotification`                                                        |
| Mothers            | `Mother`, `Pregnancy`, `AncVisit`, `Delivery`, `PostnatalVisit`, `TdDose`, `PregnancyHistory`                                                 |
| Infants            | `Patient`, `Caregiver`, `Dose` (given KEPI doses), `OptionalDose` (paid vaccines a parent added), `Measurement`, `ContactAttempt`, `Reminder` |
| Shared             | `HealthItem` (allergies, conditions, medicines, diagnoses for mothers and infants), `AuditEntry` (every clinician edit with its reason)       |
| Visits             | `Appointment`, `Request` (from the family app), `VisitNote`                                                                                   |
| Messages           | `Conversation` (one staff inbox each), `Message`, `StaffNotification`, `StaffNotificationRecipient` (per-person read state)                   |
| Reports            | `CoverageReport`, `CoverageDose`, `AppSetting`, `Revision`                                                                                    |

Calendar dates are `DATE` columns; times are `TIMESTAMP(0)` wall-clock time in
Africa/Nairobi. Statuses that depend on today's date are never stored.

## Endpoints

All routes except `/auth/*` need `Authorization: Bearer <token>`. A family token
cannot open portal routes (403) and the reverse. Errors come back as
`{ message, field?, fields? }`.

### Family app — `/api/family`

| Area                  | Routes                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth                  | `POST /auth/sign-in`, `/auth/sms-code`, `/auth/sms-code/verify`, `/auth/password-reset`, `/auth/password-reset/verify`, `/auth/password-reset/complete`, `/auth/register`, `/auth/register/confirm`                                                          |
| Profiles and children | `GET /me/profiles`, `GET /children`, `GET /children/:id`, `/children/:id/health`, `/children/:id/overview`, `/children/:id/measurements`; `POST /children` (add), `POST /children/lookup` (find a hospital record, sends a code), `POST /children/link`      |
| Vaccines              | `GET /children/:id/immunizations`, `GET /doses/:id`, `GET /children/:id/optional-vaccines`, `PUT /children/:id/optional-vaccines/:vaccineId`, `GET/POST/DELETE /children/:id/share-link`                                                                     |
| Visits                | `GET /appointments?when=&childId=`, `GET /appointments/:id`, `GET /booking/options`, `GET /booking/slots?clinicianId=&forId=`, `POST /appointments/requests`, `DELETE /appointments/requests/:id`, `POST /appointments/requests/:id/proposal` (`{ accept }`) |
| Messages              | `GET /conversations`, `POST /conversations`, `GET /conversations/:id`, `POST /conversations/:id/read`, `POST /conversations/:id/messages`                                                                                                                    |
| Notifications         | `GET /notifications`, `GET /notifications/unread-counts`, `POST /notifications/:id/read`, `POST /notifications/read-all`                                                                                                                                     |
| Account               | `GET/PATCH /me`, `GET /me/settings`, `PATCH /me/settings/reminders`, `PATCH /me/settings/language`, `GET /me/record-access`, `POST /me/password`, `GET /help/articles`                                                                                       |
| My care               | `GET /me/overview`, `GET/PATCH /me/health-record`, `POST /me/health-record/:kind`, `DELETE /me/health-record/:kind/:itemId`, `GET /me/pregnancy`, `/me/antenatal`, `/me/antenatal/:id`, `/me/progress`, `/me/vaccines`, `/me/postnatal`                      |

### Clinician portal — `/api/clinic`

| Area                       | Routes                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                       | `POST /auth/sign-in`, `POST /auth/password-reset`, `GET /auth/me`                                                                                                                                                                                                                                    |
| Dashboard                  | `GET /dashboard`, `GET /nav-counts`                                                                                                                                                                                                                                                                  |
| Patients                   | `GET /patients?q=&tab=&group=&page=`, `/patients/export`, `/patients/search`, `/patients/options`, `/patients/first-visit-suggestion?dob=`; `POST /patients/duplicate-check`, `POST /patients`; `GET /patients/:id`, `/patients/:id/caregivers`; `POST /patients/:id/caregivers/:caregiverId/invite` |
| Immunizations and growth   | `GET /patients/:id/immunizations/form`, `POST /patients/:id/immunizations`, `GET/POST /patients/:id/measurements`, `DELETE /measurements/:id`                                                                                                                                                        |
| Mothers                    | `GET /mothers/options`, `GET /mothers/:id`, `GET /mothers/:id/anc/form`, `POST /mothers/:id/anc`, `POST /mothers/:id/delivery`, `GET /mothers/:id/postnatal/form`, `POST /mothers/:id/postnatal`, `GET/PATCH /records/:kind/:id` (audited edits)                                                     |
| Appointments               | `GET /appointments?from=&to=&clinician=&status=`, `/appointments/options`, `/appointments/availability`; `POST /appointments`; `PATCH /appointments/:id/reschedule`, `/appointments/:id/cancel`                                                                                                      |
| Requests                   | `GET /requests`, `POST /requests/:id/confirm`, `/requests/:id/propose`, `/requests/:id/decline`                                                                                                                                                                                                      |
| Messages                   | `GET /conversations`, `POST /conversations` (`{ patientId }` or `{ motherId }`), `GET /conversations/:id`, `POST /conversations/:id/read`, `POST /conversations/:id/messages`                                                                                                                        |
| Notes, coverage, reminders | `GET /visit-notes/queue`, `GET/PATCH /visit-notes/:id`, `POST /visit-notes/:id/sign`, `GET /coverage?period=`, `GET /coverage/defaulters`, `POST /reminders`, `POST /reminders/bulk`                                                                                                                 |
| Notifications              | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`                                                                                                                                                                                                                 |

`GET /api/health` checks the API and the database.

## Security

- Passwords are bcrypt hashes (cost 12), compared in constant time; unknown logins take
  as long as wrong passwords.
- Tokens are HS256 JWTs carrying only the user id and kind. Staff tokens last 8 hours.
- Family routes only ever return the signed-in account's own records and children; a
  child is "yours" when your account is on the child's caregiver list.
- Clinicians see only their own message threads, and their own notification read state.
- Opening a mother's or child's record updates "last viewed" on the family's
  _Who can see my records_ page.
- Rate limits on sign-in, SMS codes and code checks; Helmet headers; CORS limited to
  `CORS_ORIGINS`; request bodies capped at 200 KB.

Before real patients use it: connect an SMS provider and set `OTP_DEMO=false`, connect
a mail provider for staff password resets (`services/clinic/api/auth.js`), serve over
HTTPS, back up the database, and check the Kenya Data Protection Act requirements
for health data (consent, access logs, registration with the ODPC).

## Folder structure

```text
backend/
  prisma/
    schema.prisma          The shared database
    migrations/            SQL migrations
    seed.js                npm run db:seed
  prisma7.config.ts        Prisma config (schema, migrations, seed command, DATABASE_URL)
  generated/prisma/        Generated Prisma client (npm run db:generate; not committed)
  scripts/smoke-test.js    npm test
  src/
    index.js               Express app: CORS, Helmet, rate limit, routes, start-up
    config/                env.js (settings), db.js (Prisma client)
    middleware/            protect (JWT), error handler, rate limits
    routes/                clinic.routes.js, family.routes.js
    controller/            clinic.controller.js, family.controller.js
    services/
      store/               state.js (load, cached state, transactional writes), mapping.js (state ⇄ rows)
      clinic/              portal services (api/), schedule and date rules (utils/), seed data (data/)
      family/              family services (api/, projection.js), rules (utils/), vaccine guide (data/)
      seed/buildState.js   Builds the shared demo data from both apps' designs
      notify.js            Cross-app notifications
      otp.js, tokens.js    SMS codes and login tokens
      context.js, errors.js
```

The folder also still holds files from an earlier project that nothing loads:
`src/controller/{auth,user,admin,oauth}.controller.js`,
`src/routes/{auth,user,admin,oauth}.routes.js` and
`src/middleware/{authorize,optionalAuth,project-upload}.middleware.js`. They can be
deleted.
