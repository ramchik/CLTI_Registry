import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { DashboardStats } from '../../shared/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(data => {
      setStats(data as DashboardStats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;
  if (!stats) return <div>No data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/patients/new" className="btn-primary">+ New Patient</Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Patients</p>
          <p className="text-3xl font-bold mt-1">{stats.total_patients}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Operations</p>
          <p className="text-3xl font-bold mt-1">{stats.total_operations}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">30-day Mortality</p>
          <p className="text-3xl font-bold mt-1">{stats.outcome_summary.mortality_30d.toFixed(1)}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">30-day MACE</p>
          <p className="text-3xl font-bold mt-1">{stats.outcome_summary.mace_30d.toFixed(1)}%</p>
        </div>
      </div>

      {/* Overdue follow-ups */}
      {stats.overdue_followups.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-red-600">
            Overdue Follow-ups ({stats.overdue_followups.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3">Patient</th>
                  <th className="text-left py-2 px-3">Operation Date</th>
                  <th className="text-left py-2 px-3">Expected Visit</th>
                  <th className="text-left py-2 px-3">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {stats.overdue_followups.map((fu, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-2 px-3">
                      <Link to={`/patients/${fu.patient_id}`} className="text-primary-600 hover:underline">
                        {fu.patient_name}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{fu.operation_date}</td>
                    <td className="py-2 px-3">{fu.expected_interval} ({fu.expected_date})</td>
                    <td className="py-2 px-3">
                      <span className={`badge ${fu.days_overdue > 30 ? 'badge-red' : 'badge-yellow'}`}>
                        {fu.days_overdue} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent operations */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Operations</h2>
        {stats.recent_operations.length === 0 ? (
          <p className="text-gray-500 text-sm">No operations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3">Patient</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">WIfI Stage</th>
                  <th className="text-left py-2 px-3">GLASS</th>
                  <th className="text-left py-2 px-3">Conduit</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_operations.map(op => (
                  <tr key={op.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-3">
                      <Link to={`/patients/${op.id}`} className="text-primary-600 hover:underline">
                        {op.last_name}, {op.first_name}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{op.operation_date}</td>
                    <td className="py-2 px-3">
                      {op.wifi_stage && <span className="badge-blue">{op.wifi_stage}</span>}
                    </td>
                    <td className="py-2 px-3">{op.glass_overall_stage || '-'}</td>
                    <td className="py-2 px-3">{op.conduit_type?.replace(/_/g, ' ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
