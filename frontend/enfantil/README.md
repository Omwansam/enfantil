# Enfantil — family web app

The web app of the **Infant and Maternal Health Management System** (v1) for
mothers and caregivers at **Tumaini Family Hospital, Kiambu Road, Kiambu**. A mother
follows her own pregnancy, antenatal and postnatal care, her children's Kenya KEPI
vaccines and growth, books appointments and messages the care team.

Built with React 19 (JSX), Vite, React Router v6, Tailwind CSS v4, lucide-react and
recharts. Data comes from the Enfantil API (`backend/`, Express + Prisma +
PostgreSQL), which it shares with the clinician portal (`client/clinician`): a booking
request sent here appears in the portal's queue, and what the doctors do (confirm a
visit, record a dose or an antenatal visit, update the health record, reply) shows up
here. The layout is responsive: a sidebar on desktop, and a top bar, menu drawer
and bottom tab bar (Home · Health · Vaccines · Visits · Messages) on phones.

## Setup

Requires Node 20 or newer, and the API running (see `backend/README.md`:
`npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`).

```bash
npm install
npm run dev        # http://localhost:5173 (calls the API on http://localhost:5000)
```

Other scripts:

```bash
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run lint       # ESLint
```

Optional: copy `.env.example` to `.env` to change where the app finds the API
(`VITE_API_URL`, default `http://localhost:5000/api/family`) and where "Go to the
clinician portal" points (`VITE_CLINICIAN_PORTAL_URL`, default `http://localhost:5174`).

## Demo logins

| Mother                  | Phone          | Email                         | Password     | What you see                                                                                                                                        |
| ----------------------- | -------------- | ----------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wanjiru Kamau (b. 1996) | `0712 345 678` | `wanjiru.kamau@example.co.ke` | `Amani2026!` | Postnatal: delivered Amani on 9 Feb 2026 (SVD, 3.2 kg, 39+2). Postnatal care complete, Td 3 can be given, a pending request and a proposed new time |
| Njeri Mwangi (b. 1999)  | `0723 118 406` | `njeri.mwangi@example.co.ke`  | `Njeri2026!` | 26 weeks pregnant (LMP 9 May 2026, due 13 Feb 2027), 3 antenatal visits, son Baraka (3 years)                                                       |

Other demo details:

- **Real dates.** Ages, pregnancy weeks, overdue doses and visits due are worked out by
  the API against today's date. The seed moves the demo dates by whole weeks so the
  designed week stays current (`npm run db:seed` in `backend/` resets everything).
- **SMS codes** (SMS sign-in, forgot password, registration, linking a record): no SMS
  provider is connected. With the API's `OTP_DEMO=true` (the development default) any
  6 digits work and `000000` shows the wrong-code error; with `OTP_DEMO=false` the API
  prints the real code in its console.
- **Add a child › Link a hospital record**: `TFH-P-250118-007` with date of birth
  18 Jan 2025 finds Jabari Kamau, who is not linked yet.
- **Register** a new account to try the "What would you like to track?" and "My health"
  steps. A mother who registers gets a hospital record that the portal's Mothers list
  shows straight away.
- **Everything is saved** in PostgreSQL. The session (a token) and the selected profile
  are kept in localStorage; an expired session sends you back to the sign-in page.
- **One record, two apps.** Njeri's son is the same patient (`baraka-m`) in both apps.
  Children you add yourself stay "pending" until the hospital confirms them.

## Sitemap

The profile switcher at the top of the sidebar (and the chips on the overview)
chooses **Me** or a child. The navigation follows it.

| Code      | Route                           | Screen                                                                                                                                           |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1        | `/sign-in`                      | Sign in (password or SMS code)                                                                                                                   |
| M1        | `/register`                     | Account → What to track (pregnancy / baby / both) → My health → Your baby → Confirm phone                                                        |
| —         | `/forgot-password`              | Phone → SMS code → new password                                                                                                                  |
| M2 / W3   | `/family`                       | Overview: the "Me" dashboard (pregnancy week or postnatal status, next visit, Td due, latest BP and weight, danger signs) or a child's dashboard |
| M3        | `/family/me`                    | My health record: details, blood group, allergies, conditions, medicines, pregnancy history; doctor-updated items read-only                      |
| M4        | `/family/me/pregnancy`          | Pregnancy tracker: week of 40, trimester, baby's size, guidance, danger signs, next visit                                                        |
| M5        | `/family/me/antenatal`          | The 8 antenatal contacts with status and what is checked                                                                                         |
| M6        | `/family/me/antenatal/:visitId` | One antenatal visit: BP, weight, fundal height, heartbeat, Hb, urine, supplements, note                                                          |
| M7        | `/family/me/progress`           | Weight and blood-pressure charts with the normal range shaded, plus a table                                                                      |
| M8        | `/family/me/vaccines`           | Maternal Td doses, planned vs given                                                                                                              |
| M9        | `/family/me/postnatal`          | Delivery summary, postnatal visits, recovery checks, family planning, link to the baby                                                           |
| W4        | `/family/health`                | Child's health profile                                                                                                                           |
| W5        | `/family/vaccines`              | Child's KEPI vaccines, plus the **Optional (paid)** vaccines the hospital offers                                                                 |
| W10       | `/family/vaccines/:doseId`      | Vaccine dose detail                                                                                                                              |
| W6        | `/family/visits`                | Visits: Pending requests, proposed times (accept / decline), upcoming and past                                                                   |
| M10 / W12 | `/family/visits/new`            | Book: who → visit type → doctor → day and time → note → review → "Request sent" (`?for=`, `?type=`, `?reschedule=`)                              |
| W7        | `/family/messages/:id?`         | Messages                                                                                                                                         |
| M11 / W9  | `/family/notifications`         | Notifications, including antenatal, postnatal, Td, request and record-update notices                                                             |
| W11       | `/family/card`                  | Vaccination card and school share link                                                                                                           |
| W13       | `/family/children/new`          | Add a child (link a hospital record or enter details)                                                                                            |
| W8        | `/family/settings`              | Profile, reminders, language, **Who can see my records** (Tumaini care team and consent date), security                                          |
| W14       | `/family/help`                  | Help & support                                                                                                                                   |

