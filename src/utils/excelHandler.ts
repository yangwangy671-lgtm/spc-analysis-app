// Excel Handler Module
// Handles importing and exporting Excel files for SPC analysis

import * as XLSX from 'xlsx';
import type { RawDataRow, ExcelData, ValidationResult, ProcessMetrics, AnomalyResult } from '../types';

/**
 * Parse Excel file and extract data
 * Supports two formats:
 * 1. Multi-column format: [Timestamp, GroupNo, Value1, Value2, Value3, Value4, Value5]
 * 2. Single-column format: [Timestamp, Value] (for I-MR charts)
 */
export async function parseExcelFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Read first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or has insufficient data'));
          return;
        }

        // Parse headers and data
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);

        // Try to extract metadata from sheet (if present)
        const metadata = extractMetadata(worksheet);

        // Parse data rows
        const parsedData = parseDataRows(headers, rows);

        resolve({
          metadata,
          data: parsedData,
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Extract metadata from worksheet (if present)
 * Looks for USL, LSL, Target values in common locations
 * Supports both Chinese and English labels
 */
function extractMetadata(worksheet: XLSX.WorkSheet): ExcelData['metadata'] {
  const metadata: ExcelData['metadata'] = {};

  // Try to find metadata in worksheet
  // Common patterns: cells with labels like "USL:", "LSL:", "规格上限", etc.
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');

  // Search in first 50 rows and first 20 columns
  for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
    for (let col = range.s.c; col <= Math.min(range.e.c, 20); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (!cell || !cell.v) continue;

      const cellValue = String(cell.v).toLowerCase().trim();
      // Remove special characters for better matching
      const normalizedValue = cellValue.replace(/[:\s()（）_-]/g, '');

      // Try to find value in adjacent cells (right, below, or same cell if contains "=")
      const valueCandidates = [
        worksheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })], // Right cell
        worksheet[XLSX.utils.encode_cell({ r: row + 1, c: col })], // Below cell (important for header row case)
        worksheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })], // Two cells to the right
        cell, // Same cell (in case value is in same cell like "USL=11.0")
      ];

      // Extract numeric value from candidates or from cell text
      let extractedValue: number | undefined;

      // First try: look for "=" pattern in same cell (e.g., "USL=11.0")
      if (cellValue.includes('=')) {
        const parts = cellValue.split('=');
        if (parts.length === 2) {
          const numPart = parseFloat(parts[1]);
          if (!isNaN(numPart)) {
            extractedValue = numPart;
          }
        }
      }

      // Second try: look in adjacent cells
      if (extractedValue === undefined) {
        for (const candidate of valueCandidates) {
          if (candidate && !isNaN(Number(candidate.v))) {
            extractedValue = Number(candidate.v);
            break;
          }
        }
      }

      // Skip if no valid number found
      if (extractedValue === undefined) continue;

      // Check for USL (Upper Specification Limit)
      if (!metadata.usl && (
        normalizedValue.includes('usl') ||
        normalizedValue.includes('规格上限') ||
        normalizedValue.includes('上规格限') ||
        normalizedValue.includes('规格上限') ||
        normalizedValue.includes('upperspec') ||
        normalizedValue.includes('upperlimit') ||
        normalizedValue.includes('上限') && !normalizedValue.includes('控制') ||
        normalizedValue === 'us' ||
        normalizedValue === 'ul' ||
        normalizedValue === 'usl' ||
        // Match exact Chinese characters
        cellValue.trim() === '规格上限' ||
        cellValue.replace(/\s/g, '') === '规格上限'
      )) {
        metadata.usl = extractedValue;
        console.log(`Found USL: ${extractedValue} at ${cellAddress}, label: "${cellValue}"`);
      }

      // Check for LSL (Lower Specification Limit)
      if (!metadata.lsl && (
        normalizedValue.includes('lsl') ||
        normalizedValue.includes('规格下限') ||
        normalizedValue.includes('下规格限') ||
        normalizedValue.includes('lowerspec') ||
        normalizedValue.includes('lowerlimit') ||
        normalizedValue.includes('下限') && !normalizedValue.includes('控制') ||
        normalizedValue === 'ls' ||
        normalizedValue === 'll' ||
        normalizedValue === 'lsl' ||
        // Match exact Chinese characters
        cellValue.trim() === '规格下限' ||
        cellValue.replace(/\s/g, '') === '规格下限'
      )) {
        metadata.lsl = extractedValue;
        console.log(`Found LSL: ${extractedValue} at ${cellAddress}, label: "${cellValue}"`);
      }

      // Check for Target / Nominal Value
      if (!metadata.target && (
        normalizedValue.includes('target') ||
        normalizedValue.includes('nominal') ||
        normalizedValue.includes('目标值') ||
        normalizedValue.includes('目标') && cellValue.length < 10 || // Avoid matching long text containing "目标"
        normalizedValue.includes('标准值') ||
        normalizedValue.includes('中心值') ||
        normalizedValue.includes('中心线') && !normalizedValue.includes('控制') ||
        normalizedValue === 'tg' ||
        normalizedValue === 'nom' ||
        cellValue.trim() === '目标值'
      )) {
        metadata.target = extractedValue;
        console.log(`Found Target: ${extractedValue} at ${cellAddress}, label: "${cellValue}"`);
      }
    }
  }

  // Calculate target if not found but USL and LSL are available
  if (!metadata.target && metadata.usl !== undefined && metadata.lsl !== undefined) {
    metadata.target = (metadata.usl + metadata.lsl) / 2;
    console.log(`Calculated Target: ${metadata.target} from USL and LSL`);
  }

  return metadata;
}

