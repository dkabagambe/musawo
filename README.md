# Musawo Training Center - Learning Platform

A fully online learning platform for Musawo Training Center (MTC), Kampala, Uganda.
Built with Next.js 14, Prisma, PostgreSQL, and Redis.

---

## Running locally

> Prerequisites: Docker Desktop (or Docker Engine + Compose), Node.js 20, npm.

```bash
# 1. Copy environment file and review values
cp .env.example .env          # already has working local defaults

# 2. Tear down any previous volumes and start the databases
docker compose down -v
docker compose up -d postgres redis

# 3. Run migrations and seed the database
npx prisma migrate dev
npx prisma db seed

# 4. Start the Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed creates accounts you can log in with — all use password **`Demo1234!`**:

| Role                    | Email                              | Portal          |
|-------------------------|------------------------------------|-----------------|
| CEO / Super Admin       | ceo@mtc.ac.ug                      | `/director`     |
| Deputy Director         | deputy@mtc.ac.ug                   | `/director`     |
| Board Member            | board@mtc.ac.ug                    | `/board`        |
| Principal               | principal@mtc.ac.ug                | `/principal`    |
| Deputy Principal        | deputyprincipal@mtc.ac.ug          | `/deputy`       |
| Academic Registrar      | registrar@mtc.ac.ug                | `/registrar`    |
| Finance Officer         | finance@mtc.ac.ug                  | `/finance`      |
| HR / System Admin       | hr@mtc.ac.ug                       | `/admin`        |
| Auditor (read-only)     | auditor@mtc.ac.ug                  | `/auditor`      |
| IT Admin                | itadmin@mtc.ac.ug                  | `/system`       |
| Instructor              | tutor@mtc.ac.ug                    | `/tutor`        |
| Instructor 2 (dual)     | tutor2@mtc.ac.ug                   | `/tutor`        |
| Teaching Assistant      | assistant@mtc.ac.ug                | `/tutor`        |
| Student (new)           | student.new@example.com            | `/dashboard`    |
| Student (pending)       | student.pending@example.com        | `/dashboard`    |
| Student (25% paid)      | student.25@example.com             | `/dashboard`    |
| Student (50% paid)      | student.50@example.com             | `/dashboard`    |
| Student (75% paid)      | student.75@example.com             | `/dashboard`    |
| Student (active)        | student.full@example.com           | `/dashboard`    |
| Student (overdue)       | student.overdue@example.com        | `/dashboard`    |
| Student (completed)     | student.completed@example.com      | `/dashboard`    |
| Student (pending invite)| student.waiting@example.com        | invite link only (PENDING_ACCEPTANCE) |
| Student (disputed)      | student.disputed@example.com       | invite link only (DETAILS_DISPUTED) |

> **One-click dev login:** open [http://localhost:3000/dev/login](http://localhost:3000/dev/login) to sign in as any account instantly without typing credentials. See `docs/DEMO.md` for the full presentation walkthrough.

---

## Environment variables

All variables are documented in `.env.example`.
The key ones for local development are already filled in with safe local defaults:

| Variable            | Local default                                             |
|---------------------|-----------------------------------------------------------|
| `POSTGRES_USER`     | `mtc`                                                     |
| `POSTGRES_PASSWORD` | `mtc12345`                                                |
| `POSTGRES_DB`       | `mtc_db`                                                  |
| `DATABASE_URL`      | `postgresql://mtc:mtc12345@localhost:5432/mtc_db?schema=public` |
| `REDIS_URL`         | `redis://localhost:6379`                                  |

---

## Production deployment (VPS + Caddy)

> **IMPORTANT - security checklist before going live:**
>
> - Generate strong random passwords:
>   ```bash
>   openssl rand -base64 32   # use this for POSTGRES_PASSWORD and NEXTAUTH_SECRET
>   ```
> - In `docker-compose.yml`, **remove** the `ports` mappings from the `postgres`
>   and `redis` services so the database is not reachable from the public internet.
>   Only Caddy (ports 80/443) should be exposed.
> - Firewall ports 5432 and 6379 at the VPS level.
> - Never commit `.env` with real secrets to version control.

```bash
# On the VPS
git pull
cp .env.example .env      # then fill in all production values
docker compose up -d --build
npx prisma migrate deploy
```

---

## Useful commands

```bash
npm run dev           # start dev server
npm test              # run Vitest unit tests
npm run lint          # ESLint
npx tsc --noEmit      # type-check without building
npx prisma studio     # open Prisma Studio on localhost:5555
npx prisma migrate dev --name <name>   # create a new migration
docker compose logs -f app             # tail app logs
docker compose logs -f postgres        # tail database logs
```

---

## Tech stack

| Layer      | Choice                        |
|------------|-------------------------------|
| Framework  | Next.js 14 App Router + TypeScript |
| Styling    | Tailwind CSS v3               |
| ORM        | Prisma + PostgreSQL 16        |
| Auth       | Auth.js v5 (NextAuth)         |
| Payments   | Pesapal v3 + Flutterwave      |
| Video      | Bunny Stream                  |
| Storage    | S3-compatible (Cloudflare R2) |
| Email      | Resend                        |
| SMS        | Africa's Talking              |
| Testing    | Vitest + Playwright           |
| Containers | Docker Compose + Caddy        |