### Flows

- **Booking request → confirmation.** The mother sends a request from Visits ›
  Book. It shows as amber **Pending**. The hospital confirms it (→ Upcoming),
  proposes another time (the mother accepts or declines in Visits), or declines it with
  a reason. Each outcome arrives as a notification.
- **Mother–infant linking.** The baby appears under the mother's profile switcher.
  The hospital links the record at delivery, or the mother links an existing record
  with its patient ID and date of birth. Postnatal care (M9) links to the baby's record.
- **Optional vaccines.** On a child's Vaccines page, switching an optional vaccine on
  adds planned doses tagged "Optional (paid)"; switching it off removes the ones not
  yet given.

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
    ├── api/                 All data access: one function per API call (client.js does the HTTP)
    │   ├── client.js        http(): API base URL, token, ApiError, change events
    │   ├── auth.js          sign in, SMS code, password reset, registration
    │   ├── children.js      children, overview, health profile, find/link/add a child
    │   ├── growth.js        measurements
    │   ├── immunizations.js doses, dose detail, school share links
    │   ├── appointments.js  visits, booking options, free slots, requests, proposals
    │   ├── messages.js      conversations, read state, sending
    │   ├── notifications.js notifications, unread counts
    │   ├── maternal.js      the mother's overview, health record, pregnancy, ANC,
    │   │                    progress, Td doses and postnatal care
    │   ├── settings.js      profile, reminders, language, record access, password
    │   └── help.js          help articles
    ├── components/          Small reusable UI pieces
    │   ├── Button, IconButton, Input, Select, Textarea, Checkbox, Switch,
    │   │   SegmentedControl, Tabs, OptionCard, ChoicePill, CodeInput, FieldMessage
    │   ├── Card, Badge, CountPill, Avatar, DateTile, StatTile, ProgressBar, Table,
    │   │   Accordion, Alert, Breadcrumb, PageHeader, Logo, QRPlaceholder, ChatBubble,
    │   │   GrowthChart
    │   ├── Modal, Drawer, EmptyState, ErrorState, Skeleton, AsyncContent, PageLoader
    │   ├── MaternalCharts (weight, blood pressure), DangerSigns
    │   └── Sidebar, BottomTabs, ChildSwitcher (profile switcher), RequireChild,
    │       RequireMe, ProtectedRoute, ScrollToTop
    ├── context/
    │   ├── AuthContext.jsx  { user, role: 'caregiver' } + signIn / signOut
    │   └── ChildContext.jsx selected profile ("me" or a child), saved to localStorage
    ├── data/counties.js     Kenya's counties for the profile form
    ├── hooks/               useAsync (loading/error/data), useDataVersion,
    │                        useUnreadCounts, useCountdown, useMediaQuery, useDocumentTitle
    ├── layouts/
    │   ├── FamilyLayout.jsx 264px sidebar; top bar, drawer and bottom tabs below 1024px
    │   └── AuthLayout.jsx   Top-bar layout (W2) and split sign-in layout (W1)
    ├── pages/               One file per screen (see the sitemap); pages/me/ holds
    │                        the mother's own screens (M2–M9)
    └── utils/               dates.js (formatting, ages, days overdue), pregnancy.js
                             (gestational age, due date, ANC/PNC schedules, sizes,
                             danger signs), format.js (phone, email, password
                             strength), profile.js, calendar.js (.ics), storage.js, cx.js
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
  choose "Save as PDF". The API could later return a generated PDF instead.
- The **QR code** on the vaccination card is a placeholder pattern, not a scannable
  code.
- Notifications are listed newest first.

## The API

Pages only import functions from `src/api/*`. Each one is a single call to the
Enfantil API through `http()` in `src/api/client.js`, which:

- adds the session token (`Authorization: Bearer …`) from localStorage or sessionStorage,
- turns error responses into `ApiError` with the server's `message`, and `field` for the
  input to highlight, so forms show errors inline,
- signs you out and returns to `/sign-in` when the session has expired,
- tells `useDataVersion` after every change, so lists and sidebar badges refresh.

Validation used by forms for instant errors (`validateBooking`, `validateHealth`,
`validateHealthItem`) stays in the app; the API checks the same rules again.
The API's routes are listed in `backend/README.md`.

The "Email app support" button uses `support@enfantil.app`; change `SUPPORT_EMAIL` in
`src/pages/Help.jsx` to the real address.
