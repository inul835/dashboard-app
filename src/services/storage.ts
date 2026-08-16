import { invoke } from './tauri'

export type Task = {
  id: number
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
}

const LS_KEY = 'cc.tasks.v1'

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
    const tasks = (await invoke<Task[]>('get_tasks')) || []
    return tasks
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return parsed.tasks || []
  }
}

export async function createTask(payload: Omit<Task, 'id'>): Promise<Task> {
  try {
    const task = await invoke<Task>('create_task', { task: payload })
    return task
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const id = parsed.next_id++
    const task = { id, ...payload }
    parsed.tasks.push(task)
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return task
  }
}

export async function updateTask(task: Task): Promise<Task> {
  try {
    const updated = await invoke<Task>('update_task', { updated: task })
    return updated
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const pos = parsed.tasks.findIndex((t: Task) => t.id === task.id)
    if (pos >= 0) parsed.tasks[pos] = task
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return task
  }
}

export async function deleteTask(id: number): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_task', { id })
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY)!
    const parsed = JSON.parse(raw)
    const orig = parsed.tasks.length
    parsed.tasks = parsed.tasks.filter((t: Task) => t.id !== id)
    localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return parsed.tasks.length !== orig
  }
}
