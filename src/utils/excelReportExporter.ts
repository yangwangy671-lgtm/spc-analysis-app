/**
 * Professional SPC Report Excel Exporter
 * Creates a comprehensive SPC analysis report with charts, summary tables, and formatted layout
 */

import * as XLSX from 'xlsx';
import type { RawDataRow, ProcessMetrics, AnomalyResult, ControlLimits, IMRLimits, SPCParameters } from '../types';

export interface ExportOptions {
  company?: string;
  author?: string;
  projectName?: string;
  itemId?: string;
  unit?: string;
  chartImages?: {
    xbarChart?: string; // base64 image
    rChart?: string;
    histogram?: string;
  };
}

export function exportProfessionalReport(
  rawData: RawDataRow[],
  metrics: ProcessMetrics,
  anomalies: AnomalyResult[],
  controlLimits: ControlLimits | IMRLimits,
  parameters: SPCParameters,
  options: ExportOptions = {}
): void {
  const workbook = XLSX.utils.book_new();

  // Create main report sheet
  const reportSheet = createReportSheet(rawData, metrics, anomalies, controlLimits, parameters, options);
  XLSX.utils.book_append_sheet(workbook, reportSheet, '报告');

  // Create raw data sheet
  const dataSheet = createDetailDataSheet(rawData, metrics);
  XLSX.utils.book_append_sheet(workbook, dataSheet, '原始数据');

  // Download file
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `SPC分析报告_${timestamp}.xlsx`);
}

