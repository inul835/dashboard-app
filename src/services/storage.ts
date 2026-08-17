import { invoke } from './tauri'

export type Subtask = {
  id: number
  title: string
  completed: boolean
}

export type Task = {
  id: number
  title: string
  description?: string | null
  status: 'Todo' | 'In Progress' | 'Completed'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date?: string | null // YYYY-MM-DD
  due_time?: string | null // HH:MM
  category?: string
  tags: string[]
  created_at: string
  updated_at: string
  subtasks: Subtask[]
  recurrence: 'None' | 'Daily' | 'Weekly' | 'Monthly' | string
}

const LS_KEY = 'cc.tasks.v1'

function normalizeTask(raw: any): Task {
  const now = new Date().toISOString()
  return {
    id: Number(raw.id) || 0,
    title: raw.title || '',
    description: raw.description ?? null,
    status: raw.status === 'In Progress' || raw.status === 'Completed' ? raw.status : 'Todo',
    priority: ['Low', 'Medium', 'High', 'Urgent'].includes(raw.priority) ? raw.priority : 'Medium',
    due_date: raw.due_date ?? null,
    due_time: raw.due_time ?? null,
    category: raw.category ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : (raw.tags ? String(raw.tags).split(',').map(s=>s.trim()).filter(Boolean) : []),
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || (raw.created_at || now),
    subtasks: Array.isArray(raw.subtasks)
      ? raw.subtasks.map((s: any, idx: number) => ({ id: Number(s.id) || idx + 1, title: s.title || '', completed: !!s.completed }))
      : [],
    recurrence: raw.recurrence || 'None',
  }
}

async function tauriAvailable() {
  try {
    await invoke('db_init')
    return true
  } catch (e) {
    return false
  }
}

export async function initStorage() {
  const ok = await tauriAvailable()
  if (ok) return { mode: 'tauri' as const }
  // ensure localStorage key exists
  if (!localStorage.getItem(LS_KEY)) {
    const initial = { tasks: [], next_id: 1 }
    localStorage.setItem(LS_KEY, JSON.stringify(initial))
  }
  return { mode: 'local' as const }
}

export async function getTasks(): Promise<Task[]> {
  try {
    const raw = (await invoke<any[]>('get_tasks')) || []
    return raw.map(normalizeTask)
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return (parsed.tasks || []).map(normalizeTask)
  }
}

function buildDefaults(payload: Partial<Task>) {
  const now = new Date().toISOString()
  return {
    title: payload.title || '',
    description: payload.description ?? null,
    status: payload.status || 'Todo',
    priority: payload.priority || 'Medium',
    due_date: payload.due_date ?? null,
    due_time: payload.due_time ?? null,
    category: payload.category || '',
    tags: payload.tags || [],
    created_at: payload.created_at || now,
    updated_at: payload.updated_at || (payload.created_at || now),
    subtasks: payload.subtasks || [],
    recurrence: payload.recurrence || 'None',
  }
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const built = buildDefaults(payload)
  try {
    const task = await invoke<any>('create_task', { task: { ...built, id: 0 } })
    return normalizeTask(task)
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const id = parsed.next_id++
    const task = normalizeTask({ id, ...built })
    parsed.tasks.push(task)
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return task
  }
}

export async function updateTask(task: Partial<Task> & { id: number }): Promise<Task> {
  const built = { ...task }
  built.updated_at = new Date().toISOString()
  try {
    const updated = await invoke<any>('update_task', { updated: built })
    return normalizeTask(updated)
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const pos = parsed.tasks.findIndex((t: any) => Number(t.id) === Number(task.id))
    const merged = { ...(parsed.tasks[pos] || {}), ...built }
    parsed.tasks[pos] = merged
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return normalizeTask(merged)
  }
}

export async function deleteTask(id: number): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_task', { id })
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const orig = parsed.tasks.length
    parsed.tasks = parsed.tasks.filter((t: any) => Number(t.id) !== Number(id))
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return parsed.tasks.length !== orig
  }
}

// Notes API
const NOTES_LS_KEY = 'cc.notes.v1'

function normalizeNote(raw: any) {
  const now = new Date().toISOString()
  return {
    id: Number(raw.id) || 0,
    title: raw.title || '',
    content: raw.content || '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : (raw.tags ? String(raw.tags).split(',').map((s:any)=>s.trim()).filter(Boolean) : []),
    category: raw.category || '',
    pinned: !!raw.pinned,
    favorite: !!raw.favorite,
    archived: !!raw.archived,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || (raw.created_at || now),
  }
}

