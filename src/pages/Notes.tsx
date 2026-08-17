import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
  getNotes as getNotesService,
  createNote as createNoteService,
  updateNote as updateNoteService,
  deleteNote as deleteNoteService,
  type Note,
} from '../services/storage'
import { Plus, Search, Bookmark, Star, Archive, Trash, Eye } from 'lucide-react'

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 400) {
  let t: any = 0
  return (...args: any[]) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all'|'pinned'|'favorites'|'archived'>('all')
  const [sortBy, setSortBy] = useState<'updated'|'created'|'alpha'>('updated')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const n = await getNotesService()
      if (!mounted) return
      setNotes(n)
      setLoading(false)
      // honor an external request to open a specific note (e.g., from Project workspace)
      try{
        const openId = typeof window !== 'undefined' ? window.localStorage.getItem('workflow-open-note') : null
        if (openId) {
          const idNum = Number(openId)
          const found = n.find(x=> x.id === idNum)
          if (found) setSelectedId(idNum)
          // remove the flag
          if (typeof window !== 'undefined') window.localStorage.removeItem('workflow-open-note')
        }
      }catch(e){ /* ignore */ }
      if (!selectedId && n.length) setSelectedId(n[0].id)
    })()
    return () => { mounted = false }
  }, [])

  const createNew = async () => {
    const note = await createNoteService({ title: 'Untitled note', content: '', tags: [], category: '', pinned: false, favorite: false, archived: false })
    setNotes((s) => [note, ...s])
    setSelectedId(note.id)
  }

  const updateLocal = (updated: Note) => {
    setNotes((s) => s.map((n) => n.id === updated.id ? updated : n))
  }

  const deleteNote = async (id: number) => {
    if (!confirm('Delete this note? This action is permanent.')) return
    const ok = await deleteNoteService(id)
    if (ok) setNotes((s) => s.filter((n) => n.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selected = useMemo(() => notes.find((n) => n.id === selectedId) || null, [notes, selectedId])

  const filtered = notes
    .filter(n => {
      if (filter === 'pinned') return n.pinned
      if (filter === 'favorites') return n.favorite
      if (filter === 'archived') return n.archived
      return true
    })
    .filter(n => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      if (n.title.toLowerCase().includes(q)) return true
      if (n.content.toLowerCase().includes(q)) return true
      if (n.category && n.category.toLowerCase().includes(q)) return true
      if (n.tags && n.tags.some((t: string) => t.toLowerCase().includes(q))) return true
      return false
    })

  const sorted = filtered.sort((a,b)=>{
    if (sortBy === 'updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return a.title.localeCompare(b.title)
  })

  return (
    <div style={{ display:'flex', gap:12 }}>
      <div style={{ width:320 }}>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,0.02)' }}>
            <Search size={14} />
            <input placeholder="Search notes..." value={query} onChange={(e)=> setQuery(e.target.value)} style={{ background:'transparent', border:'none', outline:'none', color:'inherit' }} />
          </div>
          <button className="action-button primary" onClick={createNew}><Plus size={14}/> New</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button className="action-button" onClick={()=> setFilter('all')}>All</button>
          <button className="action-button" onClick={()=> setFilter('pinned')}><Bookmark size={14} /></button>
          <button className="action-button" onClick={()=> setFilter('favorites')}><Star size={14} /></button>
          <button className="action-button" onClick={()=> setFilter('archived')}><Archive size={14} /></button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <select value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)} style={{ padding:8, borderRadius:8 }}>
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'70vh', overflow:'auto' }}>
          {loading ? <div>Loading...</div> : sorted.map(n => (
            <div key={n.id} onClick={()=> setSelectedId(n.id)} style={{ padding:12, borderRadius:10, background: selectedId===n.id ? 'rgba(124,156,255,0.12)' : 'transparent', cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <strong>{n.title || 'Untitled'}</strong>
                <div style={{ color:'#9aa8c3' }}>{new Date(n.updated_at).toLocaleString()}</div>
              </div>
              <div style={{ color:'#9fb0d7', fontSize:13, marginTop:6 }}>{(n.content||'').slice(0,120)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1 }}>
        {selected ? (
          <NoteEditor note={selected} onUpdate={(u)=> updateLocal(u)} onDelete={deleteNote} />
        ) : (
          <div className="panel" style={{ padding:20 }}>
            <h3>No note selected</h3>
            <p>Create a new note or select one from the list.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteEditor({ note, onUpdate, onDelete }:{ note: Note; onUpdate: (n:Note)=>void; onDelete: (id:number)=>void }){
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [mode, setMode] = useState<'edit'|'preview'>('edit')
  const [tags, setTags] = useState((note.tags||[]).join(', '))
  const [category, setCategory] = useState(note.category||'')
  const [pinned, setPinned] = useState(note.pinned)
  const [favorite, setFavorite] = useState(note.favorite)
  const [archived, setArchived] = useState(note.archived)

  useEffect(()=>{
    setTitle(note.title)
    setContent(note.content)
    setTags((note.tags||[]).join(', '))
    setCategory(note.category||'')
    setPinned(note.pinned)
    setFavorite(note.favorite)
    setArchived(note.archived)
  },[note])

  useEffect(()=>{
    const deb = debounce(async ()=>{
    const updated = await updateNoteService({ id: note.id, title: title||'Untitled', content, tags: tags.split(',').map((s:string)=>s.trim()).filter(Boolean), category, pinned, favorite, archived })
      onUpdate(updated)
    },800)
    deb()
    return ()=>{}
  },[title,content,tags,category,pinned,favorite,archived])

  const html = useMemo(()=> {
    try{
      const raw = String(marked.parse(content||''))
      return DOMPurify.sanitize(raw)
    }catch(e){
      return ''
    }
  },[content])

  return (
    <div className="panel">
      <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center' }}>
        <input value={title} onChange={(e)=> setTitle(e.target.value)} style={{ fontSize:20, fontWeight:700, background:'transparent', border:'none', outline:'none', color:'inherit' }} />
        <div style={{ display:'flex', gap:8 }}>
          <button className="action-button" onClick={()=> setMode(mode==='edit'?'preview':'edit')}><Eye size={14} /></button>
          <button className="action-button" onClick={()=> { setPinned((p:boolean)=>!p) }}>{pinned ? 'Unpin' : 'Pin'}</button>
          <button className="action-button" onClick={()=> { setFavorite((f:boolean)=>!f) }}>{favorite ? 'Unfav' : 'Fav'}</button>
          <button className="action-button" onClick={()=> { setArchived((a:boolean)=>!a) }}>{archived ? 'Unarchive' : 'Archive'}</button>
          <button className="action-button" onClick={()=> onDelete(note.id)}><Trash size={14} /></button>
        </div>
      </div>

      <div style={{ display:'flex', gap:12, marginTop:12 }}>
        <div style={{ flex:1 }}>
          {mode === 'edit' ? (
            <textarea value={content} onChange={(e)=> setContent(e.target.value)} style={{ width:'100%', minHeight:'60vh', background:'transparent', border:'1px solid rgba(255,255,255,0.04)', padding:12, borderRadius:8 }} />
          ) : (
            <div style={{ width:'100%', minHeight:'60vh', background:'transparent', border:'1px solid rgba(255,255,255,0.04)', padding:12, borderRadius:8 }} dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>

        <div style={{ width:280 }}>
          <div style={{ marginBottom:8 }}>
            <label>Category</label>
            <input value={category} onChange={(e)=> setCategory(e.target.value)} style={{ width:'100%', padding:8, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.04)' }} />
          </div>
          <div style={{ marginBottom:8 }}>
            <label>Tags</label>
            <input value={tags} onChange={(e)=> setTags(e.target.value)} style={{ width:'100%', padding:8, borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.04)' }} />
          </div>
          <div style={{ marginTop:12, color:'#9aa8c3' }}>Last modified: {new Date(note.updated_at).toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
