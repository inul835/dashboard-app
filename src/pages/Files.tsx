import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  Code2,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid2x2,
  HardDrive,
  List,
  Pencil,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import {
  addFavoriteFile,
  addRecentFile,
  getFilePreferences,
  getRecentFiles,
  removeFavoriteFile,
  saveFilePreferences,
} from '../services/storage'

type StorageMode = 'offline' | 'online'
type ViewMode = 'grid' | 'list'
type SortKey = 'name' | 'modified' | 'size' | 'type'
type FileTypeFilter = 'all' | 'folders' | 'images' | 'videos' | 'audio' | 'documents' | 'archives' | 'code'

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: string
  extension: string
  type: FileTypeFilter | 'unknown'
}

type RecentFile = {
  path: string
  name: string
  openedAt: string
}

const emptyStateText =
  'Local filesystem access is available when the app is running as a desktop/Tauri application. In browser mode, the file browser stays read-only and safe.'

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as any).__TAURI_INTERNALS__)
}

function joinPath(base: string, relative: string) {
  const separator = base.includes('\\') ? '\\' : '/'
  if (!base) return relative
  return base.endsWith('/') || base.endsWith('\\') ? `${base}${relative}` : `${base}${separator}${relative}`
}

function getParentDirectory(path: string) {
  if (!path) return ''
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  parts.pop()
  return parts.join('/')
}

function getBreadcrumbs(path: string) {
  if (!path) return [] as Array<{ label: string; path: string }>
  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean)
  let current = ''
  return segments.map((segment, index) => {
    current = index === 0 ? segment : `${current}/${segment}`
    return { label: segment, path: current }
  })
}

function getFileTypeFromName(name: string): FileEntry['type'] {
  const extension = name.split('.').pop()?.toLowerCase() || ''
  if (!extension) return 'unknown'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(extension)) return 'images'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'videos'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) return 'audio'
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'odt'].includes(extension)) return 'documents'
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) return 'archives'
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cs', 'json', 'html', 'css', 'sql', 'rs', 'md'].includes(extension)) return 'code'
  return 'unknown'
}

