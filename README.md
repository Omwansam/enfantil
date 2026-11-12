# Enfantil

**Infant and Maternal Health Management System** for Tumaini Family Hospital, Kiambu Road, Kiambu.
Mothers follow their pregnancy, antenatal and postnatal care and their children's vaccines and growth.
Doctors and nurses record visits, answer appointment requests and message families. Everyone works
from one shared database.

| Part                                  | Folder               | Opens at              |
| ------------------------------------- | -------------------- | --------------------- |
| API (Express + Prisma + PostgreSQL)   | `backend/`           | http://localhost:5000 |
| Family app (mothers and caregivers)   | `frontend/enfantil/` | http://localhost:5173 |
| Clinician portal (doctors and nurses) | `client/clinician/`  | http://localhost:5174 |

The steps below work on Windows (PowerShell or Command Prompt), macOS and Linux. Every command
is typed the same way in all of them unless a step says otherwise.

---

## 1. Install the three tools you need

Install each one once per computer. After installing, **close and reopen your terminal** so it
can find the new programs.

| Tool                                       | Get it from                                               | Check it works            |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------- |
| **Node.js** 22 or 24 (LTS), at least 20.19 | https://nodejs.org (the LTS button). npm comes with it.   | `node -v` and `npm -v`    |
| **PostgreSQL** 14 or newer                 | See [Installing PostgreSQL](#installing-postgresql) below | (the setup step tests it) |
| **Git** (optional)                         | https://git-scm.com/downloads                             | `git --version`           |

Without Git you can download the project as a ZIP instead (see step 2).

## 2. Get the code

With Git:

```bash
git clone https://github.com/Omwansam/enfantil.git
cd enfantil
```

Without Git: on the GitHub page click **Code → Download ZIP**, unzip it, and open a terminal in
the unzipped `enfantil` folder.

> **Opening a terminal in a folder**
>
> - **Windows:** open the folder in File Explorer, click the address bar, type `powershell` (or
>   `cmd`) and press Enter. On Windows 11 you can also right-click the folder → _Open in Terminal_.
> - **macOS:** open _Terminal_, type `cd ` (with a space), drag the folder into the window, press Enter.
> - **VS Code:** _File → Open Folder…_, then _Terminal → New Terminal_.

## 3. Set everything up (one command)

From the `enfantil` folder:

```bash
npm run setup
```

This installs everything for all three parts and prepares the database.

**The first time, it stops and asks for your database details.** That is expected, and npm may
print some red "npm error" lines after the message. It has created the file `backend/.env`:

1. Open `backend/.env` in a text editor:
   - Windows: `notepad backend\.env`
   - macOS: `open -e backend/.env`
   - Linux: `nano backend/.env` (save with Ctrl+O, Enter, then exit with Ctrl+X)
2. Change the `DATABASE_URL` line to your PostgreSQL login:

   ```
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/enfantil"
   ```

   The format is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. The `enfantil` database is
   created for you if it doesn't exist. Use the user and password you chose when installing
   PostgreSQL ([which one?](#installing-postgresql)). If the password contains `@ # / : ?`,
   either pick a simpler one or write those characters as `%40 %23 %2F %3A %3F`.

3. Save the file and run the setup again:

   ```bash
   npm run setup
   ```

   It ends with **"✔ The API is set up."** It has created the tables and loaded the demo patients.

## 4. Start it

```bash
npm run dev
```

This starts all three parts in one window. Each line is labelled `[api]`, `[family]` or
`[portal]`. Wait until you see `Enfantil API on http://localhost:5000`, then open:

- **Family app:** http://localhost:5173
- **Clinician portal:** http://localhost:5174

To stop everything, press **Ctrl + C** in that window. On Windows, answer `Y` if it asks
"Terminate batch job?".

## 5. Sign in

| App    | Login           | Password      | Who                                           |
| ------ | --------------- | ------------- | --------------------------------------------- |
| Family | `0712 345 678`  | `Amani2026!`  | Wanjiru Kamau: had baby Amani in February     |
| Family | `0723 118 406`  | `Njeri2026!`  | Njeri Mwangi: 26 weeks pregnant, son Baraka   |
| Portal | `TFH-PAED-0217` | `Clinic2026!` | Dr. Achieng Otieno, Paediatrician             |
| Portal | `TFH-OBG-0105`  | `Clinic2026!` | Dr. Grace Wanjala, Obstetrician-Gynaecologist |

Things to try:

- As Njeri, book a visit (**Visits → Book appointment**). Then, as Dr. Otieno, open **Requests**
  and confirm it. Njeri gets a notification.
- Where an SMS code is asked for (SMS sign-in, forgot password, registration, linking a child),
  type any 6 digits. `000000` shows the "wrong code" message. No SMS service is connected yet.
- **Add a child → Link a hospital record** with `TFH-P-250118-007` and date of birth 18 Jan 2025.

---

## Everyday commands

Run these from the `enfantil` folder.

| Command         | What it does                                                                    |
| --------------- | ------------------------------------------------------------------------------- |
| `npm run dev`   | Start the API, the family app and the portal                                    |
| `npm run seed`  | Reset the database to the demo data. **Everything you added is replaced.**      |
| `npm run setup` | Install everything again and reset the demo data (after pulling new code)       |
| `npm run build` | Production builds of both apps (`dist/` folders)                                |
| `npm test`      | Quick check of the API: run it while `npm run dev` is running in another window |

To browse the database tables in your browser: `npm run db:studio --prefix backend`.

## Doing it by hand (three terminals)

If you prefer separate windows, or the one-command setup doesn't suit you:

1. **Terminal 1: the API**

   ```bash
   cd backend
   npm install
   npm run setup
   npm run dev
   ```

   `npm run setup` creates `.env` (edit `DATABASE_URL`, then run it again), creates the tables and
   loads the demo data. To create `.env` yourself instead, copy `.env.example`:
   - PowerShell: `Copy-Item .env.example .env`
   - Command Prompt: `copy .env.example .env`
   - macOS / Linux: `cp .env.example .env`

   Then put a long random value after `JWT_SECRET=`. This prints one:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **Terminal 2: the family app**

   ```bash
   cd frontend/enfantil
   npm install
   npm run dev
   ```

3. **Terminal 3: the clinician portal**

   ```bash
   cd client/clinician
   npm install
   npm run dev
   ```

On Windows you can write paths with `\` or `/` (`cd frontend\enfantil` works too).

---

## Installing PostgreSQL

You only need it running on your computer and a username and password for it. You don't have to
create anything inside it: the setup step does that.

**Windows**

1. Download the installer from https://www.postgresql.org/download/windows/ and run it.
2. Keep the default port **5432**. When it asks for a password for the **postgres** user, choose
   one and write it down. Stack Builder at the end is not needed.
3. Your `DATABASE_URL` is `postgresql://postgres:THAT_PASSWORD@localhost:5432/enfantil`.

**macOS**

- Easiest: install **Postgres.app** from https://postgresapp.com, open it and click _Initialize_.
  The user is your Mac username with no password:
  `DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/enfantil"`
- Or with Homebrew: `brew install postgresql@17` then `brew services start postgresql@17` (same
  user, no password).

**Linux (Ubuntu / Debian)**

```bash
sudo apt install postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

Then use `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/enfantil"`.

**Optional: a separate database user (recommended on a shared server).** In `psql` or pgAdmin's
Query Tool, run:

```sql
CREATE USER enfantil WITH PASSWORD 'choose-a-password';
CREATE DATABASE enfantil OWNER enfantil;
```

Then use `postgresql://enfantil:choose-a-password@localhost:5432/enfantil`.

---

## Troubleshooting

| You see                                                                                   | What to do                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PowerShell: `npm.ps1 cannot be loaded because running scripts is disabled on this system` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and answer `Y`. Or use Command Prompt, or type `npm.cmd` instead of `npm`.                                                                                                                                                                                                                        |
| `'node' is not recognized…` / `command not found: npm`                                    | Node.js is not installed, or the terminal was open before you installed it. Install it from nodejs.org, then close and reopen the terminal.                                                                                                                                                                                                                      |
| `Authentication failed` / `password authentication failed for user` (P1000)               | The user or password in `DATABASE_URL` is wrong. Check `backend/.env`, including `%40`-style codes for special characters.                                                                                                                                                                                                                                       |
| `Can't reach database server at localhost:5432` (P1001)                                   | PostgreSQL isn't running, or uses another port. **Windows:** open _Services_, find _postgresql-x64-…_, click _Start_. **macOS:** open Postgres.app, or `brew services start postgresql@17`. **Linux:** `sudo systemctl start postgresql`. Check the port in `DATABASE_URL`.                                                                                      |
| `permission denied to create database`                                                    | Your user can't create databases. Create it with the SQL above, or use the `postgres` user.                                                                                                                                                                                                                                                                      |
| `The database has no data yet`                                                            | Run `npm run seed`.                                                                                                                                                                                                                                                                                                                                              |
| `JWT_SECRET is missing…`                                                                  | Run `npm run setup`; it adds one to `backend/.env`.                                                                                                                                                                                                                                                                                                              |
| `Port 5000 is already in use`                                                             | **On a Mac this is usually AirPlay Receiver:** turn it off in _System Settings → General → AirDrop & Handoff_. Or pick another port: set `PORT=5050` in `backend/.env`, then create `frontend/enfantil/.env` with `VITE_API_URL=http://localhost:5050/api/family` and `client/clinician/.env` with `VITE_API_URL=http://localhost:5050/api/clinic`, and restart. |
| The apps open on a different port than 5173 / 5174                                        | Another program is using those ports, and the API refuses unknown addresses. Close the other program, or add the new address to `CORS_ORIGINS` in `backend/.env` and restart.                                                                                                                                                                                    |
| The app says _"We couldn't reach Enfantil"_ or _"…the Enfantil server"_                   | The API is not running or crashed. Look at the `[api]` lines in the `npm run dev` window for the reason.                                                                                                                                                                                                                                                         |
| `Cannot find module '…/generated/prisma/client'`                                          | Run `npm run db:generate --prefix backend` (or `npm install` inside `backend`).                                                                                                                                                                                                                                                                                  |
| You are suddenly back on the sign-in page                                                 | Your session expired (8 hours for staff, 30 days for families) or the database was reset. Sign in again.                                                                                                                                                                                                                                                         |

**Opening the apps on a phone on the same Wi-Fi (optional).** Find your computer's IP address
(Windows: `ipconfig`; macOS / Linux: `ipconfig getifaddr en0` or `hostname -I`), for example
`192.168.1.20`. Then:

1. Set `VITE_API_URL=http://192.168.1.20:5000/api/family` in `frontend/enfantil/.env` (and
   `…/api/clinic` in `client/clinician/.env`).
2. Add `http://192.168.1.20:5173,http://192.168.1.20:5174` to `CORS_ORIGINS` in `backend/.env`.
3. Start the API with `npm run dev` in `backend`, and each app with `npm run dev -- --host` in its own folder (`frontend/enfantil`, `client/clinician`). The `--host` part does not work with the all-in-one `npm run dev`.
4. Allow Node.js through the firewall if Windows asks.

---

## What's in the project

```text
enfantil/
  package.json        npm run setup / dev / seed / build / test for everything
  backend/            The API and the database (Prisma schema, migrations, demo data) → backend/README.md
  frontend/enfantil/  Family web app (React + Vite)                                  → frontend/enfantil/README.md
  client/clinician/   Clinician portal (React + Vite)                                → client/clinician/README.md
  Mobile/enfantil-app Expo starter for a future phone app (not connected to the API yet)
```

- `backend/.env` holds your database password and the login-token secret. It is not stored in Git,
  so every computer makes its own with `npm run setup`.
- `backend/README.md` explains the settings, the database tables, all API routes and what to change
  before real patients use the system (SMS provider, HTTPS, backups).
