import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Patient, Comorbidities, PreopAssessment } from '../../shared/types';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [comorbidities, setComorbidities] = useState<Comorbidities | null>(null);
  const [episodes, setEpisodes] = useState<PreopAssessment[]>([]);
  const [editingComorbidities, setEditingComorbidities] = useState(false);
  const [comorb, setComorb] = useState<Partial<Comorbidities>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getPatient(id),
      api.getComorbidities(id),
      api.listEpisodes(id),
    ]).then(([p, c, e]) => {
      setPatient(p as Patient);
      setComorbidities(c as Comorbidities);
      setComorb(c as Comorbidities || {});
      setEpisodes(e as PreopAssessment[] || []);
    });
  }, [id]);

  const saveComorb = async () => {
    await api.upsertComorbidities({ ...comorb, patient_id: id });
    setComorbidities(comorb as Comorbidities);
    setEditingComorbidities(false);
  };

  if (!patient) return <div className="animate-pulse">Loading...</div>;

  const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/patients" className="text-sm text-primary-600 hover:underline">&larr; Back to Registry</Link>
          <h1 className="text-2xl font-bold mt-1">{patient.last_name}, {patient.first_name}</h1>
          <p className="text-gray-500 text-sm">DOB: {patient.date_of_birth} (Age {age}) | {patient.sex} | ASA {patient.asa_class}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => api.exportPdf(id!)}>Export PDF</button>
          <Link to={`/patients/${id}/episodes/new`} className="btn-primary">+ New Episode</Link>
        </div>
      </div>

      {/* Demographics card */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Demographics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500">BMI:</span> {patient.bmi ?? 'N/A'}</div>
          <div><span className="text-gray-500">Smoking:</span> {patient.smoking_status}{patient.pack_years ? ` (${patient.pack_years} pack-years)` : ''}</div>
          <div><span className="text-gray-500">Functional:</span> {patient.functional_status}</div>
          <div><span className="text-gray-500">Ethnicity:</span> {patient.ethnicity || 'N/A'}</div>
        </div>
      </div>

      {/* Comorbidities card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Comorbidities</h2>
          <button className="btn-secondary text-sm" onClick={() => setEditingComorbidities(!editingComorbidities)}>
            {editingComorbidities ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingComorbidities ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Diabetes</label>
                <select className="select-field" value={comorb.diabetes_type || 'none'}
                  onChange={e => setComorb({...comorb, diabetes_type: e.target.value as any})}>
                  <option value="none">None</option>
                  <option value="type1">Type 1</option>
                  <option value="type2">Type 2</option>
                </select>
              </div>
              <div>
                <label className="label">HbA1c</label>
                <input type="number" step="0.1" className="input-field" value={comorb.hba1c || ''}
                  onChange={e => setComorb({...comorb, hba1c: parseFloat(e.target.value) || null})} />
              </div>
              <div>
                <label className="label">CKD Stage</label>
                <select className="select-field" value={comorb.ckd_stage || 'none'}
                  onChange={e => setComorb({...comorb, ckd_stage: e.target.value as any})}>
                  {['none','1','2','3a','3b','4','5'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">LVEF %</label>
                <input type="number" className="input-field" value={comorb.lvef_percent || ''}
                  onChange={e => setComorb({...comorb, lvef_percent: parseInt(e.target.value) || null})} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['hypertension', 'Hypertension'],
                ['dialysis_dependent', 'Dialysis'],
                ['cad', 'CAD'],
                ['prior_mi', 'Prior MI'],
                ['chf', 'CHF'],
                ['copd', 'COPD'],
                ['prior_stroke_tia', 'Prior Stroke/TIA'],
                ['prior_ipsilateral_bypass', 'Prior Ipsilateral Bypass'],
                ['prior_ipsilateral_endovascular', 'Prior Ipsilateral Endovascular'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!(comorb as any)[key]}
                    onChange={e => setComorb({...comorb, [key]: e.target.checked})}
                    className="rounded border-gray-300" />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={saveComorb}>Save Comorbidities</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><span className="text-gray-500">Diabetes:</span> {comorbidities?.diabetes_type || 'none'}</div>
            <div><span className="text-gray-500">HbA1c:</span> {comorbidities?.hba1c ?? 'N/A'}</div>
            <div><span className="text-gray-500">CKD:</span> {comorbidities?.ckd_stage || 'none'}</div>
            <div><span className="text-gray-500">Dialysis:</span> {comorbidities?.dialysis_dependent ? 'Yes' : 'No'}</div>
            <div><span className="text-gray-500">HTN:</span> {comorbidities?.hypertension ? 'Yes' : 'No'}</div>
            <div><span className="text-gray-500">CAD:</span> {comorbidities?.cad ? 'Yes' : 'No'}</div>
            <div><span className="text-gray-500">CHF:</span> {comorbidities?.chf ? 'Yes' : 'No'}{comorbidities?.lvef_percent ? ` (EF ${comorbidities.lvef_percent}%)` : ''}</div>
            <div><span className="text-gray-500">COPD:</span> {comorbidities?.copd ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>

      {/* Episodes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Episodes</h2>
          <Link to={`/patients/${id}/episodes/new`} className="btn-primary text-sm">+ New Episode</Link>
        </div>

        {episodes.length === 0 ? (
          <p className="text-gray-500 text-sm">No episodes recorded.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map(ep => (
              <Link
                key={ep.id}
                to={`/patients/${id}/episodes/${ep.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ep.episode_date} — {ep.affected_limb} limb</p>
                    <p className="text-sm text-gray-500 mt-1">
                      WIfI: W{ep.wifi_wound} I{ep.wifi_ischemia} Fi{ep.wifi_infection} → Stage {ep.wifi_stage} |
                      Rutherford {ep.rutherford_grade} |
                      PREVENT III: {ep.prevent_iii_score} ({ep.patient_risk_category})
                    </p>
                  </div>
                  <span className={`badge ${ep.wifi_stage >= 4 ? 'badge-red' : ep.wifi_stage >= 3 ? 'badge-yellow' : 'badge-green'}`}>
                    Stage {ep.wifi_stage}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
