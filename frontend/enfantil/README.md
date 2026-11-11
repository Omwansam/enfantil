# Enfantil — caregiver web app

The desktop/web version of Enfantil for parents and caregivers in Kenya: follow each
child's Kenya KEPI vaccines, growth, visits and messages with their care team.

Built with React 19 (JSX), Vite, React Router v6, Tailwind CSS v4, lucide-react and
recharts. There is no backend yet: every screen reads mock data through async
functions in `src/api/`, so they can be swapped for Express calls without touching
the pages.

The screens follow the "Enfantil — UI/UX Design" frames W1–W14 (caregiver web app).

## Setup

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run lint       # ESLint
```

Optional: copy `.env.example` to `.env` to point "Go to the clinician portal" on the
sign-in page at the clinician app (`client/clinician`, default `http://localhost:5174`).

## Demo login

| Field | Value |
| --- | --- |
| Phone | `0712 345 678` (also accepts `+254 712 345 678` or `712345678`) |
| or email | `wanjiru.kamau@example.co.ke` |
| Password | `Amani2026!` |

Other demo details:

- **"Today" is Sunday 8 November 2026** (`TODAY` in `src/utils/dates.js`). Ages,
  "Tomorrow" labels, overdue status and "91 days late" are all calculated from it.
- **SMS codes** (SMS sign-in, forgot password, registration, linking a record): any
  6 digits work; `000000` shows the wrong-code error.
- **Add a child › Link a clinic record**: `THK-P-250118-007` with date of birth
  18 Jan 2025 finds a new record (Baraka). `KL4-P-230604-031` with 4 Jun 2023 finds
  Zawadi, who is already linked.
- **Changes live in memory.** Sent messages, requests, read notifications and so on
  reset when you reload the page. The session and the selected child are kept in
  localStorage.
- **Error states**: to see loading errors with "Try again", run this in the browser
  console and reload:

  ```js
  localStorage.setItem('enfantil:failRate', '0.3') // 30% of API calls fail
  localStorage.removeItem('enfantil:failRate')     // back to normal
  ```

## Screens and routes

| Frame | Route | Screen |
| --- | --- | --- |
| W1 | `/sign-in` | Sign in (password or SMS code) |
| W2 | `/register` | Create a family account (3 steps) |
| — | `/forgot-password` | Phone → 6-digit SMS code → new password |
| W3 | `/family` | Overview / dashboard |
| W4 | `/family/health` | Health profile: growth chart, measurements, allergies, medicines, visit history |
| W5 | `/family/vaccines` | Immunizations: progress, planned doses, administered doses |
| W10 | `/family/vaccines/:doseId` | Vaccine dose detail |
| W6 | `/family/visits` | Appointments & visits (`?visit=<id>`, `?tab=past`) |
| W12 | `/family/visits/new` | Request an appointment (`?child=`, `?reason=`, `?reschedule=`) |
| W7 | `/family/messages/:id?` | Messages |
| W9 | `/family/notifications` | Notifications |
| W11 | `/family/card` | Printable vaccination card and school share link |
| W13 | `/family/children/new` | Add a child |
| W8 | `/family/settings` | Profile & settings (`#reminders`, `#privacy`, …) |
| W14 | `/family/help` | Help & support |
| — | anything else | 404 |

Everything under `/family/*` is wrapped in `ProtectedRoute`; signed-out visitors are
sent to `/sign-in` and returned to the page they wanted after signing in.

## Folder structure

