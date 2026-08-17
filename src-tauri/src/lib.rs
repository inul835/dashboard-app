use serde::{Deserialize, Serialize};
use std::fs::{File};
use std::io::{Read, Write};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubtaskItem {
  #[serde(default)]
  pub id: u64,
  #[serde(default)]
  pub title: String,
  #[serde(default)]
  pub completed: bool,
}

fn default_string() -> String {
  String::new()
}

fn default_vec_string() -> Vec<String> {
  Vec::new()
}

fn default_subtasks() -> Vec<SubtaskItem> {
  Vec::new()
}

fn default_next_id() -> u64 {
  1
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskItem {
  #[serde(default)]
  pub id: u64,
  #[serde(default = "default_string")]
  pub title: String,
  #[serde(default)]
  pub description: Option<String>,
  #[serde(default = "default_string")]
  pub status: String,
  #[serde(default = "default_string")]
  pub priority: String,
  #[serde(default)]
  pub due_date: Option<String>,
  #[serde(default)]
  pub due_time: Option<String>,
  #[serde(default = "default_string")]
  pub category: String,
  #[serde(default = "default_vec_string")]
  pub tags: Vec<String>,
  #[serde(default = "default_string")]
  pub created_at: String,
  #[serde(default = "default_string")]
  pub updated_at: String,
  #[serde(default = "default_subtasks")]
  pub subtasks: Vec<SubtaskItem>,
  #[serde(default = "default_string")]
  pub recurrence: String,
  #[serde(default)]
  pub project_id: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteItem {
  #[serde(default)]
  pub id: u64,
  #[serde(default = "default_string")]
  pub title: String,
  #[serde(default = "default_string")]
  pub content: String,
  #[serde(default = "default_vec_string")]
  pub tags: Vec<String>,
  #[serde(default = "default_string")]
  pub category: String,
  #[serde(default)]
  pub pinned: bool,
  #[serde(default)]
  pub favorite: bool,
  #[serde(default)]
  pub archived: bool,
  #[serde(default = "default_string")]
  pub created_at: String,
  #[serde(default = "default_string")]
  pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRef {
  #[serde(default = "default_string")]
  pub path: String,
  #[serde(default)]
  pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectItem {
  #[serde(default)]
  pub id: u64,
  #[serde(default = "default_string")]
  pub name: String,
  #[serde(default = "default_string")]
  pub description: String,
  #[serde(default = "default_string")]
  pub status: String,
  #[serde(default = "default_string")]
  pub priority: String,
  #[serde(default = "default_string")]
  pub icon: String,
  #[serde(default = "default_string")]
  pub color: String,
  #[serde(default = "default_vec_string")]
  pub tags: Vec<String>,
  #[serde(default)]
  pub start_date: Option<String>,
  #[serde(default)]
  pub due_date: Option<String>,
  #[serde(default = "default_string")]
  pub created_at: String,
  #[serde(default = "default_string")]
  pub updated_at: String,
  #[serde(default)]
  pub archived: bool,
  #[serde(default = "default_vec_string")]
  pub tasks: Vec<u64>,
  #[serde(default = "default_vec_string")]
  pub notes: Vec<u64>,
  #[serde(default)]
  pub files: Vec<FileRef>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppData {
  #[serde(default)]
  tasks: Vec<TaskItem>,
  #[serde(default)]
  notes: Vec<NoteItem>,
  #[serde(default)]
  projects: Vec<ProjectItem>,
  #[serde(default = "default_next_id")]
  next_id: u64,
  #[serde(default = "default_next_id")]
  next_note_id: u64,
  #[serde(default = "default_next_id")]
  next_project_id: u64,
}

impl Default for AppData {
  fn default() -> Self {
    AppData { tasks: Vec::new(), notes: Vec::new(), projects: Vec::new(), next_id: 1, next_note_id: 1, next_project_id: 1 }
  }
}

fn data_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  app
    .path_resolver()
    .app_local_data_dir()
    .ok_or_else(|| "failed to resolve app local data dir".to_string())
    .map(|mut p| {
      p.push("command-center");
      // ensure dir exists
      let _ = std::fs::create_dir_all(&p);
      p.push("db.json");
      p
    })
}

fn read_app_data(path: &PathBuf) -> Result<AppData, String> {
  if !path.exists() {
    return Ok(AppData::default());
  }
  let mut f = File::open(path).map_err(|e| format!("open error: {}", e))?;
  let mut s = String::new();
  f.read_to_string(&mut s).map_err(|e| format!("read error: {}", e))?;
  let mut data: AppData = serde_json::from_str(&s).map_err(|e| format!("json parse error: {}", e))?;
  // normalize tasks with defaults for created_at/updated_at if empty
  for t in &mut data.tasks {
    if t.created_at.is_empty() {
      t.created_at = chrono::Utc::now().to_rfc3339();
    }
    if t.updated_at.is_empty() {
      t.updated_at = t.created_at.clone();
    }
  }
  for n in &mut data.notes {
    if n.created_at.is_empty() {
      n.created_at = chrono::Utc::now().to_rfc3339();
    }
    if n.updated_at.is_empty() {
      n.updated_at = n.created_at.clone();
    }
  }
  // normalize projects
  for p in &mut data.projects {
    if p.created_at.is_empty() {
      p.created_at = chrono::Utc::now().to_rfc3339();
    }
    if p.updated_at.is_empty() {
      p.updated_at = p.created_at.clone();
    }
    if p.tags.is_empty() {
      p.tags = Vec::new();
    }
    if p.tasks.is_empty() {
      p.tasks = Vec::new();
    }
  }
  Ok(data)
}

fn write_app_data(path: &PathBuf, data: &AppData) -> Result<(), String> {
  let s = serde_json::to_string_pretty(data).map_err(|e| format!("json ser error: {}", e))?;
  let mut f = File::create(path).map_err(|e| format!("create error: {}", e))?;
  f.write_all(s.as_bytes())
    .map_err(|e| format!("write error: {}", e))
}

#[tauri::command]
fn db_init(app: tauri::AppHandle) -> Result<(), String> {
  let path = data_file_path(&app)?;
  if !path.exists() {
    let data = AppData::default();
    write_app_data(&path, &data)?;
  }
  Ok(())
}

#[tauri::command]
fn get_tasks(app: tauri::AppHandle) -> Result<Vec<TaskItem>, String> {
  let path = data_file_path(&app)?;
  let data = read_app_data(&path)?;
  Ok(data.tasks)
}

#[tauri::command]
fn create_task(app: tauri::AppHandle, mut task: TaskItem) -> Result<TaskItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  task.id = data.next_id;
  data.next_id = data.next_id.saturating_add(1);
  if task.created_at.is_empty() {
    task.created_at = chrono::Utc::now().to_rfc3339();
  }
  task.updated_at = task.created_at.clone();
  data.tasks.push(task.clone());
  write_app_data(&path, &data)?;
  Ok(task)
}

#[tauri::command]
fn update_task(app: tauri::AppHandle, updated: TaskItem) -> Result<TaskItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  if let Some(pos) = data.tasks.iter().position(|t| t.id == updated.id) {
    let mut u = updated.clone();
    u.updated_at = chrono::Utc::now().to_rfc3339();
    data.tasks[pos] = u.clone();
    write_app_data(&path, &data)?;
    Ok(u)
  } else {
    Err("task not found".into())
  }
}

#[tauri::command]
fn delete_task(app: tauri::AppHandle, id: u64) -> Result<bool, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  let original_len = data.tasks.len();
  data.tasks.retain(|t| t.id != id);
  let changed = data.tasks.len() != original_len;
  if changed {
    write_app_data(&path, &data)?;
  }
  Ok(changed)
}

#[tauri::command]
fn get_notes(app: tauri::AppHandle) -> Result<Vec<NoteItem>, String> {
  let path = data_file_path(&app)?;
  let data = read_app_data(&path)?;
  Ok(data.notes)
}

#[tauri::command]
fn create_note(app: tauri::AppHandle, mut note: NoteItem) -> Result<NoteItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  note.id = data.next_note_id;
  data.next_note_id = data.next_note_id.saturating_add(1);
  if note.created_at.is_empty() {
    note.created_at = chrono::Utc::now().to_rfc3339();
  }
  note.updated_at = note.created_at.clone();
  data.notes.push(note.clone());
  write_app_data(&path, &data)?;
  Ok(note)
}

