import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import {
  ArrowUpRight,
  BellRing,
  BookOpenText,
  Briefcase,
  CheckCheck,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Database,
  FileText,
  Film,
  FolderOpen,
  FolderTree,
  LayoutGrid,
  Music4,
  NotebookText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type SectionId =
  | 'home'
  | 'tasks'
  | 'files'
  | 'accounts'
  | 'projects'
  | 'music'
  | 'movies'
  | 'study'
  | 'finance'
  | 'notes'

type StorageMode = 'offline' | 'online'
type ThemeMode = 'dark' | 'light'

const navItems: Array<{ id: SectionId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: CheckCheck },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'accounts', label: 'Accounts', icon: ShieldCheck },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'music', label: 'Music', icon: Music4 },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'study', label: 'Study', icon: BookOpenText },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'notes', label: 'Notes', icon: NotebookText },
]

const todayTasks = [
  { title: 'Review launch brief', status: 'In Progress', priority: 'High', due: '9:30 AM' },
  { title: 'Submit tax notes', status: 'Todo', priority: 'Medium', due: '12:00 PM' },
  { title: 'Finish literature summary', status: 'Todo', priority: 'High', due: '3:00 PM' },
]

const TaskLoader = lazy(() => import('./pages/Tasks'))

const projectCards = [
  { name: 'Personal OS redesign', progress: 72, due: 'May 18' },
  { name: 'Portfolio refresh', progress: 49, due: 'May 22' },
  { name: 'Budget clean-up', progress: 88, due: 'May 14' },
]

const studyCards = [
  { subject: 'Math', target: '90 min', streak: '7-day streak' },
  { subject: 'Physics', target: '60 min', streak: '3-day streak' },
  { subject: 'Bangla', target: '45 min', streak: 'New goal' },
]

const financeCards = [
  { label: 'Balance', value: '$4,840', delta: '+$340 this month' },
  { label: 'Income', value: '$2,150', delta: '8% above target' },
  { label: 'Expenses', value: '$1,110', delta: '2 large bills cleared' },
]

const notesList = [
  { title: 'Weekly review notes', tag: 'system' },
  { title: 'Project ideas', tag: 'ideas' },
  { title: 'Study checklist', tag: 'study' },
]

