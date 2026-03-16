// ===== Enums =====
export type Sex = 'male' | 'female' | 'other';
export type SmokingStatus = 'never' | 'ex' | 'current';
export type ASAClass = 'I' | 'II' | 'III' | 'IV' | 'V';
export type FunctionalStatus = 'independent' | 'assisted' | 'dependent';
export type DiabetesType = 'none' | 'type1' | 'type2';
export type CKDStage = 'none' | '1' | '2' | '3a' | '3b' | '4' | '5';
export type RutherfordGrade = '0' | '1' | '2' | '3' | '4' | '5' | '6';
export type ImagingModality = 'duplex' | 'CTA' | 'MRA' | 'DSA' | 'combined';
export type GLASSStage = 'I' | 'II' | 'III';
export type GLASSTibialModifier = '0' | '1' | '2';
export type Urgency = 'elective' | 'urgent' | 'emergent';
export type AnaesthesiaType = 'GA' | 'regional_spinal' | 'regional_epidural' | 'regional_block' | 'local';
export type ConduitType = 'GSV_single' | 'GSV_spliced' | 'SSV' | 'arm_vein' | 'composite_vein' | 'PTFE' | 'Dacron' | 'hybrid';
export type ConduitTechnique = 'reversed' | 'in_situ' | 'non_reversed_translocated' | 'NA';
export type CompletionImaging = 'none' | 'duplex' | 'angiography';
export type CompletionImagingFinding = 'normal' | 'revision_required' | 'revision_performed';
export type Antiplatelet = 'none' | 'aspirin' | 'clopidogrel' | 'DAPT' | 'ticagrelor_aspirin';
export type Anticoagulation = 'none' | 'warfarin' | 'DOAC' | 'heparin_bridge';
export type StatinIntensity = 'low' | 'moderate' | 'high' | 'NA';
export type AmputationLevel = 'BKA' | 'AKA' | 'NA';
export type SSIGrade = 'superficial' | 'deep' | 'organ_space' | 'NA';
export type VisitInterval = '1m' | '3m' | '6m' | '12m' | '18m' | '24m' | '3yr' | '4yr' | '5yr' | 'other';
export type StenosisGrade = 'none' | 'lt50' | '50_75' | 'gt75' | 'occlusion';
export type PatencyStatus = 'patent_no_intervention' | 'patent_assisted' | 'occluded_recanalized' | 'occluded';
export type ReinterventionType = 'none' | 'PTA' | 'stent' | 'surgical_revision' | 'thrombectomy' | 'lysis' | 'new_bypass';
export type AffectedLimb = 'left' | 'right';
export type PatientRiskCategory = 'average' | 'high';

// ===== Data interfaces =====

export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: Sex;
  ethnicity: string;
  bmi: number | null;
  smoking_status: SmokingStatus;
  pack_years: number | null;
  asa_class: ASAClass;
  functional_status: FunctionalStatus;
  notes: string;
}

export interface Comorbidities {
  patient_id: string;
  diabetes_type: DiabetesType;
  hba1c: number | null;
  hypertension: boolean;
  ckd_stage: CKDStage;
  dialysis_dependent: boolean;
  cad: boolean;
  prior_mi: boolean;
  chf: boolean;
  lvef_percent: number | null;
  copd: boolean;
  prior_stroke_tia: boolean;
  prior_ipsilateral_bypass: boolean;
  prior_ipsilateral_endovascular: boolean;
}

export interface PreopAssessment {
  id: string;
  patient_id: string;
  episode_date: string;
  affected_limb: AffectedLimb;
  wifi_wound: number; // 0-3
  wifi_ischemia: number; // 0-3
  wifi_infection: number; // 0-3
  wifi_stage: number; // computed 1-4
  rutherford_grade: RutherfordGrade;
  abi_value: number | null;
  tbi_value: number | null;
  toe_pressure_mmhg: number | null;
  tcpo2_mmhg: number | null;
  dialysis: boolean;
  tissue_loss: boolean;
  age_gte_75: boolean;
  haematocrit_lt30: boolean;
  creatinine_gt180: boolean;
  prevent_iii_score: number; // computed 0-5
  patient_risk_category: PatientRiskCategory; // computed
  notes: string;
}

export interface PreopImaging {
  episode_id: string;
  imaging_modality: ImagingModality;
  glass_fp_stage: GLASSStage;
  glass_tibial_modifier: GLASSTibialModifier;
  glass_overall_stage: GLASSStage;
  target_artery_path: string;
  inflow_vessel: string;
  runoff_vessels_patent: number; // 1-3
  gsv_ipsilateral_available: boolean;
  gsv_diameter_mm: number | null;
  ssv_available: boolean;
  arm_vein_available: boolean;
  vein_mapping_performed: boolean;
  notes: string;
}

