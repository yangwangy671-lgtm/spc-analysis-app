// SPC Constants Table
// Based on subgroup size (n), provides constants for control chart calculations

import type { SPCConstant } from '../types';

export const SPC_CONSTANTS: Record<number, SPCConstant> = {
  2: { A2: 1.880, D3: 0, D4: 3.267, c4: 0.7979, d2: 1.128, d3: 0.853 },
  3: { A2: 1.023, D3: 0, D4: 2.575, c4: 0.8862, d2: 1.693, d3: 0.888 },
  4: { A2: 0.729, D3: 0, D4: 2.282, c4: 0.9213, d2: 2.059, d3: 0.880 },
  5: { A2: 0.577, D3: 0, D4: 2.115, c4: 0.9400, d2: 2.326, d3: 0.864 },
  6: { A2: 0.483, D3: 0, D4: 2.004, c4: 0.9515, d2: 2.534, d3: 0.848 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, c4: 0.9594, d2: 2.704, d3: 0.833 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, c4: 0.9650, d2: 2.847, d3: 0.820 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, c4: 0.9693, d2: 2.970, d3: 0.808 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, c4: 0.9727, d2: 3.078, d3: 0.797 },
  11: { A2: 0.285, D3: 0.256, D4: 1.744, c4: 0.9754, d2: 3.173, d3: 0.787 },
  12: { A2: 0.266, D3: 0.284, D4: 1.716, c4: 0.9776, d2: 3.258, d3: 0.778 },
  13: { A2: 0.249, D3: 0.308, D4: 1.692, c4: 0.9794, d2: 3.336, d3: 0.770 },
  14: { A2: 0.235, D3: 0.329, D4: 1.671, c4: 0.9810, d2: 3.407, d3: 0.763 },
  15: { A2: 0.223, D3: 0.348, D4: 1.652, c4: 0.9823, d2: 3.472, d3: 0.756 },
  16: { A2: 0.212, D3: 0.364, D4: 1.636, c4: 0.9835, d2: 3.532, d3: 0.750 },
  17: { A2: 0.203, D3: 0.379, D4: 1.621, c4: 0.9845, d2: 3.588, d3: 0.744 },
  18: { A2: 0.194, D3: 0.392, D4: 1.608, c4: 0.9854, d2: 3.640, d3: 0.739 },
  19: { A2: 0.187, D3: 0.404, D4: 1.596, c4: 0.9862, d2: 3.689, d3: 0.734 },
  20: { A2: 0.180, D3: 0.414, D4: 1.586, c4: 0.9869, d2: 3.735, d3: 0.729 },
  21: { A2: 0.173, D3: 0.425, D4: 1.575, c4: 0.9876, d2: 3.778, d3: 0.724 },
  22: { A2: 0.167, D3: 0.434, D4: 1.566, c4: 0.9882, d2: 3.819, d3: 0.720 },
  23: { A2: 0.162, D3: 0.443, D4: 1.557, c4: 0.9887, d2: 3.858, d3: 0.716 },
  24: { A2: 0.157, D3: 0.452, D4: 1.548, c4: 0.9892, d2: 3.895, d3: 0.712 },
  25: { A2: 0.153, D3: 0.459, D4: 1.541, c4: 0.9896, d2: 3.931, d3: 0.708 },
};

/**
 * Get SPC constant by subgroup size and constant name
 * @param n - Subgroup size (2-25)
 * @param key - Constant key (A2, D3, D4, c4, d2, d3)
 * @returns The constant value
 */
export function getConstant(n: number, key: keyof SPCConstant): number {
  if (n < 2 || n > 25) {
    throw new Error(`Subgroup size ${n} is out of range. Must be between 2 and 25.`);
  }

  const constants = SPC_CONSTANTS[n];
  if (!constants) {
    throw new Error(`No constants found for subgroup size ${n}`);
  }

  return constants[key];
}

/**
 * Get all constants for a given subgroup size
 * @param n - Subgroup size (2-25)
 * @returns Object containing all constants
 */
export function getAllConstants(n: number): SPCConstant {
  if (n < 2 || n > 25) {
    throw new Error(`Subgroup size ${n} is out of range. Must be between 2 and 25.`);
  }

  const constants = SPC_CONSTANTS[n];
  if (!constants) {
    throw new Error(`No constants found for subgroup size ${n}`);
  }

  return constants;
}

/**
 * Check if subgroup size is valid
 * @param n - Subgroup size to check
 * @returns true if valid, false otherwise
 */
export function isValidSubgroupSize(n: number): boolean {
  return n >= 2 && n <= 25 && Number.isInteger(n);
}

// Standard normal distribution constants
export const NORMAL_DIST = {
  // 3-sigma limits (99.73% coverage)
  THREE_SIGMA: 3,
  // 6-sigma limits (99.9999998% coverage)
  SIX_SIGMA: 6,
  // Z-score for common probability levels
  Z_SCORES: {
    '90%': 1.282,
    '95%': 1.645,
    '99%': 2.326,
    '99.9%': 3.090,
  },
};

export default {
  SPC_CONSTANTS,
  getConstant,
  getAllConstants,
  isValidSubgroupSize,
  NORMAL_DIST,
};
