# Recall Features

Recall is a local-first workspace for keeping the context behind engineering work. It organizes projects and tickets, records what happened during each work session, and makes the next action easy to recover later.

## Core Concepts

- **Projects** group related engineering tickets.
- **Tickets** represent individual pieces of work and retain both task details and personal implementation context.
- **Progress items** provide a checklist for a ticket.
- **Work logs** capture what changed, what remains, the next action, work type, and an optional commit hash.
- **Work sessions** provide a lightweight handoff when pausing one ticket to work on something else.
- **Ticket files** store file paths associated with a work log.

All workspace data is stored in a local SQLite database named `recall.db`.

## Main Navigation

### Home

The Home tab is a dashboard for resuming work quickly. It includes:

- A date-aware greeting.
- Counts for active, paused or blocked, and completed tickets.
- A rotating deck of open tickets.
- A short list of active tickets.
- Recently worked-on tickets.
- Quick actions to add a ticket or log progress.

### Projects

Projects keep tickets organized by product, service, or codebase. Each project can include:

- Project name.
- Description.
- Optional repository URL.
- Counts of active and completed tickets.

Selecting a project opens its ticket list. Projects can be created from the Projects tab.

### Tickets

The Tickets tab provides a workspace-wide ticket list. Users can:

- Search by ticket key, title, or project name.
- Filter by status: All, In progress, Paused, Blocked, Review, or Done.
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

Matching tickets open directly into their detail view.

### Settings

Settings includes appearance, workflow, and data controls:

- Appearance choices: System, Light, and Dark.
- Optional work-session toggle.
- Default sort display: Recently updated.
- Export all workspace data as a JSON backup.
- Import a compatible Recall JSON backup.
- Delete all workspace data.

The current appearance and work-session controls are presented in the settings UI. Workspace backup and destructive data actions are functional.

## Ticket Detail

A ticket detail page is the main place to rebuild context. It includes:

- Ticket key, title, project, status, and priority.
- Ticket description.
- The latest work session summary.
- Editable personal context fields:
  - What is this feature?
  - Why am I implementing it?
  - How does it work?
  - Important decisions.
- Progress checklist.
- Editable next action.
- Chronological work history.
- Actions to log progress, pause or switch work, mark the ticket done, reopen it, edit it, or delete it.

Marking a ticket done records its completion time. Reopening it returns it to `In progress`.

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
- `Done`

Ticket priorities are:

- `Low`
- `Medium`
- `High`
- `Urgent`

## Clipboard Notifications

On supported native platforms, Recall connects to the configured clipboard notification service. Incoming desktop clipboard text appears in a movable notification bell and can also produce a push notification when the app is in the background.

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

1. Create a project and optionally add its repository URL.
2. Create a ticket with its key, title, description, and first next action.
3. Add personal context as the implementation becomes clearer.
4. Use the progress checklist and log work as it happens.
5. Before switching tasks, record a handoff with the remaining work and next action.
6. Return through Home, Tickets, or Search and continue from the saved context.
7. Mark the ticket done when complete, or reopen it if more work is needed.

## Local-First Behavior

Recall initializes its SQLite database when the app starts and reads workspace data locally. The app does not require a remote project-management service for its core project, ticket, context, progress, or work-log features. The clipboard notification integration is the exception: it uses the configured WebSocket and push-notification service for cross-device clipboard messages.

## Version

The Settings screen identifies the current app version as `1.0.0` and labels the app as local-first.
