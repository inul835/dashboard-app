// Tauri invoke wrapper with graceful fallback for browser/dev mode
export async function invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T> {
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return (tauriInvoke as any)(cmd, args)
  } catch (e) {
    return Promise.reject(new Error('Tauri invoke not available'))
  }
}
