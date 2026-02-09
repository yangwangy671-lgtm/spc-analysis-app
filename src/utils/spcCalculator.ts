// Core SPC (Statistical Process Control) Calculator
// Implements CPK, CP, PPK, control limits, and statistical calculations

import { getConstant } from './constants';
import type { ControlLimits, IMRLimits, ProcessMetrics } from '../types';

/**
 * Calculate arithmetic mean of an array
 */
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
}

/**
 * Calculate standard deviation
 * @param data - Array of numbers
 * @param ddof - Delta degrees of freedom (0 for population, 1 for sample)
 */
export function stdDev(data: number[], ddof: number = 1): number {
  if (data.length <= ddof) return 0;

  const avg = mean(data);
  const squareDiffs = data.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);

  return Math.sqrt((avgSquareDiff * data.length) / (data.length - ddof));
}

/**
 * Calculate range (max - min)
 */
export function range(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.max(...data) - Math.min(...data);
}

/**
 * Calculate median
 */
export function median(data: number[]): number {
  if (data.length === 0) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate Process Capability Index (CP)
 * CP = (USL - LSL) / (6 * σ)
 */
export function calculateCP(data: number[], usl: number, lsl: number): number {
  const sigma = stdDev(data, 1);
  if (sigma === 0) return Infinity;
  return (usl - lsl) / (6 * sigma);
}

/**
 * Calculate Process Capability Index (CPK)
 * CPK = min((USL - μ) / (3 * σ), (μ - LSL) / (3 * σ))
 */
export function calculateCPK(data: number[], usl: number, lsl: number): number {
  const avg = mean(data);
  const sigma = stdDev(data, 1);

  if (sigma === 0) return Infinity;

  const cpkUpper = (usl - avg) / (3 * sigma);
  const cpkLower = (avg - lsl) / (3 * sigma);

  return Math.min(cpkUpper, cpkLower);
}

/**
 * Calculate Process Performance Index (PP)
 * PP = (USL - LSL) / (6 * σ_overall)
 */
export function calculatePP(data: number[], usl: number, lsl: number): number {
  const sigma = stdDev(data, 0); // Use population std dev for PP
  if (sigma === 0) return Infinity;
  return (usl - lsl) / (6 * sigma);
}

/**
 * Calculate Process Performance Index (PPK)
 * PPK = min((USL - μ) / (3 * σ_overall), (μ - LSL) / (3 * σ_overall))
 */
export function calculatePPK(data: number[], usl: number, lsl: number): number {
  const avg = mean(data);
  const sigma = stdDev(data, 0); // Use population std dev for PPK

  if (sigma === 0) return Infinity;

  const ppkUpper = (usl - avg) / (3 * sigma);
  const ppkLower = (avg - lsl) / (3 * sigma);

  return Math.min(ppkUpper, ppkLower);
}

/**
 * Calculate pass rate (percentage within spec limits)
 */
export function calculatePassRate(data: number[], usl: number, lsl: number): number {
  if (data.length === 0) return 0;

  const withinSpec = data.filter(val => val >= lsl && val <= usl).length;
  return (withinSpec / data.length) * 100;
}

/**
 * Calculate X-bar and R control limits for subgrouped data
 * @param subgroups - Array of subgroups, each containing n measurements
 * @param n - Subgroup size
 */
export function calculateXbarRLimits(subgroups: number[][], n: number): ControlLimits {
  // Calculate X-bar for each subgroup
  const xBars = subgroups.map(group => mean(group));
  const ranges = subgroups.map(group => range(group));

  // Grand mean and average range
  const xBarBar = mean(xBars);
  const rBar = mean(ranges);

  // Get constants from table
  const A2 = getConstant(n, 'A2');
  const D3 = getConstant(n, 'D3');
  const D4 = getConstant(n, 'D4');

  // X-bar chart limits
  const xBarUCL = xBarBar + A2 * rBar;
  const xBarLCL = xBarBar - A2 * rBar;

  // R chart limits
  const rUCL = D4 * rBar;
  const rLCL = D3 * rBar;

  return {
    xBar: {
      center: xBarBar,
      ucl: xBarUCL,
      lcl: xBarLCL,
    },
    r: {
      center: rBar,
      ucl: rUCL,
      lcl: rLCL,
    },
  };
}

/**
 * Calculate I-MR (Individual-Moving Range) control limits
 * @param data - Array of individual measurements
 */
export function calculateIMRLimits(data: number[]): IMRLimits {
  if (data.length < 2) {
    throw new Error('Need at least 2 data points for I-MR chart');
  }

  // Calculate moving ranges
  const movingRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    movingRanges.push(Math.abs(data[i] - data[i - 1]));
  }

  // Calculate averages
  const xBar = mean(data);
  const mrBar = mean(movingRanges);

  // Constants for n=2 (moving range uses 2 consecutive points)
  const d2 = getConstant(2, 'd2');
  const D3 = getConstant(2, 'D3');
  const D4 = getConstant(2, 'D4');

  // Individual chart limits
  const individualUCL = xBar + ((3 / d2) * mrBar); // 3/d2 for n=2 (~2.66)
  const individualLCL = xBar - ((3 / d2) * mrBar);

  // Moving range chart limits
  const mrUCL = D4 * mrBar;
  const mrLCL = D3 * mrBar;

  return {
    individual: {
      center: xBar,
      ucl: individualUCL,
      lcl: individualLCL,
    },
    movingRange: {
      center: mrBar,
      ucl: mrUCL,
      lcl: mrLCL,
    },
  };
}

