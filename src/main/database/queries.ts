import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { calculateWifiStage, calculatePreventIIIScore, getPatientRiskCategory, generateFollowupSchedule } from '../../shared/computed';
import type {
  Patient, Comorbidities, PreopAssessment, PreopImaging,
  Operation, Medications, Labs, Outcomes30Day, FollowupVisit,
  PatientSummary, DashboardStats, OverdueFollowup, FilterCriteria, AuditLogEntry,
} from '../../shared/types';

// ===== Audit Logging =====

function auditLog(db: Database.Database, user: string, action: string, tableName: string, recordId: string, field?: string, oldVal?: string, newVal?: string): void {
  db.prepare(`
    INSERT INTO audit_log (id, user, action, table_name, record_id, field_changed, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), user, action, tableName, recordId, field || null, oldVal || null, newVal || null);
}

// ===== Patients =====

export function listPatients(db: Database.Database, filters?: FilterCriteria): PatientSummary[] {
  let sql = `
    SELECT p.id, p.first_name, p.last_name, p.date_of_birth, p.sex,
           pa.episode_date as latest_episode_date, pa.wifi_stage,
           pi.glass_overall_stage, o.operation_date, o.conduit_type
    FROM patients p
    LEFT JOIN preop_assessments pa ON pa.patient_id = p.id
    LEFT JOIN preop_imaging pi ON pi.episode_id = pa.id
    LEFT JOIN operations o ON o.episode_id = pa.id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.search_text) {
    conditions.push(`(p.first_name LIKE ? OR p.last_name LIKE ? OR p.id LIKE ?)`);
    const term = `%${filters.search_text}%`;
    params.push(term, term, term);
  }
  if (filters?.conduit_type?.length) {
    conditions.push(`o.conduit_type IN (${filters.conduit_type.map(() => '?').join(',')})`);
    params.push(...filters.conduit_type);
  }
  if (filters?.glass_stage?.length) {
    conditions.push(`pi.glass_overall_stage IN (${filters.glass_stage.map(() => '?').join(',')})`);
    params.push(...filters.glass_stage);
  }
  if (filters?.wifi_stage?.length) {
    conditions.push(`pa.wifi_stage IN (${filters.wifi_stage.map(() => '?').join(',')})`);
    params.push(...filters.wifi_stage);
  }
  if (filters?.year_range) {
    conditions.push(`CAST(strftime('%Y', o.operation_date) AS INTEGER) BETWEEN ? AND ?`);
    params.push(filters.year_range[0], filters.year_range[1]);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY p.id ORDER BY p.last_name, p.first_name';

  return db.prepare(sql).all(...params) as PatientSummary[];
}

export function getPatient(db: Database.Database, id: string): Patient | undefined {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Patient | undefined;
}

export function createPatient(db: Database.Database, patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>, user: string): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO patients (id, first_name, last_name, date_of_birth, sex, ethnicity, bmi, smoking_status, pack_years, asa_class, functional_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient.first_name, patient.last_name, patient.date_of_birth, patient.sex,
    patient.ethnicity, patient.bmi, patient.smoking_status, patient.pack_years,
    patient.asa_class, patient.functional_status, patient.notes || '');

  // Also create empty comorbidities record
  db.prepare('INSERT INTO comorbidities (patient_id) VALUES (?)').run(id);

  auditLog(db, user, 'create', 'patients', id);
  return id;
}

export function updatePatient(db: Database.Database, id: string, updates: Partial<Patient>, user: string): void {
  const current = getPatient(db, id);
  if (!current) throw new Error('Patient not found');

  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return;

  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);

  db.prepare(`UPDATE patients SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`)
    .run(...values, id);

  for (const field of fields) {
    auditLog(db, user, 'update', 'patients', id, field,
      String((current as Record<string, unknown>)[field]),
      String((updates as Record<string, unknown>)[field]));
  }
}

export function deletePatient(db: Database.Database, id: string, user: string): void {
  db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  auditLog(db, user, 'delete', 'patients', id);
}

export function checkDuplicate(db: Database.Database, firstName: string, lastName: string, dob: string): Patient[] {
  return db.prepare(
    'SELECT * FROM patients WHERE first_name = ? AND last_name = ? AND date_of_birth = ?'
  ).all(firstName, lastName, dob) as Patient[];
}

// ===== Comorbidities =====

export function getComorbidities(db: Database.Database, patientId: string): Comorbidities | undefined {
  return db.prepare('SELECT * FROM comorbidities WHERE patient_id = ?').get(patientId) as Comorbidities | undefined;
}