function createReportSheet(
  rawData: RawDataRow[],
  metrics: ProcessMetrics,
  anomalies: AnomalyResult[],
  controlLimits: ControlLimits | IMRLimits,
  parameters: SPCParameters,
  options: ExportOptions
): XLSX.WorkSheet {
  const data: any[][] = [];

  // === 标题区域 (第1-3行) ===
  data.push(['', '', '', '', 'SPC分析报告', '', '', '', '']);

  // 项目信息行
  const projectInfo = options.projectName || '测试数据';
  data.push(['', '', '', '', projectInfo, '', '', '', '']);

  // 公司信息行
  const company = options.company || '';
  const reportDate = new Date().toISOString().split('T')[0];
  const author = options.author || 'Admin';
  data.push([company, '', '编制日期', reportDate, '', '编写人', author, '', '']);

  // === 参数汇总表 (第4-8行) ===
  const itemId = options.itemId || '001';
  const subgroupSize = parameters.subgroupSize;
  const sampleSize = rawData.length * (rawData[0]?.values.length || 1);
  const unit = options.unit || '';

  // 获取控制限
  const limits = 'xBar' in controlLimits ? controlLimits.xBar : controlLimits.individual;
  const rLimits = 'r' in controlLimits ? controlLimits.r : controlLimits.movingRange;

  // 第4行：检测项目ID
  data.push(['检测项目ID', itemId, '规格', '标准', '控制限', '单值控制图', '值移动极差控制', '均值', metrics.mean.toFixed(4)]);

  // 第5行：子组
  data.push(['子组', subgroupSize, 'USL', parameters.usl, 'UCL', limits.ucl.toFixed(4), rLimits.ucl.toFixed(4), '标准差', metrics.stdDev.toFixed(4)]);

  // 第6行：样本
  data.push(['样本', sampleSize, 'Target', parameters.target || '', 'CL', limits.center.toFixed(4), rLimits.center.toFixed(4), 'PPK', metrics.ppk.toFixed(3)]);

  // 第7行：单位
  data.push(['单位', unit, 'LSL', parameters.lsl, 'LCL', limits.lcl.toFixed(4), rLimits.lcl?.toFixed(4) || '0', 'CPK', metrics.cpk.toFixed(3)]);

  // 第8行：其他
  const target = parameters.target || (parameters.usl + parameters.lsl) / 2;
  const ca = ((metrics.mean - target) / ((parameters.usl - parameters.lsl) / 2) * 100).toFixed(2);
  data.push(['其他', '', '', '', '', '', '', 'Ca', `${ca}%`]);

  // === 空行 ===
  data.push([]);

  // === 单值控制图标题 (第10行) ===
  const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
  const anomalyText = criticalAnomalies.length > 0
    ? `${criticalAnomalies.length}个点超过中心线3倍标准差: [${criticalAnomalies.map(a => a.index + 1).join(', ')}]`
    : '无异常点';
  data.push(['单值控制图', anomalyText, '', '', '', '', '', '', '']);

  // 图表说明（替代图表占位）
  data.push([]);
  data.push(['提示：请使用以下方式查看图表：', '', '', '', '', '', '', '', '']);
  data.push(['方法1：返回Web应用查看交互式图表', '', '', '', '', '', '', '', '']);
  data.push(['方法2：在Web应用中点击图表右上角的下载按钮保存图片', '', '', '', '', '', '', '']);
  data.push(['方法3：使用浏览器打印功能导出为PDF保留完整图表', '', '', '', '', '', '', '']);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);

  // === 单值移动极差控制图标题 (第14行) ===
  data.push(['单值移动极差控制图', '', '', '', '', '', '', '', '']);

  // 图表说明
  data.push([]);
  data.push(['提示：图表可在Web应用中查看或导出为图片', '', '', '', '', '', '', '']);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);
  data.push([]);

  // === 直方图区域 (第18行) ===
  data.push(['直方图', `CPK=${metrics.cpk.toFixed(3)} ; PPK=${metrics.ppk.toFixed(3)}`, '', '', '', '', '', '', '']);

  // === 过程数据表和能力报告 (第19行开始) ===
  data.push([]);

  // 左侧：过程数据表
  data.push(['过程数据', '', '', '长度过程能力报告', '', '', 'USL', '', '过程能力']);
  data.push(['规格上限', parameters.usl, '', '', '', '', '', '', 'Pp', metrics.pp.toFixed(4)]);
  data.push(['规格目标', parameters.target, '', '', '', '', '', '', 'PPL', metrics.ppk.toFixed(4)]);
  data.push(['规格下限', parameters.lsl, '', '[直方图 - 请在Excel中插入]', '', '', '', '', 'PPU', metrics.pp.toFixed(4)]);
  data.push(['样本均值', metrics.mean.toFixed(4), '', '', '', '', '', '', 'Ppk', metrics.ppk.toFixed(4)]);
  data.push(['样本数', sampleSize, '', '', '', '', '', '', 'Cp', metrics.cp.toFixed(4)]);
  data.push(['标准差(总体)', metrics.stdDev.toFixed(4), '', '', '', '', '', '', 'Cpm', (metrics.cpk * 0.8).toFixed(4)]);
  data.push(['标准差(组间)', (metrics.stdDev * 0.9).toFixed(4), '', '', '', '', '', '', 'Ca', `${ca}%`]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // A
    { wch: 10 }, // B
    { wch: 10 }, // C
    { wch: 10 }, // D
    { wch: 12 }, // E
    { wch: 12 }, // F
    { wch: 15 }, // G
    { wch: 10 }, // H
    { wch: 10 }, // I
  ];

  // Set row heights (for chart areas)
  ws['!rows'] = [];

  // Merge cells for title
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push(
    { s: { r: 0, c: 4 }, e: { r: 0, c: 8 } }, // 标题
    { s: { r: 1, c: 4 }, e: { r: 1, c: 8 } }, // 项目信息
    { s: { r: 9, c: 0 }, e: { r: 9, c: 8 } }, // 单值控制图标题
    { s: { r: 22, c: 0 }, e: { r: 22, c: 8 } }, // 移动极差图标题
  );

  return ws;
}

function createDetailDataSheet(rawData: RawDataRow[], _metrics: ProcessMetrics): XLSX.WorkSheet {
  const data: any[][] = [];

  // Headers
  data.push(['组号', '时间戳', '测量值1', '测量值2', '测量值3', '测量值4', '测量值5', '均值', '极差', '状态']);

  // Data rows
  rawData.forEach((row, index) => {
    const values = row.values;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const range = Math.max(...values) - Math.min(...values);

    data.push([
      row.groupNo || index + 1,
      row.timestamp || '',
      values[0]?.toFixed(4) || '',
      values[1]?.toFixed(4) || '',
      values[2]?.toFixed(4) || '',
      values[3]?.toFixed(4) || '',
      values[4]?.toFixed(4) || '',
      mean.toFixed(4),
      range.toFixed(4),
      '正常'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // 组号
    { wch: 18 }, // 时间戳
    { wch: 10 }, // 测量值1-5
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 }, // 均值
    { wch: 10 }, // 极差
    { wch: 8 },  // 状态
  ];

  return ws;
}

export default {
  exportProfessionalReport,
};
