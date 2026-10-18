# Recall

Recall is an online workspace for capturing engineering context. It organizes projects and tickets, records progress and work logs, and makes the next action easy to recover later.

The repository contains an Expo mobile/web client, an Express API backed by PostgreSQL and Prisma, and an optional desktop integration script.

## Repository Layout

- `app/` - Expo Router application for Android, iOS, and web.
- `backend/` - Express API, Prisma schema, migrations, Neon Auth JWT verification, and AI summary endpoints.
- `script/` - Optional desktop integration for clipboard and Git events.

## Requirements

- Node.js 20 or newer
- npm
- Expo CLI through the local Expo dependency
- Android Studio for Android development, or Xcode for iOS development
- A PostgreSQL database, such as Neon
- A Neon Auth project

## App Setup

```bash
cd app
npm install
```

Create `app/.env`:

```env
BACKEND_URL=http://localhost:3000
NEON_AUTH_URL=https://<neon-auth-host>/neondb/auth
EXPO_PUBLIC_NEON_AUTH_CALLBACK_URL=recall://auth/callback
EXPO_PUBLIC_NEON_AUTH_ORIGIN=http://localhost:8081
```

Start the app:

```bash
npm start
```

Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

For a production Android build:

```bash
npm run android:prod
```

The app uses Neon Auth for sign-in. After login, the Neon JWT is stored securely on the device and sent to the backend with every authenticated API request.

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
ENVIRONMENT=dev
DEV_DATABASE_URL=postgresql://...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEON_AUTH_URL=https://<neon-auth-host>/neondb/auth
GROQ_API_KEY=gsk_...
PORT=3000
```

Use `ENVIRONMENT=dev` for `DEV_DATABASE_URL`. Use `ENVIRONMENT=prod` for `DIRECT_URL` or `DATABASE_URL`.

Generate Prisma Client and apply migrations:

```bash
npm run db:generate
npm run db:deploy
```

Start the API:

```bash
npm start
```

Start it in development mode:

```bash
npm run dev
```

The public health endpoint is available at `GET /`. Workspace, summary, import/export, clipboard, and Git routes require a valid Neon Auth JWT.

## Data and Backups

Workspace data is stored in the online PostgreSQL database. The Settings screen can export a JSON backup and upload a compatible backup directly to the backend. Importing a backup replaces the current online workspace data.

Never commit `.env` files, database URLs, API keys, service-account files, or JWTs.

## Database Commands

Run these from `backend/`:

```bash
npm run db:format
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:push
npm run db:studio
```

Use migrations for shared or production environments. Use `db:push` only when intentionally synchronizing a development database without creating a migration.

## Authentication

The app obtains a JWT from Neon Auth after sign-in. The backend validates the token signature, issuer, and expiration using Neon Auth JWKS. The backend must have the same `NEON_AUTH_URL` configured as the app.

A valid login token is required for application API requests. The API does not use a separate static app token.

## Validation

App typecheck:

```bash
cd app
npx tsc --noEmit
```

Backend syntax checks:

```bash
cd backend
node --check index.js
node --check middleware/requireNeonAuth.js
```

## Release

The current mobile release is `2.0.0`. Release notes are maintained in [app/CHANGELOG.md](app/CHANGELOG.md).

For a new release:

1. Move the entries from `[Unreleased]` into a dated version section.
2. Update the version in `app/app.config.js`, `app/package.json`, and `app/package-lock.json`.
3. Run the app validation commands.
4. Build and publish through the configured EAS profile.

## Documentation

Product capabilities and workflows are documented in [app/FEATURES.md](app/FEATURES.md).
