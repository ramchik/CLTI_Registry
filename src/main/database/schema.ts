/**
 * SQLite database schema for CLTI Bypass Registry.
 * Uses raw SQL for better-sqlite3 — no ORM dependency at runtime.
 */

export const SCHEMA_SQL = `
-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male','female','other')),
  ethnicity TEXT NOT NULL DEFAULT '',
  bmi REAL,
  smoking_status TEXT NOT NULL CHECK (smoking_status IN ('never','ex','current')),
  pack_years INTEGER,
  asa_class TEXT NOT NULL CHECK (asa_class IN ('I','II','III','IV','V')),
  functional_status TEXT NOT NULL CHECK (functional_status IN ('independent','assisted','dependent')),
  notes TEXT NOT NULL DEFAULT ''
);

-- Comorbidities (one-to-one with patients)
CREATE TABLE IF NOT EXISTS comorbidities (
  patient_id TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  diabetes_type TEXT NOT NULL DEFAULT 'none' CHECK (diabetes_type IN ('none','type1','type2')),
  hba1c REAL,
  hypertension INTEGER NOT NULL DEFAULT 0,
  ckd_stage TEXT NOT NULL DEFAULT 'none' CHECK (ckd_stage IN ('none','1','2','3a','3b','4','5')),
  dialysis_dependent INTEGER NOT NULL DEFAULT 0,
  cad INTEGER NOT NULL DEFAULT 0,
  prior_mi INTEGER NOT NULL DEFAULT 0,
  chf INTEGER NOT NULL DEFAULT 0,
  lvef_percent INTEGER,
  copd INTEGER NOT NULL DEFAULT 0,
  prior_stroke_tia INTEGER NOT NULL DEFAULT 0,
  prior_ipsilateral_bypass INTEGER NOT NULL DEFAULT 0,
  prior_ipsilateral_endovascular INTEGER NOT NULL DEFAULT 0
);

-- Preop Assessment (one per limb episode)
CREATE TABLE IF NOT EXISTS preop_assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  episode_date TEXT NOT NULL,
  affected_limb TEXT NOT NULL CHECK (affected_limb IN ('left','right')),
  wifi_wound INTEGER NOT NULL CHECK (wifi_wound BETWEEN 0 AND 3),
  wifi_ischemia INTEGER NOT NULL CHECK (wifi_ischemia BETWEEN 0 AND 3),
  wifi_infection INTEGER NOT NULL CHECK (wifi_infection BETWEEN 0 AND 3),
  wifi_stage INTEGER NOT NULL CHECK (wifi_stage BETWEEN 1 AND 4),
  rutherford_grade TEXT NOT NULL CHECK (rutherford_grade IN ('0','1','2','3','4','5','6')),
  abi_value REAL,
  tbi_value REAL,
  toe_pressure_mmhg INTEGER,
  tcpo2_mmhg INTEGER,
  dialysis INTEGER NOT NULL DEFAULT 0,
  tissue_loss INTEGER NOT NULL DEFAULT 0,
  age_gte_75 INTEGER NOT NULL DEFAULT 0,
  haematocrit_lt30 INTEGER NOT NULL DEFAULT 0,
  creatinine_gt180 INTEGER NOT NULL DEFAULT 0,
  prevent_iii_score INTEGER NOT NULL DEFAULT 0,
  patient_risk_category TEXT NOT NULL DEFAULT 'average' CHECK (patient_risk_category IN ('average','high')),
  notes TEXT NOT NULL DEFAULT ''
);

-- Preop Imaging (one per episode)
CREATE TABLE IF NOT EXISTS preop_imaging (
  episode_id TEXT PRIMARY KEY REFERENCES preop_assessments(id) ON DELETE CASCADE,
  imaging_modality TEXT NOT NULL CHECK (imaging_modality IN ('duplex','CTA','MRA','DSA','combined')),
  glass_fp_stage TEXT NOT NULL CHECK (glass_fp_stage IN ('I','II','III')),
  glass_tibial_modifier TEXT NOT NULL CHECK (glass_tibial_modifier IN ('0','1','2')),
  glass_overall_stage TEXT NOT NULL CHECK (glass_overall_stage IN ('I','II','III')),
  target_artery_path TEXT NOT NULL DEFAULT '',
  inflow_vessel TEXT NOT NULL DEFAULT '',
  runoff_vessels_patent INTEGER NOT NULL CHECK (runoff_vessels_patent BETWEEN 1 AND 3),
  gsv_ipsilateral_available INTEGER NOT NULL DEFAULT 0,
  gsv_diameter_mm REAL,
  ssv_available INTEGER NOT NULL DEFAULT 0,
  arm_vein_available INTEGER NOT NULL DEFAULT 0,
  vein_mapping_performed INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

-- Operations (one per episode)
CREATE TABLE IF NOT EXISTS operations (
  episode_id TEXT PRIMARY KEY REFERENCES preop_assessments(id) ON DELETE CASCADE,
  operation_date TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('elective','urgent','emergent')),
  anaesthesia_type TEXT NOT NULL CHECK (anaesthesia_type IN ('GA','regional_spinal','regional_epidural','regional_block','local')),
  inflow_site TEXT NOT NULL,
  outflow_site TEXT NOT NULL,
  bypass_configuration TEXT NOT NULL DEFAULT '',
  conduit_type TEXT NOT NULL CHECK (conduit_type IN ('GSV_single','GSV_spliced','SSV','arm_vein','composite_vein','PTFE','Dacron','hybrid')),
  conduit_technique TEXT NOT NULL CHECK (conduit_technique IN ('reversed','in_situ','non_reversed_translocated','NA')),
  conduit_diameter_mm REAL,
  operative_time_min INTEGER,
  ebl_ml INTEGER,
  heparin_dose_units INTEGER,
  act_peak INTEGER,
  clamp_time_min INTEGER,
  transfusion_units_prbc INTEGER NOT NULL DEFAULT 0,
  completion_imaging TEXT NOT NULL DEFAULT 'none' CHECK (completion_imaging IN ('none','duplex','angiography')),
  completion_imaging_finding TEXT NOT NULL DEFAULT 'normal' CHECK (completion_imaging_finding IN ('normal','revision_required','revision_performed')),
  concurrent_minor_amputation INTEGER NOT NULL DEFAULT 0,
  concurrent_wound_debridement INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

-- Medications (per episode and/or follow-up)
CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL REFERENCES preop_assessments(id) ON DELETE CASCADE,
  visit_id TEXT REFERENCES followup_visits(id) ON DELETE SET NULL,
  antiplatelet TEXT NOT NULL DEFAULT 'none' CHECK (antiplatelet IN ('none','aspirin','clopidogrel','DAPT','ticagrelor_aspirin')),
  anticoagulation TEXT NOT NULL DEFAULT 'none' CHECK (anticoagulation IN ('none','warfarin','DOAC','heparin_bridge')),
  statin INTEGER NOT NULL DEFAULT 0,
  statin_intensity TEXT NOT NULL DEFAULT 'NA' CHECK (statin_intensity IN ('low','moderate','high','NA')),
  ace_arb INTEGER NOT NULL DEFAULT 0,
  diabetes_agent_class TEXT NOT NULL DEFAULT '',
  smoking_cessation_counselled INTEGER NOT NULL DEFAULT 0
);

-- Labs (timestamped, per episode or visit)
CREATE TABLE IF NOT EXISTS labs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL REFERENCES preop_assessments(id) ON DELETE CASCADE,
  visit_id TEXT REFERENCES followup_visits(id) ON DELETE SET NULL,
  lab_date TEXT NOT NULL,
  hb_gdl REAL,
  haematocrit REAL,
  platelets INTEGER,
  inr REAL,
  creatinine_umol REAL,
  egfr REAL,
  hba1c_percent REAL,
  ldl_mmol REAL,
  crp_mg_l REAL
);

-- 30-day outcomes (one per episode)
CREATE TABLE IF NOT EXISTS outcomes_30day (
  episode_id TEXT PRIMARY KEY REFERENCES preop_assessments(id) ON DELETE CASCADE,
  death_30d INTEGER NOT NULL DEFAULT 0,
  death_date TEXT,
  cause_of_death TEXT,
  mi_30d INTEGER NOT NULL DEFAULT 0,
  stroke_30d INTEGER NOT NULL DEFAULT 0,
  graft_thrombosis_30d INTEGER NOT NULL DEFAULT 0,
  thrombosis_date TEXT,
  major_amputation_30d INTEGER NOT NULL DEFAULT 0,
  amputation_level TEXT NOT NULL DEFAULT 'NA' CHECK (amputation_level IN ('BKA','AKA','NA')),
  amputation_date TEXT,
  reintervention_30d INTEGER NOT NULL DEFAULT 0,
  reintervention_type TEXT,
  ssi_30d INTEGER NOT NULL DEFAULT 0,
  ssi_grade TEXT NOT NULL DEFAULT 'NA' CHECK (ssi_grade IN ('superficial','deep','organ_space','NA')),
  los_days INTEGER,
  icu_days INTEGER
);

-- Follow-up visits (one-to-many per episode)
CREATE TABLE IF NOT EXISTS followup_visits (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES preop_assessments(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  visit_interval TEXT NOT NULL CHECK (visit_interval IN ('1m','3m','6m','12m','18m','24m','3yr','4yr','5yr','other')),
  patient_alive INTEGER NOT NULL DEFAULT 1,
  limb_present INTEGER NOT NULL DEFAULT 1,
  duplex_performed INTEGER NOT NULL DEFAULT 0,
  psv_proximal_anastomosis REAL,
  psv_graft_body REAL,
  psv_distal_anastomosis REAL,
  psv_outflow REAL,
  velocity_ratio_peak REAL,
  stenosis_detected INTEGER NOT NULL DEFAULT 0,
  stenosis_grade TEXT NOT NULL DEFAULT 'none' CHECK (stenosis_grade IN ('none','lt50','50_75','gt75','occlusion')),
  abi_followup REAL,
  tbi_followup REAL,
  patency_status TEXT NOT NULL DEFAULT 'patent_no_intervention' CHECK (patency_status IN ('patent_no_intervention','patent_assisted','occluded_recanalized','occluded')),
  reintervention_performed INTEGER NOT NULL DEFAULT 0,
  reintervention_type TEXT NOT NULL DEFAULT 'none' CHECK (reintervention_type IN ('none','PTA','stent','surgical_revision','thrombectomy','lysis','new_bypass')),
  wound_healed INTEGER NOT NULL DEFAULT 0,
  wifi_wound_followup INTEGER CHECK (wifi_wound_followup BETWEEN 0 AND 3),
  minor_amputation_since_last INTEGER NOT NULL DEFAULT 0,
  major_amputation_since_last INTEGER NOT NULL DEFAULT 0,
  vascuqol6_score INTEGER CHECK (vascuqol6_score BETWEEN 6 AND 24),
  antiplatelet_current TEXT NOT NULL DEFAULT '',
  statin_current INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  user TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- User auth (local only)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_preop_patient ON preop_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_preop_date ON preop_assessments(episode_date);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(operation_date);
CREATE INDEX IF NOT EXISTS idx_followup_episode ON followup_visits(episode_id);
CREATE INDEX IF NOT EXISTS idx_followup_date ON followup_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
`;
