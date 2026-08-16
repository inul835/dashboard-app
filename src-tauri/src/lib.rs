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
}

#[derive(Debug, Serialize, Deserialize)]
struct AppData {
  #[serde(default)]
  tasks: Vec<TaskItem>,
  #[serde(default = "default_next_id")]
  next_id: u64,
}

impl Default for AppData {
  fn default() -> Self {
    AppData { tasks: Vec::new(), next_id: 1 }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
      delete_task
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