```text
frontend/enfantil/
├── index.html               Inter from Google Fonts, favicon, page title
├── tailwind.config.js       Design tokens (colours, type scale, radius, shadows)
├── .env.example
└── src/
    ├── main.jsx             Router + AuthProvider
    ├── App.jsx              Routes (pages are lazy-loaded)
    ├── index.css            Tailwind import, base styles, focus ring, print stylesheet
    ├── api/                 All data access: async functions over the mock data
    │   ├── client.js        request() helper: delay, simulated failures, change events
    │   ├── helpers.js       Shared lookups and derived fields (dose status, days late)
    │   ├── auth.js          sign in, SMS code, password reset, registration
    │   ├── children.js      children, overview, health profile, find/link/add a child
    │   ├── growth.js        measurements
    │   ├── immunizations.js doses, dose detail, school share links
    │   ├── appointments.js  visits, clinics, clinicians, appointment requests
    │   ├── messages.js      conversations, read state, sending
    │   ├── notifications.js notifications, unread counts
    │   ├── settings.js      profile, reminders, language, clinic access, password
    │   └── help.js          help articles
    ├── components/          Small reusable UI pieces
    │   ├── Button, IconButton, Input, Select, Textarea, Checkbox, Switch,
    │   │   SegmentedControl, Tabs, OptionCard, ChoicePill, CodeInput, FieldMessage
    │   ├── Card, Badge, CountPill, Avatar, DateTile, StatTile, ProgressBar, Table,
    │   │   Accordion, Alert, Breadcrumb, PageHeader, Logo, QRPlaceholder, ChatBubble,
    │   │   GrowthChart
    │   ├── Modal, Drawer, EmptyState, ErrorState, Skeleton, AsyncContent, PageLoader
    │   └── Sidebar, ChildSwitcher, RequireChild, ProtectedRoute, ScrollToTop
    ├── context/
    │   ├── AuthContext.jsx  { user, role: 'caregiver' } + signIn / signOut
    │   └── ChildContext.jsx selected child, saved to localStorage
    ├── data/mockData.js     Caregiver, children, KEPI schedule and doses, growth,
    │                        appointments, messages, notifications, settings, FAQs
    ├── hooks/               useAsync (loading/error/data), useDataVersion,
    │                        useUnreadCounts, useCountdown, useMediaQuery, useDocumentTitle
    ├── layouts/
    │   ├── FamilyLayout.jsx 264px sidebar; top bar + drawer below 1024px
    │   └── AuthLayout.jsx   Top-bar layout (W2) and split sign-in layout (W1)
    ├── pages/               One file per screen (see the table above)
    └── utils/               dates.js (formatting, ages, days overdue), format.js
                             (phone, email, password strength), calendar.js (.ics),
                             storage.js, cx.js
```

## Design system

Tokens live in `tailwind.config.js` and are loaded by Tailwind v4 with
`@config "../tailwind.config.js"` in `src/index.css`.

- **Colours**: `teal-700` primary, `teal-800` hover, `teal-50` tint, `teal-100`;
  `coral-500` alerts/unread, `coral-700` alert text, `coral-50`; `ink`, `slate-600`,
  `muted`, `line` (borders), `page` (off-white background).
- **Status badges**: `bg-upcoming-bg text-upcoming`, `completed`, `cancelled`,
  `overdue`, `given`, `planned`. Use `<StatusBadge status="Overdue" />`; status is
  always shown as text as well as colour.
- **Type**: `text-display`, `text-h1`, `text-h2`, `text-body`, `text-small`,
  `text-caption`.
- **Shape**: inputs and buttons `rounded-xl` (12px) and at least 44px tall, cards
  `rounded-2xl` (16px) with `shadow-card`, pills `rounded-full`.
- **Accessibility**: every focusable element gets a 3px teal focus ring
  (`:focus-visible` in `index.css`); toggles use `role="switch"`, tabs use
  `role="tablist"`/`"tab"`, segmented controls use `role="radiogroup"`/`"radio"`, and
  option cards are real radio inputs. Icon-only buttons have `aria-label`s.

Notes where the build differs slightly from the frames:

- Unread **count pills** use `coral-700` behind the white number. White on
  `coral-500` is 3.6:1, below the 4.5:1 AA minimum for small text. Unread **dots**
  still use `coral-500`.
- **Download PDF** opens the browser's print dialog with the card's print stylesheet;
  choose "Save as PDF". A backend can later return a generated PDF instead.
- The **QR code** on the vaccination card is a placeholder pattern, not a scannable
  code.
- Notifications are listed newest first.

## Replacing `src/api` with Express calls

Pages only import functions from `src/api/*` and expect them to return promises.
Each function wraps its mock logic in `request()` from `src/api/client.js`. To move to
a real backend, keep the function names and return shapes and swap the bodies.

