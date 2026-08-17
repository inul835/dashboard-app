import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, List, Grid, Edit3, Trash2 } from 'lucide-react'
import { getProjects, createProject, updateProject, deleteProject } from '../services/storage'

type Project = {
  id: number
  name: string
  description?: string
  status: 'Planning'|'Active'|'On Hold'|'Completed'|'Archived'
  priority: 'Low'|'Medium'|'High'|'Urgent'
  icon?: string
  color?: string
  tags: string[]
  start_date?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
  archived: boolean
}

function ProjectsPage(){
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', archived: false })
  const [q, setQ] = useState('')
  const [view, setView] = useState<'grid'|'list'>('grid')
  const [sortBy, setSortBy] = useState<'updated'|'due'|'created'|'alpha'>('updated')
  const [editing, setEditing] = useState<Project | null>(null)

  useEffect(()=>{ (async ()=>{
    const items = await getProjects()
    setProjects(items)
  })() }, [])

  const visible = useMemo(()=>{
    const sq = q.trim().toLowerCase()
    return projects.filter(p=>{
      if (!p) return false
      if (filter.archived && !p.archived) return false
      if (!filter.archived && p.archived) return false
      if (filter.status !== 'all' && p.status !== filter.status) return false
      if (filter.priority !== 'all' && p.priority !== filter.priority) return false
      if (sq){
        const hay = `${p.name} ${p.description || ''} ${(p.tags||[]).join(' ')}`.toLowerCase()
        return hay.includes(sq)
      }
      return true
    }).sort((a,b)=>{
      switch(sortBy){
        case 'due': return (a.due_date||'').localeCompare(b.due_date||'')
        case 'created': return (b.created_at||'').localeCompare(a.created_at||'')
        case 'alpha': return a.name.localeCompare(b.name)
        default: return (b.updated_at||'').localeCompare(a.updated_at||'')
      }
    })
  },[projects, filter, q, sortBy])

  async function onCreate(){
    const name = window.prompt('Project name') || 'New Project'
    const proj = await createProject({ name })
    setProjects((p)=>[proj, ...p])
    setEditing(proj)
  }

  async function onDelete(p: Project){
    if (!confirm(`Delete project ${p.name}? This will not delete linked tasks or notes.`)) return
    await deleteProject(p.id)
    setProjects((cur)=>cur.filter(x=> x.id !== p.id))
  }

  return (
    <div className="panel">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2>Projects</h2>
          <p className="eyebrow">Workspaces and projects</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="ghost-button" onClick={()=> setView(view==='grid'?'list':'grid')}>{view==='grid'?<List/>:<Grid/>}</button>
          <button className="primary-button" onClick={onCreate}><Plus size={14}/> New Project</button>
        </div>
      </div>

      <div style={{marginTop:12}} className="card-surface">
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <label className="input-wrap"><Search size={14}/> <input placeholder="Search projects" value={q} onChange={(e)=> setQ(e.target.value)} /></label>
          <select className="mini-select" value={filter.status as string} onChange={(e)=> setFilter({...filter, status: e.target.value})}>
            <option value="all">All statuses</option>
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
          <select className="mini-select" value={filter.priority as string} onChange={(e)=> setFilter({...filter, priority: e.target.value})}>
            <option value="all">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select className="mini-select" value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)}>
            <option value="updated">Recently updated</option>
            <option value="due">Due date</option>
            <option value="created">Created</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>
      </div>

      <div style={{marginTop:12, display: view==='grid' ? 'grid' : 'block', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap:12}}>
        {visible.map(p=> (
          <div key={p.id} className="panel card-surface" style={{padding:12}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <strong>{p.name}</strong>
              <div style={{display:'flex',gap:6}}>
                <button className="ghost-button" onClick={()=> setEditing(p)}><Edit3 size={14}/></button>
                <button className="ghost-button danger" onClick={()=> onDelete(p)}><Trash2 size={14}/></button>
              </div>
            </div>
            <div style={{marginTop:8,color:'#9baecb'}}>{p.description}</div>
            <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <small className="chip">{p.status}</small>
                <small className="chip">{p.priority}</small>
                <small className="chip">{(p.tags||[]).join(', ')}</small>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,color:'#9baecb'}}>Due</div>
                <div>{p.due_date || '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="panel" style={{marginTop:12}}>
          <h3>Edit Project</h3>
          <input value={editing.name} onChange={(e)=> setEditing({...editing, name: e.target.value})} />
          <textarea value={editing.description||''} onChange={(e)=> setEditing({...editing, description: e.target.value})} />
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <select value={editing.status} onChange={(e)=> setEditing({...editing, status: e.target.value as any})}>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
            <select value={editing.priority} onChange={(e)=> setEditing({...editing, priority: e.target.value as any})}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <button className="primary-button" onClick={async ()=>{
              const updated = await updateProject(editing)
              setProjects((cur)=> cur.map(x=> x.id===updated.id? updated: x))
              setEditing(null)
            }}>Save</button>
            <button className="ghost-button" onClick={()=> setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