#[tauri::command]
fn update_note(app: tauri::AppHandle, updated: NoteItem) -> Result<NoteItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  if let Some(pos) = data.notes.iter().position(|n| n.id == updated.id) {
    let mut u = updated.clone();
    u.updated_at = chrono::Utc::now().to_rfc3339();
    data.notes[pos] = u.clone();
    write_app_data(&path, &data)?;
    Ok(u)
  } else {
    Err("note not found".into())
  }
}

#[tauri::command]
fn delete_note(app: tauri::AppHandle, id: u64) -> Result<bool, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  let original_len = data.notes.len();
  data.notes.retain(|n| n.id != id);
  let changed = data.notes.len() != original_len;
  if changed {
    write_app_data(&path, &data)?;
  }
  Ok(changed)
}

#[tauri::command]
fn get_projects(app: tauri::AppHandle) -> Result<Vec<ProjectItem>, String> {
  let path = data_file_path(&app)?;
  let data = read_app_data(&path)?;
  Ok(data.projects)
}

#[tauri::command]
fn create_project(app: tauri::AppHandle, mut project: ProjectItem) -> Result<ProjectItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  project.id = data.next_project_id;
  data.next_project_id = data.next_project_id.saturating_add(1);
  if project.created_at.is_empty() {
    project.created_at = chrono::Utc::now().to_rfc3339();
  }
  project.updated_at = project.created_at.clone();
  // ensure vectors are non-null
  project.tags = project.tags.clone();
  project.tasks = project.tasks.clone();
  project.notes = project.notes.clone();
  data.projects.push(project.clone());
  write_app_data(&path, &data)?;
  Ok(project)
}