/**
 * Calculate all process metrics
 */
export function calculateAllMetrics(
  data: number[],
  usl: number,
  lsl: number
): ProcessMetrics {
  return {
    n: data.length,
    mean: mean(data),
    stdDev: stdDev(data, 1),
    cp: calculateCP(data, usl, lsl),
    cpk: calculateCPK(data, usl, lsl),
    pp: calculatePP(data, usl, lsl),
    ppk: calculatePPK(data, usl, lsl),
    passRate: calculatePassRate(data, usl, lsl),
  };
}

/**
 * Simple Shapiro-Wilk normality test (simplified version)
 * Returns approximate p-value
 * Note: This is a simplified implementation. For production, consider using a statistics library.
 */
export function shapiroWilkTest(data: number[]): number {
  if (data.length < 3) return 1;
  if (data.length > 5000) {
    // For large samples, use simplified approach
    return andersonDarlingTest(data);
  }

  // For now, return a placeholder based on skewness and kurtosis
  const avg = mean(data);
  const sigma = stdDev(data, 1);

  // Calculate standardized moments
  const m3 = data.reduce((sum, x) => sum + Math.pow((x - avg) / sigma, 3), 0) / data.length;
  const m4 = data.reduce((sum, x) => sum + Math.pow((x - avg) / sigma, 4), 0) / data.length;

  const skewness = m3;
  const kurtosis = m4 - 3; // Excess kurtosis

  // Approximate p-value based on departure from normality
  const departure = Math.abs(skewness) + Math.abs(kurtosis) / 2;
  const pValue = Math.max(0.001, Math.min(1, Math.exp(-departure * 2)));

  return pValue;
}

/**
 * Simplified Anderson-Darling test for large samples
 */
function andersonDarlingTest(data: number[]): number {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const avg = mean(sorted);
  const sigma = stdDev(sorted, 1);

  // Calculate A² statistic (simplified)
  let A2 = 0;
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - avg) / sigma;
    const phi = normalCDF(z);
    if (phi > 0 && phi < 1) {
      A2 += (2 * i + 1) * (Math.log(phi) + Math.log(1 - normalCDF((sorted[n - 1 - i] - avg) / sigma)));
    }
  }
  A2 = -n - A2 / n;

  // Convert to approximate p-value
  const pValue = Math.max(0.001, Math.min(1, Math.exp(-A2)));
  return pValue;
}

/**
 * Standard normal cumulative distribution function
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return x > 0 ? 1 - p : p;
}

/**
 * Normal probability density function
 */
export function normalPDF(x: number, mu: number, sigma: number): number {
  const coefficient = 1 / (sigma * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2));
  return coefficient * Math.exp(exponent);
}

export default {
  mean,
  stdDev,
  range,
  median,
  calculateCP,
  calculateCPK,
  calculatePP,
  calculatePPK,
  calculatePassRate,
  calculateXbarRLimits,
  calculateIMRLimits,
  calculateAllMetrics,
  shapiroWilkTest,
  normalPDF,
};