1. Add a small fetch helper (for example in `src/api/client.js`):

   ```js
   const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

   export async function http(path, { method = 'GET', body } = {}) {
     const session = JSON.parse(localStorage.getItem('enfantil:session') ?? sessionStorage.getItem('enfantil:session') ?? 'null')
     const res = await fetch(`${API_URL}${path}`, {
       method,
       headers: {
         'Content-Type': 'application/json',
         ...(session?.token && { Authorization: `Bearer ${session.token}` }),
       },
       body: body ? JSON.stringify(body) : undefined,
     })
     const data = await res.json().catch(() => null)
     if (!res.ok) throw new ApiError(data?.message ?? 'Something went wrong.', { status: res.status, field: data?.field })
     return data
   }
   ```

2. Replace each mock body with a call. For example in `src/api/children.js`:

   ```js
   // before
   export function getChildren() {
     return request((db) => db.children.map((c) => enrichChild(db, c)))
   }

   // after
   export function getChildren() {
     return http('/children')
   }
   ```

   For writes, call `emitChange()` (or keep `request(..., { mutates: true })`
   semantics) after a successful response, so the sidebar badges and open lists
   refresh through `useDataVersion`.

3. Errors: forms show `error.message` inline, and show it next to a specific field
   when the server returns `{ message, field }` (for example
   `{ "message": "Enter a valid Kenyan mobile number.", "field": "phone" }`).

4. Derived fields: the mock API adds `status` (`Given` / `Planned` / `Overdue`),
   `daysLate`, `age`, `ageShort`, `initials` and nested `child`, `clinician` and
   `facility` objects. Either return the same fields from Express, or keep the helpers
   in `src/api/helpers.js` and apply them to the server response.

5. Dates: replace the fixed `TODAY` in `src/utils/dates.js` with `new Date()` once the
   data is real.

Suggested Express endpoints, matching the current functions:

| Function | Method and path |
| --- | --- |
| `signIn` | `POST /auth/sign-in` |
| `sendSmsSignInCode`, `verifySmsSignInCode` | `POST /auth/sms-code`, `POST /auth/sms-code/verify` |
| `requestPasswordReset`, `verifyResetCode`, `resetPassword` | `POST /auth/password-reset`, `…/verify`, `…/complete` |
| `startRegistration`, `completeRegistration` | `POST /auth/register`, `POST /auth/register/confirm` |
| `getChildren`, `getChild`, `getHealthProfile`, `getChildOverview` | `GET /children`, `GET /children/:id`, `…/health`, `…/overview` |
| `findChildRecord`, `linkChildRecord`, `addChildManually` | `POST /children/lookup`, `POST /children/link`, `POST /children` |
| `getMeasurements` | `GET /children/:id/measurements` |
| `getImmunizations`, `getDose` | `GET /children/:id/immunizations`, `GET /doses/:id` |
| `getShareLink`, `createShareLink`, `revokeShareLink` | `GET/POST/DELETE /children/:id/share-link` |
| `getAppointments`, `getAppointment` | `GET /appointments?when=&childId=`, `GET /appointments/:id` |
| `requestAppointment`, `cancelAppointmentRequest` | `POST /appointments/requests`, `DELETE /appointments/requests/:id` |
| `getFacilities`, `getClinicians` | `GET /facilities`, `GET /facilities/:id/clinicians` |
| `getConversations`, `getConversation`, `openConversationWith` | `GET /conversations`, `GET /conversations/:id`, `POST /conversations` |
| `markConversationRead`, `sendMessage` | `POST /conversations/:id/read`, `POST /conversations/:id/messages` |
| `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `getUnreadCounts` | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-counts` |
| `getProfile`, `updateProfile` | `GET/PATCH /me` |
| `getSettings`, `updateReminders`, `updateLanguage` | `GET /me/settings`, `PATCH /me/settings/reminders`, `PATCH /me/settings/language` |
| `getClinicAccess`, `setClinicAccess` | `GET /me/clinic-access`, `PATCH /me/clinic-access/:id` |
| `changePassword` | `POST /me/password` |
| `getHelpArticles` | `GET /help/articles` |

The "Email app support" button uses `support@enfantil.app`; change `SUPPORT_EMAIL` in
`src/pages/Help.jsx` to the real address.
