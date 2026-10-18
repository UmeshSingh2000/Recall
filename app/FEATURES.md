# Recall Features

Recall is an online workspace for keeping the context behind engineering work. It organizes projects and tickets, records what happened during each work session, and makes the next action easy to recover later. Sign-in and backend services provide shared online storage, AI summaries, and automatic work logs from Git commits and desktop clipboard events.

## Core Concepts

- **Projects** group related engineering tickets.
- **Tickets** represent individual pieces of work and retain both task details and personal implementation context.
- **Progress items** provide a checklist for a ticket.
- **Work logs** capture what changed, what remains, the next action, work type, and an optional commit hash.
- **Work sessions** provide a lightweight handoff when pausing one ticket to work on something else.
- **Ticket files** store file paths associated with a work log.

Workspace data is stored in the online Recall backend database.

## Account and Sign-In

Recall requires an account before opening the main workspace.

- **Sign up** uses email and password, then email verification with a one-time code.
- **Sign in** uses email and password.
- Authentication is handled through Neon Auth; the session token is stored securely on the device.
- **Log out** is available in Settings and clears the stored auth token.

The core ticket, project, and work-log experience uses the online backend after sign-in. Sign-in gates access to the app and enables calls to the Recall backend.

## Main Navigation

### Home

The Home tab is a dashboard for resuming work quickly. It includes:

- A date-aware greeting.
- Counts for active, paused or blocked, and completed tickets (including `Live` in the done count).
- A rotating deck of open tickets.
- A short list of active tickets.
- Recently worked-on tickets.
- Quick actions to add a ticket or log progress.
- **Clipboard notifications** in the header on supported native platforms (see below).

### Projects

Projects keep tickets organized by product, service, or codebase. Each project can include:

- Project name.
- Description.
- Optional repository URL.
- Counts of active and completed tickets (`Done` and `Live` count as completed).

Selecting a project opens its ticket list. Projects can be created from the Projects tab.

Projects are loaded directly from the online backend.

Sync state is tracked in local metadata so the bar can be dismissed and restored.

### Tickets

The Tickets tab provides a workspace-wide ticket list. Users can:

- Search by ticket key, title, or project name.
- Filter by status: All, In progress, Paused, Blocked, Review, Product review, Code review, Testing, Live, or Done.
- Pull to refresh the list.
- Review tickets ordered by most recently updated.
- Create a new ticket.
- Open a ticket’s detail view.

A new ticket requires a project, ticket ID, and title. Description and next action are optional. New tickets start with `In progress` status and `Medium` priority.

### Search

Search scans the work memory for matching ticket information, including:

- Ticket key.
- Ticket title.
- Ticket description.
- Next action.
- Work-log descriptions.
- Commit hashes.

Matching tickets open directly into their detail view. The list can be refreshed to pick up new logs.

### Settings

Settings includes appearance, workflow, backend, data, and account controls:

- **Appearance:** System, Light, and Dark (persisted on the device).
- **Workflow:** Optional work sessions toggle and a read-only default sort of Recently updated.
- **Backend:** Save or remove a **Recall API token** in secure storage (used for AI summaries; separate from the sign-in session).
- **Data:** Export all workspace data as a JSON backup, import a compatible backup, or delete all workspace data.
- **Account:** Log out.

The about section shows the current app version (see [CHANGELOG.md](./CHANGELOG.md)).

## Ticket Detail

A ticket detail page is the main place to rebuild context. It includes:

- Ticket key, title, project, status, and priority.
- Horizontal **status** picker for all supported statuses.
- **Summarize ticket** — generates a markdown **AI summary** from ticket context, progress, logs, notes, sessions, and project metadata (requires a Recall API token in Settings).
- Ticket description.
- The latest work session summary (tap through to the related log when available).
- Editable personal context fields:
  - What is this feature?
  - Why am I implementing it?
  - How does it work?
  - Important decisions.
- Progress checklist.
- Editable next action.
- Chronological work history (updates when Git commit logs are ingested).
- Actions to log progress, pause or switch work, mark the ticket done, reopen it, edit it, or delete it.

Marking a ticket `Done` or `Live` records completion time. Reopening returns the ticket to `In progress`.

## Work Log Detail

Opening a work log shows its type, timestamps, description, next action, commit hash, and associated file paths. Users can:

