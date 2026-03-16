import React, { useState } from 'react';
import { api } from '../api';

export default function ExportPage() {
  const [exporting, setExporting] = useState('');
  const [message, setMessage] = useState('');

  const handleExport = async (type: string) => {
    setExporting(type);
    setMessage('');
    try {
      let result: unknown;
      switch (type) {
        case 'xlsx':
          result = await api.exportXlsx();
          break;
        case 'backup':
          result = await api.createBackup();
          break;
      }
      if (result) {
        setMessage(`Exported successfully to: ${result}`);
      } else {
        setMessage('Export cancelled.');
      }
    } catch (err) {
      setMessage('Error: ' + (err as Error).message);
    }
    setExporting('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Export & Backup</h1>

      <div className="space-y-4">
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Full Dataset Export</h2>
          <p className="text-sm text-gray-500 mb-4">
            Export the complete registry to an Excel file (XLSX) with one sheet per table.
            STROBE/CONSORT-compatible variable labelling included.
          </p>
          <button
            className="btn-primary"
            onClick={() => handleExport('xlsx')}
            disabled={!!exporting}
          >
            {exporting === 'xlsx' ? 'Exporting...' : 'Export to XLSX'}
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Kaplan-Meier Data Export</h2>
          <p className="text-sm text-gray-500 mb-4">
            Export KM curve data to CSV for use in R, SPSS, or Stata.
            Available from the Statistics page with the "Export KM to CSV" button.
          </p>
          <a href="#/statistics" className="btn-secondary inline-block">Go to Statistics</a>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Database Backup</h2>
          <p className="text-sm text-gray-500 mb-4">
            Create an AES-256 encrypted backup of the database to a local folder.
          </p>
          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={() => handleExport('backup')}
              disabled={!!exporting}
            >
              {exporting === 'backup' ? 'Creating backup...' : 'Create Encrypted Backup'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => api.restoreBackup()}
              disabled={!!exporting}
            >
              Restore from Backup
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'} dark:bg-opacity-20`}>
          {message}
        </div>
      )}
    </div>
  );
}
