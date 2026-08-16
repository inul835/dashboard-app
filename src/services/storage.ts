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
