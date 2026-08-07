# Security Operations

## Log Retention And Access

| Data | Retention | Access |
|---|---:|---|
| Reliability application log | 14 days of 5 MB rotated files | Local filesystem operators |
| Realtime events | 14 days | Authenticated project clients |
| Webhook events | 45 days | Admin only |
| Notifications | 90 days | Authenticated project clients |
| Terminal commands | 180 days | Admin only |
| Mail logs | 180 days | Authenticated project clients |
| Backup files | 90 days | Infrastructure filesystem operators |
| Backup records and drill outcomes | 365 days | Admin only |
| Audit log | Indefinite | Admin only |

The companion scheduler applies database retention every minute and marks expired backup files before removing them. Audit records are append-only through the application service layer and are never included in rotation.

## Secret Controls

- `.env*` files, private keys, databases, and backup files are excluded from source control.
- The repository pre-commit hook scans staged additions for high-confidence credential formats.
- CI performs an independent full-history Gitleaks scan and `npm audit --audit-level=high`.
- Rotate a credential immediately if any scanner reports that it entered Git history; deleting only the current file is insufficient.

## Recovery Drills

The scheduler selects each project's newest completed backup when no drill exists in the previous seven days. It verifies the SHA-256 checksum, copies the backup to a temporary sandbox, runs SQLite `integrity_check`, confirms project data exists, records the outcome in `backup_drills`, appends `backup.drill` to the audit log, and removes the sandbox copy.