/**
 * Type-safe API wrapper for Electron IPC calls.
 * In production, calls go through the preload bridge.
 * For development/testing, provides a mock layer.
 */

declare global {
  interface Window {
    api: Record<string, (...args: unknown[]) => Promise<unknown>>;
  }
}

function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (window.api && window.api[channel]) {
    return window.api[channel](...args);
  }
  console.warn(`IPC channel not available: ${channel}`);
  return Promise.resolve(null);
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    invoke('auth_login', username, password) as Promise<{ success: boolean; error?: string }>,
  changePassword: (username: string, oldPw: string, newPw: string) =>
    invoke('auth_change_password', username, oldPw, newPw) as Promise<{ success: boolean; error?: string }>,
  checkAuth: () =>
    invoke('auth_check') as Promise<{ loggedIn: boolean; user: string }>,

  // Patients
  listPatients: (filters?: unknown) => invoke('patients_list', filters),
  getPatient: (id: string) => invoke('patients_get', id),
  createPatient: (data: unknown) => invoke('patients_create', data) as Promise<string>,
  updatePatient: (id: string, data: unknown) => invoke('patients_update', id, data),
  deletePatient: (id: string) => invoke('patients_delete', id),
  checkDuplicate: (first: string, last: string, dob: string) => invoke('patients_check_duplicate', first, last, dob),

  // Comorbidities
  getComorbidities: (patientId: string) => invoke('comorbidities_get', patientId),
  upsertComorbidities: (data: unknown) => invoke('comorbidities_upsert', data),

  // Episodes
  listEpisodes: (patientId: string) => invoke('episodes_list', patientId),
  getEpisode: (id: string) => invoke('episodes_get', id),
  createEpisode: (data: unknown) => invoke('episodes_create', data) as Promise<string>,
  updateEpisode: (id: string, data: unknown) => invoke('episodes_update', id, data),

  // Imaging
  getImaging: (episodeId: string) => invoke('imaging_get', episodeId),
  upsertImaging: (data: unknown) => invoke('imaging_upsert', data),

  // Operations
  getOperation: (episodeId: string) => invoke('operations_get', episodeId),
  upsertOperation: (data: unknown) => invoke('operations_upsert', data),

  // Medications
  getMedications: (episodeId: string, visitId?: string) => invoke('medications_get', episodeId, visitId),
  upsertMedications: (data: unknown) => invoke('medications_upsert', data),

  // Labs
  getLabs: (episodeId: string, visitId?: string) => invoke('labs_get', episodeId, visitId),
  upsertLabs: (data: unknown) => invoke('labs_upsert', data),

  // Outcomes
  getOutcomes: (episodeId: string) => invoke('outcomes_get', episodeId),
  upsertOutcomes: (data: unknown) => invoke('outcomes_upsert', data),

  // Follow-up
  listFollowups: (episodeId: string) => invoke('followup_list', episodeId),
  getFollowup: (id: string) => invoke('followup_get', id),
  createFollowup: (data: unknown) => invoke('followup_create', data) as Promise<string>,
  updateFollowup: (id: string, data: unknown) => invoke('followup_update', id, data),
  getFollowupSchedule: (episodeId: string) => invoke('followup_schedule', episodeId),
  getOverdueFollowups: () => invoke('followup_overdue'),

  // Dashboard
  getDashboardStats: () => invoke('dashboard_stats'),

  // Statistics
  getKaplanMeier: (type: string, filters?: unknown) => invoke('stats_kaplan_meier', type, filters),
  getOutcomesSummary: (filters?: unknown) => invoke('stats_outcomes_summary', filters),
  getLogRank: (type: string, groupBy: string, filters?: unknown) => invoke('stats_log_rank', type, groupBy, filters),

  // Export
  exportXlsx: () => invoke('export_xlsx'),
  exportPdf: (patientId: string) => invoke('export_pdf', patientId),
  exportCsv: (type: string, filters?: unknown) => invoke('export_csv', type, filters),

  // Backup
  createBackup: () => invoke('backup_create'),
  restoreBackup: () => invoke('backup_restore'),

  // Audit
  getAuditLog: (limit?: number, offset?: number) => invoke('audit_list', limit, offset),

  // Settings
  selectDirectory: () => invoke('settings_select_directory'),
};
