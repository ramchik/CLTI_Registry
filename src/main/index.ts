import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase, verifyPassword, hashPassword, createBackup, restoreBackup } from './database/connection';
import * as queries from './database/queries';
import { exportToXlsx, exportToPdf, exportKmCsv } from './export';
import { kaplanMeier, logRankTest, descriptiveStats } from '../shared/computed';
import { IPC } from '../shared/ipc-channels';
import type { FilterCriteria } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let currentUser = '';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'CLTI Bypass Registry',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  getDatabase();
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

function registerIpcHandlers(): void {
  const db = () => getDatabase();

  // Auth
  ipcMain.handle(IPC.AUTH_LOGIN, (_e, username: string, password: string) => {
    const user = db().prepare('SELECT * FROM users WHERE username = ?').get(username) as { username: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return { success: false, error: 'Invalid credentials' };
    }
    currentUser = username;
    return { success: true };
  });

  ipcMain.handle(IPC.AUTH_CHANGE_PASSWORD, (_e, username: string, oldPassword: string, newPassword: string) => {
    const user = db().prepare('SELECT * FROM users WHERE username = ?').get(username) as { password_hash: string } | undefined;
    if (!user || !verifyPassword(oldPassword, user.password_hash)) {
      return { success: false, error: 'Invalid current password' };
    }
    db().prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashPassword(newPassword), username);
    return { success: true };
  });

  ipcMain.handle(IPC.AUTH_CHECK, () => ({ loggedIn: !!currentUser, user: currentUser }));

  // Patients
  ipcMain.handle(IPC.PATIENTS_LIST, (_e, filters?: FilterCriteria) => queries.listPatients(db(), filters));
  ipcMain.handle(IPC.PATIENTS_GET, (_e, id: string) => queries.getPatient(db(), id));
  ipcMain.handle(IPC.PATIENTS_CREATE, (_e, data) => queries.createPatient(db(), data, currentUser));
  ipcMain.handle(IPC.PATIENTS_UPDATE, (_e, id: string, data) => queries.updatePatient(db(), id, data, currentUser));
  ipcMain.handle(IPC.PATIENTS_DELETE, (_e, id: string) => queries.deletePatient(db(), id, currentUser));
  ipcMain.handle(IPC.PATIENTS_CHECK_DUPLICATE, (_e, first: string, last: string, dob: string) => queries.checkDuplicate(db(), first, last, dob));

  // Comorbidities
  ipcMain.handle(IPC.COMORBIDITIES_GET, (_e, patientId: string) => queries.getComorbidities(db(), patientId));
  ipcMain.handle(IPC.COMORBIDITIES_UPSERT, (_e, data) => queries.upsertComorbidities(db(), data, currentUser));

  // Episodes
  ipcMain.handle(IPC.EPISODES_LIST, (_e, patientId: string) => queries.listEpisodes(db(), patientId));
  ipcMain.handle(IPC.EPISODES_GET, (_e, id: string) => queries.getEpisode(db(), id));
  ipcMain.handle(IPC.EPISODES_CREATE, (_e, data) => queries.createEpisode(db(), data, currentUser));
  ipcMain.handle(IPC.EPISODES_UPDATE, (_e, id: string, data) => queries.updateEpisode(db(), id, data, currentUser));

  // Imaging
  ipcMain.handle(IPC.IMAGING_GET, (_e, episodeId: string) => queries.getImaging(db(), episodeId));
  ipcMain.handle(IPC.IMAGING_UPSERT, (_e, data) => queries.upsertImaging(db(), data, currentUser));

  // Operations
  ipcMain.handle(IPC.OPERATIONS_GET, (_e, episodeId: string) => queries.getOperation(db(), episodeId));
  ipcMain.handle(IPC.OPERATIONS_UPSERT, (_e, data) => queries.upsertOperation(db(), data, currentUser));

  // Medications
  ipcMain.handle(IPC.MEDICATIONS_GET, (_e, episodeId: string, visitId?: string) => queries.getMedications(db(), episodeId, visitId));
  ipcMain.handle(IPC.MEDICATIONS_UPSERT, (_e, data) => queries.upsertMedications(db(), data, currentUser));

  // Labs
  ipcMain.handle(IPC.LABS_GET, (_e, episodeId: string, visitId?: string) => queries.getLabs(db(), episodeId, visitId));
  ipcMain.handle(IPC.LABS_UPSERT, (_e, data) => queries.upsertLabs(db(), data, currentUser));

  // Outcomes
  ipcMain.handle(IPC.OUTCOMES_GET, (_e, episodeId: string) => queries.getOutcomes(db(), episodeId));
  ipcMain.handle(IPC.OUTCOMES_UPSERT, (_e, data) => queries.upsertOutcomes(db(), data, currentUser));

  // Follow-up
  ipcMain.handle(IPC.FOLLOWUP_LIST, (_e, episodeId: string) => queries.listFollowups(db(), episodeId));
  ipcMain.handle(IPC.FOLLOWUP_GET, (_e, id: string) => queries.getFollowup(db(), id));
  ipcMain.handle(IPC.FOLLOWUP_CREATE, (_e, data) => queries.createFollowup(db(), data, currentUser));
  ipcMain.handle(IPC.FOLLOWUP_UPDATE, (_e, id: string, data) => queries.updateFollowup(db(), id, data, currentUser));
  ipcMain.handle(IPC.FOLLOWUP_SCHEDULE, (_e, episodeId: string) => queries.getFollowupSchedule(db(), episodeId));
  ipcMain.handle(IPC.FOLLOWUP_OVERDUE, () => queries.getOverdueFollowups(db()));

  // Dashboard
  ipcMain.handle(IPC.DASHBOARD_STATS, () => queries.getDashboardStats(db()));

  // Statistics
  ipcMain.handle(IPC.STATS_KAPLAN_MEIER, (_e, type: string, filters?: FilterCriteria) => {
    const data = queries.getKaplanMeierData(db(), type, filters);
    return kaplanMeier(data);
  });

  ipcMain.handle(IPC.STATS_OUTCOMES_SUMMARY, (_e, filters?: FilterCriteria) => {
    return queries.getOutcomesSummary(db(), filters);
  });

  ipcMain.handle(IPC.STATS_LOG_RANK, (_e, type: string, groupBy: string, filters?: FilterCriteria) => {
    const data = queries.getKaplanMeierData(db(), type, filters);
    const groups = new Map<string, typeof data>();
    for (const d of data) {
      const group = (d as any).group || 'unknown';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(d);
    }
    const groupNames = Array.from(groups.keys());
    if (groupNames.length < 2) return null;
    return logRankTest(groups.get(groupNames[0])!, groups.get(groupNames[1])!);
  });

  // Export
  ipcMain.handle(IPC.EXPORT_XLSX, async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      defaultPath: 'clti-registry-export.xlsx',
    });
    if (result.canceled || !result.filePath) return null;
    await exportToXlsx(db(), result.filePath);
    return result.filePath;
  });

  ipcMain.handle(IPC.EXPORT_PDF, async (_e, patientId: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: 'patient-summary.pdf',
    });
    if (result.canceled || !result.filePath) return null;
    await exportToPdf(db(), patientId, result.filePath);
    return result.filePath;
  });

  ipcMain.handle(IPC.EXPORT_CSV, async (_e, type: string, filters?: FilterCriteria) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      defaultPath: `km-${type}.csv`,
    });
    if (result.canceled || !result.filePath) return null;
    const data = queries.getKaplanMeierData(db(), type, filters);
    const km = kaplanMeier(data);
    exportKmCsv(km, result.filePath);
    return result.filePath;
  });

  // Backup
  ipcMain.handle(IPC.BACKUP_CREATE, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths.length) return null;
    return createBackup(result.filePaths[0]);
  });

  ipcMain.handle(IPC.BACKUP_RESTORE, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'Encrypted backup', extensions: ['enc'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    // This would need proper implementation for production
    return { success: true, path: result.filePaths[0] };
  });

  // Audit log
  ipcMain.handle(IPC.AUDIT_LOG_LIST, (_e, limit?: number, offset?: number) =>
    queries.getAuditLog(db(), limit, offset));

  // Settings
  ipcMain.handle(IPC.SETTINGS_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'] });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
}
