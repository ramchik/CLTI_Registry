/**
 * IPC channel constants for Electron main ↔ renderer communication.
 */
export const IPC = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',
  AUTH_CHECK: 'auth:check',

  // Patients
  PATIENTS_LIST: 'patients:list',
  PATIENTS_GET: 'patients:get',
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_UPDATE: 'patients:update',
  PATIENTS_DELETE: 'patients:delete',
  PATIENTS_SEARCH: 'patients:search',
  PATIENTS_CHECK_DUPLICATE: 'patients:check-duplicate',

  // Comorbidities
  COMORBIDITIES_GET: 'comorbidities:get',
  COMORBIDITIES_UPSERT: 'comorbidities:upsert',

  // Preop Assessment (Episodes)
  EPISODES_LIST: 'episodes:list',
  EPISODES_GET: 'episodes:get',
  EPISODES_CREATE: 'episodes:create',
  EPISODES_UPDATE: 'episodes:update',

  // Preop Imaging
  IMAGING_GET: 'imaging:get',
  IMAGING_UPSERT: 'imaging:upsert',

  // Operations
  OPERATIONS_GET: 'operations:get',
  OPERATIONS_UPSERT: 'operations:upsert',

  // Medications
  MEDICATIONS_GET: 'medications:get',
  MEDICATIONS_UPSERT: 'medications:upsert',

  // Labs
  LABS_GET: 'labs:get',
  LABS_UPSERT: 'labs:upsert',

  // 30-day Outcomes
  OUTCOMES_GET: 'outcomes:get',
  OUTCOMES_UPSERT: 'outcomes:upsert',

  // Follow-up
  FOLLOWUP_LIST: 'followup:list',
  FOLLOWUP_GET: 'followup:get',
  FOLLOWUP_CREATE: 'followup:create',
  FOLLOWUP_UPDATE: 'followup:update',
  FOLLOWUP_SCHEDULE: 'followup:schedule',
  FOLLOWUP_OVERDUE: 'followup:overdue',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',

  // Statistics
  STATS_KAPLAN_MEIER: 'stats:kaplan-meier',
  STATS_OUTCOMES_SUMMARY: 'stats:outcomes-summary',
  STATS_DESCRIPTIVE: 'stats:descriptive',
  STATS_LOG_RANK: 'stats:log-rank',

  // Export
  EXPORT_XLSX: 'export:xlsx',
  EXPORT_PDF: 'export:pdf',
  EXPORT_CSV: 'export:csv',

  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_SET_PATH: 'backup:set-path',

  // Audit log
  AUDIT_LOG_LIST: 'audit:list',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_SELECT_DIRECTORY: 'settings:select-directory',
} as const;
