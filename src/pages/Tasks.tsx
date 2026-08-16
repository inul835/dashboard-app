import { useEffect, useMemo, useState } from 'react'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
  type Subtask,
} from '../services/storage'
import { Plus, Search, List, X, Edit, Trash, Check } from 'lucide-react'

type ViewMode = 'list' | 'kanban'
type RangeTab = 'all' | 'today' | 'upcoming' | 'completed'


function isToday(d?: string | null) {
  if (!d) return false
  const today = new Date()
  const dt = new Date(d)
  return (
    dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate()
  )
}

function isOverdue(task: Task) {
  if (!task.due_date) return false
  const due = new Date(task.due_date as string)
  const now = new Date()
  if (task.status === 'Completed') return false
  return due < new Date(now.toDateString()) // compare dates only
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [tab, setTab] = useState<RangeTab>('all')
  const [query, setQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority' | 'alpha'>('created')
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)

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

  const stats = useMemo(() => {
    const total = tasks.length
    const today = tasks.filter((t) => isToday(t.due_date)).length
    const completed = tasks.filter((t) => t.status === 'Completed').length
    const pending = tasks.filter((t) => t.status !== 'Completed').length
    const overdue = tasks.filter((t) => isOverdue(t)).length
    return { total, today, completed, pending, overdue }
  }, [tasks])

  const categories = useMemo(() => {
    const s = new Set<string>()
    tasks.forEach((t) => { if (t.category) s.add(t.category) })
    return Array.from(s)
  }, [tasks])

  function matchesQuery(t: Task) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    if (t.title.toLowerCase().includes(q)) return true
    if ((t.description || '').toLowerCase().includes(q)) return true
    if ((t.category || '').toLowerCase().includes(q)) return true
    if ((t.tags || []).some((tg) => tg.toLowerCase().includes(q))) return true
    return false
  }

  const filtered = tasks
    .filter((t) => {
      if (tab === 'today') return isToday(t.due_date)
      if (tab === 'upcoming') return t.due_date && !isToday(t.due_date) && new Date(t.due_date) > new Date()
      if (tab === 'completed') return t.status === 'Completed'
      return true
    })
    .filter((t) => (filterPriority ? t.priority === filterPriority : true))
    .filter((t) => (filterCategory ? t.category === filterCategory : true))
    .filter(matchesQuery)

  const sorted = filtered.sort((a, b) => {
    if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortBy === 'due') return (a.due_date ? new Date(a.due_date).getTime() : 0) - (b.due_date ? new Date(b.due_date).getTime() : 0)
    if (sortBy === 'priority') {
      const order = { Urgent: 4, High: 3, Medium: 2, Low: 1 } as any
      return (order[b.priority] || 0) - (order[a.priority] || 0)
    }
    return a.title.localeCompare(b.title)
  })

  async function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  async function onSave(task: Partial<Task> & { id?: number }) {
    if (task.id) {
      const updated = await updateTask(task as any)
      setTasks((s) => s.map((x) => (x.id === updated.id ? updated : x)))
    } else {
      const created = await createTask(task as any)
      setTasks((s) => [created, ...s])
    }
    setShowForm(false)
  }

  async function onDelete(id: number) {
    const ok = await deleteTask(id)
    if (ok) setTasks((s) => s.filter((t) => t.id !== id))
  }

  const kanbanCols = {
    Todo: sorted.filter((t) => t.status === 'Todo'),
    'In Progress': sorted.filter((t) => t.status === 'In Progress'),
    Completed: sorted.filter((t) => t.status === 'Completed'),
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="action-button primary" onClick={openNew}><Plus size={14} /> New Task</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
            <Search size={14} />
            <input placeholder="Search tasks..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }} />
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={tab} onChange={(e) => setTab(e.target.value as RangeTab)} style={{ padding: '8px 10px', borderRadius: 10 }}>
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>

          <select value={filterPriority ?? ''} onChange={(e) => setFilterPriority(e.target.value || null)} style={{ padding: '8px 10px', borderRadius: 10 }}>
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          <select value={filterCategory ?? ''} onChange={(e) => setFilterCategory(e.target.value || null)} style={{ padding: '8px 10px', borderRadius: 10 }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 10 }}>
            <option value="created">Newest</option>
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="alpha">A → Z</option>
          </select>

          <button className="action-button" onClick={() => setView(view === 'list' ? 'kanban' : 'list')}><List size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <div className="metric-card">
          <div className="metric-header"><strong>Total</strong></div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><strong>Today</strong></div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.today}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><strong>Pending</strong></div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.pending}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><strong>Overdue</strong></div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.overdue}</div>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        view === 'list' ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {sorted.map((t) => (
              <div key={t.id} className="panel" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={t.status === 'Completed'} onChange={async () => { const updated = await updateTask({ ...t, status: t.status === 'Completed' ? 'Todo' : 'Completed' }); setTasks((s) => s.map(x => x.id === updated.id ? updated : x)) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>{t.title}</strong>
                    <div style={{ color: '#9aa8c3' }}>{t.priority} • {t.due_date ?? 'No due'}</div>
                  </div>
                  <p style={{ margin: '8px 0', color: '#9fb0d7' }}>{t.description}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="chip">{t.category || 'No category'}</span>
                    {t.tags.map((tg) => <span key={tg} className="chip">#{tg}</span>)}
                    <span style={{ marginLeft: 'auto', color: isOverdue(t) ? '#ff8b8b' : '#8ea1c0' }}>{isOverdue(t) ? 'Overdue' : ''}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <small>{t.subtasks.length > 0 ? `${t.subtasks.filter(s=>s.completed).length} / ${t.subtasks.length} subtasks` : ''}</small>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="action-button" onClick={() => { setEditing(t); setShowForm(true) }}><Edit size={14} /></button>
                  <button className="action-button" onClick={() => onDelete(t.id)}><Trash size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            {(['Todo','In Progress','Completed'] as const).map((col) => (
              <div key={col} style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0 }}>{col}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kanbanCols[col as keyof typeof kanbanCols].map((t) => (
                    <div key={t.id} className="panel" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{t.title}</strong>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="action-button" onClick={() => { setEditing(t); setShowForm(true) }}><Edit size={14} /></button>
                          <button className="action-button" onClick={() => onDelete(t.id)}><Trash size={14} /></button>
                        </div>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <small style={{ color: '#9fb0d7' }}>{t.description}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <TaskForm
          task={editing}
          onCancel={() => setShowForm(false)}
          onSave={(t) => onSave(t)}
        />
      )}
    </div>
  )
}

function TaskForm({ task, onCancel, onSave }:
  { task: Task | null; onCancel: ()=>void; onSave: (t: Partial<Task>)=>void }){
  const [title, setTitle] = useState(task?.title||'')
  const [description, setDescription] = useState(task?.description||'')
  const [status, setStatus] = useState<Task['status']>(task?.status||'Todo')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority||'Medium')
  const [due_date, setDueDate] = useState<string | null>(task?.due_date||null)
  const [due_time, setDueTime] = useState<string | null>(task?.due_time||null)
  const [category, setCategory] = useState(task?.category||'')
  const [tags, setTags] = useState((task?.tags||[]).join(', '))
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks||[])
  const [recurrence, setRecurrence] = useState(task?.recurrence||'None')

  function addSubtask(){
    const nextId = (subtasks.length? Math.max(...subtasks.map(s=>s.id))+1 : 1)
    setSubtasks(s=>[...s,{id: nextId,title:'',completed:false}])
  }

  function updateSubtask(id:number, patch: Partial<Subtask>){
    setSubtasks(s=>s.map(x=> x.id===id? {...x,...patch}: x))
  }

  function save(){
    const tagArr = tags.split(',').map(s=>s.trim()).filter(Boolean)
    const payload: Partial<Task> = {
      id: task?.id,
      title,
      description,
      status,
      priority,
      due_date,
      due_time,
      category,
      tags: tagArr,
      subtasks,
      recurrence,
    }
    onSave(payload)
  }

  return (
    <div style={{ position: 'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }} onClick={onCancel}></div>
      <div style={{ background:'#0f1724', padding:20, borderRadius:12, width:720, maxWidth:'95%', zIndex:50 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h3 style={{ margin:0 }}>{task? 'Edit Task': 'New Task'}</h3>
          <div style={{ display:'flex', gap:8 }}>
            <button className="action-button" onClick={onCancel}><X size={14} /></button>
            <button className="action-button primary" onClick={save}><Check size={14} /></button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:12 }}>
          <div>
            <label style={{ display:'block', marginBottom:6 }}>Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} style={{ width:'100%', padding:10, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.06)' }} />

            <label style={{ display:'block', margin:'12px 0 6px' }}>Description</label>
            <textarea value={description||''} onChange={e=>setDescription(e.target.value)} style={{ width:'100%', minHeight:120, padding:10, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.06)' }} />

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <div style={{ flex:1 }}>
                <label>Category</label>
                <input value={category} onChange={e=>setCategory(e.target.value)} style={{ width:'100%', padding:8, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.06)' }} />
              </div>

              <div style={{ flex:1 }}>
                <label>Tags (comma separated)</label>
                <input value={tags} onChange={e=>setTags(e.target.value)} style={{ width:'100%', padding:8, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.06)' }} />
              </div>
            </div>

            <div style={{ marginTop:12 }}>
              <label>Subtasks</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                {subtasks.map(s=> (
                  <div key={s.id} style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="checkbox" checked={s.completed} onChange={()=> updateSubtask(s.id,{completed:!s.completed})} />
                    <input value={s.title} onChange={e=> updateSubtask(s.id,{title:e.target.value})} style={{ flex:1, padding:8, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.04)' }} />
                    <button className="action-button" onClick={()=> setSubtasks(st=>st.filter(x=>x.id!==s.id))}><X size={12} /></button>
                  </div>
                ))}
                <button className="action-button" onClick={addSubtask}><Plus size={12}/> Add subtask</button>
              </div>
            </div>
          </div>

          <div>
            <label>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value as any)} style={{ width:'100%', padding:8, borderRadius:8 }}>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <label style={{ marginTop:8 }}>Priority</label>
            <select value={priority} onChange={e=>setPriority(e.target.value as any)} style={{ width:'100%', padding:8, borderRadius:8 }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <label style={{ marginTop:8 }}>Due date</label>
            <input type="date" value={due_date||''} onChange={e=> setDueDate(e.target.value||null)} style={{ width:'100%', padding:8, borderRadius:8 }} />

            <label style={{ marginTop:8 }}>Due time</label>
            <input type="time" value={due_time||''} onChange={e=> setDueTime(e.target.value||null)} style={{ width:'100%', padding:8, borderRadius:8 }} />

            <label style={{ marginTop:8 }}>Recurrence</label>
            <select value={recurrence} onChange={e=>setRecurrence(e.target.value)} style={{ width:'100%', padding:8, borderRadius:8 }}>
              <option value="None">None</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
