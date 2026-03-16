import { describe, it, expect } from 'vitest';
import {
  calculateWifiStage,
  calculatePreventIIIScore,
  getPatientRiskCategory,
  calculateGLASSOverallStage,
  kaplanMeier,
  logRankTest,
  generateFollowupSchedule,
  descriptiveStats,
} from './computed';

// ===== WIfI Stage Tests =====

describe('calculateWifiStage', () => {
  it('returns stage 1 for W0-I0-Fi0', () => {
    expect(calculateWifiStage(0, 0, 0)).toBe(1);
  });

  it('returns stage 1 for W0-I1-Fi0', () => {
    expect(calculateWifiStage(0, 1, 0)).toBe(1);
  });

  it('returns stage 1 for W1-I0-Fi0', () => {
    expect(calculateWifiStage(1, 0, 0)).toBe(1);
  });

  it('returns stage 2 for W2-I0-Fi0', () => {
    expect(calculateWifiStage(2, 0, 0)).toBe(2);
  });

  it('returns stage 2 for W0-I2-Fi0', () => {
    expect(calculateWifiStage(0, 2, 0)).toBe(2);
  });

  it('returns stage 3 for W0-I3-Fi0', () => {
    expect(calculateWifiStage(0, 3, 0)).toBe(3);
  });

  it('returns stage 3 for W3-I0-Fi0', () => {
    expect(calculateWifiStage(3, 0, 0)).toBe(3);
  });

  it('returns stage 4 for W3-I3-Fi3', () => {
    expect(calculateWifiStage(3, 3, 3)).toBe(4);
  });

  it('returns stage 4 for W0-I3-Fi2', () => {
    expect(calculateWifiStage(0, 3, 2)).toBe(4);
  });

  it('returns stage 4 for W0-I0-Fi3', () => {
    expect(calculateWifiStage(0, 0, 3)).toBe(4);
  });

  it('returns 0 for invalid grades', () => {
    expect(calculateWifiStage(-1, 0, 0)).toBe(0);
    expect(calculateWifiStage(0, 4, 0)).toBe(0);
    expect(calculateWifiStage(0, 0, 5)).toBe(0);
  });

  // Test all 64 combinations are defined (0-3 × 0-3 × 0-3)
  it('returns a valid stage (1-4) for all valid grade combinations', () => {
    for (let w = 0; w <= 3; w++) {
      for (let i = 0; i <= 3; i++) {
        for (let f = 0; f <= 3; f++) {
          const stage = calculateWifiStage(w, i, f);
          expect(stage).toBeGreaterThanOrEqual(1);
          expect(stage).toBeLessThanOrEqual(4);
        }
      }
    }
  });
});

// ===== PREVENT III Tests =====

describe('calculatePreventIIIScore', () => {
  it('returns 0 when all components are false', () => {
    expect(calculatePreventIIIScore({
      dialysis: false, tissue_loss: false, age_gte_75: false,
      haematocrit_lt30: false, creatinine_gt180: false,
    })).toBe(0);
  });

  it('returns 5 when all components are true', () => {
    expect(calculatePreventIIIScore({
      dialysis: true, tissue_loss: true, age_gte_75: true,
      haematocrit_lt30: true, creatinine_gt180: true,
    })).toBe(5);
  });

  it('returns 1 for single risk factor', () => {
    expect(calculatePreventIIIScore({
      dialysis: true, tissue_loss: false, age_gte_75: false,
      haematocrit_lt30: false, creatinine_gt180: false,
    })).toBe(1);
  });

  it('returns 3 for three risk factors', () => {
    expect(calculatePreventIIIScore({
      dialysis: true, tissue_loss: true, age_gte_75: true,
      haematocrit_lt30: false, creatinine_gt180: false,
    })).toBe(3);
  });
});

describe('getPatientRiskCategory', () => {
  it('returns average for score 0', () => expect(getPatientRiskCategory(0)).toBe('average'));
  it('returns average for score 1', () => expect(getPatientRiskCategory(1)).toBe('average'));
  it('returns average for score 2', () => expect(getPatientRiskCategory(2)).toBe('average'));
  it('returns high for score 3', () => expect(getPatientRiskCategory(3)).toBe('high'));
  it('returns high for score 4', () => expect(getPatientRiskCategory(4)).toBe('high'));
  it('returns high for score 5', () => expect(getPatientRiskCategory(5)).toBe('high'));
});

// ===== GLASS Tests =====

describe('calculateGLASSOverallStage', () => {
  it('returns I for FP I + tibial 0', () => {
    expect(calculateGLASSOverallStage('I', '0')).toBe('I');
  });

  it('returns II for FP I + tibial 1', () => {
    expect(calculateGLASSOverallStage('I', '1')).toBe('II');
  });

  it('returns III for FP I + tibial 2', () => {
    expect(calculateGLASSOverallStage('I', '2')).toBe('III');
  });

  it('returns II for FP II + tibial 0', () => {
    expect(calculateGLASSOverallStage('II', '0')).toBe('II');
  });

  it('returns III for FP II + tibial 1', () => {
    expect(calculateGLASSOverallStage('II', '1')).toBe('III');
  });

  it('caps at III for FP III + tibial 2', () => {
    expect(calculateGLASSOverallStage('III', '2')).toBe('III');
  });

  it('returns III for FP III + tibial 0', () => {
    expect(calculateGLASSOverallStage('III', '0')).toBe('III');
  });
});

// ===== Kaplan-Meier Tests =====