- **Summarize log** — generate a markdown AI summary for that log in context of the ticket and project (requires API token).
- Delete the log (and linked ticket files for that log).
- Navigate back to the parent ticket.

## Logging Progress

The Log progress flow creates a work log for a ticket. A log includes:

- Work type: code, bug fix, investigation, testing, refactoring, documentation, decision, or other.
- What happened, which is required.
- What remains.
- Next action.
- Optional commit hash.
- Optional file paths, separated by commas or new lines.

Saving a log updates the ticket’s next action. If the ticket was paused, logging progress moves it back to `In progress`.

## Pausing and Switching Work

The Pause / switch action creates a handoff before leaving a ticket. It records:

- What was accomplished.
- What remains.
- The first next action.
- Why work is being switched, such as a higher-priority task, a blocker, waiting for someone, taking a break, or being finished for now.

The ticket becomes `Paused`, and the handoff is also added to its work history.

## Statuses and Priorities

Ticket statuses are:

- `In progress`
- `Paused`
- `Blocked`
- `Review`
- `Product review`
- `Code review`
- `Testing`
- `Live`
- `Done`

`Live` and `Done` are treated as completed for counts and deck filtering.

Ticket priorities are:

- `Low`
- `Medium`
- `High`
- `Urgent`

## Git Commit Auto-Logging

On native platforms, Recall listens for **git commit** events from the Recall desktop script and backend:

- Events arrive over a WebSocket connection to the configured backend URL.
- Push notifications can also deliver the same payload when the app is backgrounded.
- Each event is matched to a ticket by **ticket key** (case-insensitive).
- Recall creates a work log with description, commit hash, work type, next action, and optional file paths, skipping duplicates for the same commit hash.
- The ticket detail screen refreshes when a new commit log is saved.

If no ticket matches the key, the event is ignored.

## Clipboard Notifications

On supported native platforms, Recall connects to the configured clipboard notification service. Incoming desktop clipboard text appears in a movable notification bell on Home and can also produce a push notification when the app is in the background.

The clipboard panel:

- Shows up to the ten most recent clipboard messages.
- Displays the received text.
- Copies a selected message back to the device clipboard.
- Removes a message after it is copied.

Clipboard notifications are not active on web. Native notification permissions and the configured push service are required for background notifications.

## Data and Backup Behavior

### Export

Export creates a versioned JSON file containing projects, tickets, progress items, work logs, ticket files, ticket notes, work sessions, and settings.

- Android asks the user to select a destination folder.
- Other supported platforms create the file locally and open the platform share dialog when available.

### Import

Import accepts only a compatible Recall backup with the expected format and version. Importing replaces all current workspace data after confirmation.

### Delete All Data

Delete all data permanently removes every project, ticket, progress item, work log, ticket file, note, work session, and setting after confirmation. This action cannot be undone unless a backup exists.

## Typical Workflow

1. Sign in or create an account.
2. Optionally save a Recall API token in Settings for summaries.
3. Create a project and optionally add its repository URL; sync with the backend when prompted.
4. Create a ticket with its key, title, description, and first next action.
5. Add personal context as the implementation becomes clearer.
6. Use the progress checklist and log work as it happens (manually or via Git commit events from the desktop script).
7. Before switching tasks, record a handoff with the remaining work and next action.
8. Return through Home, Tickets, or Search and continue from the saved context.
9. Use **Summarize ticket** or **Summarize log** when you need a quick narrative for standup or handoff.
10. Mark the ticket `Done` or `Live` when complete, or reopen it if more work is needed.

## Local-First Behavior

Recall initializes its SQLite database when the app starts and reads workspace data locally. Projects, tickets, context, progress, and work logs do not require a remote project-management service for day-to-day use.

Optional cloud-connected features:

- **Sign-in** (Neon Auth) to access the app and authenticated backend APIs.
- **Project sync** between the device and the Recall backend.
- **AI summaries** for tickets and work logs (backend + API token).
- **Git commit** and **clipboard** integrations via the backend WebSocket, push notifications, and desktop script.

Over-the-air (OTA) updates are configured through EAS for supported builds.

## Version

See [CHANGELOG.md](./CHANGELOG.md) for release history. The Settings screen shows the current user-facing version (for example `1.2.1`) and labels the app as online.
