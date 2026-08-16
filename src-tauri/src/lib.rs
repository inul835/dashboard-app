use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskItem {
  pub id: u64,
  pub title: String,
  pub description: Option<String>,
  pub status: String,
  pub priority: String,
  pub due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct AppData {
  tasks: Vec<TaskItem>,
  next_id: u64,
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
    return Ok(AppData { tasks: vec![], next_id: 1 });
  }
  let mut f = File::open(path).map_err(|e| format!("open error: {}", e))?;
  let mut s = String::new();
  f.read_to_string(&mut s).map_err(|e| format!("read error: {}", e))?;
  serde_json::from_str(&s).map_err(|e| format!("json parse error: {}", e))
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
    let data = AppData { tasks: vec![], next_id: 1 };
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
  data.tasks.push(task.clone());
  write_app_data(&path, &data)?;
  Ok(task)
}

#[tauri::command]
fn update_task(app: tauri::AppHandle, updated: TaskItem) -> Result<TaskItem, String> {
  let path = data_file_path(&app)?;
  let mut data = read_app_data(&path)?;
  if let Some(pos) = data.tasks.iter().position(|t| t.id == updated.id) {
    data.tasks[pos] = updated.clone();
    write_app_data(&path, &data)?;
    Ok(updated)
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
