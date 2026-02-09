// Excel模板生成工具模块
// 用于生成标准的SPC数据导入模板

import * as XLSX from 'xlsx';

/**
 * 生成并下载Excel导入模板
 * 提供两种格式：多值格式（X-bar R图）和单值格式（I-MR图）
 */
export function downloadTemplate(templateType: 'multi-value' | 'single-value' = 'multi-value'): void {
  const workbook = XLSX.utils.book_new();

  if (templateType === 'multi-value') {
    // 多值格式模板（用于X-bar R图）
    const templateData = [
      // 元数据行
      ['规格信息', '', '', '', '', '', ''],
      ['规格上限 (USL)', '11.0', '', '', '', '', ''],
      ['规格下限 (LSL)', '9.5', '', '', '', '', ''],
      ['目标值 (Target)', '10.25', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      // 数据表头
      ['时间戳', '组号', '测量值1', '测量值2', '测量值3', '测量值4', '测量值5'],
      // 示例数据
      ['2024-01-01 08:00', '1', '10.2', '10.3', '10.1', '10.4', '10.2'],
      ['2024-01-01 09:00', '2', '10.1', '10.2', '10.3', '10.2', '10.1'],
      ['2024-01-01 10:00', '3', '10.3', '10.2', '10.4', '10.1', '10.3'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 18 }, // 时间戳
      { wch: 8 },  // 组号
      { wch: 10 }, // 测量值1
      { wch: 10 }, // 测量值2
      { wch: 10 }, // 测量值3
      { wch: 10 }, // 测量值4
      { wch: 10 }, // 测量值5
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, '数据模板');
  } else {
    // 单值格式模板（用于I-MR图）
    const templateData = [
      // 元数据行
      ['规格信息', '', ''],
      ['规格上限 (USL)', '11.0', ''],
      ['规格下限 (LSL)', '9.5', ''],
      ['目标值 (Target)', '10.25', ''],
      ['', '', ''],
      // 数据表头
      ['时间戳', '组号', '测量值'],
      // 示例数据
      ['2024-01-01 08:00', '1', '10.2'],
      ['2024-01-01 09:00', '2', '10.3'],
      ['2024-01-01 10:00', '3', '10.1'],
      ['2024-01-01 11:00', '4', '10.4'],
      ['2024-01-01 12:00', '5', '10.2'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 18 }, // 时间戳
      { wch: 8 },  // 组号
      { wch: 12 }, // 测量值
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, '数据模板');
  }

  // 生成文件名
  const fileName = templateType === 'multi-value'
    ? 'SPC数据导入模板_多值格式.xlsx'
    : 'SPC数据导入模板_单值格式.xlsx';

  // 下载文件
  XLSX.writeFile(workbook, fileName);
}

/**
 * 生成CSV模板
 */
export function downloadCSVTemplate(templateType: 'multi-value' | 'single-value' = 'multi-value'): void {
  let csvContent: string;

  if (templateType === 'multi-value') {
    csvContent = `规格上限 (USL),11.0
规格下限 (LSL),9.5
目标值 (Target),10.25

时间戳,组号,测量值1,测量值2,测量值3,测量值4,测量值5
2024-01-01 08:00,1,10.2,10.3,10.1,10.4,10.2
2024-01-01 09:00,2,10.1,10.2,10.3,10.2,10.1
2024-01-01 10:00,3,10.3,10.2,10.4,10.1,10.3`;
  } else {
    csvContent = `规格上限 (USL),11.0
规格下限 (LSL),9.5
目标值 (Target),10.25

时间戳,组号,测量值
2024-01-01 08:00,1,10.2
2024-01-01 09:00,2,10.3
2024-01-01 10:00,3,10.1
2024-01-01 11:00,4,10.4
2024-01-01 12:00,5,10.2`;
  }

  // 创建Blob并下载
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const fileName = templateType === 'multi-value'
    ? 'SPC数据导入模板_多值格式.csv'
    : 'SPC数据导入模板_单值格式.csv';

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default {
  downloadTemplate,
  downloadCSVTemplate,
};
