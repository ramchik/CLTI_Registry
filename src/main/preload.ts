import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';

// Expose safe IPC methods to the renderer
const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

for (const [key, channel] of Object.entries(IPC)) {
  // Convert PATIENTS_LIST to patients.list style naming
  const parts = key.toLowerCase().split('_');
  const namespace = parts[0];
  const method = parts.slice(1).join('_');
  const fnName = `${namespace}_${method}`;

  api[fnName] = (...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('api', api);
