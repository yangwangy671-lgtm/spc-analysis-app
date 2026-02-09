// Anomaly Detection Module
// Implements 8 Western Electric Rules for SPC control charts

import type { AnomalyResult, ControlLimits, IMRLimits } from '../types';

/**
 * Rule 1: One point beyond Zone A (beyond 3σ from center line)
 * Level: Critical
 */
export function rule1_OutOf3Sigma(
  data: number[],
  center: number,
  ucl: number,
  lcl: number
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  data.forEach((value, index) => {
    if (value > ucl || value < lcl) {
      const isAbove = value > ucl;
      const limit = isAbove ? ucl : lcl;
      const deviation = Math.abs(value - center) / ((ucl - center) / 3); // 计算偏离几个σ

      anomalies.push({
        index,
        value,
        rule: 1,
        level: 'critical',
        description: `数据点超出3σ控制限（${isAbove ? '超过上限' : '低于下限'}）。当前值${value.toFixed(3)}，${isAbove ? '上' : '下'}控制限${limit.toFixed(3)}，偏离中心线约${deviation.toFixed(1)}σ。这表明过程出现特殊原因，需要立即调查并采取纠正措施。`,
      });
    }
  });

  return anomalies;
}

/**
 * Rule 2: Nine (or more) points in a row on same side of center line
 * Level: Warning
 */
export function rule2_NineConsecutiveSameSide(data: number[], center: number): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const minConsecutive = 9;

  let consecutiveCount = 0;
  let previousSide: 'above' | 'below' | null = null;

  data.forEach((value, index) => {
    const currentSide = value > center ? 'above' : value < center ? 'below' : null;

    if (currentSide === null) {
      // Point on center line, reset
      consecutiveCount = 0;
      previousSide = null;
      return;
    }

    if (currentSide === previousSide) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      previousSide = currentSide;
    }

    if (consecutiveCount >= minConsecutive) {
      // 已达到连续点数阈值，记录异常
      anomalies.push({
        index,
        value,
        rule: 2,
        level: 'warning',
        description: `连续${consecutiveCount}个点在中心线${currentSide === 'above' ? '上方' : '下方'}（当前值${value.toFixed(3)}，中心线${center.toFixed(3)}）。这种模式表明过程可能存在系统性偏移，建议检查过程设置或原材料变化。`,
      });
    }
  });

  return anomalies;
}

/**
 * Rule 3: Six (or more) points in a row steadily increasing or decreasing
 * Level: Warning
 */
export function rule3_SixTrending(data: number[]): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const minTrend = 6;

  let trendCount = 1;
  let trendDirection: 'increasing' | 'decreasing' | null = null;

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];

    if (diff === 0) {
      // No change, reset
      trendCount = 1;
      trendDirection = null;
      continue;
    }

    const currentDirection = diff > 0 ? 'increasing' : 'decreasing';

    if (currentDirection === trendDirection) {
      trendCount++;
    } else {
      trendCount = 2; // Current and previous point
      trendDirection = currentDirection;
    }

    if (trendCount >= minTrend) {
      const startValue = data[i - trendCount + 1];
      const changeAmount = Math.abs(data[i] - startValue);

      anomalies.push({
        index: i,
        value: data[i],
        rule: 3,
        level: 'warning',
        description: `连续${trendCount}个点持续${trendDirection === 'increasing' ? '上升' : '下降'}（从${startValue.toFixed(3)}到${data[i].toFixed(3)}，变化${changeAmount.toFixed(3)}）。这表明过程可能存在趋势性变化，如工具磨损、温度漂移等，需要查找并消除原因。`,
      });
    }
  }

  return anomalies;
}

/**
 * Rule 4: Fourteen (or more) points in a row alternating up and down
 * Level: Warning
 */
export function rule4_FourteenAlternating(data: number[]): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const minAlternating = 14;

  let alternatingCount = 1;

  for (let i = 2; i < data.length; i++) {
    const diff1 = data[i - 1] - data[i - 2];
    const diff2 = data[i] - data[i - 1];

    if (diff1 === 0 || diff2 === 0) {
      alternatingCount = 1;
      continue;
    }

    const direction1 = diff1 > 0 ? 'up' : 'down';
    const direction2 = diff2 > 0 ? 'up' : 'down';

    if (direction1 !== direction2) {
      alternatingCount++;
    } else {
      alternatingCount = 1;
    }

    if (alternatingCount >= minAlternating) {
      anomalies.push({
        index: i,
        value: data[i],
        rule: 4,
        level: 'warning',
        description: `连续${alternatingCount}个点上下交替波动（当前值${data[i].toFixed(3)}）。这种锯齿状模式可能表明过程存在过度调整、交替使用设备、或测量误差，需要检查操作规程和测量系统。`,
      });
    }
  }

  return anomalies;
}