/**
 * Parse data rows based on headers
 */
function parseDataRows(headers: string[], rows: any[][]): RawDataRow[] {
  const parsedData: RawDataRow[] = [];

  // Detect format based on headers
  const hasMultipleValues = headers.filter(h =>
    String(h).toLowerCase().includes('value') ||
    String(h).toLowerCase().includes('measurement') ||
    /^[0-9]+$/.test(String(h))
  ).length > 1;

  rows.forEach((row, index) => {
    if (!row || row.length === 0) return;

    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || cell === '')) return;

    try {
      if (hasMultipleValues) {
        // Multi-column format
        const dataRow = parseMultiColumnRow(headers, row);
        if (dataRow) parsedData.push(dataRow);
      } else {
        // Single-column format (for I-MR)
        const dataRow = parseSingleColumnRow(headers, row, index);
        if (dataRow) parsedData.push(dataRow);
      }
    } catch (error) {
      console.warn(`Skipping row ${index + 2}: ${error}`);
    }
  });

  return parsedData;
}

/**
 * Parse multi-column row format
 */
function parseMultiColumnRow(headers: string[], row: any[]): RawDataRow | null {
  const values: number[] = [];
  let timestamp: string | undefined;
  let groupNo: number | undefined;

  headers.forEach((header, colIndex) => {
    const cell = row[colIndex];
    const headerLower = String(header).toLowerCase();

    if (headerLower.includes('time') || headerLower.includes('date')) {
      timestamp = cell ? String(cell) : undefined;
    } else if (headerLower.includes('group') || headerLower.includes('no') || headerLower.includes('序号')) {
      groupNo = cell ? Number(cell) : undefined;
    } else if (
      headerLower.includes('value') ||
      headerLower.includes('measurement') ||
      headerLower.includes('测量') ||
      /^[0-9]+$/.test(String(header))
    ) {
      const value = parseFloat(cell);
      if (!isNaN(value)) {
        values.push(value);
      }
    }
  });

  if (values.length === 0) return null;

  return {
    timestamp,
    groupNo,
    values,
  };
}

/**
 * Parse single-column row format
 */
