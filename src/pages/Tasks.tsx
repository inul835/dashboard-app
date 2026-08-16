import { useEffect, useState } from 'react'
import { createTask, deleteTask, getTasks, updateTask, type Task } from '../services/storage'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const t = await getTasks()
      if (!mounted) return
      setTasks(t)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleAdd() {
    if (!newTitle.trim()) return
    const payload = {
      title: newTitle.trim(),
      description: '',
      status: 'Todo',
      priority: 'Medium',
      due_date: null,
    } as any
    const t = await createTask(payload)
    setTasks((s) => [t, ...s])
    setNewTitle('')
  }

  async function toggleComplete(t: Task) {
    const updated = { ...t, status: t.status === 'Completed' ? 'Todo' : 'Completed' }
    await updateTask(updated)
    setTasks((s) => s.map((x) => (x.id === updated.id ? updated : x)))
  }

  async function handleDelete(id: number) {
    const ok = await deleteTask(id)
    if (ok) setTasks((s) => s.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="New task title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} style={{ padding: '8px 12px', borderRadius: 10 }}>Add</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : tasks.length === 0 ? (
        <div>No tasks yet — add one.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.map((t) => (
            <div key={t.id} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={t.status === 'Completed'} onChange={() => toggleComplete(t)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div style={{ color: '#9fb0d7', fontSize: 12 }}>{t.priority} • {t.due_date ?? 'No due'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleDelete(t.id)} style={{ color: '#ff8b8b' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