describe('kaplanMeier', () => {
  it('returns empty result for no data', () => {
    const result = kaplanMeier([]);
    expect(result.curve).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.events).toBe(0);
  });

  it('calculates simple KM curve', () => {
    const data = [
      { time: 10, event: true },
      { time: 20, event: true },
      { time: 30, event: false }, // censored
      { time: 40, event: true },
    ];
    const result = kaplanMeier(data);
    expect(result.total).toBe(4);
    expect(result.events).toBe(3);
    expect(result.censored).toBe(1);

    // First point: time=0, survival=1.0
    expect(result.curve[0].time).toBe(0);
    expect(result.curve[0].survival).toBe(1.0);

    // After first event at t=10: S = (4-1)/4 = 0.75
    expect(result.curve[1].time).toBe(10);
    expect(result.curve[1].survival).toBeCloseTo(0.75, 4);

    // After second event at t=20: S = 0.75 * (3-1)/3 = 0.5
    expect(result.curve[2].time).toBe(20);
    expect(result.curve[2].survival).toBeCloseTo(0.5, 4);
  });

  it('handles all events (no censoring)', () => {
    const data = [
      { time: 5, event: true },
      { time: 10, event: true },
    ];
    const result = kaplanMeier(data);
    expect(result.total).toBe(2);
    expect(result.events).toBe(2);
    expect(result.censored).toBe(0);
    // Final survival should be 0
    expect(result.curve[result.curve.length - 1].survival).toBe(0);
  });

  it('handles all censored (no events)', () => {
    const data = [
      { time: 10, event: false },
      { time: 20, event: false },
    ];
    const result = kaplanMeier(data);
    expect(result.events).toBe(0);
    expect(result.censored).toBe(2);
    // Survival stays at 1.0 (only censored marks)
    expect(result.curve[result.curve.length - 1].survival).toBe(1.0);
  });

  it('handles simultaneous events', () => {
    const data = [
      { time: 10, event: true },
      { time: 10, event: true },
      { time: 20, event: false },
    ];
    const result = kaplanMeier(data);
    // At t=10, 2 events out of 3 at risk: S = (3-2)/3 = 1/3
    const eventPoint = result.curve.find(p => p.time === 10 && !p.censored);
    expect(eventPoint?.survival).toBeCloseTo(1/3, 4);
  });

  it('calculates median survival correctly', () => {
    const data = [
      { time: 1, event: true },
      { time: 2, event: true },
      { time: 3, event: true },
      { time: 4, event: true },
    ];
    const result = kaplanMeier(data);
    // Median: first time S ≤ 0.5
    // t=1: S=0.75, t=2: S=0.5
    expect(result.median_survival).toBe(2);
  });

  it('returns null median when survival never reaches 0.5', () => {
    const data = [
      { time: 10, event: true },
      { time: 20, event: false },
      { time: 30, event: false },
      { time: 40, event: false },
    ];
    const result = kaplanMeier(data);
    expect(result.median_survival).toBeNull();
  });
});

// ===== Log-rank Test =====

describe('logRankTest', () => {
  it('returns p=1 for identical groups', () => {
    const group = [
      { time: 10, event: true },
      { time: 20, event: true },
    ];
    const result = logRankTest(group, group);
    expect(result.pValue).toBeCloseTo(1, 0);
  });

  it('returns a p-value between 0 and 1', () => {
    const g1 = [
      { time: 5, event: true },
      { time: 10, event: true },
      { time: 15, event: true },
    ];
    const g2 = [
      { time: 50, event: true },
      { time: 60, event: true },
      { time: 70, event: true },
    ];
    const result = logRankTest(g1, g2);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.chi2).toBeGreaterThanOrEqual(0);
  });
});

// ===== Follow-up Schedule =====

describe('generateFollowupSchedule', () => {
  it('generates 9 follow-up dates', () => {
    const schedule = generateFollowupSchedule('2024-01-15');
    expect(schedule).toHaveLength(9);
  });

  it('generates correct intervals', () => {
    const schedule = generateFollowupSchedule('2024-01-15');
    const labels = schedule.map(s => s.interval);
    expect(labels).toEqual(['1m', '3m', '6m', '12m', '18m', '24m', '3yr', '4yr', '5yr']);
  });

  it('generates correct dates', () => {
    const schedule = generateFollowupSchedule('2024-01-15');
    expect(schedule[0].date).toBe('2024-02-15'); // 1 month
    expect(schedule[2].date).toBe('2024-07-15'); // 6 months
    expect(schedule[3].date).toBe('2025-01-15'); // 12 months
  });
});

// ===== Descriptive Statistics =====

describe('descriptiveStats', () => {
  it('handles empty array', () => {
    const result = descriptiveStats([]);
    expect(result.n).toBe(0);
    expect(result.mean).toBe(0);
  });

  it('calculates correct stats for simple data', () => {
    const result = descriptiveStats([1, 2, 3, 4, 5]);
    expect(result.n).toBe(5);
    expect(result.mean).toBe(3);
    expect(result.median).toBe(3);
    expect(result.min).toBe(1);
    expect(result.max).toBe(5);
    expect(result.sd).toBeCloseTo(1.5811, 3);
  });

  it('calculates correct median for even-length array', () => {
    const result = descriptiveStats([1, 2, 3, 4]);
    expect(result.median).toBe(2.5);
  });

  it('calculates correct stats for single value', () => {
    const result = descriptiveStats([42]);
    expect(result.n).toBe(1);
    expect(result.mean).toBe(42);
    expect(result.median).toBe(42);
    expect(result.min).toBe(42);
    expect(result.max).toBe(42);
  });
});