/**
 * Rule 5: Two (or three) out of three points in Zone A or beyond
 * Zone A: between 2σ and 3σ from center line
 * Level: Warning
 */
export function rule5_TwoOfThreeInZoneA(
  data: number[],
  center: number,
  ucl: number,
  lcl: number
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const sigma = (ucl - center) / 3;

  // Zone A boundaries
  const upperZoneA = center + 2 * sigma;
  const lowerZoneA = center - 2 * sigma;

  for (let i = 2; i < data.length; i++) {
    const window = [data[i - 2], data[i - 1], data[i]];
    const inZoneA = window.filter(
      val => (val > upperZoneA && val <= ucl) || (val < lowerZoneA && val >= lcl)
    );

    if (inZoneA.length >= 2) {
      const isUpper = data[i] > center;
      anomalies.push({
        index: i,
        value: data[i],
        rule: 5,
        level: 'warning',
        description: `连续3个点中有${inZoneA.length}个点在A区（2σ-3σ范围，${isUpper ? '上方' : '下方'}）。当前值${data[i].toFixed(3)}，A区范围${isUpper ? upperZoneA.toFixed(3) + '-' + ucl.toFixed(3) : lcl.toFixed(3) + '-' + lowerZoneA.toFixed(3)}。这表明过程变异增大，需要关注。`,
      });
    }
  }

  return anomalies;
}

/**
 * Rule 6: Four (or five) out of five points in Zone B or beyond
 * Zone B: between 1σ and 2σ from center line
 * Level: Info
 */
export function rule6_FourOfFiveInZoneB(
  data: number[],
  center: number,
  ucl: number,
  _lcl: number
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const sigma = (ucl - center) / 3;

  // Zone B boundaries
  const upperZoneB = center + sigma;
  const lowerZoneB = center - sigma;

  for (let i = 4; i < data.length; i++) {
    const window = [data[i - 4], data[i - 3], data[i - 2], data[i - 1], data[i]];
    const inZoneBOrBeyond = window.filter(
      val => val > upperZoneB || val < lowerZoneB
    );

    if (inZoneBOrBeyond.length >= 4) {
      const isUpper = data[i] > center;
      anomalies.push({
        index: i,
        value: data[i],
        rule: 6,
        level: 'info',
        description: `连续5个点中有${inZoneBOrBeyond.length}个点在B区或更远（距中心线1σ以上，${isUpper ? '上方' : '下方'}）。当前值${data[i].toFixed(3)}，中心线${center.toFixed(3)}，B区边界${isUpper ? upperZoneB.toFixed(3) : lowerZoneB.toFixed(3)}。这提示过程可能偏离中心或变异增加，建议监控。`,
      });
    }
  }

  return anomalies;
}

/**
 * Rule 7: Fifteen points in a row in Zone C (within 1σ of center line)
 * Level: Info
 */
export function rule7_FifteenInZoneC(
  data: number[],
  center: number,
  ucl: number,
  _lcl: number
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const sigma = (ucl - center) / 3;
  const minConsecutive = 15;

  // Zone C boundaries (within 1σ)
  const upperZoneC = center + sigma;
  const lowerZoneC = center - sigma;

  let consecutiveCount = 0;

  data.forEach((value, index) => {
    if (value >= lowerZoneC && value <= upperZoneC) {
      consecutiveCount++;
    } else {
      consecutiveCount = 0;
    }

    if (consecutiveCount >= minConsecutive) {
      anomalies.push({
        index,
        value,
        rule: 7,
        level: 'info',
        description: `连续${consecutiveCount}个点在C区（距中心线1σ以内）。当前值${value.toFixed(3)}，中心线${center.toFixed(3)}，C区范围${lowerZoneC.toFixed(3)}-${upperZoneC.toFixed(3)}。这可能表明过程变异过小（不自然的一致性），需要检查数据采集方法或测量系统。`,
      });
    }
  });

  return anomalies;
}

