# Kosh Desktop Tray (Optional)

This folder is an isolated Windows tray MVP for Kosh. It is optional and does not run unless you start it.

## Run

From repo root:

```bash
npm run desktop:install
npm run desktop:dev
```

Prerequisite:

- Kosh web app running at `http://localhost:3000` (`npm run dev`)

## Behavior

- Adds a system tray icon.
- Click tray icon to toggle compact panel.
- Panel loads `http://localhost:3000/tray`.
- Context menu:
  - Open Dashboard
  - Open Tray Panel
  - Quit

## Disable

- Stop tray process.
- Do not run `desktop:*` scripts.

## Remove

1. Delete `desktop/`.
2. Remove `desktop:*` scripts from root `package.json`.
