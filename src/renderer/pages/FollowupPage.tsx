import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import type { FollowupVisit } from '../../shared/types';

export default function FollowupPage() {
  const { patientId, episodeId } = useParams<{ patientId: string; episodeId: string }>();
  const [visits, setVisits] = useState<FollowupVisit[]>([]);
  const [schedule, setSchedule] = useState<Array<{ interval: string; date: string; completed: boolean }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    visit_interval: '1m' as const,
    patient_alive: true,
    limb_present: true,
    duplex_performed: false,
    psv_proximal_anastomosis: '' as string,
    psv_graft_body: '' as string,
    psv_distal_anastomosis: '' as string,
    psv_outflow: '' as string,
    velocity_ratio_peak: '' as string,
    stenosis_detected: false,
    stenosis_grade: 'none' as const,
    abi_followup: '' as string,
    tbi_followup: '' as string,
    patency_status: 'patent_no_intervention' as const,
    reintervention_performed: false,
    reintervention_type: 'none' as const,
    wound_healed: false,
    wifi_wound_followup: '' as string,
    minor_amputation_since_last: false,
    major_amputation_since_last: false,
    vascuqol6_score: '' as string,
    antiplatelet_current: 'aspirin',
    statin_current: true,
    notes: '',
  });

  const load = () => {
    if (!episodeId) return;
    api.listFollowups(episodeId).then(v => setVisits(v as FollowupVisit[] || []));
    api.getFollowupSchedule(episodeId).then(s => setSchedule(s as any[] || []));
  };

  useEffect(load, [episodeId]);

  const saveVisit = async () => {
    if (!episodeId) return;
    setSaving(true);
    try {
      await api.createFollowup({
        episode_id: episodeId,
        ...form,
        psv_proximal_anastomosis: form.psv_proximal_anastomosis ? parseFloat(form.psv_proximal_anastomosis) : null,
        psv_graft_body: form.psv_graft_body ? parseFloat(form.psv_graft_body) : null,
        psv_distal_anastomosis: form.psv_distal_anastomosis ? parseFloat(form.psv_distal_anastomosis) : null,
        psv_outflow: form.psv_outflow ? parseFloat(form.psv_outflow) : null,
        velocity_ratio_peak: form.velocity_ratio_peak ? parseFloat(form.velocity_ratio_peak) : null,
        abi_followup: form.abi_followup ? parseFloat(form.abi_followup) : null,
        tbi_followup: form.tbi_followup ? parseFloat(form.tbi_followup) : null,
        wifi_wound_followup: form.wifi_wound_followup ? parseInt(form.wifi_wound_followup) : null,
        vascuqol6_score: form.vascuqol6_score ? parseInt(form.vascuqol6_score) : null,
      });
      setShowForm(false);
      load();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link to={`/patients/${patientId}/episodes/${episodeId}`} className="text-sm text-primary-600 hover:underline">&larr; Back to Episode</Link>
        <h1 className="text-2xl font-bold mt-1">Follow-up Visits</h1>
      </div>

      {/* Schedule */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Follow-up Schedule</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {schedule.map(s => (
            <div key={s.interval} className={`p-3 rounded-lg text-center text-sm ${
              s.completed ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
              new Date(s.date) < new Date() ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <div className="font-medium">{s.interval}</div>
              <div className="text-xs">{s.date}</div>
              <div className="text-xs mt-1">{s.completed ? 'Done' : new Date(s.date) < new Date() ? 'OVERDUE' : 'Pending'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visit list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recorded Visits ({visits.length})</h2>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Record Visit</button>
        </div>

        {visits.length === 0 ? (
          <p className="text-gray-500 text-sm">No follow-up visits recorded.</p>
        ) : (
          <div className="space-y-3">
            {visits.map(v => (
              <div key={v.id} className="p-4 border rounded-lg dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.visit_date} — {v.visit_interval}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {v.patient_alive ? 'Alive' : 'Deceased'} |
                      {v.limb_present ? ' Limb intact' : ' Limb lost'} |
                      Patency: {v.patency_status.replace(/_/g, ' ')} |
                      {v.wound_healed ? ' Wound healed' : ' Wound not healed'}
                    </p>
                    {v.duplex_performed && (
                      <p className="text-sm text-gray-500">
                        Duplex: PSV ratio {v.velocity_ratio_peak || 'N/A'} |
                        Stenosis: {v.stenosis_grade.replace(/_/g, ' ')} |
                        ABI: {v.abi_followup || 'N/A'}
                      </p>
                    )}
                    {v.vascuqol6_score && (
                      <p className="text-sm text-gray-500">VascuQol-6: {v.vascuqol6_score}/24</p>
                    )}
                  </div>
                  <span className={`badge ${
                    v.patency_status === 'occluded' ? 'badge-red' :
                    v.patency_status === 'patent_no_intervention' ? 'badge-green' : 'badge-yellow'
                  }`}>
                    {v.patency_status === 'patent_no_intervention' ? 'Patent' :
                     v.patency_status === 'patent_assisted' ? 'Assisted' :
                     v.patency_status === 'occluded' ? 'Occluded' : 'Recanalized'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New visit form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Record New Visit</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Visit Date</label>
                <input type="date" className="input-field" value={form.visit_date}
                  onChange={e => setForm({...form, visit_date: e.target.value})} />
              </div>
              <div>
                <label className="label">Visit Interval</label>
                <select className="select-field" value={form.visit_interval}
                  onChange={e => setForm({...form, visit_interval: e.target.value as any})}>
                  {['1m','3m','6m','12m','18m','24m','3yr','4yr','5yr','other'].map(i =>
                    <option key={i} value={i}>{i}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.patient_alive}
                  onChange={e => setForm({...form, patient_alive: e.target.checked})}
                  className="rounded border-gray-300" />
                Patient alive
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.limb_present}
                  onChange={e => setForm({...form, limb_present: e.target.checked})}
                  className="rounded border-gray-300" />
                Limb present
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.wound_healed}
                  onChange={e => setForm({...form, wound_healed: e.target.checked})}
                  className="rounded border-gray-300" />
                Wound healed
              </label>
            </div>

            {/* Duplex surveillance */}
            <div>
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" checked={form.duplex_performed}
                  onChange={e => setForm({...form, duplex_performed: e.target.checked})}
                  className="rounded border-gray-300" />
                <span className="font-medium">Duplex surveillance performed (ESVS standard)</span>
              </label>
              {form.duplex_performed && (
                <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label">PSV Proximal Anast.</label>
                    <input type="number" step="0.1" className="input-field" value={form.psv_proximal_anastomosis}
                      onChange={e => setForm({...form, psv_proximal_anastomosis: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">PSV Graft Body</label>
                    <input type="number" step="0.1" className="input-field" value={form.psv_graft_body}
                      onChange={e => setForm({...form, psv_graft_body: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">PSV Distal Anast.</label>
                    <input type="number" step="0.1" className="input-field" value={form.psv_distal_anastomosis}
                      onChange={e => setForm({...form, psv_distal_anastomosis: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">PSV Outflow</label>
                    <input type="number" step="0.1" className="input-field" value={form.psv_outflow}
                      onChange={e => setForm({...form, psv_outflow: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Peak Velocity Ratio</label>
                    <input type="number" step="0.1" className="input-field" value={form.velocity_ratio_peak}
                      onChange={e => setForm({...form, velocity_ratio_peak: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Stenosis Grade</label>
                    <select className="select-field" value={form.stenosis_grade}
                      onChange={e => setForm({...form, stenosis_grade: e.target.value as any, stenosis_detected: e.target.value !== 'none'})}>
                      <option value="none">None</option>
                      <option value="lt50">&lt;50%</option>
                      <option value="50_75">50-75%</option>
                      <option value="gt75">&gt;75%</option>
                      <option value="occlusion">Occlusion</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">ABI</label>
                <input type="number" step="0.01" className="input-field" value={form.abi_followup}
                  onChange={e => setForm({...form, abi_followup: e.target.value})} />
              </div>
              <div>
                <label className="label">TBI</label>
                <input type="number" step="0.01" className="input-field" value={form.tbi_followup}
                  onChange={e => setForm({...form, tbi_followup: e.target.value})} />
              </div>
              <div>
                <label className="label">WIfI Wound (0-3)</label>
                <input type="number" min="0" max="3" className="input-field" value={form.wifi_wound_followup}
                  onChange={e => setForm({...form, wifi_wound_followup: e.target.value})} />
              </div>
              <div>
                <label className="label">VascuQol-6 (6-24)</label>
                <input type="number" min="6" max="24" className="input-field" value={form.vascuqol6_score}
                  onChange={e => setForm({...form, vascuqol6_score: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patency Status</label>
                <select className="select-field" value={form.patency_status}
                  onChange={e => setForm({...form, patency_status: e.target.value as any})}>
                  <option value="patent_no_intervention">Patent (no intervention)</option>
                  <option value="patent_assisted">Patent (assisted)</option>
                  <option value="occluded_recanalized">Occluded (recanalized)</option>
                  <option value="occluded">Occluded</option>
                </select>
              </div>
              <div>
                <label className="label">Reintervention Type</label>
                <select className="select-field" value={form.reintervention_type}
                  onChange={e => setForm({...form, reintervention_type: e.target.value as any, reintervention_performed: e.target.value !== 'none'})}>
                  <option value="none">None</option>
                  <option value="PTA">PTA</option>
                  <option value="stent">Stent</option>
                  <option value="surgical_revision">Surgical Revision</option>
                  <option value="thrombectomy">Thrombectomy</option>
                  <option value="lysis">Lysis</option>
                  <option value="new_bypass">New Bypass</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.minor_amputation_since_last}
                  onChange={e => setForm({...form, minor_amputation_since_last: e.target.checked})}
                  className="rounded border-gray-300" />
                Minor amputation since last visit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.major_amputation_since_last}
                  onChange={e => setForm({...form, major_amputation_since_last: e.target.checked})}
                  className="rounded border-gray-300" />
                Major amputation since last visit
              </label>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveVisit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
