/**
 * Computed fields for the CLTI Bypass Registry.
 * All calculations follow published clinical guidelines.
 */

/**
 * WIfI Stage Lookup Matrix
 * Per Mills et al., J Vasc Surg 2014; 59(1):220-234
 * Maps (wound, ischemia, infection) → clinical stage (1-4)
 *
 * Stage 1: Very low risk of amputation
 * Stage 2: Low risk
 * Stage 3: Moderate risk
 * Stage 4: High risk
 */
const WIFI_STAGE_MATRIX: Record<string, number> = {};

// Build the matrix per GVG table
// Key format: "W-I-Fi" where W=wound, I=ischemia, Fi=foot infection
function initWifiMatrix(): void {
  // Stage 1 (Very Low): low wound, low ischemia, low infection
  const stage1: [number, number, number][] = [
    [0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], [1, 1, 0],
  ];
  // Stage 2 (Low)
  const stage2: [number, number, number][] = [
    [0, 1, 1], [0, 2, 0], [1, 0, 1], [1, 1, 1], [1, 2, 0],
    [2, 0, 0], [2, 1, 0], [0, 0, 2], [0, 2, 1],
  ];
  // Stage 3 (Moderate)
  const stage3: [number, number, number][] = [
    [0, 1, 2], [0, 2, 2], [0, 3, 0], [0, 3, 1], [1, 0, 2],
    [1, 1, 2], [1, 2, 1], [1, 2, 2], [1, 3, 0], [1, 3, 1],
    [2, 0, 1], [2, 1, 1], [2, 2, 0], [2, 2, 1], [2, 3, 0],
    [3, 0, 0], [3, 1, 0], [3, 0, 1],
  ];
  // Stage 4 (High) — everything else with high grades
  const stage4: [number, number, number][] = [
    [0, 3, 2], [0, 3, 3], [0, 2, 3], [0, 1, 3], [0, 0, 3],
    [1, 3, 2], [1, 3, 3], [1, 2, 3], [1, 1, 3], [1, 0, 3],
    [2, 0, 2], [2, 1, 2], [2, 2, 2], [2, 3, 1], [2, 3, 2],
    [2, 3, 3], [2, 2, 3], [2, 1, 3], [2, 0, 3],
    [3, 0, 2], [3, 1, 1], [3, 1, 2], [3, 2, 0], [3, 2, 1],
    [3, 2, 2], [3, 3, 0], [3, 3, 1], [3, 3, 2], [3, 3, 3],
    [3, 0, 3], [3, 1, 3], [3, 2, 3],
  ];

  for (const [w, i, f] of stage1) WIFI_STAGE_MATRIX[`${w}-${i}-${f}`] = 1;
  for (const [w, i, f] of stage2) WIFI_STAGE_MATRIX[`${w}-${i}-${f}`] = 2;
  for (const [w, i, f] of stage3) WIFI_STAGE_MATRIX[`${w}-${i}-${f}`] = 3;
  for (const [w, i, f] of stage4) WIFI_STAGE_MATRIX[`${w}-${i}-${f}`] = 4;
}

initWifiMatrix();

/**
 * Calculate WIfI clinical stage from wound, ischemia, and foot infection grades.
 * Returns 1-4 (clinical stage) or 0 if grades are invalid.
 */
export function calculateWifiStage(wound: number, ischemia: number, infection: number): number {
  if (wound < 0 || wound > 3 || ischemia < 0 || ischemia > 3 || infection < 0 || infection > 3) {
    return 0;
  }
  return WIFI_STAGE_MATRIX[`${wound}-${ischemia}-${infection}`] ?? 4;
}

/**
 * PREVENT III Risk Score
 * Per Conte et al., J Vasc Surg 2006; 43(2):313-321
 *
 * Five binary components (1 point each):
 * 1. Dialysis-dependent
 * 2. Tissue loss (Rutherford 5 or 6 / WIfI wound ≥ 2)
 * 3. Age ≥ 75 years
 * 4. Haematocrit < 30%
 * 5. Serum creatinine > 180 µmol/L
 *
 * Score 0-2 = Average risk; 3-5 = High risk
 */
export function calculatePreventIIIScore(components: {
  dialysis: boolean;
  tissue_loss: boolean;
  age_gte_75: boolean;
  haematocrit_lt30: boolean;
  creatinine_gt180: boolean;
}): number {
  let score = 0;
  if (components.dialysis) score++;
  if (components.tissue_loss) score++;
  if (components.age_gte_75) score++;
  if (components.haematocrit_lt30) score++;
  if (components.creatinine_gt180) score++;
  return score;
}

/**
 * Get patient risk category from PREVENT III score.
 */
export function getPatientRiskCategory(score: number): 'average' | 'high' {
  return score >= 3 ? 'high' : 'average';
}

/**
 * GLASS Overall Stage Calculation
 * Per GVG 2019 (EJVES)
 *
 * Combines femoropopliteal (FP) grade and tibial modifier (P).
 * Overall GLASS stage = max(FP grade, modified by tibial complexity)
 */
export function calculateGLASSOverallStage(
  fpStage: 'I' | 'II' | 'III',
  tibialModifier: '0' | '1' | '2'
): 'I' | 'II' | 'III' {
  const fpNum = fpStage === 'I' ? 1 : fpStage === 'II' ? 2 : 3;
  const tibNum = parseInt(tibialModifier);
  const combined = Math.min(fpNum + tibNum, 3);
  return combined === 1 ? 'I' : combined === 2 ? 'II' : 'III';
}

/**
 * Kaplan-Meier Estimator
 *
 * Computes survival probability at each event time using the product-limit method.
 *
 * @param data Array of { time: number (days from surgery), event: boolean (true=event occurred, false=censored) }
 * @returns KM curve data points with survival probabilities and at-risk counts
 */