export function upsertComorbidities(db: Database.Database, data: Comorbidities, user: string): void {
  db.prepare(`
    INSERT INTO comorbidities (patient_id, diabetes_type, hba1c, hypertension, ckd_stage, dialysis_dependent, cad, prior_mi, chf, lvef_percent, copd, prior_stroke_tia, prior_ipsilateral_bypass, prior_ipsilateral_endovascular)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(patient_id) DO UPDATE SET
      diabetes_type=excluded.diabetes_type, hba1c=excluded.hba1c, hypertension=excluded.hypertension,
      ckd_stage=excluded.ckd_stage, dialysis_dependent=excluded.dialysis_dependent, cad=excluded.cad,
      prior_mi=excluded.prior_mi, chf=excluded.chf, lvef_percent=excluded.lvef_percent, copd=excluded.copd,
      prior_stroke_tia=excluded.prior_stroke_tia, prior_ipsilateral_bypass=excluded.prior_ipsilateral_bypass,
      prior_ipsilateral_endovascular=excluded.prior_ipsilateral_endovascular
  `).run(data.patient_id, data.diabetes_type, data.hba1c, data.hypertension ? 1 : 0,
    data.ckd_stage, data.dialysis_dependent ? 1 : 0, data.cad ? 1 : 0,
    data.prior_mi ? 1 : 0, data.chf ? 1 : 0, data.lvef_percent, data.copd ? 1 : 0,
    data.prior_stroke_tia ? 1 : 0, data.prior_ipsilateral_bypass ? 1 : 0,
    data.prior_ipsilateral_endovascular ? 1 : 0);

  auditLog(db, user, 'update', 'comorbidities', data.patient_id);
}

// ===== Preop Assessment (Episodes) =====

export function listEpisodes(db: Database.Database, patientId: string): PreopAssessment[] {
  return db.prepare('SELECT * FROM preop_assessments WHERE patient_id = ? ORDER BY episode_date DESC')
    .all(patientId) as PreopAssessment[];
}

export function getEpisode(db: Database.Database, id: string): PreopAssessment | undefined {
  return db.prepare('SELECT * FROM preop_assessments WHERE id = ?').get(id) as PreopAssessment | undefined;
}

export function createEpisode(db: Database.Database, data: Omit<PreopAssessment, 'id' | 'wifi_stage' | 'prevent_iii_score' | 'patient_risk_category'>, user: string): string {
  const id = uuidv4();
  const wifiStage = calculateWifiStage(data.wifi_wound, data.wifi_ischemia, data.wifi_infection);
  const preventScore = calculatePreventIIIScore({
    dialysis: data.dialysis,
    tissue_loss: data.tissue_loss,
    age_gte_75: data.age_gte_75,
    haematocrit_lt30: data.haematocrit_lt30,
    creatinine_gt180: data.creatinine_gt180,
  });
  const riskCategory = getPatientRiskCategory(preventScore);

  db.prepare(`
    INSERT INTO preop_assessments (id, patient_id, episode_date, affected_limb, wifi_wound, wifi_ischemia, wifi_infection, wifi_stage, rutherford_grade, abi_value, tbi_value, toe_pressure_mmhg, tcpo2_mmhg, dialysis, tissue_loss, age_gte_75, haematocrit_lt30, creatinine_gt180, prevent_iii_score, patient_risk_category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.patient_id, data.episode_date, data.affected_limb,
    data.wifi_wound, data.wifi_ischemia, data.wifi_infection, wifiStage,
    data.rutherford_grade, data.abi_value, data.tbi_value, data.toe_pressure_mmhg,
    data.tcpo2_mmhg, data.dialysis ? 1 : 0, data.tissue_loss ? 1 : 0,
    data.age_gte_75 ? 1 : 0, data.haematocrit_lt30 ? 1 : 0, data.creatinine_gt180 ? 1 : 0,
    preventScore, riskCategory, data.notes || '');

  auditLog(db, user, 'create', 'preop_assessments', id);
  return id;
}

export function updateEpisode(db: Database.Database, id: string, data: Partial<PreopAssessment>, user: string): void {
  const current = getEpisode(db, id);
  if (!current) throw new Error('Episode not found');

  // Recalculate computed fields if components changed
  const wifi_wound = data.wifi_wound ?? current.wifi_wound;
  const wifi_ischemia = data.wifi_ischemia ?? current.wifi_ischemia;
  const wifi_infection = data.wifi_infection ?? current.wifi_infection;
  const wifiStage = calculateWifiStage(wifi_wound, wifi_ischemia, wifi_infection);

  const preventScore = calculatePreventIIIScore({
    dialysis: data.dialysis ?? !!current.dialysis,
    tissue_loss: data.tissue_loss ?? !!current.tissue_loss,
    age_gte_75: data.age_gte_75 ?? !!current.age_gte_75,
    haematocrit_lt30: data.haematocrit_lt30 ?? !!current.haematocrit_lt30,
    creatinine_gt180: data.creatinine_gt180 ?? !!current.creatinine_gt180,
  });
  const riskCategory = getPatientRiskCategory(preventScore);

  db.prepare(`
    UPDATE preop_assessments SET
      episode_date = COALESCE(?, episode_date), affected_limb = COALESCE(?, affected_limb),
      wifi_wound = ?, wifi_ischemia = ?, wifi_infection = ?, wifi_stage = ?,
      rutherford_grade = COALESCE(?, rutherford_grade), abi_value = ?, tbi_value = ?,
      toe_pressure_mmhg = ?, tcpo2_mmhg = ?, dialysis = ?, tissue_loss = ?,
      age_gte_75 = ?, haematocrit_lt30 = ?, creatinine_gt180 = ?,
      prevent_iii_score = ?, patient_risk_category = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(
    data.episode_date, data.affected_limb,
    wifi_wound, wifi_ischemia, wifi_infection, wifiStage,
    data.rutherford_grade, data.abi_value ?? current.abi_value,
    data.tbi_value ?? current.tbi_value,
    data.toe_pressure_mmhg ?? current.toe_pressure_mmhg,
    data.tcpo2_mmhg ?? current.tcpo2_mmhg,
    (data.dialysis ?? !!current.dialysis) ? 1 : 0,
    (data.tissue_loss ?? !!current.tissue_loss) ? 1 : 0,
    (data.age_gte_75 ?? !!current.age_gte_75) ? 1 : 0,
    (data.haematocrit_lt30 ?? !!current.haematocrit_lt30) ? 1 : 0,
    (data.creatinine_gt180 ?? !!current.creatinine_gt180) ? 1 : 0,
    preventScore, riskCategory, data.notes, id
  );

  auditLog(db, user, 'update', 'preop_assessments', id);
}

// ===== Preop Imaging =====

export function getImaging(db: Database.Database, episodeId: string): PreopImaging | undefined {
  return db.prepare('SELECT * FROM preop_imaging WHERE episode_id = ?').get(episodeId) as PreopImaging | undefined;
}

export function upsertImaging(db: Database.Database, data: PreopImaging, user: string): void {
  db.prepare(`
    INSERT INTO preop_imaging (episode_id, imaging_modality, glass_fp_stage, glass_tibial_modifier, glass_overall_stage, target_artery_path, inflow_vessel, runoff_vessels_patent, gsv_ipsilateral_available, gsv_diameter_mm, ssv_available, arm_vein_available, vein_mapping_performed, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id) DO UPDATE SET
      imaging_modality=excluded.imaging_modality, glass_fp_stage=excluded.glass_fp_stage,
      glass_tibial_modifier=excluded.glass_tibial_modifier, glass_overall_stage=excluded.glass_overall_stage,
      target_artery_path=excluded.target_artery_path, inflow_vessel=excluded.inflow_vessel,
      runoff_vessels_patent=excluded.runoff_vessels_patent, gsv_ipsilateral_available=excluded.gsv_ipsilateral_available,
      gsv_diameter_mm=excluded.gsv_diameter_mm, ssv_available=excluded.ssv_available,
      arm_vein_available=excluded.arm_vein_available, vein_mapping_performed=excluded.vein_mapping_performed,
      notes=excluded.notes
  `).run(data.episode_id, data.imaging_modality, data.glass_fp_stage, data.glass_tibial_modifier,
    data.glass_overall_stage, data.target_artery_path, data.inflow_vessel,
    data.runoff_vessels_patent, data.gsv_ipsilateral_available ? 1 : 0,
    data.gsv_diameter_mm, data.ssv_available ? 1 : 0, data.arm_vein_available ? 1 : 0,
    data.vein_mapping_performed ? 1 : 0, data.notes || '');

  auditLog(db, user, 'update', 'preop_imaging', data.episode_id);
}

// ===== Operations =====

export function getOperation(db: Database.Database, episodeId: string): Operation | undefined {
  return db.prepare('SELECT * FROM operations WHERE episode_id = ?').get(episodeId) as Operation | undefined;
}

export function upsertOperation(db: Database.Database, data: Operation, user: string): void {
  db.prepare(`
    INSERT INTO operations (episode_id, operation_date, urgency, anaesthesia_type, inflow_site, outflow_site, bypass_configuration, conduit_type, conduit_technique, conduit_diameter_mm, operative_time_min, ebl_ml, heparin_dose_units, act_peak, clamp_time_min, transfusion_units_prbc, completion_imaging, completion_imaging_finding, concurrent_minor_amputation, concurrent_wound_debridement, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id) DO UPDATE SET
      operation_date=excluded.operation_date, urgency=excluded.urgency, anaesthesia_type=excluded.anaesthesia_type,
      inflow_site=excluded.inflow_site, outflow_site=excluded.outflow_site, bypass_configuration=excluded.bypass_configuration,
      conduit_type=excluded.conduit_type, conduit_technique=excluded.conduit_technique, conduit_diameter_mm=excluded.conduit_diameter_mm,
      operative_time_min=excluded.operative_time_min, ebl_ml=excluded.ebl_ml, heparin_dose_units=excluded.heparin_dose_units,
      act_peak=excluded.act_peak, clamp_time_min=excluded.clamp_time_min, transfusion_units_prbc=excluded.transfusion_units_prbc,
      completion_imaging=excluded.completion_imaging, completion_imaging_finding=excluded.completion_imaging_finding,
      concurrent_minor_amputation=excluded.concurrent_minor_amputation, concurrent_wound_debridement=excluded.concurrent_wound_debridement,
      notes=excluded.notes
  `).run(data.episode_id, data.operation_date, data.urgency, data.anaesthesia_type,
    data.inflow_site, data.outflow_site, data.bypass_configuration, data.conduit_type,
    data.conduit_technique, data.conduit_diameter_mm, data.operative_time_min,
    data.ebl_ml, data.heparin_dose_units, data.act_peak, data.clamp_time_min,
    data.transfusion_units_prbc, data.completion_imaging, data.completion_imaging_finding,
    data.concurrent_minor_amputation ? 1 : 0, data.concurrent_wound_debridement ? 1 : 0,
    data.notes || '');

  auditLog(db, user, 'update', 'operations', data.episode_id);
}

// ===== Medications =====

export function getMedications(db: Database.Database, episodeId: string, visitId?: string): Medications | undefined {
  if (visitId) {
    return db.prepare('SELECT * FROM medications WHERE episode_id = ? AND visit_id = ?').get(episodeId, visitId) as Medications | undefined;
  }
  return db.prepare('SELECT * FROM medications WHERE episode_id = ? AND visit_id IS NULL').get(episodeId) as Medications | undefined;
}

export function upsertMedications(db: Database.Database, data: Medications, user: string): void {
  if (data.visit_id) {
    const existing = db.prepare('SELECT id FROM medications WHERE episode_id = ? AND visit_id = ?').get(data.episode_id, data.visit_id) as { id: number } | undefined;
    if (existing) {
      db.prepare(`UPDATE medications SET antiplatelet=?, anticoagulation=?, statin=?, statin_intensity=?, ace_arb=?, diabetes_agent_class=?, smoking_cessation_counselled=? WHERE id=?`)
        .run(data.antiplatelet, data.anticoagulation, data.statin ? 1 : 0, data.statin_intensity, data.ace_arb ? 1 : 0, data.diabetes_agent_class, data.smoking_cessation_counselled ? 1 : 0, existing.id);
    } else {
      db.prepare(`INSERT INTO medications (episode_id, visit_id, antiplatelet, anticoagulation, statin, statin_intensity, ace_arb, diabetes_agent_class, smoking_cessation_counselled) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(data.episode_id, data.visit_id, data.antiplatelet, data.anticoagulation, data.statin ? 1 : 0, data.statin_intensity, data.ace_arb ? 1 : 0, data.diabetes_agent_class, data.smoking_cessation_counselled ? 1 : 0);
    }
  } else {
    const existing = db.prepare('SELECT id FROM medications WHERE episode_id = ? AND visit_id IS NULL').get(data.episode_id) as { id: number } | undefined;
    if (existing) {
      db.prepare(`UPDATE medications SET antiplatelet=?, anticoagulation=?, statin=?, statin_intensity=?, ace_arb=?, diabetes_agent_class=?, smoking_cessation_counselled=? WHERE id=?`)
        .run(data.antiplatelet, data.anticoagulation, data.statin ? 1 : 0, data.statin_intensity, data.ace_arb ? 1 : 0, data.diabetes_agent_class, data.smoking_cessation_counselled ? 1 : 0, existing.id);
    } else {
      db.prepare(`INSERT INTO medications (episode_id, antiplatelet, anticoagulation, statin, statin_intensity, ace_arb, diabetes_agent_class, smoking_cessation_counselled) VALUES (?,?,?,?,?,?,?,?)`)
        .run(data.episode_id, data.antiplatelet, data.anticoagulation, data.statin ? 1 : 0, data.statin_intensity, data.ace_arb ? 1 : 0, data.diabetes_agent_class, data.smoking_cessation_counselled ? 1 : 0);
    }
  }
  auditLog(db, user, 'update', 'medications', data.episode_id);
}

// ===== Labs =====

export function getLabs(db: Database.Database, episodeId: string, visitId?: string): Labs | undefined {
  if (visitId) {
    return db.prepare('SELECT * FROM labs WHERE episode_id = ? AND visit_id = ?').get(episodeId, visitId) as Labs | undefined;
  }
  return db.prepare('SELECT * FROM labs WHERE episode_id = ? AND visit_id IS NULL ORDER BY lab_date DESC LIMIT 1').get(episodeId) as Labs | undefined;
}

export function upsertLabs(db: Database.Database, data: Labs, user: string): void {
  const existing = data.visit_id
    ? db.prepare('SELECT id FROM labs WHERE episode_id = ? AND visit_id = ?').get(data.episode_id, data.visit_id) as { id: number } | undefined
    : db.prepare('SELECT id FROM labs WHERE episode_id = ? AND visit_id IS NULL AND lab_date = ?').get(data.episode_id, data.lab_date) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE labs SET lab_date=?, hb_gdl=?, haematocrit=?, platelets=?, inr=?, creatinine_umol=?, egfr=?, hba1c_percent=?, ldl_mmol=?, crp_mg_l=? WHERE id=?`)
      .run(data.lab_date, data.hb_gdl, data.haematocrit, data.platelets, data.inr, data.creatinine_umol, data.egfr, data.hba1c_percent, data.ldl_mmol, data.crp_mg_l, existing.id);
  } else {
    db.prepare(`INSERT INTO labs (episode_id, visit_id, lab_date, hb_gdl, haematocrit, platelets, inr, creatinine_umol, egfr, hba1c_percent, ldl_mmol, crp_mg_l) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.episode_id, data.visit_id || null, data.lab_date, data.hb_gdl, data.haematocrit, data.platelets, data.inr, data.creatinine_umol, data.egfr, data.hba1c_percent, data.ldl_mmol, data.crp_mg_l);
  }
  auditLog(db, user, 'update', 'labs', data.episode_id);
}

// ===== 30-day Outcomes =====

export function getOutcomes(db: Database.Database, episodeId: string): Outcomes30Day | undefined {
  return db.prepare('SELECT * FROM outcomes_30day WHERE episode_id = ?').get(episodeId) as Outcomes30Day | undefined;
}

export function upsertOutcomes(db: Database.Database, data: Outcomes30Day, user: string): void {
  db.prepare(`
    INSERT INTO outcomes_30day (episode_id, death_30d, death_date, cause_of_death, mi_30d, stroke_30d, graft_thrombosis_30d, thrombosis_date, major_amputation_30d, amputation_level, amputation_date, reintervention_30d, reintervention_type, ssi_30d, ssi_grade, los_days, icu_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id) DO UPDATE SET
      death_30d=excluded.death_30d, death_date=excluded.death_date, cause_of_death=excluded.cause_of_death,
      mi_30d=excluded.mi_30d, stroke_30d=excluded.stroke_30d, graft_thrombosis_30d=excluded.graft_thrombosis_30d,
      thrombosis_date=excluded.thrombosis_date, major_amputation_30d=excluded.major_amputation_30d,
      amputation_level=excluded.amputation_level, amputation_date=excluded.amputation_date,
      reintervention_30d=excluded.reintervention_30d, reintervention_type=excluded.reintervention_type,
      ssi_30d=excluded.ssi_30d, ssi_grade=excluded.ssi_grade, los_days=excluded.los_days, icu_days=excluded.icu_days
  `).run(data.episode_id, data.death_30d ? 1 : 0, data.death_date, data.cause_of_death,
    data.mi_30d ? 1 : 0, data.stroke_30d ? 1 : 0, data.graft_thrombosis_30d ? 1 : 0,
    data.thrombosis_date, data.major_amputation_30d ? 1 : 0, data.amputation_level,
    data.amputation_date, data.reintervention_30d ? 1 : 0, data.reintervention_type,
    data.ssi_30d ? 1 : 0, data.ssi_grade, data.los_days, data.icu_days);

  auditLog(db, user, 'update', 'outcomes_30day', data.episode_id);
}

// ===== Follow-up =====

export function listFollowups(db: Database.Database, episodeId: string): FollowupVisit[] {
  return db.prepare('SELECT * FROM followup_visits WHERE episode_id = ? ORDER BY visit_date')
    .all(episodeId) as FollowupVisit[];
}

export function getFollowup(db: Database.Database, id: string): FollowupVisit | undefined {
  return db.prepare('SELECT * FROM followup_visits WHERE id = ?').get(id) as FollowupVisit | undefined;
}

export function createFollowup(db: Database.Database, data: Omit<FollowupVisit, 'id'>, user: string): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO followup_visits (id, episode_id, visit_date, visit_interval, patient_alive, limb_present, duplex_performed, psv_proximal_anastomosis, psv_graft_body, psv_distal_anastomosis, psv_outflow, velocity_ratio_peak, stenosis_detected, stenosis_grade, abi_followup, tbi_followup, patency_status, reintervention_performed, reintervention_type, wound_healed, wifi_wound_followup, minor_amputation_since_last, major_amputation_since_last, vascuqol6_score, antiplatelet_current, statin_current, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.episode_id, data.visit_date, data.visit_interval,
    data.patient_alive ? 1 : 0, data.limb_present ? 1 : 0, data.duplex_performed ? 1 : 0,
    data.psv_proximal_anastomosis, data.psv_graft_body, data.psv_distal_anastomosis,
    data.psv_outflow, data.velocity_ratio_peak, data.stenosis_detected ? 1 : 0,
    data.stenosis_grade, data.abi_followup, data.tbi_followup, data.patency_status,
    data.reintervention_performed ? 1 : 0, data.reintervention_type,
    data.wound_healed ? 1 : 0, data.wifi_wound_followup,
    data.minor_amputation_since_last ? 1 : 0, data.major_amputation_since_last ? 1 : 0,
    data.vascuqol6_score, data.antiplatelet_current, data.statin_current ? 1 : 0,
    data.notes || '');

  auditLog(db, user, 'create', 'followup_visits', id);
  return id;
}

export function updateFollowup(db: Database.Database, id: string, data: Partial<FollowupVisit>, user: string): void {
  const fields = Object.keys(data).filter(k => k !== 'id');
  if (fields.length === 0) return;

  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    const val = (data as Record<string, unknown>)[f];
    return typeof val === 'boolean' ? (val ? 1 : 0) : val;
  });

  db.prepare(`UPDATE followup_visits SET ${setClauses} WHERE id = ?`).run(...values, id);
  auditLog(db, user, 'update', 'followup_visits', id);
}

export function getFollowupSchedule(db: Database.Database, episodeId: string): Array<{ interval: string; date: string; completed: boolean }> {
  const op = getOperation(db, episodeId);
  if (!op) return [];

  const schedule = generateFollowupSchedule(op.operation_date);
  const existingVisits = listFollowups(db, episodeId);
  const completedIntervals = new Set(existingVisits.map(v => v.visit_interval));

  return schedule.map(s => ({
    ...s,
    completed: completedIntervals.has(s.interval as any),
  }));
}

export function getOverdueFollowups(db: Database.Database): OverdueFollowup[] {
  const today = new Date().toISOString().split('T')[0];

  // Get all operations with their patients
  const operations = db.prepare(`
    SELECT o.episode_id, o.operation_date, p.id as patient_id, p.first_name, p.last_name
    FROM operations o
    JOIN preop_assessments pa ON pa.id = o.episode_id
    JOIN patients p ON p.id = pa.patient_id
  `).all() as Array<{ episode_id: string; operation_date: string; patient_id: string; first_name: string; last_name: string }>;

  const overdue: OverdueFollowup[] = [];

  for (const op of operations) {
    const schedule = generateFollowupSchedule(op.operation_date);
    const visits = listFollowups(db, op.episode_id);
    const completedIntervals = new Set(visits.map(v => v.visit_interval));

    for (const s of schedule) {
      if (s.date < today && !completedIntervals.has(s.interval as any)) {
        const daysOverdue = Math.floor((new Date(today).getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
        overdue.push({
          patient_id: op.patient_id,
          patient_name: `${op.last_name}, ${op.first_name}`,
          episode_id: op.episode_id,
          operation_date: op.operation_date,
          expected_interval: s.interval as any,
          expected_date: s.date,
          days_overdue: daysOverdue,
        });
      }
    }
  }

  return overdue.sort((a, b) => b.days_overdue - a.days_overdue);
}

// ===== Dashboard =====

export function getDashboardStats(db: Database.Database): DashboardStats {
  const totalPatients = (db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number }).count;
  const totalOps = (db.prepare('SELECT COUNT(*) as count FROM operations').get() as { count: number }).count;

  const overdue = getOverdueFollowups(db);

  const recentOps = db.prepare(`
    SELECT p.id, p.first_name, p.last_name, p.date_of_birth, p.sex,
           pa.episode_date as latest_episode_date, pa.wifi_stage,
           pi.glass_overall_stage, o.operation_date, o.conduit_type
    FROM operations o
    JOIN preop_assessments pa ON pa.id = o.episode_id
    JOIN patients p ON p.id = pa.patient_id
    LEFT JOIN preop_imaging pi ON pi.episode_id = pa.id
    ORDER BY o.operation_date DESC LIMIT 10
  `).all() as PatientSummary[];

  // 30-day outcome summary
  const outcomes = db.prepare('SELECT * FROM outcomes_30day').all() as Outcomes30Day[];
  const n = outcomes.length || 1;

  return {
    total_patients: totalPatients,
    total_operations: totalOps,
    overdue_followups: overdue.slice(0, 20),
    recent_operations: recentOps,
    outcome_summary: {
      mortality_30d: outcomes.filter(o => o.death_30d).length / n * 100,
      mace_30d: outcomes.filter(o => o.death_30d || o.mi_30d || o.stroke_30d).length / n * 100,
      amputation_30d: outcomes.filter(o => o.major_amputation_30d).length / n * 100,
      graft_thrombosis_30d: outcomes.filter(o => o.graft_thrombosis_30d).length / n * 100,
    },
  };
}

// ===== Statistics =====

export function getKaplanMeierData(db: Database.Database, type: string, filters?: FilterCriteria): Array<{ time: number; event: boolean; group?: string }> {
  let baseQuery = `
    SELECT o.operation_date, o.conduit_type, pa.wifi_stage, pi.glass_overall_stage,
           pa.patient_risk_category,
           oc.death_30d, oc.death_date, oc.mi_30d, oc.stroke_30d,
           oc.graft_thrombosis_30d, oc.thrombosis_date,
           oc.major_amputation_30d, oc.amputation_date,
           pa.id as episode_id
    FROM operations o
    JOIN preop_assessments pa ON pa.id = o.episode_id
    LEFT JOIN preop_imaging pi ON pi.episode_id = pa.id
    LEFT JOIN outcomes_30day oc ON oc.episode_id = pa.id
    LEFT JOIN comorbidities c ON c.patient_id = pa.patient_id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.conduit_type?.length) {
    conditions.push(`o.conduit_type IN (${filters.conduit_type.map(() => '?').join(',')})`);
    params.push(...filters.conduit_type);
  }
  if (filters?.glass_stage?.length) {
    conditions.push(`pi.glass_overall_stage IN (${filters.glass_stage.map(() => '?').join(',')})`);
    params.push(...filters.glass_stage);
  }

  if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

  const rows = db.prepare(baseQuery).all(...params) as any[];
  const today = new Date();

  return rows.map(row => {
    const opDate = new Date(row.operation_date);
    let eventDate: Date | null = null;
    let event = false;

    switch (type) {
      case 'primary_patency': {
        // Event: first loss of patency (thrombosis or any graft-related reintervention)
        if (row.graft_thrombosis_30d) {
          eventDate = row.thrombosis_date ? new Date(row.thrombosis_date) : opDate;
          event = true;
        }
        // Also check followup visits for first patency loss
        const visits = db.prepare(
          `SELECT visit_date, patency_status FROM followup_visits WHERE episode_id = ? ORDER BY visit_date`
        ).all(row.episode_id) as any[];
        for (const v of visits) {
          if (v.patency_status !== 'patent_no_intervention') {
            const vDate = new Date(v.visit_date);
            if (!eventDate || vDate < eventDate) {
              eventDate = vDate;
              event = true;
            }
            break;
          }
        }
        break;
      }
      case 'assisted_primary_patency': {
        // Event: occlusion regardless of prior revisions while patent
        if (row.graft_thrombosis_30d) { event = true; eventDate = row.thrombosis_date ? new Date(row.thrombosis_date) : opDate; }
        const visits2 = db.prepare(
          `SELECT visit_date, patency_status FROM followup_visits WHERE episode_id = ? ORDER BY visit_date`
        ).all(row.episode_id) as any[];
        for (const v of visits2) {
          if (v.patency_status === 'occluded') {
            eventDate = new Date(v.visit_date);
            event = true;
            break;
          }
        }
        break;
      }
      case 'secondary_patency': {
        // Event: permanent occlusion (no restoration)
        const visits3 = db.prepare(
          `SELECT visit_date, patency_status FROM followup_visits WHERE episode_id = ? ORDER BY visit_date DESC LIMIT 1`
        ).all(row.episode_id) as any[];
        if (visits3.length && visits3[0].patency_status === 'occluded') {
          eventDate = new Date(visits3[0].visit_date);
          event = true;
        }
        break;
      }
      case 'limb_salvage': {
        if (row.major_amputation_30d) {
          event = true;
          eventDate = row.amputation_date ? new Date(row.amputation_date) : opDate;
        }
        const visits4 = db.prepare(
          `SELECT visit_date FROM followup_visits WHERE episode_id = ? AND major_amputation_since_last = 1 ORDER BY visit_date LIMIT 1`
        ).all(row.episode_id) as any[];
        if (visits4.length) {
          const vDate = new Date(visits4[0].visit_date);
          if (!eventDate || vDate < eventDate) { eventDate = vDate; event = true; }
        }
        break;
      }
      case 'overall_survival': {
        if (row.death_30d) {
          event = true;
          eventDate = row.death_date ? new Date(row.death_date) : opDate;
        }
        const visits5 = db.prepare(
          `SELECT visit_date FROM followup_visits WHERE episode_id = ? AND patient_alive = 0 ORDER BY visit_date LIMIT 1`
        ).all(row.episode_id) as any[];
        if (visits5.length) {
          const vDate = new Date(visits5[0].visit_date);
          if (!eventDate || vDate < eventDate) { eventDate = vDate; event = true; }
        }
        break;
      }
      case 'mace_free': {
        if (row.death_30d || row.mi_30d || row.stroke_30d) {
          event = true;
          eventDate = row.death_date ? new Date(row.death_date) : opDate;
        }
        break;
      }
    }

    const endDate = event && eventDate ? eventDate : today;
    const time = Math.max(0, Math.floor((endDate.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24)));

    return { time, event, group: row.conduit_type };
  });
}

export function getOutcomesSummary(db: Database.Database, filters?: FilterCriteria): Record<string, { count: number; total: number; pct: number }> {
  let query = `
    SELECT oc.*
    FROM outcomes_30day oc
    JOIN preop_assessments pa ON pa.id = oc.episode_id
    LEFT JOIN preop_imaging pi ON pi.episode_id = pa.id
    LEFT JOIN operations o ON o.episode_id = pa.id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.conduit_type?.length) {
    conditions.push(`o.conduit_type IN (${filters.conduit_type.map(() => '?').join(',')})`);
    params.push(...filters.conduit_type);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

  const outcomes = db.prepare(query).all(...params) as Outcomes30Day[];
  const n = outcomes.length;
  if (n === 0) return {};

  const count = (fn: (o: Outcomes30Day) => boolean) => outcomes.filter(fn).length;

  return {
    'Mortality': { count: count(o => !!o.death_30d), total: n, pct: count(o => !!o.death_30d) / n * 100 },
    'MI': { count: count(o => !!o.mi_30d), total: n, pct: count(o => !!o.mi_30d) / n * 100 },
    'Stroke': { count: count(o => !!o.stroke_30d), total: n, pct: count(o => !!o.stroke_30d) / n * 100 },
    'MACE': { count: count(o => !!(o.death_30d || o.mi_30d || o.stroke_30d)), total: n, pct: count(o => !!(o.death_30d || o.mi_30d || o.stroke_30d)) / n * 100 },
    'Graft thrombosis': { count: count(o => !!o.graft_thrombosis_30d), total: n, pct: count(o => !!o.graft_thrombosis_30d) / n * 100 },
    'Major amputation': { count: count(o => !!o.major_amputation_30d), total: n, pct: count(o => !!o.major_amputation_30d) / n * 100 },
    'Reintervention': { count: count(o => !!o.reintervention_30d), total: n, pct: count(o => !!o.reintervention_30d) / n * 100 },
    'SSI': { count: count(o => !!o.ssi_30d), total: n, pct: count(o => !!o.ssi_30d) / n * 100 },
  };
}

// ===== Audit Log =====

export function getAuditLog(db: Database.Database, limit = 100, offset = 0): AuditLogEntry[] {
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as AuditLogEntry[];
}
