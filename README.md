# Personal Workflow Desktop App

This project is a Windows-first personal digital command center built with React, TypeScript, Vite, and Tauri. It is designed as a local-first workflow system with a deliberate offline-first model and optional manual cloud uploads.

## Architecture

The app is structured around a modular desktop shell:

- UI shell: sidebar navigation, dashboard, top controls
- State layer: local app state and future SQLite-backed persistence
- Data services: tasks, notes, projects, study, finance, files
- Filesystem integration: native local file browsing through Tauri
- Cloud layer: manual upload/download only, no background sync

## Storage Model

- Offline mode is the default and primary mode.
- Online mode is a conscious manual mode for cloud-only operations.
- No automatic backups or sync tasks run in the background.
- Sensitive or private data remains local by default.

## Phase 1 Delivered

This phase includes the foundational architecture and desktop shell:

- Tauri + React + TypeScript + Vite setup
- Tailwind-powered dark UI shell
- Sidebar navigation and active module tracking
- Local-first Home dashboard with personal metrics
- Offline/Online selector with visible state handling
- Placeholder sections for upcoming module expansion

## Planned roadmap

- Phase 1: shell, dashboard, offline selector
- Phase 2: tasks, notes, projects
- Phase 3: files, music, movies
- Phase 4: study and finance
- Phase 5: cloud storage features, manual upload/download
- Phase 6: search, command palette, notifications, settings
- Phase 7: polish, performance, and packaging

## Local development

```bash
npm install
npm run dev
```

For desktop runtime:

```bash
npx tauri dev
```
