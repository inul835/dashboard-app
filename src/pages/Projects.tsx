import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Search, List, Grid, Edit3, Trash2, ArrowLeft, Tag, Calendar, FileText, Clipboard } from 'lucide-react'
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  attachTaskToProject,
  detachTaskFromProject,
  getNotes,
  createNote,
  attachNoteToProject,
  detachNoteFromProject,
  attachFileToProject,
  detachFileFromProject,
} from '../services/storage'

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
  files?: Array<{ path: string; name?: string }>
}

function ProjectsPage(){
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', archived: false })
  const [q, setQ] = useState('')
  const [view, setView] = useState<'grid'|'list'>('grid')
  const [sortBy, setSortBy] = useState<'updated'|'due'|'created'|'alpha'>('updated')
  const [editing, setEditing] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview'|'tasks'|'notes'|'files'>('overview')

  useEffect(()=>{ (async ()=>{
    const items = await getProjects()
    setProjects(items)
    const t = await getTasks()
    setTasks(t)
    const n = await getNotes()
    setNotes(n)
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

  function openProject(p: Project){
    setSelectedProject(p)
    setActiveTab('overview')
  }

  function closeProject(){
    setSelectedProject(null)
    setActiveTab('overview')
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
          <div key={p.id} className="panel card-surface" style={{padding:12, cursor:'pointer'}} onClick={()=> openProject(p)}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <strong>{p.name}</strong>
              <div style={{display:'flex',gap:6}}>
                <button className="ghost-button" onClick={(e)=>{ e.stopPropagation(); setEditing(p)}}><Edit3 size={14}/></button>
                <button className="ghost-button danger" onClick={(e)=>{ e.stopPropagation(); onDelete(p)}}><Trash2 size={14}/></button>
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

      {selectedProject && (
        <div className="panel" style={{marginTop:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <button className="ghost-button" onClick={closeProject}><ArrowLeft/></button>
              <div>
                <h2>{selectedProject.name}</h2>
                <div style={{color:'#9baecb'}}>{selectedProject.description}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="ghost-button"><Tag/> {selectedProject.tags?.join(', ')}</button>
              <button className="ghost-button"><Calendar/> {selectedProject.due_date || '—'}</button>
              <button className="primary-button" onClick={()=> setEditing(selectedProject)}>Edit Project</button>
            </div>
          </div>

          <div style={{marginTop:12,display:'flex',gap:12}}>
            <div style={{display:'flex',gap:8}}>
              <button className={`chip ${activeTab==='overview'?'active':''}`} onClick={()=> setActiveTab('overview')}>Overview</button>
              <button className={`chip ${activeTab==='tasks'?'active':''}`} onClick={()=> setActiveTab('tasks')}><Clipboard/> Tasks</button>
              <button className={`chip ${activeTab==='notes'?'active':''}`} onClick={()=> setActiveTab('notes')}><FileText/> Notes</button>
              <button className={`chip ${activeTab==='files'?'active':''}`} onClick={()=> setActiveTab('files')}><FileText/> Files</button>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:8}}>
              <button className="action-button" onClick={async ()=>{
                const t = await createTask({ title: 'New Task', project_id: selectedProject.id })
                setTasks((cur)=> [t, ...cur])
              }}><Plus/> New Task</button>
              <button className="action-button" onClick={async ()=>{
                const n = await createNote({ title: 'New Note', content: '', project_id: selectedProject.id })
                setNotes((cur)=> [n, ...cur])
              }}><Plus/> New Note</button>
            </div>
          </div>

          <div style={{marginTop:12}}>
            {activeTab === 'overview' && (
              <Overview project={selectedProject} tasks={tasks.filter(t=> t.project_id === selectedProject.id)} notes={notes.filter(n=> n.project_id === selectedProject.id)} />
            )}

            {activeTab === 'tasks' && (
              <ProjectTasks project={selectedProject} tasks={tasks} setTasks={setTasks} onAttach={async (taskId:number)=>{ await attachTaskToProject(taskId, selectedProject.id); const tlist = await getTasks(); setTasks(tlist) }} onDetach={async (taskId:number)=>{ await detachTaskFromProject(taskId, selectedProject.id); const tlist = await getTasks(); setTasks(tlist) }} />
            )}

            {activeTab === 'notes' && (
              <ProjectNotes project={selectedProject} notes={notes} setNotes={setNotes} onAttach={async (noteId:number)=>{ await attachNoteToProject(noteId, selectedProject.id); const nlist = await getNotes(); setNotes(nlist) }} onDetach={async (noteId:number)=>{ await detachNoteFromProject(noteId, selectedProject.id); const nlist = await getNotes(); setNotes(nlist) }} />
            )}

            {activeTab === 'files' && (
              <ProjectFiles files={selectedProject.files || []} onAttach={async (file)=>{ await attachFileToProject(selectedProject.id, file); const projs = await getProjects(); const p = projs.find(x=> x.id === selectedProject.id); if (p) setSelectedProject(p) }} onDetach={async (path)=>{ await detachFileFromProject(selectedProject.id, path); const projs = await getProjects(); const p = projs.find(x=> x.id === selectedProject.id); if (p) setSelectedProject(p) }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Overview({ project, tasks, notes }:{ project: Project; tasks:any[]; notes:any[] }){
  const total = tasks.length
  const completed = tasks.filter(t=> t.status === 'Completed').length
  const progress = total === 0 ? 0 : Math.round((completed/total)*100)
  const filesCount = (project as any).files ? (project as any).files.length : 0
  const daysLeft = project.due_date ? Math.max(0, Math.ceil((new Date(project.due_date).getTime() - Date.now())/(1000*60*60*24))) : null
  return (
    <div className="card-surface" style={{padding:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h3 style={{margin:0}}>{project.name}</h3>
          <div style={{color:'#9baecb'}}>{project.description}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,color:'#9baecb'}}>Progress</div>
          <div style={{fontSize:18,fontWeight:700}}>{progress}%</div>
        </div>
      </div>

      <div style={{display:'flex',gap:12,marginTop:12}}>
        <div className="stat-card">
          <div className="stat-title">Tasks</div>
          <div className="stat-value">{completed} / {total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Notes</div>
          <div className="stat-value">{notes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Files</div>
          <div className="stat-value">{filesCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Due</div>
          <div className="stat-value">{project.due_date || '—'}{daysLeft!==null?` · ${daysLeft}d left`:''}</div>
        </div>
      </div>
    </div>
  )
}

function ProjectTasks({ project, tasks, setTasks, onAttach, onDetach }:{ project: Project; tasks:any[]; setTasks: Dispatch<SetStateAction<any[]>>; onAttach: (id:number)=>Promise<void>; onDetach: (id:number)=>Promise<void> }){
  const list = tasks.filter(t=> Number(t.project_id) === Number(project.id))
  const unassigned = tasks.filter(t=> !t.project_id || Number(t.project_id) !== Number(project.id))

  async function toggleComplete(t:any){
    const updated = { ...t, status: t.status === 'Completed' ? 'Todo' : 'Completed' }
    await updateTaskLocal(updated)
  }

  async function updateTaskLocal(updated:any){
    try{
      const res = await (await import('../services/storage')).updateTask(updated)
      setTasks((cur:any[])=> cur.map(c=> c.id===res.id? res: c))
    }catch(e){ console.error(e) }
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button className="action-button" onClick={async ()=>{ const title = prompt('Task title')||'New Task'; const t = await createTask({ title, project_id: project.id }); setTasks((cur)=> [t, ...cur]) }}>+ New task</button>
        <div style={{marginLeft:'auto'}}>
          <select onChange={async (e)=>{ const id = Number(e.target.value); if (!id) return; await onAttach(id); const t = await getTasks(); setTasks(t) }}>
            <option value="">Attach existing task...</option>
            {unassigned.map(u=> <option key={u.id} value={u.id}>{u.title}</option>)}
          </select>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {list.map(t=> (
          <div key={t.id} className="card-surface" style={{padding:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <strong>{t.title}</strong>
              <div style={{color:'#9baecb'}}>{t.priority} · {t.due_date||'—'}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="action-button" onClick={async ()=> toggleComplete(t)}>{t.status==='Completed'?'Undo':'Done'}</button>
              <button className="action-button" onClick={async ()=>{ await onDetach(t.id); const tlist = await getTasks(); setTasks(tlist) }}>Detach</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function ProjectNotes({ project, notes, setNotes, onAttach, onDetach }:{ project: Project; notes:any[]; setNotes: Dispatch<SetStateAction<any[]>>; onAttach: (id:number)=>Promise<void>; onDetach: (id:number)=>Promise<void> }){
  const list = notes.filter(n=> Number(n.project_id) === Number(project.id))
  const unassigned = notes.filter(n=> !n.project_id || Number(n.project_id) !== Number(project.id))

  async function create(){
    const title = prompt('Note title') || 'New Note'
    const n = await createNote({ title, content:'', project_id: project.id })
    setNotes((cur)=> [n, ...cur])
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button className="action-button" onClick={create}>+ New note</button>
        <div style={{marginLeft:'auto'}}>
          <select onChange={async (e)=>{ const id = Number(e.target.value); if (!id) return; await onAttach(id); const n = await getNotes(); setNotes(n) }}>
            <option value="">Attach existing note...</option>
            {unassigned.map(u=> <option key={u.id} value={u.id}>{u.title}</option>)}
          </select>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {list.map(n=> (
          <div key={n.id} className="card-surface" style={{padding:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <strong>{n.title}</strong>
              <div style={{color:'#9baecb'}}>{n.tags?.join(', ')}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="action-button" onClick={async ()=>{ // open in Notes page
                try{ window.localStorage.setItem('workflow-open-note', String(n.id)); window.location.href = window.location.pathname + "#notes"; window.location.reload(); }catch(e){ console.error(e) }
              }}>Open</button>
              <button className="action-button" onClick={async ()=>{ await onDetach(n.id); const list = await getNotes(); setNotes(list) }}>Detach</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectFiles({ files, onAttach, onDetach }:{ files:any[]; onAttach: (f:{path:string;name?:string})=>Promise<void>; onDetach: (path:string)=>Promise<void> }){
  async function doAttach(){
    const p = prompt('Enter file or folder path to attach')
    if (!p) return
    await onAttach({ path: p, name: undefined })
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button className="action-button" onClick={doAttach}>+ Attach file/folder</button>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {files.map((f:any)=> (
          <div key={f.path} className="card-surface" style={{padding:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <strong>{f.name || (f.path||'')}</strong>
              <div style={{color:'#9baecb'}}>{f.path}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="action-button" onClick={async ()=>{ try{ await (await import('../services/storage')).addRecentFile(f.path, f.name); }catch(e){ console.error(e) } }}>Open</button>
              <button className="action-button" onClick={async ()=>{ await onDetach(f.path) }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProjectsPage
