import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { calculateWifiStage, calculatePreventIIIScore, getPatientRiskCategory, calculateGLASSOverallStage } from '../../shared/computed';
import type { PreopAssessment, PreopImaging, Operation, Medications, Labs, Outcomes30Day } from '../../shared/types';

type Step = 'preop' | 'imaging' | 'operation' | 'medications' | 'labs' | 'outcomes';

const STEPS: { key: Step; label: string }[] = [
  { key: 'preop', label: 'Preop Assessment' },
  { key: 'imaging', label: 'Imaging / GLASS' },
  { key: 'operation', label: 'Operation' },
  { key: 'medications', label: 'Medications' },
  { key: 'labs', label: 'Labs' },
  { key: 'outcomes', label: '30-Day Outcomes' },
];

export default function EpisodeWizardPage() {
  const { patientId, episodeId } = useParams<{ patientId: string; episodeId: string }>();
  const navigate = useNavigate();
  const isNew = !episodeId || episodeId === 'new';
  const [currentStep, setCurrentStep] = useState<Step>('preop');
  const [saving, setSaving] = useState(false);
  const [savedEpisodeId, setSavedEpisodeId] = useState(episodeId && episodeId !== 'new' ? episodeId : '');

  // Preop Assessment state
  const [preop, setPreop] = useState({
    episode_date: new Date().toISOString().split('T')[0],
    affected_limb: 'left' as const,
    wifi_wound: 0,
    wifi_ischemia: 0,
    wifi_infection: 0,
    rutherford_grade: '5' as const,
    abi_value: '' as string,
    tbi_value: '' as string,
    toe_pressure_mmhg: '' as string,
    tcpo2_mmhg: '' as string,
    dialysis: false,
    tissue_loss: false,
    age_gte_75: false,
    haematocrit_lt30: false,
    creatinine_gt180: false,
    notes: '',
  });

  // Imaging state
  const [imaging, setImaging] = useState({
    imaging_modality: 'CTA' as const,
    glass_fp_stage: 'I' as const,
    glass_tibial_modifier: '0' as const,
    target_artery_path: '',
    inflow_vessel: '',
    runoff_vessels_patent: 1,
    gsv_ipsilateral_available: false,
    gsv_diameter_mm: '' as string,
    ssv_available: false,
    arm_vein_available: false,
    vein_mapping_performed: false,
    notes: '',
  });

  // Operation state
  const [operation, setOperation] = useState({
    operation_date: new Date().toISOString().split('T')[0],
    urgency: 'elective' as const,
    anaesthesia_type: 'GA' as const,
    inflow_site: '',
    outflow_site: '',
    bypass_configuration: '',
    conduit_type: 'GSV_single' as const,
    conduit_technique: 'reversed' as const,
    conduit_diameter_mm: '' as string,
    operative_time_min: '' as string,
    ebl_ml: '' as string,
    heparin_dose_units: '' as string,
    act_peak: '' as string,
    clamp_time_min: '' as string,
    transfusion_units_prbc: 0,
    completion_imaging: 'none' as const,
    completion_imaging_finding: 'normal' as const,
    concurrent_minor_amputation: false,
    concurrent_wound_debridement: false,
    notes: '',
  });

  // Medications state
  const [meds, setMeds] = useState({
    antiplatelet: 'aspirin' as const,
    anticoagulation: 'none' as const,
    statin: true,
    statin_intensity: 'high' as const,
    ace_arb: false,
    diabetes_agent_class: '',
    smoking_cessation_counselled: false,
  });

  // Labs state
  const [labs, setLabs] = useState({
    lab_date: new Date().toISOString().split('T')[0],
    hb_gdl: '' as string,
    haematocrit: '' as string,
    platelets: '' as string,
    inr: '' as string,
    creatinine_umol: '' as string,
    egfr: '' as string,
    hba1c_percent: '' as string,
    ldl_mmol: '' as string,
    crp_mg_l: '' as string,
  });

  // Outcomes state
  const [outcomes, setOutcomes] = useState({
    death_30d: false,
    death_date: '' as string,
    cause_of_death: '',
    mi_30d: false,
    stroke_30d: false,
    graft_thrombosis_30d: false,
    thrombosis_date: '' as string,
    major_amputation_30d: false,
    amputation_level: 'NA' as const,
    amputation_date: '' as string,
    reintervention_30d: false,
    reintervention_type: '' as string,
    ssi_30d: false,
    ssi_grade: 'NA' as const,
    los_days: '' as string,
    icu_days: '' as string,
  });

  // Load existing data
  useEffect(() => {
    if (!isNew && episodeId) {
      Promise.all([
        api.getEpisode(episodeId),
        api.getImaging(episodeId),
        api.getOperation(episodeId),
        api.getMedications(episodeId),
        api.getLabs(episodeId),
        api.getOutcomes(episodeId),
      ]).then(([ep, img, op, med, lb, oc]) => {
        if (ep) {
          const e = ep as PreopAssessment;
          setPreop({
            episode_date: e.episode_date,
            affected_limb: e.affected_limb,
            wifi_wound: e.wifi_wound,
            wifi_ischemia: e.wifi_ischemia,
            wifi_infection: e.wifi_infection,
            rutherford_grade: e.rutherford_grade,
            abi_value: e.abi_value?.toString() || '',
            tbi_value: e.tbi_value?.toString() || '',
            toe_pressure_mmhg: e.toe_pressure_mmhg?.toString() || '',
            tcpo2_mmhg: e.tcpo2_mmhg?.toString() || '',
            dialysis: !!e.dialysis,
            tissue_loss: !!e.tissue_loss,
            age_gte_75: !!e.age_gte_75,
            haematocrit_lt30: !!e.haematocrit_lt30,
            creatinine_gt180: !!e.creatinine_gt180,
            notes: e.notes,
          });
        }
        if (img) {
          const i = img as PreopImaging;
          setImaging({
            imaging_modality: i.imaging_modality,
            glass_fp_stage: i.glass_fp_stage,
            glass_tibial_modifier: i.glass_tibial_modifier,
            target_artery_path: i.target_artery_path,
            inflow_vessel: i.inflow_vessel,
            runoff_vessels_patent: i.runoff_vessels_patent,
            gsv_ipsilateral_available: !!i.gsv_ipsilateral_available,
            gsv_diameter_mm: i.gsv_diameter_mm?.toString() || '',
            ssv_available: !!i.ssv_available,
            arm_vein_available: !!i.arm_vein_available,
            vein_mapping_performed: !!i.vein_mapping_performed,
            notes: i.notes,
          });
        }
        if (op) {
          const o = op as Operation;
          setOperation({
            operation_date: o.operation_date,
            urgency: o.urgency,
            anaesthesia_type: o.anaesthesia_type,
            inflow_site: o.inflow_site,
            outflow_site: o.outflow_site,
            bypass_configuration: o.bypass_configuration,
            conduit_type: o.conduit_type,
            conduit_technique: o.conduit_technique,
            conduit_diameter_mm: o.conduit_diameter_mm?.toString() || '',
            operative_time_min: o.operative_time_min?.toString() || '',
            ebl_ml: o.ebl_ml?.toString() || '',
            heparin_dose_units: o.heparin_dose_units?.toString() || '',
            act_peak: o.act_peak?.toString() || '',
            clamp_time_min: o.clamp_time_min?.toString() || '',
            transfusion_units_prbc: o.transfusion_units_prbc,
            completion_imaging: o.completion_imaging,
            completion_imaging_finding: o.completion_imaging_finding,
            concurrent_minor_amputation: !!o.concurrent_minor_amputation,
            concurrent_wound_debridement: !!o.concurrent_wound_debridement,
            notes: o.notes,
          });
        }
        if (med) {
          const m = med as Medications;
          setMeds({
            antiplatelet: m.antiplatelet,
            anticoagulation: m.anticoagulation,
            statin: !!m.statin,
            statin_intensity: m.statin_intensity,
            ace_arb: !!m.ace_arb,
            diabetes_agent_class: m.diabetes_agent_class,
            smoking_cessation_counselled: !!m.smoking_cessation_counselled,
          });
        }
        if (lb) {
          const l = lb as Labs;
          setLabs({
            lab_date: l.lab_date,
            hb_gdl: l.hb_gdl?.toString() || '',
            haematocrit: l.haematocrit?.toString() || '',
            platelets: l.platelets?.toString() || '',
            inr: l.inr?.toString() || '',
            creatinine_umol: l.creatinine_umol?.toString() || '',
            egfr: l.egfr?.toString() || '',
            hba1c_percent: l.hba1c_percent?.toString() || '',
            ldl_mmol: l.ldl_mmol?.toString() || '',
            crp_mg_l: l.crp_mg_l?.toString() || '',
          });
        }
        if (oc) {
          const o = oc as Outcomes30Day;
          setOutcomes({
            death_30d: !!o.death_30d,
            death_date: o.death_date || '',
            cause_of_death: o.cause_of_death || '',
            mi_30d: !!o.mi_30d,
            stroke_30d: !!o.stroke_30d,
            graft_thrombosis_30d: !!o.graft_thrombosis_30d,
            thrombosis_date: o.thrombosis_date || '',
            major_amputation_30d: !!o.major_amputation_30d,
            amputation_level: o.amputation_level,
            amputation_date: o.amputation_date || '',
            reintervention_30d: !!o.reintervention_30d,
            reintervention_type: o.reintervention_type || '',
            ssi_30d: !!o.ssi_30d,
            ssi_grade: o.ssi_grade,
            los_days: o.los_days?.toString() || '',
            icu_days: o.icu_days?.toString() || '',
          });
        }
      });
    }
  }, [episodeId, isNew]);

  // Computed values
  const wifiStage = calculateWifiStage(preop.wifi_wound, preop.wifi_ischemia, preop.wifi_infection);
  const preventScore = calculatePreventIIIScore({
    dialysis: preop.dialysis,
    tissue_loss: preop.tissue_loss,
    age_gte_75: preop.age_gte_75,
    haematocrit_lt30: preop.haematocrit_lt30,
    creatinine_gt180: preop.creatinine_gt180,
  });
  const riskCategory = getPatientRiskCategory(preventScore);
  const glassOverall = calculateGLASSOverallStage(imaging.glass_fp_stage as any, imaging.glass_tibial_modifier as any);

  const saveCurrentStep = async () => {
    setSaving(true);
    try {
      let epId = savedEpisodeId;

      if (currentStep === 'preop') {
        const data = {
          patient_id: patientId,
          ...preop,
          abi_value: preop.abi_value ? parseFloat(preop.abi_value) : null,
          tbi_value: preop.tbi_value ? parseFloat(preop.tbi_value) : null,
          toe_pressure_mmhg: preop.toe_pressure_mmhg ? parseInt(preop.toe_pressure_mmhg) : null,
          tcpo2_mmhg: preop.tcpo2_mmhg ? parseInt(preop.tcpo2_mmhg) : null,
        };
        if (!epId) {
          epId = await api.createEpisode(data);
          setSavedEpisodeId(epId);
        } else {
          await api.updateEpisode(epId, data);
        }
      } else if (currentStep === 'imaging' && epId) {
        await api.upsertImaging({
          episode_id: epId,
          ...imaging,
          glass_overall_stage: glassOverall,
          gsv_diameter_mm: imaging.gsv_diameter_mm ? parseFloat(imaging.gsv_diameter_mm) : null,
        });
      } else if (currentStep === 'operation' && epId) {
        await api.upsertOperation({
          episode_id: epId,
          ...operation,
          conduit_diameter_mm: operation.conduit_diameter_mm ? parseFloat(operation.conduit_diameter_mm) : null,
          operative_time_min: operation.operative_time_min ? parseInt(operation.operative_time_min) : null,
          ebl_ml: operation.ebl_ml ? parseInt(operation.ebl_ml) : null,
          heparin_dose_units: operation.heparin_dose_units ? parseInt(operation.heparin_dose_units) : null,
          act_peak: operation.act_peak ? parseInt(operation.act_peak) : null,
          clamp_time_min: operation.clamp_time_min ? parseInt(operation.clamp_time_min) : null,
        });
      } else if (currentStep === 'medications' && epId) {
        await api.upsertMedications({ episode_id: epId, visit_id: null, ...meds });
      } else if (currentStep === 'labs' && epId) {
        await api.upsertLabs({
          episode_id: epId,
          visit_id: null,
          ...labs,
          hb_gdl: labs.hb_gdl ? parseFloat(labs.hb_gdl) : null,
          haematocrit: labs.haematocrit ? parseFloat(labs.haematocrit) : null,
          platelets: labs.platelets ? parseInt(labs.platelets) : null,
          inr: labs.inr ? parseFloat(labs.inr) : null,
          creatinine_umol: labs.creatinine_umol ? parseFloat(labs.creatinine_umol) : null,
          egfr: labs.egfr ? parseFloat(labs.egfr) : null,
          hba1c_percent: labs.hba1c_percent ? parseFloat(labs.hba1c_percent) : null,
          ldl_mmol: labs.ldl_mmol ? parseFloat(labs.ldl_mmol) : null,
          crp_mg_l: labs.crp_mg_l ? parseFloat(labs.crp_mg_l) : null,
        });
      } else if (currentStep === 'outcomes' && epId) {
        await api.upsertOutcomes({
          episode_id: epId,
          ...outcomes,
          death_date: outcomes.death_date || null,
          cause_of_death: outcomes.cause_of_death || null,
          thrombosis_date: outcomes.thrombosis_date || null,
          amputation_date: outcomes.amputation_date || null,
          reintervention_type: outcomes.reintervention_type || null,
          los_days: outcomes.los_days ? parseInt(outcomes.los_days) : null,
          icu_days: outcomes.icu_days ? parseInt(outcomes.icu_days) : null,
        });
      }
    } catch (err) {
      alert('Error saving: ' + (err as Error).message);
    }
    setSaving(false);
  };

  const nextStep = async () => {
    await saveCurrentStep();
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key);
    }
  };

  const prevStep = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  };

  const finish = async () => {
    await saveCurrentStep();
    navigate(`/patients/${patientId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link to={`/patients/${patientId}`} className="text-sm text-primary-600 hover:underline">&larr; Back to Patient</Link>
        <h1 className="text-2xl font-bold mt-1">{isNew ? 'New Episode' : 'Edit Episode'}</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => savedEpisodeId && setCurrentStep(step.key)}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
              currentStep === step.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            } ${!savedEpisodeId && i > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="card">
        {currentStep === 'preop' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Preoperative Assessment</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Episode Date *</label>
                <input type="date" className="input-field" value={preop.episode_date}
                  onChange={e => setPreop({...preop, episode_date: e.target.value})} required />
              </div>
              <div>
                <label className="label">Affected Limb *</label>
                <select className="select-field" value={preop.affected_limb}
                  onChange={e => setPreop({...preop, affected_limb: e.target.value as any})}>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="label">Rutherford Grade *</label>
                <select className="select-field" value={preop.rutherford_grade}
                  onChange={e => setPreop({...preop, rutherford_grade: e.target.value as any})}>
                  {['0','1','2','3','4','5','6'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* WIfI Calculator */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-3">WIfI Classification (Mandatory)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Wound (W) 0-3</label>
                  <select className="select-field" value={preop.wifi_wound}
                    onChange={e => setPreop({...preop, wifi_wound: parseInt(e.target.value)})}>
                    <option value={0}>0 — No ulcer/gangrene</option>
                    <option value={1}>1 — Small shallow ulcer</option>
                    <option value={2}>2 — Deep ulcer +/- gangrene (forefoot)</option>
                    <option value={3}>3 — Extensive ulcer/gangrene</option>
                  </select>
                </div>
                <div>
                  <label className="label">Ischemia (I) 0-3</label>
                  <select className="select-field" value={preop.wifi_ischemia}
                    onChange={e => setPreop({...preop, wifi_ischemia: parseInt(e.target.value)})}>
                    <option value={0}>0 — ABI ≥ 0.80</option>
                    <option value={1}>1 — ABI 0.60-0.79</option>
                    <option value={2}>2 — ABI 0.40-0.59</option>
                    <option value={3}>3 — ABI ≤ 0.39</option>
                  </select>
                </div>
                <div>
                  <label className="label">Foot Infection (fI) 0-3</label>
                  <select className="select-field" value={preop.wifi_infection}
                    onChange={e => setPreop({...preop, wifi_infection: parseInt(e.target.value)})}>
                    <option value={0}>0 — No infection</option>
                    <option value={1}>1 — Mild: local infection, skin/subcut only</option>
                    <option value={2}>2 — Moderate: deeper abscess, joint</option>
                    <option value={3}>3 — Severe: SIRS/sepsis</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <span className="text-lg font-bold">
                  WIfI Stage: <span className={wifiStage >= 4 ? 'text-red-600' : wifiStage >= 3 ? 'text-yellow-600' : 'text-green-600'}>{wifiStage}</span>
                </span>
                <span className="text-sm text-gray-500 ml-3">
                  ({wifiStage === 1 ? 'Very low' : wifiStage === 2 ? 'Low' : wifiStage === 3 ? 'Moderate' : 'High'} amputation risk)
                </span>
              </div>
            </div>

            {/* Hemodynamics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">ABI</label>
                <input type="number" step="0.01" className="input-field" value={preop.abi_value}
                  onChange={e => setPreop({...preop, abi_value: e.target.value})} />
              </div>
              <div>
                <label className="label">TBI</label>
                <input type="number" step="0.01" className="input-field" value={preop.tbi_value}
                  onChange={e => setPreop({...preop, tbi_value: e.target.value})} />
              </div>
              <div>
                <label className="label">Toe Pressure (mmHg)</label>
                <input type="number" className="input-field" value={preop.toe_pressure_mmhg}
                  onChange={e => setPreop({...preop, toe_pressure_mmhg: e.target.value})} />
              </div>
              <div>
                <label className="label">TcPO₂ (mmHg)</label>
                <input type="number" className="input-field" value={preop.tcpo2_mmhg}
                  onChange={e => setPreop({...preop, tcpo2_mmhg: e.target.value})} />
              </div>
            </div>

            {/* PREVENT III Calculator */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h3 className="font-semibold mb-3">PREVENT III Risk Score</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ['dialysis', 'Dialysis-dependent'],
                  ['tissue_loss', 'Tissue loss (Rutherford 5/6)'],
                  ['age_gte_75', 'Age ≥ 75'],
                  ['haematocrit_lt30', 'Haematocrit < 30%'],
                  ['creatinine_gt180', 'Creatinine > 180 µmol/L'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(preop as any)[key]}
                      onChange={e => setPreop({...preop, [key]: e.target.checked})}
                      className="rounded border-gray-300" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <span className="text-lg font-bold">
                  PREVENT III Score: {preventScore}/5 — <span className={riskCategory === 'high' ? 'text-red-600' : 'text-green-600'}>{riskCategory} risk</span>
                </span>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={preop.notes}
                onChange={e => setPreop({...preop, notes: e.target.value})} />
            </div>
          </div>
        )}

        {currentStep === 'imaging' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Preoperative Imaging & GLASS Staging</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Imaging Modality *</label>
                <select className="select-field" value={imaging.imaging_modality}
                  onChange={e => setImaging({...imaging, imaging_modality: e.target.value as any})}>
                  <option value="duplex">Duplex Ultrasound</option>
                  <option value="CTA">CTA</option>
                  <option value="MRA">MRA</option>
                  <option value="DSA">DSA</option>
                  <option value="combined">Combined</option>
                </select>
              </div>
            </div>

            {/* GLASS Staging */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-semibold mb-3">GLASS Classification (Mandatory)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Femoropopliteal (FP) Stage</label>
                  <select className="select-field" value={imaging.glass_fp_stage}
                    onChange={e => setImaging({...imaging, glass_fp_stage: e.target.value as any})}>
                    <option value="I">I — Mild disease</option>
                    <option value="II">II — Moderate disease</option>
                    <option value="III">III — Severe/extensive</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tibial Modifier (P)</label>
                  <select className="select-field" value={imaging.glass_tibial_modifier}
                    onChange={e => setImaging({...imaging, glass_tibial_modifier: e.target.value as any})}>
                    <option value="0">0 — No significant tibial disease</option>
                    <option value="1">1 — Moderate tibial disease</option>
                    <option value="2">2 — Severe tibial disease</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg w-full text-center">
                    <span className="text-lg font-bold">Overall GLASS: {glassOverall}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Target Artery Path</label>
                <input className="input-field" placeholder="e.g. popliteal P2, AT, PT, peroneal"
                  value={imaging.target_artery_path}
                  onChange={e => setImaging({...imaging, target_artery_path: e.target.value})} />
              </div>
              <div>
                <label className="label">Inflow Vessel</label>
                <input className="input-field" value={imaging.inflow_vessel}
                  onChange={e => setImaging({...imaging, inflow_vessel: e.target.value})} />
              </div>
              <div>
                <label className="label">Runoff Vessels Patent (1-3)</label>
                <select className="select-field" value={imaging.runoff_vessels_patent}
                  onChange={e => setImaging({...imaging, runoff_vessels_patent: parseInt(e.target.value)})}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>

            {/* Vein Mapping */}
            <div>
              <h3 className="font-semibold mb-3">Vein Mapping</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={imaging.vein_mapping_performed}
                    onChange={e => setImaging({...imaging, vein_mapping_performed: e.target.checked})}
                    className="rounded border-gray-300" />
                  Vein mapping performed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={imaging.gsv_ipsilateral_available}
                    onChange={e => setImaging({...imaging, gsv_ipsilateral_available: e.target.checked})}
                    className="rounded border-gray-300" />
                  Ipsilateral GSV available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={imaging.ssv_available}
                    onChange={e => setImaging({...imaging, ssv_available: e.target.checked})}
                    className="rounded border-gray-300" />
                  SSV available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={imaging.arm_vein_available}
                    onChange={e => setImaging({...imaging, arm_vein_available: e.target.checked})}
                    className="rounded border-gray-300" />
                  Arm vein available
                </label>
              </div>
              {imaging.gsv_ipsilateral_available && (
                <div className="mt-3 w-48">
                  <label className="label">GSV Diameter (mm)</label>
                  <input type="number" step="0.1" className="input-field" value={imaging.gsv_diameter_mm}
                    onChange={e => setImaging({...imaging, gsv_diameter_mm: e.target.value})} />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'operation' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Operation Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Operation Date *</label>
                <input type="date" className="input-field" value={operation.operation_date}
                  onChange={e => setOperation({...operation, operation_date: e.target.value})} required />
              </div>
              <div>
                <label className="label">Urgency *</label>
                <select className="select-field" value={operation.urgency}
                  onChange={e => setOperation({...operation, urgency: e.target.value as any})}>
                  <option value="elective">Elective</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergent">Emergent</option>
                </select>
              </div>
              <div>
                <label className="label">Anaesthesia *</label>
                <select className="select-field" value={operation.anaesthesia_type}
                  onChange={e => setOperation({...operation, anaesthesia_type: e.target.value as any})}>
                  <option value="GA">General</option>
                  <option value="regional_spinal">Regional — Spinal</option>
                  <option value="regional_epidural">Regional — Epidural</option>
                  <option value="regional_block">Regional — Block</option>
                  <option value="local">Local</option>
                </select>
              </div>
            </div>

            {/* Bypass configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Inflow Site *</label>
                <input className="input-field" placeholder="e.g. CFA, SFA, popliteal above knee"
                  value={operation.inflow_site}
                  onChange={e => setOperation({...operation, inflow_site: e.target.value})} required />
              </div>
              <div>
                <label className="label">Outflow Site *</label>
                <input className="input-field" placeholder="e.g. popliteal P3, AT, dorsalis pedis"
                  value={operation.outflow_site}
                  onChange={e => setOperation({...operation, outflow_site: e.target.value})} required />
              </div>
              <div>
                <label className="label">Bypass Configuration</label>
                <input className="input-field" value={operation.bypass_configuration}
                  onChange={e => setOperation({...operation, bypass_configuration: e.target.value})} />
              </div>
            </div>

            {/* Conduit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Conduit Type *</label>
                <select className="select-field" value={operation.conduit_type}
                  onChange={e => setOperation({...operation, conduit_type: e.target.value as any})}>
                  <option value="GSV_single">GSV Single Segment</option>
                  <option value="GSV_spliced">GSV Spliced</option>
                  <option value="SSV">SSV</option>
                  <option value="arm_vein">Arm Vein</option>
                  <option value="composite_vein">Composite Vein</option>
                  <option value="PTFE">PTFE</option>
                  <option value="Dacron">Dacron</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="label">Conduit Technique</label>
                <select className="select-field" value={operation.conduit_technique}
                  onChange={e => setOperation({...operation, conduit_technique: e.target.value as any})}>
                  <option value="reversed">Reversed</option>
                  <option value="in_situ">In Situ</option>
                  <option value="non_reversed_translocated">Non-reversed Translocated</option>
                  <option value="NA">N/A</option>
                </select>
              </div>
              <div>
                <label className="label">Conduit Diameter (mm)</label>
                <input type="number" step="0.1" className="input-field" value={operation.conduit_diameter_mm}
                  onChange={e => setOperation({...operation, conduit_diameter_mm: e.target.value})} />
              </div>
            </div>

            {/* Intraoperative */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Op Time (min)</label>
                <input type="number" className="input-field" value={operation.operative_time_min}
                  onChange={e => setOperation({...operation, operative_time_min: e.target.value})} />
              </div>
              <div>
                <label className="label">EBL (mL)</label>
                <input type="number" className="input-field" value={operation.ebl_ml}
                  onChange={e => setOperation({...operation, ebl_ml: e.target.value})} />
              </div>
              <div>
                <label className="label">Heparin (units)</label>
                <input type="number" className="input-field" value={operation.heparin_dose_units}
                  onChange={e => setOperation({...operation, heparin_dose_units: e.target.value})} />
              </div>
              <div>
                <label className="label">Peak ACT</label>
                <input type="number" className="input-field" value={operation.act_peak}
                  onChange={e => setOperation({...operation, act_peak: e.target.value})} />
              </div>
              <div>
                <label className="label">Clamp Time (min)</label>
                <input type="number" className="input-field" value={operation.clamp_time_min}
                  onChange={e => setOperation({...operation, clamp_time_min: e.target.value})} />
              </div>
              <div>
                <label className="label">Transfusion (units pRBC)</label>
                <input type="number" className="input-field" value={operation.transfusion_units_prbc}
                  onChange={e => setOperation({...operation, transfusion_units_prbc: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="label">Completion Imaging</label>
                <select className="select-field" value={operation.completion_imaging}
                  onChange={e => setOperation({...operation, completion_imaging: e.target.value as any})}>
                  <option value="none">None</option>
                  <option value="duplex">Duplex</option>
                  <option value="angiography">Angiography</option>
                </select>
              </div>
              <div>
                <label className="label">Imaging Finding</label>
                <select className="select-field" value={operation.completion_imaging_finding}
                  onChange={e => setOperation({...operation, completion_imaging_finding: e.target.value as any})}>
                  <option value="normal">Normal</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="revision_performed">Revision Performed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={operation.concurrent_minor_amputation}
                  onChange={e => setOperation({...operation, concurrent_minor_amputation: e.target.checked})}
                  className="rounded border-gray-300" />
                Concurrent minor amputation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={operation.concurrent_wound_debridement}
                  onChange={e => setOperation({...operation, concurrent_wound_debridement: e.target.checked})}
                  className="rounded border-gray-300" />
                Concurrent wound debridement
              </label>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={operation.notes}
                onChange={e => setOperation({...operation, notes: e.target.value})} />
            </div>
          </div>
        )}

        {currentStep === 'medications' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Perioperative Medications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Antiplatelet</label>
                <select className="select-field" value={meds.antiplatelet}
                  onChange={e => setMeds({...meds, antiplatelet: e.target.value as any})}>
                  <option value="none">None</option>
                  <option value="aspirin">Aspirin</option>
                  <option value="clopidogrel">Clopidogrel</option>
                  <option value="DAPT">DAPT (Aspirin + Clopidogrel)</option>
                  <option value="ticagrelor_aspirin">Ticagrelor + Aspirin</option>
                </select>
              </div>
              <div>
                <label className="label">Anticoagulation</label>
                <select className="select-field" value={meds.anticoagulation}
                  onChange={e => setMeds({...meds, anticoagulation: e.target.value as any})}>
                  <option value="none">None</option>
                  <option value="warfarin">Warfarin</option>
                  <option value="DOAC">DOAC</option>
                  <option value="heparin_bridge">Heparin Bridge</option>
                </select>
              </div>
              <div>
                <label className="label">Statin Intensity</label>
                <select className="select-field" value={meds.statin_intensity}
                  onChange={e => setMeds({...meds, statin: e.target.value !== 'NA', statin_intensity: e.target.value as any})}>
                  <option value="NA">Not on statin</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label">Diabetes Agent Class</label>
                <input className="input-field" value={meds.diabetes_agent_class}
                  onChange={e => setMeds({...meds, diabetes_agent_class: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={meds.ace_arb}
                  onChange={e => setMeds({...meds, ace_arb: e.target.checked})}
                  className="rounded border-gray-300" />
                ACE inhibitor / ARB
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={meds.smoking_cessation_counselled}
                  onChange={e => setMeds({...meds, smoking_cessation_counselled: e.target.checked})}
                  className="rounded border-gray-300" />
                Smoking cessation counselled
              </label>
            </div>
          </div>
        )}

        {currentStep === 'labs' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Laboratory Values</h2>
            <div>
              <label className="label">Lab Date</label>
              <input type="date" className="input-field w-48" value={labs.lab_date}
                onChange={e => setLabs({...labs, lab_date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Haemoglobin (g/dL)</label>
                <input type="number" step="0.1" className="input-field" value={labs.hb_gdl}
                  onChange={e => setLabs({...labs, hb_gdl: e.target.value})} />
              </div>
              <div>
                <label className="label">Haematocrit</label>
                <input type="number" step="0.01" className="input-field" value={labs.haematocrit}
                  onChange={e => setLabs({...labs, haematocrit: e.target.value})} />
              </div>
              <div>
                <label className="label">Platelets (×10⁹/L)</label>
                <input type="number" className="input-field" value={labs.platelets}
                  onChange={e => setLabs({...labs, platelets: e.target.value})} />
              </div>
              <div>
                <label className="label">INR</label>
                <input type="number" step="0.1" className="input-field" value={labs.inr}
                  onChange={e => setLabs({...labs, inr: e.target.value})} />
              </div>
              <div>
                <label className="label">Creatinine (µmol/L)</label>
                <input type="number" step="0.1" className="input-field" value={labs.creatinine_umol}
                  onChange={e => setLabs({...labs, creatinine_umol: e.target.value})} />
              </div>
              <div>
                <label className="label">eGFR</label>
                <input type="number" step="0.1" className="input-field" value={labs.egfr}
                  onChange={e => setLabs({...labs, egfr: e.target.value})} />
              </div>
              <div>
                <label className="label">HbA1c (%)</label>
                <input type="number" step="0.1" className="input-field" value={labs.hba1c_percent}
                  onChange={e => setLabs({...labs, hba1c_percent: e.target.value})} />
              </div>
              <div>
                <label className="label">LDL (mmol/L)</label>
                <input type="number" step="0.1" className="input-field" value={labs.ldl_mmol}
                  onChange={e => setLabs({...labs, ldl_mmol: e.target.value})} />
              </div>
              <div>
                <label className="label">CRP (mg/L)</label>
                <input type="number" step="0.1" className="input-field" value={labs.crp_mg_l}
                  onChange={e => setLabs({...labs, crp_mg_l: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {currentStep === 'outcomes' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">30-Day Outcomes (Mandatory)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mortality */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.death_30d}
                    onChange={e => setOutcomes({...outcomes, death_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">30-day mortality</span>
                </label>
                {outcomes.death_30d && (
                  <div className="ml-6 space-y-2">
                    <input type="date" className="input-field" placeholder="Date of death"
                      value={outcomes.death_date}
                      onChange={e => setOutcomes({...outcomes, death_date: e.target.value})} />
                    <input className="input-field" placeholder="Cause of death"
                      value={outcomes.cause_of_death}
                      onChange={e => setOutcomes({...outcomes, cause_of_death: e.target.value})} />
                  </div>
                )}
              </div>

              {/* MI */}
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.mi_30d}
                    onChange={e => setOutcomes({...outcomes, mi_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">MI within 30 days</span>
                </label>
              </div>

              {/* Stroke */}
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.stroke_30d}
                    onChange={e => setOutcomes({...outcomes, stroke_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">Stroke within 30 days</span>
                </label>
              </div>

              {/* Graft thrombosis */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.graft_thrombosis_30d}
                    onChange={e => setOutcomes({...outcomes, graft_thrombosis_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">Graft thrombosis within 30 days</span>
                </label>
                {outcomes.graft_thrombosis_30d && (
                  <div className="ml-6">
                    <input type="date" className="input-field" value={outcomes.thrombosis_date}
                      onChange={e => setOutcomes({...outcomes, thrombosis_date: e.target.value})} />
                  </div>
                )}
              </div>

              {/* Major amputation */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.major_amputation_30d}
                    onChange={e => setOutcomes({...outcomes, major_amputation_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">Major amputation within 30 days</span>
                </label>
                {outcomes.major_amputation_30d && (
                  <div className="ml-6 space-y-2">
                    <select className="select-field" value={outcomes.amputation_level}
                      onChange={e => setOutcomes({...outcomes, amputation_level: e.target.value as any})}>
                      <option value="BKA">Below-knee (BKA)</option>
                      <option value="AKA">Above-knee (AKA)</option>
                    </select>
                    <input type="date" className="input-field" value={outcomes.amputation_date}
                      onChange={e => setOutcomes({...outcomes, amputation_date: e.target.value})} />
                  </div>
                )}
              </div>

              {/* Reintervention */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.reintervention_30d}
                    onChange={e => setOutcomes({...outcomes, reintervention_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">Reintervention within 30 days</span>
                </label>
                {outcomes.reintervention_30d && (
                  <div className="ml-6">
                    <input className="input-field" placeholder="Type of reintervention"
                      value={outcomes.reintervention_type}
                      onChange={e => setOutcomes({...outcomes, reintervention_type: e.target.value})} />
                  </div>
                )}
              </div>

              {/* SSI */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outcomes.ssi_30d}
                    onChange={e => setOutcomes({...outcomes, ssi_30d: e.target.checked})}
                    className="rounded border-gray-300" />
                  <span className="font-medium">Surgical site infection</span>
                </label>
                {outcomes.ssi_30d && (
                  <div className="ml-6">
                    <select className="select-field" value={outcomes.ssi_grade}
                      onChange={e => setOutcomes({...outcomes, ssi_grade: e.target.value as any})}>
                      <option value="superficial">Superficial</option>
                      <option value="deep">Deep</option>
                      <option value="organ_space">Organ/Space</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Length of Stay (days)</label>
                <input type="number" className="input-field" value={outcomes.los_days}
                  onChange={e => setOutcomes({...outcomes, los_days: e.target.value})} />
              </div>
              <div>
                <label className="label">ICU Days</label>
                <input type="number" className="input-field" value={outcomes.icu_days}
                  onChange={e => setOutcomes({...outcomes, icu_days: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t dark:border-gray-700">
          <button
            type="button"
            className="btn-secondary"
            onClick={prevStep}
            disabled={currentStep === STEPS[0].key}
          >
            Previous
          </button>

          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={saveCurrentStep} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {currentStep === STEPS[STEPS.length - 1].key ? (
              <button type="button" className="btn-primary" onClick={finish} disabled={saving}>
                Finish & Return
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={nextStep} disabled={saving}>
                Save & Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
