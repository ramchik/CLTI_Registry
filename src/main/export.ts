import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import type { KMResult } from '../shared/computed';

/**
 * Export full dataset to XLSX (one sheet per table).
 * STROBE-compatible variable labelling.
 */
export async function exportToXlsx(db: Database.Database, filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CLTI Bypass Registry';
  workbook.created = new Date();

  const tables = [
    { name: 'Patients', query: 'SELECT * FROM patients ORDER BY last_name' },
    { name: 'Comorbidities', query: 'SELECT * FROM comorbidities' },
    { name: 'Preop Assessments', query: 'SELECT * FROM preop_assessments ORDER BY episode_date' },
    { name: 'Preop Imaging', query: 'SELECT * FROM preop_imaging' },
    { name: 'Operations', query: 'SELECT * FROM operations ORDER BY operation_date' },
    { name: 'Medications', query: 'SELECT * FROM medications' },
    { name: 'Labs', query: 'SELECT * FROM labs ORDER BY lab_date' },
    { name: '30-Day Outcomes', query: 'SELECT * FROM outcomes_30day' },
    { name: 'Follow-up Visits', query: 'SELECT * FROM followup_visits ORDER BY visit_date' },
  ];

  for (const table of tables) {
    const sheet = workbook.addWorksheet(table.name);
    const rows = db.prepare(table.query).all() as Record<string, unknown>[];

    if (rows.length > 0) {
      // Headers
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);

      // Style headers
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Data
      for (const row of rows) {
        sheet.addRow(Object.values(row));
      }

      // Auto-width columns
      for (let i = 1; i <= headers.length; i++) {
        const col = sheet.getColumn(i);
        col.width = Math.max(headers[i - 1].length + 2, 12);
      }
    }
  }

  await workbook.xlsx.writeFile(filePath);
}

/**
 * Export individual patient summary to PDF.
 */
export async function exportToPdf(db: Database.Database, patientId: string, filePath: string): Promise<void> {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as Record<string, unknown>;
  if (!patient) throw new Error('Patient not found');

  const comorbidities = db.prepare('SELECT * FROM comorbidities WHERE patient_id = ?').get(patientId) as Record<string, unknown>;
  const episodes = db.prepare('SELECT * FROM preop_assessments WHERE patient_id = ? ORDER BY episode_date DESC').all(patientId) as Record<string, unknown>[];

  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text('CLTI Bypass Registry - Patient Summary', 14, y);
  y += 12;

  // Patient demographics
  doc.setFontSize(14);
  doc.text('Demographics', 14, y);
  y += 8;
  doc.setFontSize(10);

  const demoFields = [
    ['Name', `${patient.last_name}, ${patient.first_name}`],
    ['DOB', String(patient.date_of_birth)],
    ['Sex', String(patient.sex)],
    ['BMI', patient.bmi ? String(patient.bmi) : 'N/A'],
    ['Smoking', String(patient.smoking_status)],
    ['ASA', String(patient.asa_class)],
    ['Functional Status', String(patient.functional_status)],
  ];

  for (const [label, value] of demoFields) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 6;
  }
  y += 4;

  // Comorbidities
  if (comorbidities) {
    doc.setFontSize(14);
    doc.text('Comorbidities', 14, y);
    y += 8;
    doc.setFontSize(10);

    const comorb = [
      ['Diabetes', String(comorbidities.diabetes_type)],
      ['Hypertension', comorbidities.hypertension ? 'Yes' : 'No'],
      ['CKD Stage', String(comorbidities.ckd_stage)],
      ['CAD', comorbidities.cad ? 'Yes' : 'No'],
      ['CHF', comorbidities.chf ? 'Yes' : 'No'],
      ['COPD', comorbidities.copd ? 'Yes' : 'No'],
    ];

    for (const [label, value] of comorb) {
      doc.text(`${label}: ${value}`, 14, y);
      y += 6;
    }
    y += 4;
  }

  // Episodes
  for (const episode of episodes) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.text(`Episode: ${episode.episode_date} (${episode.affected_limb})`, 14, y);
    y += 8;
    doc.setFontSize(10);

    doc.text(`WIfI: W${episode.wifi_wound} I${episode.wifi_ischemia} Fi${episode.wifi_infection} → Stage ${episode.wifi_stage}`, 14, y);
    y += 6;
    doc.text(`PREVENT III Score: ${episode.prevent_iii_score} (${episode.patient_risk_category} risk)`, 14, y);
    y += 6;
    doc.text(`Rutherford: ${episode.rutherford_grade}`, 14, y);
    y += 6;

    // Operation
    const op = db.prepare('SELECT * FROM operations WHERE episode_id = ?').get(episode.id as string) as Record<string, unknown>;
    if (op) {
      doc.text(`Operation: ${op.operation_date} | ${op.conduit_type} ${op.conduit_technique} | ${op.inflow_site} → ${op.outflow_site}`, 14, y);
      y += 6;
    }

    // Outcomes
    const oc = db.prepare('SELECT * FROM outcomes_30day WHERE episode_id = ?').get(episode.id as string) as Record<string, unknown>;
    if (oc) {
      const events = [];
      if (oc.death_30d) events.push('Death');
      if (oc.mi_30d) events.push('MI');
      if (oc.stroke_30d) events.push('Stroke');
      if (oc.graft_thrombosis_30d) events.push('Graft thrombosis');
      if (oc.major_amputation_30d) events.push('Major amputation');
      doc.text(`30-day outcomes: ${events.length ? events.join(', ') : 'No adverse events'}`, 14, y);
      y += 6;
      doc.text(`LOS: ${oc.los_days ?? 'N/A'} days | ICU: ${oc.icu_days ?? 'N/A'} days`, 14, y);
      y += 10;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toISOString()} | CLTI Bypass Registry`, 14, 285);

  doc.save(filePath);
}

/**
 * Export KM curve data to CSV.
 */
export function exportKmCsv(km: KMResult, filePath: string): void {
  const lines = ['time_days,survival_probability,at_risk,censored'];
  for (const point of km.curve) {
    lines.push(`${point.time},${point.survival.toFixed(4)},${point.at_risk},${point.censored ? 1 : 0}`);
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}