function parseSingleColumnRow(headers: string[], row: any[], rowIndex: number): RawDataRow | null {
  let timestamp: string | undefined;
  let value: number | undefined;

  headers.forEach((header, colIndex) => {
    const cell = row[colIndex];
    const headerLower = String(header).toLowerCase();

    if (headerLower.includes('time') || headerLower.includes('date')) {
      timestamp = cell ? String(cell) : undefined;
    } else if (
      headerLower.includes('value') ||
      headerLower.includes('measurement') ||
      headerLower.includes('测量')
    ) {
      value = parseFloat(cell);
    }
  });

  if (value === undefined || isNaN(value)) return null;

  return {
    timestamp,
    groupNo: rowIndex + 1,
    values: [value],
  };
}

/**
 * Validate parsed data
 */
export function validateData(data: RawDataRow[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push('No data found in file');
    return { valid: false, errors, warnings };
  }

  if (data.length < 3) {
    warnings.push('Very few data points (< 3). Results may not be reliable.');
  }

  // Check for consistent subgroup sizes
  const subgroupSizes = data.map(row => row.values.length);
  const uniqueSizes = [...new Set(subgroupSizes)];

  if (uniqueSizes.length > 1) {
    warnings.push(`Inconsistent subgroup sizes detected: ${uniqueSizes.join(', ')}`);
  }

  // Check for invalid values
  data.forEach((row, index) => {
    row.values.forEach((value, valueIndex) => {
      if (isNaN(value) || !isFinite(value)) {
        errors.push(`Invalid value at row ${index + 1}, measurement ${valueIndex + 1}`);
      }
    });
  });

  // Check for extreme outliers (simple check)
  const allValues = data.flatMap(row => row.values);
  const mean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
  const stdDev = Math.sqrt(
    allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length
  );

  const extremeOutliers = allValues.filter(val => Math.abs(val - mean) > 6 * stdDev);
  if (extremeOutliers.length > 0) {
    warnings.push(`Found ${extremeOutliers.length} extreme outliers (> 6σ from mean)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export data to Excel with multiple sheets
 */
export function exportToExcel(
  rawData: RawDataRow[],
  metrics: ProcessMetrics,
  anomalies: AnomalyResult[],
  fileName: string = 'SPC_Report'
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Raw Data
  const rawDataSheet = createRawDataSheet(rawData);
  XLSX.utils.book_append_sheet(workbook, rawDataSheet, 'Raw Data');

  // Sheet 2: Summary Metrics
  const summarySheet = createSummarySheet(metrics);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 3: Anomalies
  if (anomalies.length > 0) {
    const anomaliesSheet = createAnomaliesSheet(anomalies, rawData);
    XLSX.utils.book_append_sheet(workbook, anomaliesSheet, 'Anomalies');
  }

  // Download file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
}

/**
 * Create raw data sheet
 */
function createRawDataSheet(data: RawDataRow[]): XLSX.WorkSheet {
  const sheetData: any[][] = [];

  // Determine max number of values
  const maxValues = Math.max(...data.map(row => row.values.length));

  // Headers
  const headers = ['Row', 'Timestamp', 'Group No'];
  for (let i = 1; i <= maxValues; i++) {
    headers.push(`Value ${i}`);
  }
  sheetData.push(headers);

  // Data rows
  data.forEach((row, index) => {
    const dataRow = [
      index + 1,
      row.timestamp || '',
      row.groupNo || index + 1,
      ...row.values,
    ];
    sheetData.push(dataRow);
  });

  return XLSX.utils.aoa_to_sheet(sheetData);
}

/**
 * Create summary metrics sheet
 */
function createSummarySheet(metrics: ProcessMetrics): XLSX.WorkSheet {
  const summaryData = [
    ['Metric', 'Value'],
    ['Sample Size (n)', metrics.n],
    ['Mean (μ)', metrics.mean.toFixed(4)],
    ['Standard Deviation (σ)', metrics.stdDev.toFixed(4)],
    [''],
    ['Process Capability Indices', ''],
    ['CP', metrics.cp.toFixed(3)],
    ['CPK', metrics.cpk.toFixed(3)],
    ['PP', metrics.pp.toFixed(3)],
    ['PPK', metrics.ppk.toFixed(3)],
    [''],
    ['Pass Rate', `${metrics.passRate.toFixed(2)}%`],
    ['Normality Test P-value', metrics.normalityPValue?.toFixed(4) || 'N/A'],
  ];

  return XLSX.utils.aoa_to_sheet(summaryData);
}

/**
 * Create anomalies sheet
 */
function createAnomaliesSheet(anomalies: AnomalyResult[], rawData: RawDataRow[]): XLSX.WorkSheet {
  const anomaliesData: any[][] = [
    ['Index', 'Group No', 'Value', 'Rule', 'Level', 'Description'],
  ];

  anomalies.forEach(anomaly => {
    const row = rawData[anomaly.index];
    anomaliesData.push([
      anomaly.index + 1,
      row?.groupNo || anomaly.index + 1,
      anomaly.value.toFixed(4),
      `Rule ${anomaly.rule}`,
      anomaly.level,
      anomaly.description,
    ]);
  });

  return XLSX.utils.aoa_to_sheet(anomaliesData);
}

/**
 * Parse CSV file (alternative to Excel)
 */
export async function parseCSVFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);

        if (lines.length < 2) {
          reject(new Error('CSV file is empty or has insufficient data'));
          return;
        }

        // Try to extract metadata from first few lines
        const metadata: ExcelData['metadata'] = {};
        let dataStartIndex = 0;

        // Check first 10 lines for metadata
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i].toLowerCase();
          const parts = lines[i].split(',').map(p => p.trim());

          // Skip empty lines
          if (!line.trim()) continue;

          // Check if this line contains metadata
          let isMetadata = false;

          for (let j = 0; j < parts.length - 1; j++) {
            const label = parts[j].toLowerCase().replace(/[:\s()（）]/g, '');
            const value = parseFloat(parts[j + 1]);

            if (isNaN(value)) continue;

            // Check for USL
            if (!metadata.usl && (
              label.includes('usl') ||
              label.includes('规格上限') ||
              label.includes('上规格限') ||
              label.includes('upperspec') ||
              label.includes('上限') && !label.includes('控制')
            )) {
              metadata.usl = value;
              isMetadata = true;
              console.log(`Found USL in CSV: ${value}`);
            }

            // Check for LSL
            if (!metadata.lsl && (
              label.includes('lsl') ||
              label.includes('规格下限') ||
              label.includes('下规格限') ||
              label.includes('lowerspec') ||
              label.includes('下限') && !label.includes('控制')
            )) {
              metadata.lsl = value;
              isMetadata = true;
              console.log(`Found LSL in CSV: ${value}`);
            }

            // Check for Target
            if (!metadata.target && (
              label.includes('target') ||
              label.includes('nominal') ||
              label.includes('目标值') ||
              label.includes('目标') ||
              label.includes('标准值') ||
              label.includes('中心值')
            )) {
              metadata.target = value;
              isMetadata = true;
              console.log(`Found Target in CSV: ${value}`);
            }
          }

          // If this line is metadata, data starts after it
          if (isMetadata) {
            dataStartIndex = i + 1;
          }

          // If we find what looks like a header row, data starts here
          if (!isMetadata && (
            line.includes('time') ||
            line.includes('date') ||
            line.includes('value') ||
            line.includes('group') ||
            line.includes('测量')
          )) {
            dataStartIndex = i;
            break;
          }
        }

        // Calculate target if not found
        if (!metadata.target && metadata.usl !== undefined && metadata.lsl !== undefined) {
          metadata.target = (metadata.usl + metadata.lsl) / 2;
          console.log(`Calculated Target in CSV: ${metadata.target}`);
        }

        // Parse CSV data starting from dataStartIndex
        const headers = lines[dataStartIndex].split(',').map(h => h.trim());
        const rows = lines.slice(dataStartIndex + 1)
          .filter(line => line.trim())
          .map(line => line.split(',').map(cell => cell.trim()));

        const parsedData = parseDataRows(headers, rows);

        resolve({
          metadata,
          data: parsedData,
        });
      } catch (error) {
        reject(new Error(`Failed to parse CSV file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export default {
  parseExcelFile,
  parseCSVFile,
  validateData,
  exportToExcel,
};
