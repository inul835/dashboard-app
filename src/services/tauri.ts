// Tauri invoke wrapper with graceful fallback for browser/dev mode
export async function invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T> {
  try {
    // Use dynamic import but suppress TS checking because @tauri-apps/api may not
    // be installed in the browser environment where we run the dev server.
    // @ts-ignore
    const tauri = await import('@tauri-apps/api/tauri')
    return (tauri.invoke as any)(cmd, args)
  } catch (e) {
    // Not running under Tauri — signal to caller with a rejected promise
    return Promise.reject(new Error('Tauri invoke not available'))
  }
}