export type Note = {
  id: number
  title: string
  content: string
  tags: string[]
  category: string
  pinned: boolean
  favorite: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export async function getNotes(): Promise<Note[]> {
  try {
    const raw = (await invoke<any[]>('get_notes')) || []
    return raw.map(normalizeNote)
  } catch (e) {
    const raw = localStorage.getItem(NOTES_LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return (parsed.notes || []).map(normalizeNote)
  }
}

export async function createNote(payload: Partial<ReturnType<typeof normalizeNote>>): Promise<any> {
  const now = new Date().toISOString()
  const built = {
    title: payload.title || 'Untitled note',
    content: payload.content || '',
    tags: payload.tags || [],
    category: payload.category || '',
    pinned: !!payload.pinned,
    favorite: !!payload.favorite,
    archived: !!payload.archived,
    created_at: payload.created_at || now,
    updated_at: payload.updated_at || (payload.created_at || now),
  }
  try {
    const note = await invoke<any>('create_note', { note: { ...built, id: 0 } })
    return normalizeNote(note)
  } catch (e) {
    const raw = localStorage.getItem(NOTES_LS_KEY)
    let parsed: any
    if (!raw) {
      parsed = { notes: [], next_note_id: 1 }
    } else {
      parsed = JSON.parse(raw)
    }
    const id = parsed.next_note_id++
    const note = normalizeNote({ id, ...built })
    parsed.notes.unshift(note)
    localStorage.setItem(NOTES_LS_KEY, JSON.stringify(parsed))
    return note
  }
}

export async function updateNote(payload: Partial<ReturnType<typeof normalizeNote>> & { id: number }) {
  const built = { ...(payload as any), updated_at: new Date().toISOString() }
  try {
    const updated = await invoke<any>('update_note', { updated: built })
    return normalizeNote(updated)
  } catch (e) {
    const raw = localStorage.getItem(NOTES_LS_KEY)!
    const parsed = JSON.parse(raw)
    const pos = parsed.notes.findIndex((n: any) => Number(n.id) === Number(payload.id))
    const merged = { ...(parsed.notes[pos] || {}), ...built }
    parsed.notes[pos] = merged
    localStorage.setItem(NOTES_LS_KEY, JSON.stringify(parsed))
    return normalizeNote(merged)
  }
}

export async function deleteNote(id: number): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_note', { id })
  } catch (e) {
    const raw = localStorage.getItem(NOTES_LS_KEY)!
    const parsed = JSON.parse(raw)
    const orig = parsed.notes.length
    parsed.notes = parsed.notes.filter((n: any) => Number(n.id) !== Number(id))
    localStorage.setItem(NOTES_LS_KEY, JSON.stringify(parsed))
    return parsed.notes.length !== orig
  }
}

// File metadata APIs
const FILES_LS_KEY = 'cc.files.v1'

export type FilePreferenceState = {
  rootFolder?: string
  defaultView?: 'grid' | 'list'
  sortBy?: 'name' | 'modified' | 'size' | 'type'
  sortDirection?: 'asc' | 'desc'
  fileTypeFilter?: string
  favorites: string[]
  recentFiles: Array<{ path: string; name: string; openedAt: string }>
}

function readFilePreferenceState(): FilePreferenceState {
  if (typeof window === 'undefined') {
    return { favorites: [], recentFiles: [] }
  }

  const raw = window.localStorage.getItem(FILES_LS_KEY)
  if (!raw) {
    return { favorites: [], recentFiles: [] }
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      rootFolder: parsed.rootFolder || undefined,
      defaultView: parsed.defaultView === 'grid' || parsed.defaultView === 'list' ? parsed.defaultView : 'grid',
      sortBy: ['name', 'modified', 'size', 'type'].includes(parsed.sortBy) ? parsed.sortBy : 'name',
      sortDirection: parsed.sortDirection === 'desc' ? 'desc' : 'asc',
      fileTypeFilter: parsed.fileTypeFilter || 'all',
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((value: unknown) => typeof value === 'string') : [],
      recentFiles: Array.isArray(parsed.recentFiles)
        ? parsed.recentFiles
            .filter((value: any) => value && typeof value.path === 'string')
            .map((value: any) => ({
              path: String(value.path),
              name: typeof value.name === 'string' ? value.name : value.path.split(/[\\/]/).pop() || 'File',
              openedAt: typeof value.openedAt === 'string' ? value.openedAt : new Date().toISOString(),
            }))
        : [],
    }
  } catch (error) {
    return { favorites: [], recentFiles: [] }
  }
}

function writeFilePreferenceState(state: FilePreferenceState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FILES_LS_KEY, JSON.stringify(state))
}

export async function getFilePreferences(): Promise<FilePreferenceState> {
  return readFilePreferenceState()
}

export async function saveFilePreferences(nextPrefs: Partial<FilePreferenceState>): Promise<FilePreferenceState> {
  const current = readFilePreferenceState()
  const merged = {
    ...current,
    ...nextPrefs,
    favorites: Array.isArray(nextPrefs.favorites) ? nextPrefs.favorites : current.favorites,
    recentFiles: Array.isArray(nextPrefs.recentFiles) ? nextPrefs.recentFiles : current.recentFiles,
  }
  writeFilePreferenceState(merged)
  return merged
}

export async function getFavoriteFiles(): Promise<string[]> {
  const prefs = readFilePreferenceState()
  return prefs.favorites
}

export async function addFavoriteFile(path: string): Promise<void> {
  const prefs = readFilePreferenceState()
  const normalized = path.trim()
  if (!normalized) return
  const favorites = Array.from(new Set([...(prefs.favorites || []), normalized]))
  writeFilePreferenceState({ ...prefs, favorites })
}

export async function removeFavoriteFile(path: string): Promise<void> {
  const prefs = readFilePreferenceState()
  const nextFavorites = (prefs.favorites || []).filter((favorite) => favorite !== path)
  writeFilePreferenceState({ ...prefs, favorites: nextFavorites })
}

export async function getRecentFiles(): Promise<Array<{ path: string; name: string; openedAt: string }>> {
  const prefs = readFilePreferenceState()
  return (prefs.recentFiles || []).slice(0, 10)
}

export async function addRecentFile(path: string, name?: string): Promise<void> {
  const prefs = readFilePreferenceState()
  const normalizedPath = path.trim()
  if (!normalizedPath) return

  const nextRecent = [
    { path: normalizedPath, name: name || normalizedPath.split(/[\\/]/).pop() || 'File', openedAt: new Date().toISOString() },
    ...((prefs.recentFiles || []).filter((item) => item.path !== normalizedPath)),
  ].slice(0, 10)

  writeFilePreferenceState({ ...prefs, recentFiles: nextRecent })
}
