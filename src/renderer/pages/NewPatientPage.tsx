import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Patient } from '../../shared/types';

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    sex: 'male' as const,
    ethnicity: '',
    bmi: '' as string,
    smoking_status: 'never' as const,
    pack_years: '' as string,
    asa_class: 'II' as const,
    functional_status: 'independent' as const,
    notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const checkDuplicate = async () => {
    if (form.first_name && form.last_name && form.date_of_birth) {
      const dupes = await api.checkDuplicate(form.first_name, form.last_name, form.date_of_birth) as Patient[];
      if (dupes && dupes.length > 0) {
        setDuplicateWarning(`Warning: Patient "${form.last_name}, ${form.first_name}" born ${form.date_of_birth} may already exist.`);
      } else {
        setDuplicateWarning('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        bmi: form.bmi ? parseFloat(form.bmi) : null,
        pack_years: form.pack_years ? parseInt(form.pack_years) : null,
      };
      const id = await api.createPatient(data);
      if (id) navigate(`/patients/${id}`);
    } catch (err) {
      alert('Error creating patient: ' + (err as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Patient</h1>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">Demographics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input className="input-field" required value={form.first_name}
              onChange={e => handleChange('first_name', e.target.value)}
              onBlur={checkDuplicate} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input-field" required value={form.last_name}
              onChange={e => handleChange('last_name', e.target.value)}
              onBlur={checkDuplicate} />
          </div>
          <div>
            <label className="label">Date of Birth *</label>
            <input type="date" className="input-field" required value={form.date_of_birth}
              onChange={e => handleChange('date_of_birth', e.target.value)}
              onBlur={checkDuplicate} />
          </div>
          <div>
            <label className="label">Sex *</label>
            <select className="select-field" value={form.sex} onChange={e => handleChange('sex', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Ethnicity</label>
            <input className="input-field" value={form.ethnicity}
              onChange={e => handleChange('ethnicity', e.target.value)} />
          </div>
          <div>
            <label className="label">BMI</label>
            <input type="number" step="0.1" className="input-field" value={form.bmi}
              onChange={e => handleChange('bmi', e.target.value)} />
          </div>
          <div>
            <label className="label">Smoking Status *</label>
            <select className="select-field" value={form.smoking_status} onChange={e => handleChange('smoking_status', e.target.value)}>
              <option value="never">Never</option>
              <option value="ex">Ex-smoker</option>
              <option value="current">Current</option>
            </select>
          </div>
          <div>
            <label className="label">Pack Years</label>
            <input type="number" className="input-field" value={form.pack_years}
              onChange={e => handleChange('pack_years', e.target.value)} />
          </div>
          <div>
            <label className="label">ASA Class *</label>
            <select className="select-field" value={form.asa_class} onChange={e => handleChange('asa_class', e.target.value)}>
              {['I', 'II', 'III', 'IV', 'V'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Functional Status *</label>
            <select className="select-field" value={form.functional_status} onChange={e => handleChange('functional_status', e.target.value)}>
              <option value="independent">Independent</option>
              <option value="assisted">Assisted</option>
              <option value="dependent">Dependent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input-field" rows={3} value={form.notes}
            onChange={e => handleChange('notes', e.target.value)} />
        </div>

        {duplicateWarning && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            {duplicateWarning}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Create Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