#[tauri::command]
fn update_project(app: tauri::AppHandle, project: ProjectItem) -> Result<ProjectItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  if let Some(pos) = data.projects.iter().position(|p| p.id == project.id) {
    let mut u = project.clone();
    u.updated_at = chrono::Utc::now().to_rfc3339();
    data.projects[pos] = u.clone();
    write_app_data(&path, &data)?;
    Ok(u)
  } else {
    Err("project not found".into())
  }
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, id: u64) -> Result<bool, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  let original_len = data.projects.len();
  data.projects.retain(|p| p.id != id);
  // clear project_id on tasks that referenced this project
  for t in &mut data.tasks {
    if let Some(pid) = t.project_id {
      if pid == id {
        t.project_id = None;
      }
    }
  }
  let changed = data.projects.len() != original_len;
  if changed {
    write_app_data(&path, &data)?;
  }
  Ok(changed)
}

#[tauri::command]
fn attach_task_to_project(app: tauri::AppHandle, task_id: u64, project_id: u64) -> Result<(), String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  // ensure project exists
  if !data.projects.iter().any(|p| p.id == project_id) {
    return Err("project not found".into());
  }
  // set task.project_id and add to project.tasks
  let mut found_task = false;
  for t in &mut data.tasks {
    if t.id == task_id {
      t.project_id = Some(project_id);
      found_task = true;
      break;
    }
  }
  if !found_task {
    return Err("task not found".into());
  }
  for p in &mut data.projects {
    if p.id == project_id {
      if !p.tasks.iter().any(|&id| id == task_id) {
        p.tasks.push(task_id);
      }
      break;
    }
  }
  write_app_data(&path, &data)?;
  Ok(())
}

#[tauri::command]
fn detach_task_from_project(app: tauri::AppHandle, task_id: u64, project_id: u64) -> Result<(), String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  // remove task id from project.tasks
  for p in &mut data.projects {
    if p.id == project_id {
      p.tasks.retain(|&id| id != task_id);
      break;
    }
  }
  // clear project_id on task
  for t in &mut data.tasks {
    if t.id == task_id {
      if let Some(pid) = t.project_id {
        if pid == project_id {
          t.project_id = None;
        }
      }
      break;
    }
  }
  write_app_data(&path, &data)?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      db_init,
      get_tasks,
      create_task,
      update_task,
      delete_task,
      get_notes,
      create_note,
      update_note,
      delete_note,
      get_projects,
      create_project,
      update_project,
      delete_project,
      attach_task_to_project,
      detach_task_from_project,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
