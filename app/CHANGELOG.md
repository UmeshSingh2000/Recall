# Changelog

All notable changes to the Recall mobile app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.0.1] - 2026-10-22

### Added

- Added an in-app notifications screen for clipboard notifications.

### Changed

- Enabled pagination for the ticket listing API and its client-side ticket loading flow.
- Added the app color palette and updated theme handling across the interface.

## [2.0.0] - 2026-10-18

### Added

- Caching for projects and ticket listing
- Redux Toolkit workspace cache for projects, tickets, ticket details, and search results.
- Shimmer loading states for Home, Projects, Tickets, and Search.
- Direct backup-file upload from Settings to replace online workspace data.
- Neon Auth JWT protection for application API routes.

### Changed

- Workspace data now uses the online backend instead of local SQLite storage.
- Project, ticket, search, summary, clipboard, and Git API requests use the signed-in Neon Auth session.
- Settings no longer requires a separate static Recall API token.
- Tab screens reuse cached data and only refresh on cache misses or pull-to-refresh.

### Fixed

- Expired JWT handling now refreshes the token before API requests.
- Ticket-detail queries select only required fields to reduce response cost.
- Ticket status updates show an indicator while the server mutation is pending.
- Project, ticket, and work-log detail screens show consistent loading feedback.

## [1.2.1] - 2026-10-18

### Added

- Expo Observe integration for navigation diagnostics (sensitive query params such as `token` filtered from reports).

### Changed

- Updated [FEATURES.md](./FEATURES.md) for sign-in, project sync, AI summaries, Git auto-logging, and expanded ticket statuses.

### Fixed

- Project sync flow and sync bar behavior on the Projects tab.
- Clipboard notification icon placement on Home.

## [1.2.0] - 2026-10-08

### Added

- Bidirectional **project sync** with the Recall backend (push local projects, pull remote projects, dirty-state bar).
- Haptic feedback on tab navigation.
- Toast messages for sync and auth feedback.

### Changed

- Backend API client structure and project typing for sync endpoints.
- Floating tab bar animation behavior.

## [1.1.0] - 2026-09-22

### Added

- **Account sign-in and sign-up** with Neon Auth (email/password and verification).
- Auth-gated navigation and secure session token storage.
- **Recall API token** in Settings (secure store) for backend features.
- **AI summaries** on ticket detail and work log detail screens.
- **Git commit auto-logging** via backend WebSocket and push notification payloads.
- Extended ticket statuses: Product review, Code review, Testing, and Live.
- Work log detail view for associated ticket files.
- Search improvements including work-log matches and refresh.
- OTA update configuration (EAS).
- System / light / dark **theme** with persisted appearance preference.
- Redesigned floating tab bar and refreshed color system.

### Changed

- Production backend URL for summaries and integrations.
- Android build workflow includes prebuild where required.

## [1.0.0] - 2026-09-20

### Added

- Local-first SQLite workspace: projects, tickets, progress items, work logs, ticket files, notes, and work sessions.
- Home dashboard, Projects, Tickets, Search, and Settings tabs.
- Ticket detail with personal context fields, progress checklist, and work history.
- Log progress and pause / switch work flows.
- JSON export, import, and delete-all-data.
- Desktop **clipboard notifications** on native platforms (WebSocket + push).
- Initial [FEATURES.md](./FEATURES.md) product documentation.
