import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { api } from '../api';
import type { KaplanMeierResult, ConduitType, GLASSStage } from '../../shared/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const KM_TYPES = [
  { key: 'primary_patency', label: 'Primary Patency' },
  { key: 'assisted_primary_patency', label: 'Assisted Primary Patency' },
  { key: 'secondary_patency', label: 'Secondary Patency' },
  { key: 'limb_salvage', label: 'Limb Salvage' },
  { key: 'overall_survival', label: 'Overall Survival' },
  { key: 'mace_free', label: 'MACE-free Survival' },
];

export default function StatisticsPage() {
  const [kmType, setKmType] = useState('primary_patency');
  const [kmData, setKmData] = useState<KaplanMeierResult | null>(null);
  const [outcomesSummary, setOutcomesSummary] = useState<Record<string, { count: number; total: number; pct: number }>>({});
  const [conduitFilter, setConduitFilter] = useState<ConduitType | ''>('');
  const [glassFilter, setGlassFilter] = useState<GLASSStage | ''>('');
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    const filters: Record<string, unknown> = {};
    if (conduitFilter) filters.conduit_type = [conduitFilter];
    if (glassFilter) filters.glass_stage = [glassFilter];

    const [km, summary] = await Promise.all([
      api.getKaplanMeier(kmType, filters),
      api.getOutcomesSummary(filters),
    ]);

    setKmData(km as KaplanMeierResult);
    setOutcomesSummary(summary as any || {});
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, [kmType, conduitFilter, glassFilter]);

  const chartData = kmData ? {
    labels: kmData.curve.map(p => p.time),
    datasets: [{
      label: KM_TYPES.find(t => t.key === kmType)?.label || '',
      data: kmData.curve.map(p => p.survival * 100),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      fill: true,
      stepped: 'before' as const,
      pointRadius: kmData.curve.map(p => p.censored ? 4 : 0),
      pointStyle: kmData.curve.map(p => p.censored ? 'crossRot' : 'circle'),
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Kaplan-Meier: ${KM_TYPES.find(t => t.key === kmType)?.label}`,
        font: { size: 16 },
      },
      legend: { display: false },
    },
    scales: {
      x: {
        title: { display: true, text: 'Time (days)' },
      },
      y: {
        title: { display: true, text: 'Survival Probability (%)' },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statistics & Analysis</h1>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Curve Type</label>
            <select className="select-field" value={kmType} onChange={e => setKmType(e.target.value)}>
              {KM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Conduit Filter</label>
            <select className="select-field" value={conduitFilter} onChange={e => setConduitFilter(e.target.value as any)}>
              <option value="">All</option>
              <option value="GSV_single">GSV Single</option>
              <option value="GSV_spliced">GSV Spliced</option>
              <option value="PTFE">PTFE</option>
              <option value="Dacron">Dacron</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label">GLASS Stage</label>
            <select className="select-field" value={glassFilter} onChange={e => setGlassFilter(e.target.value as any)}>
              <option value="">All</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary w-full" onClick={() => api.exportCsv(kmType)}>
              Export KM to CSV
            </button>
          </div>
        </div>
      </div>

      {/* KM Curve */}
      <div className="card">
        {loading ? (
          <div className="h-96 flex items-center justify-center">Loading...</div>
        ) : chartData && kmData && kmData.curve.length > 1 ? (
          <div>
            <div style={{ height: '400px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Number-at-risk table (EJVES requirement) */}
            <div className="mt-4 overflow-x-auto">
              <h3 className="text-sm font-semibold mb-2">Number at Risk</h3>
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Time (days)</th>
                    {kmData.curve.filter((_, i) => i % Math.max(1, Math.floor(kmData.curve.length / 8)) === 0).map((p, i) => (
                      <th key={i} className="px-2 py-1">{p.time}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 font-medium">At risk</td>
                    {kmData.curve.filter((_, i) => i % Math.max(1, Math.floor(kmData.curve.length / 8)) === 0).map((p, i) => (
                      <td key={i} className="px-2 py-1 text-center">{p.at_risk}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* KM summary */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Total:</span> {kmData.total}</div>
              <div><span className="text-gray-500">Events:</span> {kmData.events}</div>
              <div><span className="text-gray-500">Censored:</span> {kmData.censored}</div>
              <div><span className="text-gray-500">Median survival:</span> {kmData.median_survival ? `${kmData.median_survival} days` : 'Not reached'}</div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            No data available. Add patients with operations to see Kaplan-Meier curves.
          </div>
        )}
      </div>

      {/* 30-Day Outcomes Summary Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">30-Day Outcome Summary</h2>
        {Object.keys(outcomesSummary).length === 0 ? (
          <p className="text-gray-500 text-sm">No outcomes data available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-3">Outcome</th>
                <th className="text-right py-2 px-3">n</th>
                <th className="text-right py-2 px-3">N</th>
                <th className="text-right py-2 px-3">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(outcomesSummary).map(([key, val]) => (
                <tr key={key} className="border-b dark:border-gray-700">
                  <td className="py-2 px-3">{key}</td>
                  <td className="text-right py-2 px-3">{val.count}</td>
                  <td className="text-right py-2 px-3">{val.total}</td>
                  <td className="text-right py-2 px-3">{val.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