/**
 * Rule 8: Eight points in a row beyond Zone C (more than 1σ from center)
 * Level: Warning
 */
export function rule8_EightBeyondZoneC(
  data: number[],
  center: number,
  ucl: number,
  _lcl: number
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const sigma = (ucl - center) / 3;
  const minConsecutive = 8;

  // Zone C boundaries
  const upperZoneC = center + sigma;
  const lowerZoneC = center - sigma;

  let consecutiveCount = 0;

  data.forEach((value, index) => {
    if (value > upperZoneC || value < lowerZoneC) {
      consecutiveCount++;
    } else {
      consecutiveCount = 0;
    }

    if (consecutiveCount >= minConsecutive) {
      const isUpper = value > center;
      anomalies.push({
        index,
        value,
        rule: 8,
        level: 'warning',
        description: `连续${consecutiveCount}个点超出C区（距中心线1σ以外，${isUpper ? '上方' : '下方'}）。当前值${value.toFixed(3)}，中心线${center.toFixed(3)}，C区边界${isUpper ? upperZoneC.toFixed(3) : lowerZoneC.toFixed(3)}。这表明过程缺乏正常的随机变异，可能存在分层、混合批次、或数据分组不当，需要检查抽样方法。`,
      });
    }
  });

  return anomalies;
}

/**
 * Detect all anomalies based on selected rules
 * @param data - Data points to analyze
 * @param limits - Control limits (X-bar or Individual)
 * @param rules - Array of rule numbers to apply (1-8)
 * @returns Array of all detected anomalies
 */
export function detectAllAnomalies(
  data: number[],
  limits: ControlLimits | IMRLimits,
  rules: number[] = [1, 2, 3, 4, 5, 6, 7, 8]
): AnomalyResult[] {
  let allAnomalies: AnomalyResult[] = [];

  // Determine which limits to use
  const chartLimits = 'xBar' in limits ? limits.xBar : limits.individual;
  const { center, ucl, lcl } = chartLimits;

  // Apply selected rules
  if (rules.includes(1)) {
    allAnomalies = allAnomalies.concat(rule1_OutOf3Sigma(data, center, ucl, lcl));
  }
  if (rules.includes(2)) {
    allAnomalies = allAnomalies.concat(rule2_NineConsecutiveSameSide(data, center));
  }
  if (rules.includes(3)) {
    allAnomalies = allAnomalies.concat(rule3_SixTrending(data));
  }
  if (rules.includes(4)) {
    allAnomalies = allAnomalies.concat(rule4_FourteenAlternating(data));
  }
  if (rules.includes(5)) {
    allAnomalies = allAnomalies.concat(rule5_TwoOfThreeInZoneA(data, center, ucl, lcl));
  }
  if (rules.includes(6)) {
    allAnomalies = allAnomalies.concat(rule6_FourOfFiveInZoneB(data, center, ucl, lcl));
  }
  if (rules.includes(7)) {
    allAnomalies = allAnomalies.concat(rule7_FifteenInZoneC(data, center, ucl, lcl));
  }
  if (rules.includes(8)) {
    allAnomalies = allAnomalies.concat(rule8_EightBeyondZoneC(data, center, ucl, lcl));
  }

  // Remove duplicates (same index, keep highest severity)
  const anomalyMap = new Map<number, AnomalyResult>();
  const levelPriority = { critical: 3, warning: 2, info: 1 };

  allAnomalies.forEach(anomaly => {
    const existing = anomalyMap.get(anomaly.index);
    if (!existing || levelPriority[anomaly.level] > levelPriority[existing.level]) {
      anomalyMap.set(anomaly.index, anomaly);
    }
  });

  return Array.from(anomalyMap.values()).sort((a, b) => a.index - b.index);
}

export default {
  rule1_OutOf3Sigma,
  rule2_NineConsecutiveSameSide,
  rule3_SixTrending,
  rule4_FourteenAlternating,
  rule5_TwoOfThreeInZoneA,
  rule6_FourOfFiveInZoneB,
  rule7_FifteenInZoneC,
  rule8_EightBeyondZoneC,
  detectAllAnomalies,
};
