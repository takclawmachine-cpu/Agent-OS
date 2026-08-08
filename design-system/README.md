# Agent OS Design System

Phase 1 source of truth for shared visual tokens, iconography, permissions, and global state treatments.

## Files

- `tokens.css`: colors, typography, spacing, radius, elevation, motion, notification, voice, live-state, and permission tokens.
- `icons.js`: one 24px, 1.8-stroke SVG symbol registry injected once per document.

## Theme Contract

Dark mode is the first-run default. Light mode is selected by applying `theme-light` to `body`. User preference persistence belongs to the app shell, not to individual modules.

Components consume semantic tokens such as `--surface-raised`, `--text-secondary`, and `--status-error`; modules must not introduce private color systems.

## Permission Contract

The shell sets `data-role="admin|operator|viewer"` on `body`.

Controls declare the minimum capability with `data-permission="write|admin"`:

- `admin`: sees all controls.
- `operator`: write controls are visible; admin controls are hidden.
- `viewer`: both write and admin controls are hidden.

Backend authorization remains mandatory in Phase 2. This convention controls visibility only.

## Notification Contract

Notification count badges use `--notification-bg`, `--notification-text`, and `--notification-ring`. The count is hidden at zero rather than rendering an empty badge.

## Voice Contract

The shell sets `data-voice-state="idle|listening|transcribing|error"` on `body`. Every microphone entry point uses the shared voice tokens and must provide text fallback when state is `error`.

## Live Contract

Every real-time surface uses the same `.live-tag` and `.live-dot` treatment backed by `--live-color`, `--live-bg`, and `--live-pulse-duration`.

## Icon Contract

Use `<svg class="icon"><use href="#i-name"/></svg>`. Icons are grouped in `icons.js`; modules do not define private sprites. Required shell/action icons include `i-folder`, `i-terminal`, `i-plug`, and `i-report`.