export interface Operation {
  episode_id: string;
  operation_date: string;
  urgency: Urgency;
  anaesthesia_type: AnaesthesiaType;
  inflow_site: string;
  outflow_site: string;
  bypass_configuration: string;
  conduit_type: ConduitType;
  conduit_technique: ConduitTechnique;
  conduit_diameter_mm: number | null;
  operative_time_min: number | null;
  ebl_ml: number | null;
  heparin_dose_units: number | null;
  act_peak: number | null;
  clamp_time_min: number | null;
  transfusion_units_prbc: number;
  completion_imaging: CompletionImaging;
  completion_imaging_finding: CompletionImagingFinding;
  concurrent_minor_amputation: boolean;
  concurrent_wound_debridement: boolean;
  notes: string;
}

export interface Medications {
  episode_id: string;
  visit_id: string | null;
  antiplatelet: Antiplatelet;
  anticoagulation: Anticoagulation;
  statin: boolean;
  statin_intensity: StatinIntensity;
  ace_arb: boolean;
  diabetes_agent_class: string;
  smoking_cessation_counselled: boolean;
}

export interface Labs {
  episode_id: string;
  visit_id: string | null;
  lab_date: string;
  hb_gdl: number | null;
  haematocrit: number | null;
  platelets: number | null;
  inr: number | null;
  creatinine_umol: number | null;
  egfr: number | null;
  hba1c_percent: number | null;
  ldl_mmol: number | null;
  crp_mg_l: number | null;
}

export interface Outcomes30Day {
  episode_id: string;
  death_30d: boolean;
  death_date: string | null;
  cause_of_death: string | null;
  mi_30d: boolean;
  stroke_30d: boolean;
  graft_thrombosis_30d: boolean;
  thrombosis_date: string | null;
  major_amputation_30d: boolean;
  amputation_level: AmputationLevel;
  amputation_date: string | null;
  reintervention_30d: boolean;
  reintervention_type: string | null;
  ssi_30d: boolean;
  ssi_grade: SSIGrade;
  los_days: number | null;
  icu_days: number | null;
}

export interface FollowupVisit {
  id: string;
  episode_id: string;
  visit_date: string;
  visit_interval: VisitInterval;
  patient_alive: boolean;
  limb_present: boolean;
  duplex_performed: boolean;
  psv_proximal_anastomosis: number | null;
  psv_graft_body: number | null;
  psv_distal_anastomosis: number | null;
  psv_outflow: number | null;
  velocity_ratio_peak: number | null;
  stenosis_detected: boolean;
  stenosis_grade: StenosisGrade;
  abi_followup: number | null;
  tbi_followup: number | null;
  patency_status: PatencyStatus;
  reintervention_performed: boolean;
  reintervention_type: ReinterventionType;
  wound_healed: boolean;
  wifi_wound_followup: number | null; // 0-3
  minor_amputation_since_last: boolean;
  major_amputation_since_last: boolean;
  vascuqol6_score: number | null; // 6-24
  antiplatelet_current: string;
  statin_current: boolean;
  notes: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
}

// ===== IPC Channel types =====

export interface PatientSummary {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: Sex;
  latest_episode_date: string | null;
  wifi_stage: number | null;
  glass_overall_stage: GLASSStage | null;
  operation_date: string | null;
  conduit_type: ConduitType | null;
}

export interface DashboardStats {
  total_patients: number;
  total_operations: number;
  overdue_followups: OverdueFollowup[];
  recent_operations: PatientSummary[];
  outcome_summary: {
    mortality_30d: number;
    mace_30d: number;
    amputation_30d: number;
    graft_thrombosis_30d: number;
  };
}

export interface OverdueFollowup {
  patient_id: string;
  patient_name: string;
  episode_id: string;
  operation_date: string;
  expected_interval: VisitInterval;
  expected_date: string;
  days_overdue: number;
}

export interface KaplanMeierDataPoint {
  time: number; // days from surgery
  survival: number; // probability
  censored: boolean;
  at_risk: number;
}

export interface KaplanMeierResult {
  curve: KaplanMeierDataPoint[];
  median_survival: number | null;
  events: number;
  censored: number;
  total: number;
}

export type FilterCriteria = {
  conduit_type?: ConduitType[];
  glass_stage?: GLASSStage[];
  wifi_stage?: number[];
  diabetes_type?: DiabetesType[];
  risk_category?: PatientRiskCategory[];
  year_range?: [number, number];
  search_text?: string;
};