const recentFiles = [
  { name: 'resume-v2.pdf', type: 'PDF' },
  { name: 'notes-brief.md', type: 'Markdown' },
  { name: 'launch-plan.xlsx', type: 'Sheet' },
]

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home')
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    if (typeof window === 'undefined') {
      return 'offline'
    }

    const storedMode = window.localStorage.getItem('workflow-storage-mode')
    return storedMode === 'online' || storedMode === 'offline' ? storedMode : 'offline'
  })
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    const storedTheme = window.localStorage.getItem('workflow-theme')
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('workflow-theme', themeMode)
    }
  }, [themeMode])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('workflow-storage-mode', storageMode)
    }
  }, [storageMode])

  const pageTitle = useMemo(
    () => navItems.find((item) => item.id === activeSection)?.label ?? 'Home',
    [activeSection],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">C</div>
          <div>
            <p className="brand-name">Command Center</p>
            <p className="brand-subtitle">Life OS</p>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${activeSection === id ? 'active' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-card">
            <Database size={15} />
            <div>
              <span className="label">Storage</span>
              <strong>{storageMode === 'offline' ? 'Local mode' : 'Cloud mode'}</strong>
            </div>
          </div>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal command center</p>
            <h1>{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" className="primary-button">
              <Plus size={15} />
              New Task
            </button>
          </div>
        </header>

        <section className="content-body">
          {activeSection === 'home' && (
            <>
              <div className="metrics-grid">
                <div className="metric-card accent">
                  <div className="metric-header">
                    <CheckCircle2 size={16} />
                    <span>Tasks</span>
                  </div>
                  <strong>7</strong>
                  <small>2 due today</small>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <TrendingUp size={16} />
                    <span>Study</span>
                  </div>
                  <strong>4h 30m</strong>
                  <small>+25 min this week</small>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <Wallet size={16} />
                    <span>Finance</span>
                  </div>
                  <strong>$4,840</strong>
                  <small>Monthly balance</small>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <BellRing size={16} />
                    <span>Alerts</span>
                  </div>
                  <strong>3</strong>
                  <small>Deadlines and reminders</small>
                </div>
              </div>

              <div className="panel-grid">
                <div className="panel panel-wide">
                  <div className="panel-header">
                    <h2>Today</h2>
                    <span>3 tasks</span>
                  </div>

                  <div className="task-list">
                    {todayTasks.map((task) => (
                      <div className="task-item" key={task.title}>
                        <div className="task-bullet" />
                        <div className="task-copy">
                          <strong>{task.title}</strong>
                          <div className="meta-row">
                            <span>{task.status}</span>
                            <span>{task.priority}</span>
                            <span>{task.due}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2>Projects</h2>
                    <ArrowUpRight size={15} />
                  </div>
                  <div className="stack-list">
                    {projectCards.map((project) => (
                      <div key={project.name} className="stack-item">
                        <div className="stack-topline">
                          <strong>{project.name}</strong>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <span style={{ width: `${project.progress}%` }} />
                        </div>
                        <small>Due {project.due}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2>Study</h2>
                    <Clock3 size={15} />
                  </div>
                  <div className="stack-list">
                    {studyCards.map((study) => (
                      <div key={study.subject} className="stack-item compact">
                        <div className="stack-topline">
                          <strong>{study.subject}</strong>
                          <span>{study.target}</span>
                        </div>
                        <small>{study.streak}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2>Finance</h2>
                    <Wallet size={15} />
                  </div>
                  <div className="stack-list">
                    {financeCards.map((card) => (
                      <div key={card.label} className="stack-item compact">
                        <div className="stack-topline">
                          <strong>{card.label}</strong>
                          <span>{card.value}</span>
                        </div>
                        <small>{card.delta}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2>Notes</h2>
                    <Sparkles size={15} />
                  </div>
                  <div className="chip-list">
                    {notesList.map((note) => (
                      <span key={note.title} className="chip">
                        {note.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2>Files</h2>
                    <FileText size={15} />
                  </div>
                  <div className="file-list">
                    {recentFiles.map((file) => (
                      <div key={file.name} className="file-item">
                        <span className="file-badge">{file.type}</span>
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel quick-actions-panel">
                <div className="panel-header">
                  <h2>Quick actions</h2>
                  <Search size={15} />
                </div>
                <div className="action-row">
                  <button type="button" className="action-button primary">
                    <Plus size={15} />
                    New Task
                  </button>
                  <button type="button" className="action-button">
                    <NotebookText size={15} />
                    New Note
                  </button>
                  <button type="button" className="action-button">
                    <Briefcase size={15} />
                    New Project
                  </button>
                  <button type="button" className="action-button">
                    <CloudUpload size={15} />
                    Upload File
                  </button>
                  <button type="button" className="action-button">
                    <Clock3 size={15} />
                    Start Focus
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === 'tasks' ? (
            <div className="panel panel-wide">
              <div className="panel-header">
                <h2>Tasks</h2>
              </div>
              <div>
                <Suspense fallback={<div>Loading Tasks...</div>}>
                  <TaskLoader />
                </Suspense>
              </div>
            </div>
          ) : activeSection !== 'home' ? (
            <div className="panel placeholder-panel">
              <div className="placeholder-header">
                <FolderTree size={22} />
                <div>
                  <h2>{pageTitle}</h2>
                  <p>Section under development in Phase 2 and beyond.</p>
                </div>
              </div>
              <p className="placeholder-copy">
                The foundation is ready for tasks, notes, projects, files, study, finance, and cloud
                workflows. This phase focuses on the command-center shell and offline-first operating
                model.
              </p>
              <div className="placeholder-list">
                <span>Offline-first architecture</span>
                <span>Manual cloud uploads</span>
                <span>Fast desktop shell</span>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <div className="storage-toggle" aria-label="Storage mode selector">
        {(['offline', 'online'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={storageMode === mode ? 'mode-button active' : 'mode-button'}
            onClick={() => setStorageMode(mode)}
            aria-pressed={storageMode === mode}
          >
            {mode === 'offline' ? '🖥 Offline' : '☁️ Online'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
