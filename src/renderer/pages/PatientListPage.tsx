import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { PatientSummary, ConduitType, GLASSStage } from '../../shared/types';

export default function PatientListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [conduitFilter, setConduitFilter] = useState<ConduitType | ''>('');
  const [glassFilter, setGlassFilter] = useState<GLASSStage | ''>('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'operation'>('name');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    const filters: Record<string, unknown> = {};
    if (searchText) filters.search_text = searchText;
    if (conduitFilter) filters.conduit_type = [conduitFilter];
    if (glassFilter) filters.glass_stage = [glassFilter];

    const data = await api.listPatients(filters) as PatientSummary[];
    let sorted = data || [];

    if (sortBy === 'name') sorted.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
    else if (sortBy === 'date') sorted.sort((a, b) => (b.date_of_birth || '').localeCompare(a.date_of_birth || ''));
    else if (sortBy === 'operation') sorted.sort((a, b) => (b.operation_date || '').localeCompare(a.operation_date || ''));

    setPatients(sorted);
    setLoading(false);
  }, [searchText, conduitFilter, glassFilter, sortBy]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient Registry</h1>
        <Link to="/patients/new" className="btn-primary">+ New Patient</Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input-field"
              placeholder="Name or ID..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Conduit Type</label>
            <select className="select-field" value={conduitFilter} onChange={e => setConduitFilter(e.target.value as ConduitType | '')}>
              <option value="">All</option>
              <option value="GSV_single">GSV Single</option>
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
            <label className="label">GLASS Stage</label>
            <select className="select-field" value={glassFilter} onChange={e => setGlassFilter(e.target.value as GLASSStage | '')}>
              <option value="">All</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
            </select>
          </div>
          <div>
            <label className="label">Sort By</label>
            <select className="select-field" value={sortBy} onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'operation')}>
              <option value="name">Name</option>
              <option value="date">Date of Birth</option>
              <option value="operation">Operation Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="animate-pulse">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No patients found</p>
            <Link to="/patients/new" className="text-primary-600 hover:underline mt-2 inline-block">
              Add your first patient
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-3 font-medium">Name</th>
                <th className="text-left py-3 px-3 font-medium">DOB</th>
                <th className="text-left py-3 px-3 font-medium">Sex</th>
                <th className="text-left py-3 px-3 font-medium">WIfI</th>
                <th className="text-left py-3 px-3 font-medium">GLASS</th>
                <th className="text-left py-3 px-3 font-medium">Op Date</th>
                <th className="text-left py-3 px-3 font-medium">Conduit</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <td className="py-3 px-3 font-medium">{p.last_name}, {p.first_name}</td>
                  <td className="py-3 px-3">{p.date_of_birth}</td>
                  <td className="py-3 px-3 capitalize">{p.sex}</td>
                  <td className="py-3 px-3">
                    {p.wifi_stage ? (
                      <span className={`badge ${p.wifi_stage >= 4 ? 'badge-red' : p.wifi_stage >= 3 ? 'badge-yellow' : 'badge-green'}`}>
                        Stage {p.wifi_stage}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-3">{p.glass_overall_stage || '-'}</td>
                  <td className="py-3 px-3">{p.operation_date || '-'}</td>
                  <td className="py-3 px-3">{p.conduit_type?.replace(/_/g, ' ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-sm text-gray-500">{patients.length} patient(s)</div>
      </div>
    </div>
  );
}
