// Core data types for SPC Analysis Application

export interface RawDataRow {
  timestamp?: string;
  groupNo?: number;
  values: number[];
}

export interface ProcessedDataRow extends RawDataRow {
  id: number;
  mean: number;
  range: number;
  status: 'normal' | 'warning' | 'critical';
  anomalies?: AnomalyResult[];
}

export interface ControlLimits {
  xBar: {
    center: number;
    ucl: number;
    lcl: number;
  };
  r: {
    center: number;
    ucl: number;
    lcl: number;
  };
}

export interface IMRLimits {
  individual: {
    center: number;
    ucl: number;
    lcl: number;
  };
  movingRange: {
    center: number;
    ucl: number;
    lcl: number;
  };
}

export interface ProcessMetrics {
  n: number;
  mean: number;
  stdDev: number;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  passRate: number;
  normalityPValue?: number;
}

export interface AnomalyResult {
  index: number;
  value: number;
  rule: number;
  level: 'critical' | 'warning' | 'info';
  description: string;
}

export interface CustomAlarmRule {
  id: number;
  name: string;
  description: string;
  level: 'critical' | 'warning' | 'info';
  enabled: boolean;
  ruleType: 'consecutive_outside' | 'n_of_m_outside' | 'consecutive_inside' | 'consecutive_alternating';
  totalCount: number;
  triggerCount?: number;
  sigmaThreshold: number;
}

export interface SPCParameters {
  usl: number;
  lsl: number;
  target?: number;
  subgroupSize: number;
  anomalyRules: number[];
  chartType: 'xbar-r' | 'i-mr';
  alarmLevels?: Record<number, 'critical' | 'warning' | 'info'>;
  customAlarmRules?: CustomAlarmRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelData {
  metadata?: {
    title?: string;
    date?: string;
    usl?: number;
    lsl?: number;
    target?: number;
  };
  data: RawDataRow[];
}

export interface ChartData {
  xBarData: number[];
  rData: number[];
  groupNumbers: number[];
  controlLimits: ControlLimits | IMRLimits;
  anomalies: AnomalyResult[];
}

export interface HistogramData {
  bins: number[];
  frequencies: number[];
  normalCurve: { x: number; y: number }[];
}

export type StatusColor = 'success' | 'warning' | 'error';

export interface SPCConstant {
  A2: number;
  D3: number;
  D4: number;
  c4: number;
  d2: number;
  d3: number;
}