function formatSize(size: number) {
  if (size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getEntryIcon(item: FileEntry) {
  if (item.isDirectory) return <Folder size={18} />

  switch (item.type) {
    case 'images':
      return <FileImage size={18} />
    case 'videos':
      return <FileVideo size={18} />
    case 'audio':
      return <FileAudio size={18} />
    case 'documents':
      return <FileText size={18} />
    case 'archives':
      return <FileArchive size={18} />
    case 'code':
      return <Code2 size={18} />
    default:
      return <FileText size={18} />
  }
}

function normalizeFileEntry(raw: any, currentPath: string): FileEntry {
  const name = raw?.name || 'Unnamed'
  const path = raw?.path || joinPath(currentPath, name)
  const isDirectory = Boolean(raw?.isDirectory ?? raw?.is_dir ?? raw?.children)
  const type = isDirectory ? 'folders' : getFileTypeFromName(name)
  return {
    name,
    path,
    isDirectory,
    size: Number(raw?.size ?? 0),
    modifiedAt: raw?.modifiedAt || raw?.modified_at || new Date().toISOString(),
    extension: name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '',
    type,
  }
}

function FilesPage({ storageMode }: { storageMode: StorageMode }) {
  const [currentPath, setCurrentPath] = useState('')
  const [rootFolder, setRootFolder] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedItem, setSelectedItem] = useState<FileEntry | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    if (storageMode !== 'offline') return

    ;(async () => {
      const prefs = await getFilePreferences()
      setFavorites(prefs.favorites || [])
      setRecentFiles((await getRecentFiles()) || [])
      setViewMode(prefs.defaultView || 'grid')
      setSortBy(prefs.sortBy || 'name')
      setSortDirection(prefs.sortDirection || 'asc')
      setFileTypeFilter((prefs.fileTypeFilter as FileTypeFilter) || 'all')

      if (prefs.rootFolder) {
        setRootFolder(prefs.rootFolder)
        setCurrentPath(prefs.rootFolder)
      }
    })()
  }, [storageMode])

  useEffect(() => {
    if (storageMode !== 'offline' || !currentPath || !isTauriRuntime()) return

    void loadDirectory(currentPath)
  }, [currentPath, storageMode])

  useEffect(() => {
    if (storageMode !== 'offline') return
    void saveFilePreferences({
      defaultView: viewMode,
      sortBy,
      sortDirection,
      fileTypeFilter,
    })
  }, [viewMode, sortBy, sortDirection, fileTypeFilter, storageMode])

  const breadcrumbItems = useMemo(() => getBreadcrumbs(currentPath), [currentPath])

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const items = entries.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query)
      const matchesType =
        fileTypeFilter === 'all' ||
        (fileTypeFilter === 'folders' && item.isDirectory) ||
        (fileTypeFilter !== 'folders' && !item.isDirectory && item.type === fileTypeFilter)
      return matchesSearch && matchesType
    })

    const sorted = [...items].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      const aKey = a.isDirectory ? 0 : 1
      const bKey = b.isDirectory ? 0 : 1
      if (aKey !== bKey) return aKey - bKey

      switch (sortBy) {
        case 'modified':
          return ((new Date(a.modifiedAt).getTime() || 0) - (new Date(b.modifiedAt).getTime() || 0)) * direction
        case 'size':
          return ((a.size || 0) - (b.size || 0)) * direction
        case 'type':
          return `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`) * direction
        case 'name':
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })

    return sorted
  }, [entries, fileTypeFilter, searchTerm, sortBy, sortDirection])

  async function loadDirectory(path: string) {
    if (!isTauriRuntime()) return

    setLoading(true)
    setError(null)

    try {
      const fs = await import('@tauri-apps/plugin-fs')
      const rawEntries = await fs.readDir(path)
      const nextEntries = (rawEntries || []).map((entry: any) => normalizeFileEntry(entry, path))
      setEntries(nextEntries)
      setSelectedItem((current) => (current && current.path.startsWith(path) ? current : null))
    } catch (readError) {
      setError('Unable to list the selected folder. Please try again.')
      console.error(readError)
    } finally {
      setLoading(false)
    }
  }

  async function persistPreferences() {
    await saveFilePreferences({
      rootFolder: rootFolder || undefined,
      defaultView: viewMode,
      sortBy,
      sortDirection,
      fileTypeFilter,
      favorites,
      recentFiles,
    })
  }

  async function chooseFolder() {
    if (!isTauriRuntime()) return

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const result = await open({ directory: true, multiple: false, title: 'Choose a folder' } as any)
      const selectedPath = Array.isArray(result) ? result[0] : result
      if (!selectedPath) return

      setRootFolder(selectedPath)
      setCurrentPath(selectedPath)
      setHistory((prev) => {
        const next = [...prev, selectedPath]
        return next.filter((item, index, array) => array.indexOf(item) === index).slice(-25)
      })
      setHistoryIndex((prev) => Math.max(prev, 0))
      await persistPreferences()
      await loadDirectory(selectedPath)
    } catch (selectionError) {
      setError('Could not open the folder picker.')
      console.error(selectionError)
    }
  }

  async function refreshDirectory() {
    if (!currentPath) return
    await loadDirectory(currentPath)
  }

  async function handleOpenDirectory(item: FileEntry) {
    if (!item.isDirectory) {
      try {
        const { openPath } = await import('@tauri-apps/plugin-opener')
        await openPath(item.path)
        setSelectedItem(item)
        await addRecentFile(item.path, item.name)
        const nextRecent = await getRecentFiles()
        setRecentFiles(nextRecent)
      } catch (openError) {
        setError('Unable to open the file with the system default application.')
        console.error(openError)
      }
      return
    }

    setCurrentPath(item.path)
    setHistory((prev) => [...prev, item.path].filter((value, index, array) => array.indexOf(value) === index).slice(-25))
    setHistoryIndex((prev) => prev + 1)
  }

  async function goBack() {
    if (historyIndex <= 0) return
    const target = history[historyIndex - 1]
    setHistoryIndex((prev) => prev - 1)
    setCurrentPath(target)
  }

  async function goForward() {
    if (historyIndex >= history.length - 1) return
    const target = history[historyIndex + 1]
    setHistoryIndex((prev) => prev + 1)
    setCurrentPath(target)
  }

  async function goToParent() {
    const parent = getParentDirectory(currentPath)
    if (!parent) return
    setCurrentPath(parent)
    setHistory((prev) => [...prev, parent].filter((value, index, array) => array.indexOf(value) === index).slice(-25))
    setHistoryIndex((prev) => prev + 1)
  }

  async function handleCreateFolder() {
    if (!currentPath) return
    const folderName = window.prompt('New folder name', 'New Folder')
    if (folderName === null) return
    const cleaned = folderName.trim()
    if (!cleaned) {
      setError('Folder name cannot be empty.')
      return
    }
    if (/[<>:"/\\|?*]/.test(cleaned)) {
      setError('Folder names cannot contain Windows invalid characters.')
      return
    }

    const nextPath = joinPath(currentPath, cleaned)
    try {
      const fs = await import('@tauri-apps/plugin-fs')
      await fs.mkdir(nextPath)
      await loadDirectory(currentPath)
    } catch (createError) {
      setError('Could not create the folder.')
      console.error(createError)
    }
  }

  async function handleRename(item: FileEntry) {
    const renamed = window.prompt('Rename item', item.name)
    if (renamed === null) return
    const cleaned = renamed.trim()
    if (!cleaned || cleaned === item.name) return
    if (/[<>:"/\\|?*]/.test(cleaned)) {
      setError('That file name is invalid for Windows.')
      return
    }

    const parent = getParentDirectory(item.path) || rootFolder
    const target = joinPath(parent, cleaned)
    try {
      const fs = await import('@tauri-apps/plugin-fs')
      await fs.rename(item.path, target)
      await loadDirectory(parent || currentPath)
      setSelectedItem(null)
    } catch (renameError) {
      setError('Could not rename this item.')
      console.error(renameError)
    }
  }

  async function handleDelete(item: FileEntry) {
    const confirmed = window.confirm(`Delete ${item.name}? This cannot be undone.`)
    if (!confirmed) return

    try {
      const fs = await import('@tauri-apps/plugin-fs')
      await fs.remove(item.path, { recursive: item.isDirectory, force: false } as any)
      await loadDirectory(getParentDirectory(item.path) || rootFolder || currentPath)
      setSelectedItem(null)
    } catch (deleteError) {
      setError('Could not delete this item.')
      console.error(deleteError)
    }
  }

  async function toggleFavorite(item: FileEntry) {
    const favoritePath = item.path
    const exists = favorites.includes(favoritePath)
    if (exists) {
      await removeFavoriteFile(favoritePath)
      setFavorites((current) => current.filter((entry) => entry !== favoritePath))
    } else {
      await addFavoriteFile(favoritePath)
      setFavorites((current) => [...current, favoritePath])
    }
    await persistPreferences()
  }

  if (storageMode !== 'offline') {
    return (
      <div className="files-panel">
        <div className="files-header">
          <div>
            <p className="eyebrow">Cloud storage</p>
            <h2>Cloud Storage</h2>
          </div>
          <span className="storage-status-badge muted">Coming soon</span>
        </div>

        <div className="files-empty-state">
          <FolderOpen size={28} />
          <h3>Cloud Storage</h3>
          <p>Manual upload and cloud file management are planned for a future phase.</p>
          <small>[Upload files manually later]</small>
        </div>
      </div>
    )
  }

  if (!isTauriRuntime()) {
    return (
      <div className="files-panel">
        <div className="files-header">
          <div>
            <p className="eyebrow">Development mode</p>
            <h2>Files</h2>
          </div>
          <span className="storage-status-badge">Local only</span>
        </div>

        <div className="files-empty-state">
          <HardDrive size={28} />
          <h3>Browser fallback</h3>
          <p>{emptyStateText}</p>
          <small>Use the desktop/Tauri runtime to access real folders and local files.</small>
        </div>
      </div>
    )
  }

  return (
    <div className="files-panel">
      <div className="files-header">
        <div>
          <p className="eyebrow">Local filesystem</p>
          <h2>Files</h2>
        </div>
        <div className="files-actions">
          <button type="button" className="ghost-button" onClick={chooseFolder}>
            <FolderOpen size={15} />
            Choose Folder
          </button>
          <button type="button" className="ghost-button" onClick={refreshDirectory}>
            <RefreshCw size={15} />
            Refresh
          </button>
          <button type="button" className="primary-button" onClick={handleCreateFolder}>
            <FolderPlus size={15} />
            New Folder
          </button>
        </div>
      </div>

      <div className="files-toolbar card-surface">
        <div className="files-controls-row">
          <label className="input-wrap icon-input">
            <Search size={15} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search files and folders"
            />
          </label>

          <select className="mini-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            <option value="name">Sort: Name</option>
            <option value="modified">Sort: Modified</option>
            <option value="size">Sort: Size</option>
            <option value="type">Sort: Type</option>
          </select>

          <select className="mini-select" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>

          <select className="mini-select" value={fileTypeFilter} onChange={(event) => setFileTypeFilter(event.target.value as FileTypeFilter)}>
            <option value="all">All</option>
            <option value="folders">Folders</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="audio">Audio</option>
            <option value="documents">Documents</option>
            <option value="archives">Archives</option>
            <option value="code">Code</option>
          </select>

          <div className="view-toggle">
            <button type="button" className={viewMode === 'grid' ? 'toggle active' : 'toggle'} onClick={() => setViewMode('grid')}>
              <Grid2x2 size={15} />
            </button>
            <button type="button" className={viewMode === 'list' ? 'toggle active' : 'toggle'} onClick={() => setViewMode('list')}>
              <List size={15} />
            </button>
          </div>
        </div>

        {rootFolder && currentPath && (
          <div className="files-breadcrumbs">
            <button type="button" className="breadcrumb-ghost" onClick={() => setCurrentPath(rootFolder)}>
              <Folder size={13} />
              Root
            </button>
            <div className="breadcrumb-stack">
              {breadcrumbItems.map((crumb, index) => (
                <button
                  key={`${crumb.path}-${index}`}
                  type="button"
                  className="breadcrumb-item"
                  onClick={() => setCurrentPath(crumb.path)}
                >
                  <span>{crumb.label}</span>
                  {index < breadcrumbItems.length - 1 && <ChevronRight size={13} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!rootFolder ? (
        <div className="files-empty-state">
          <FolderOpen size={28} />
          <h3>No folder selected</h3>
          <p>Select a local folder to begin browsing your files.</p>
          <button type="button" className="primary-button" onClick={chooseFolder}>
            Choose Folder
          </button>
        </div>
      ) : (
        <>
          <div className="files-summary-row">
            <div className="summary-rail">
              <button type="button" className="ghost-button" onClick={goBack} disabled={historyIndex <= 0}>
                <ArrowLeft size={15} />
                Back
              </button>
              <button type="button" className="ghost-button" onClick={goForward} disabled={historyIndex >= history.length - 1}>
                <ArrowRight size={15} />
                Forward
              </button>
              <button type="button" className="ghost-button" onClick={goToParent} disabled={!currentPath || currentPath === rootFolder}>
                Parent
              </button>
            </div>

            <div className="files-current-path">
              <Folder size={14} />
              <span>{currentPath}</span>
            </div>
          </div>

          {error && <div className="inline-error">{error}</div>}

          {loading ? (
            <div className="files-empty-state compact">
              <RefreshCw size={20} className="spin" />
              <p>Loading directory…</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="files-empty-state compact">
              <Folder size={22} />
              <p>No files match this view.</p>
            </div>
          ) : (
            <div className="file-layout">
              <div className={viewMode === 'grid' ? 'files-grid' : 'files-list'}>
                {filteredEntries.map((item) => (
                  <div
                    key={item.path}
                    className={`file-item-card ${selectedItem?.path === item.path ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedItem(item)
                      if (item.isDirectory) {
                        setCurrentPath(item.path)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedItem(item)
                        if (item.isDirectory) {
                          setCurrentPath(item.path)
                        }
                      }
                    }}
                  >
                    <div className="file-item-topline">
                      <div className="file-icon-badge">{getEntryIcon(item)}</div>
                      <button
                        type="button"
                        className={favorites.includes(item.path) ? 'favorite-button active' : 'favorite-button'}
                        onClick={(event) => {
                          event.stopPropagation()
                          void toggleFavorite(item)
                        }}
                        aria-label="Toggle favorite"
                      >
                        <Star size={14} fill={favorites.includes(item.path) ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="file-item-copy">
                      <strong>{item.name}</strong>
                      <small>{item.isDirectory ? 'Folder' : item.extension.toUpperCase() || 'FILE'}</small>
                    </div>

                    <div className="file-item-meta">
                      <span>{formatSize(item.size)}</span>
                      <span>{formatDate(item.modifiedAt)}</span>
                    </div>

                    <div className="file-actions-row">
                      <button type="button" className="mini-action" onClick={(event) => { event.stopPropagation(); void handleOpenDirectory(item) }}>
                        {item.isDirectory ? 'Open' : 'Open'}
                      </button>
                      <button type="button" className="mini-action" onClick={(event) => { event.stopPropagation(); void handleRename(item) }}>
                        <Pencil size={12} />
                      </button>
                      <button type="button" className="mini-action danger" onClick={(event) => { event.stopPropagation(); void handleDelete(item) }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="file-details-panel card-surface">
                {selectedItem ? (
                  <>
                    <div className="detail-header">
                      <div className="file-icon-badge detail-icon">{getEntryIcon(selectedItem)}</div>
                      <div>
                        <h3>{selectedItem.name}</h3>
                        <p>{selectedItem.isDirectory ? 'Folder' : 'File'}</p>
                      </div>
                    </div>

                    <dl className="detail-list">
                      <div><dt>Name</dt><dd>{selectedItem.name}</dd></div>
                      <div><dt>Full path</dt><dd>{selectedItem.path}</dd></div>
                      <div><dt>Type</dt><dd>{selectedItem.isDirectory ? 'Folder' : selectedItem.type}</dd></div>
                      <div><dt>Size</dt><dd>{selectedItem.isDirectory ? 'Folder' : formatSize(selectedItem.size)}</dd></div>
                      <div><dt>Modified</dt><dd>{formatDate(selectedItem.modifiedAt)}</dd></div>
                      <div><dt>Location</dt><dd>{getParentDirectory(selectedItem.path) || rootFolder}</dd></div>
                    </dl>
                  </>
                ) : (
                  <div className="files-empty-state compact">
                    <FileText size={20} />
                    <p>Select a file or folder for details.</p>
                  </div>
                )}
              </aside>
            </div>
          )}

          {recentFiles.length > 0 && (
            <div className="recent-files card-surface">
              <div className="panel-header">
                <h3>Recent</h3>
                <Clock3 size={15} />
              </div>
              <div className="recent-list">
                {recentFiles.map((item) => (
                  <button key={`${item.path}-${item.openedAt}`} type="button" className="recent-item" onClick={() => setCurrentPath(item.path)}>
                    <FileText size={14} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FilesPage
