# Workflow Desktop App Architecture

## 1. Design principles

- Local-first by default
- Offline functionality without internet dependency
- Manual cloud interactions only
- Single desktop command-center interface for daily life management
- Fast and modular UI with minimal clutter

## 2. Platform architecture

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS with a dark, minimal design system
- Desktop runtime: Tauri for native desktop packaging and OS integration
- Local persistence: SQLite for structured local data
- Optional cloud mode: Supabase Storage or equivalent for manual file uploads

## 3. Storage strategy

### Offline mode
- Tasks are stored on local SQLite
- Notes, finance, study data, projects, and files remain local
- Music and movie references use local file/folder metadata
- The app is fully usable without internet access

### Online mode
- Cloud files are accessed only when the user manually switches modes
- Upload/download actions are explicit and user-triggered
- No automatic sync, no background upload, no cloud backup
- The cloud view only exposes manually selected files and data

## 4. Core modules

1. Home dashboard
2. Tasks and planning
3. Files and local filesystem access
4. Accounts (placeholder, under development)
5. Projects
6. Music
7. Movies
8. Study
9. Finance
10. Notes
11. Settings and configuration

## 5. Data model direction

The application should evolve around a SQLite schema with entities such as:

- tasks
- subtasks
- projects
- project_tasks
- notes
- files
- movies
- music
- subjects
- study_sessions
- exams
- finance_transactions
- finance_categories
- settings
- cloud_files

Each entity should use proper foreign keys and indexes, and the app should keep local data ownership central.

## 6. Phase 1 implementation

This project phase includes the foundational layer:

- project bootstrap with Tauri + Vite
- React TypeScript shell
- sidebar navigation
- dark workspace design
- dashboard overview
- storage mode selector
- architectural foundations for future persistence and cloud operations

## 7. Next phases

- Phase 2: tasks, notes, projects
- Phase 3: files, music, movies
- Phase 4: study and finance
- Phase 5: manual cloud upload/download/delete flows
- Phase 6: global search, command palette, notifications, settings
- Phase 7: polish, performance, packaging, and release hardening

## 8. Development guardrails

- Do not depend on internet for base functionality
- Do not silently fail on files or database operations
- Do not upload data without explicit user choice
- Protect sensitive data; avoid plaintext credentials
- Keep UI minimal, responsive, and readable
