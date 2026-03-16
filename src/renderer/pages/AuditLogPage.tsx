import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { AuditLogEntry } from '../../shared/types';

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLog(200, 0).then(data => {
      setEntries(data as AuditLogEntry[] || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="animate-pulse">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">No audit entries.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-3">Timestamp</th>
                <th className="text-left py-2 px-3">User</th>
                <th className="text-left py-2 px-3">Action</th>
                <th className="text-left py-2 px-3">Table</th>
                <th className="text-left py-2 px-3">Record</th>
                <th className="text-left py-2 px-3">Field</th>
                <th className="text-left py-2 px-3">Old Value</th>
                <th className="text-left py-2 px-3">New Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b dark:border-gray-700">
                  <td className="py-2 px-3 whitespace-nowrap">{e.timestamp}</td>
                  <td className="py-2 px-3">{e.user}</td>
                  <td className="py-2 px-3">
                    <span className={`badge ${
                      e.action === 'create' ? 'badge-green' :
                      e.action === 'update' ? 'badge-blue' : 'badge-red'
                    }`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="py-2 px-3">{e.table_name}</td>
                  <td className="py-2 px-3 font-mono text-xs">{e.record_id.slice(0, 8)}...</td>
                  <td className="py-2 px-3">{e.field_changed || '-'}</td>
                  <td className="py-2 px-3 max-w-32 truncate">{e.old_value || '-'}</td>
                  <td className="py-2 px-3 max-w-32 truncate">{e.new_value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