export interface KMInput {
  time: number;
  event: boolean;
}

export interface KMDataPoint {
  time: number;
  survival: number;
  censored: boolean;
  at_risk: number;
  events_at_time: number;
}

export interface KMResult {
  curve: KMDataPoint[];
  median_survival: number | null;
  events: number;
  censored: number;
  total: number;
}

export function kaplanMeier(data: KMInput[]): KMResult {
  if (data.length === 0) {
    return { curve: [], median_survival: null, events: 0, censored: 0, total: 0 };
  }

  // Sort by time
  const sorted = [...data].sort((a, b) => a.time - b.time);
  const total = sorted.length;
  const totalEvents = sorted.filter(d => d.event).length;
  const totalCensored = total - totalEvents;

  // Build curve
  const curve: KMDataPoint[] = [];
  let atRisk = total;
  let survival = 1.0;

  // Add time 0 point
  curve.push({ time: 0, survival: 1.0, censored: false, at_risk: total, events_at_time: 0 });

  // Group events by time
  let i = 0;
  while (i < sorted.length) {
    const currentTime = sorted[i].time;
    let eventsAtTime = 0;
    let censoredAtTime = 0;

    while (i < sorted.length && sorted[i].time === currentTime) {
      if (sorted[i].event) {
        eventsAtTime++;
      } else {
        censoredAtTime++;
      }
      i++;
    }

    if (eventsAtTime > 0) {
      survival *= (atRisk - eventsAtTime) / atRisk;
      curve.push({
        time: currentTime,
        survival,
        censored: false,
        at_risk: atRisk,
        events_at_time: eventsAtTime,
      });
    }

    if (censoredAtTime > 0 && eventsAtTime === 0) {
      curve.push({
        time: currentTime,
        survival,
        censored: true,
        at_risk: atRisk,
        events_at_time: 0,
      });
    }

    atRisk -= eventsAtTime + censoredAtTime;
  }

  // Median survival: first time where survival ≤ 0.5
  let medianSurvival: number | null = null;
  for (const point of curve) {
    if (point.survival <= 0.5) {
      medianSurvival = point.time;
      break;
    }
  }

  return { curve, median_survival: medianSurvival, events: totalEvents, censored: totalCensored, total };
}

/**
 * Log-rank test for comparing two KM curves.
 * Returns chi-square statistic and p-value.
 */
export function logRankTest(group1: KMInput[], group2: KMInput[]): { chi2: number; pValue: number } {
  // Combine and get all unique event times
  const allData = [
    ...group1.map(d => ({ ...d, group: 1 })),
    ...group2.map(d => ({ ...d, group: 2 })),
  ];
  allData.sort((a, b) => a.time - b.time);

  const eventTimes = [...new Set(allData.filter(d => d.event).map(d => d.time))].sort((a, b) => a - b);

  let numerator = 0;
  let denominator = 0;

  for (const t of eventTimes) {
    // At-risk counts at time t
    const n1 = group1.filter(d => d.time >= t).length;
    const n2 = group2.filter(d => d.time >= t).length;
    const n = n1 + n2;
    if (n === 0) continue;

    // Events at time t
    const d1 = group1.filter(d => d.time === t && d.event).length;
    const d2 = group2.filter(d => d.time === t && d.event).length;
    const d = d1 + d2;

    const expected1 = (d * n1) / n;
    numerator += d1 - expected1;

    if (n > 1) {
      denominator += (d * n1 * n2 * (n - d)) / (n * n * (n - 1));
    }
  }

  if (denominator === 0) return { chi2: 0, pValue: 1 };

  const chi2 = (numerator * numerator) / denominator;

  // Approximate p-value from chi-squared distribution with 1 df
  const pValue = 1 - chiSquaredCDF(chi2, 1);

  return { chi2, pValue };
}

/**
 * Chi-squared CDF approximation (1 degree of freedom).
 * Uses the relationship with the standard normal distribution.
 */
function chiSquaredCDF(x: number, _df: number): number {
  if (x <= 0) return 0;
  // For df=1: CDF = 2 * Phi(sqrt(x)) - 1 where Phi is standard normal CDF
  const z = Math.sqrt(x);
  return erf(z / Math.SQRT2);
}

/**
 * Error function approximation (Abramowitz and Stegun 7.1.26).
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/**
 * Generate follow-up schedule dates from an operation date.
 * Standard intervals: 1m, 3m, 6m, 12m, 18m, 24m, annually to 5yr
 */
export function generateFollowupSchedule(operationDate: string): Array<{ interval: string; date: string }> {
  const opDate = new Date(operationDate);
  const intervals: Array<{ months: number; label: string }> = [
    { months: 1, label: '1m' },
    { months: 3, label: '3m' },
    { months: 6, label: '6m' },
    { months: 12, label: '12m' },
    { months: 18, label: '18m' },
    { months: 24, label: '24m' },
    { months: 36, label: '3yr' },
    { months: 48, label: '4yr' },
    { months: 60, label: '5yr' },
  ];

  return intervals.map(({ months, label }) => {
    const date = new Date(opDate);
    date.setMonth(date.getMonth() + months);
    return { interval: label, date: date.toISOString().split('T')[0] };
  });
}

/**
 * Descriptive statistics for an array of numbers.
 */
export function descriptiveStats(values: number[]): {
  n: number;
  mean: number;
  sd: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { n: 0, mean: 0, sd: 0, median: 0, q1: 0, q3: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const sd = Math.sqrt(variance);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  return { n, mean, sd, median, q1, q3, min: sorted[0], max: sorted[n - 1] };
}
