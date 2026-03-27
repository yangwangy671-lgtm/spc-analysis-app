import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Modal, message, Drawer, Form, Slider, ColorPicker, InputNumber, Divider } from 'antd';
import { SettingOutlined, DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ControlLimits, IMRLimits, AnomalyResult, ProcessMetrics, SPCParameters, RawDataRow } from '../../types';
import { normalPDF } from '../../utils/spcCalculator';

interface ChartCardProps {
  title: string;
  chartType: 'xbar' | 'r' | 'histogram' | 'boxplot' | 'rainbow' | 'scatter';
  xBarData?: number[];
  rData?: number[];
  groupNumbers?: number[];
  controlLimits?: ControlLimits | IMRLimits | null;
  anomalies?: AnomalyResult[];
  parameters?: SPCParameters;
  allData?: number[];
  metrics?: ProcessMetrics | null;
  usl?: number;
  lsl?: number;
  rawData?: RawDataRow[]; // 用于箱线图和彩虹图
}

interface ChartSettings {
  fontSize: number;
  lineWidth: number;
  dataLineColor: string;
  uclColor: string;
  clColor: string;
  lclColor: string;
  anomalyColor: string;
  yAxisMin: number | null;
  yAxisMax: number | null;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  chartType,
  xBarData = [],
  rData = [],
  groupNumbers = [],
  controlLimits,
  anomalies = [],
  parameters,
  allData = [],
  metrics,
  usl,
  lsl,
  rawData = [],
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chartRef = useRef<any>(null);

  // 图表设置状态（默认色彩参照 Minitab 风格）
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    fontSize: 14,
    lineWidth: 2,
    dataLineColor: '#1a3a8a',   // 深海军蓝
    uclColor: '#f5222d',
    clColor: '#00bcd4',         // 青蓝色中心线
    lclColor: '#f5222d',
    anomalyColor: '#f5222d',
    yAxisMin: null,
    yAxisMax: null,
  });

  // 计算自适应Y轴范围（让数据居中显示）
  const calculateAutoRange = (data: number[], includeControlLimits: boolean = true): { min: number; max: number } => {
    if (data.length === 0) return { min: 0, max: 100 };

    let minVal = Math.min(...data);
    let maxVal = Math.max(...data);

    // 如果需要包含控制限
    if (includeControlLimits && controlLimits) {
      const limits = 'xBar' in controlLimits ? controlLimits.xBar : controlLimits.individual;
      // 只有当控制限在合理范围内时才包含它们
      // 避免控制限过宽导致数据显示过小
      const dataRange = maxVal - minVal;
      const uclDistance = Math.abs(limits.ucl - maxVal);
      const lclDistance = Math.abs(minVal - limits.lcl);

      // 如果控制限距离数据不超过数据范围的50%，则包含它们
      if (uclDistance < dataRange * 0.5) {
        maxVal = Math.max(maxVal, limits.ucl);
      }
      if (lclDistance < dataRange * 0.5) {
        minVal = Math.min(minVal, limits.lcl);
      }
    }

    // 计算数据范围
    const range = maxVal - minVal;

    // 对于直方图（频数），从0开始，上方留出20%空间
    if (!includeControlLimits) {
      const min = 0;
      const max = Math.ceil(maxVal * 1.2); // 上方留出20%，并向上取整
      return { min, max };
    }

    // 对于控制图，上下各留出12%的空间，让数据更好地展示
    const padding = range * 0.12;

    // 四舍五入到合理的精度
    const min = Math.floor((minVal - padding) * 100) / 100;
    const max = Math.ceil((maxVal + padding) * 100) / 100;

    return { min, max };
  };

  // 应用自适应范围
  const applyAutoRange = () => {
    let dataToUse: number[] = [];

    if (chartType === 'xbar') {
      dataToUse = xBarData;
      const autoRange = calculateAutoRange(dataToUse, true);
      setChartSettings({
        ...chartSettings,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      });
      message.success('已应用自适应居中范围');
    } else if (chartType === 'r') {
      // R图特殊处理：从0开始
      const maxR = Math.max(...rData);
      const autoRange = {
        min: 0,
        max: Math.ceil(maxR * 1.3 * 100) / 100,
      };
      setChartSettings({
        ...chartSettings,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      });
      message.success('已应用自适应居中范围');
    } else if (chartType === 'histogram') {
      dataToUse = allData;
      const autoRange = calculateAutoRange(dataToUse, false);
      setChartSettings({
        ...chartSettings,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      });
      message.success('已应用自适应居中范围');
    }
  };

  // 首次加载数据时自动应用自适应范围
  useEffect(() => {
    if (chartType === 'xbar' && xBarData.length > 0 && chartSettings.yAxisMin === null) {
      const autoRange = calculateAutoRange(xBarData, true);
      setChartSettings(prev => ({
        ...prev,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      }));
    } else if (chartType === 'r' && rData.length > 0 && chartSettings.yAxisMin === null) {
      // 对于极差图，特殊处理：从0开始，但上方留出足够空间
      const maxR = Math.max(...rData);
      const autoRange = {
        min: 0, // 极差从0开始
        max: Math.ceil(maxR * 1.3 * 100) / 100, // 上方留出30%空间，并保留2位小数
      };
      setChartSettings(prev => ({
        ...prev,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      }));
    } else if (chartType === 'histogram' && allData.length > 0 && chartSettings.yAxisMin === null) {
      const autoRange = calculateAutoRange(allData, false);
      setChartSettings(prev => ({
        ...prev,
        yAxisMin: autoRange.min,
        yAxisMax: autoRange.max,
      }));
    }
  }, [chartType, xBarData.length, rData.length, allData.length]);

  // 下载图表为图片
  const handleDownload = () => {
    if (!chartRef.current) {
      message.error('图表未加载完成');
      return;
    }

    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      const url = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2, // 2倍分辨率，更清晰
        backgroundColor: '#fff',
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('图表下载成功');
    } catch (error) {
      console.error('Download error:', error);
      message.error('图表下载失败');
    }
  };

  // X-bar Chart Option
  const xBarChartOption: EChartsOption = useMemo(() => {
    if (!controlLimits || xBarData.length === 0) return {};

    const limits = 'xBar' in controlLimits ? controlLimits.xBar : controlLimits.individual;
    const { center, ucl, lcl } = limits;

    const anomalyPoints = anomalies
      .filter(a => a.level === 'critical' || a.level === 'warning')
      .map(a => [a.index, a.value]);

    const isIMR = !('xBar' in controlLimits);
    const centerLabel = isIMR ? `X̄=${center.toFixed(4)}` : `X̄=${center.toFixed(4)}`;

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold', color: '#333' },
        top: 5,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: chartSettings.fontSize - 2, color: '#333' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:3px">序号 ${idx}</div>`;
          params.forEach((param: any) => {
            if (param.seriesName === '异常点' && param.data) {
              const anomaly = anomalies.find(a => a.index === param.data[0]);
              result += `${param.marker} <span style="color:#f5222d;font-weight:bold">异常: ${param.data[1].toFixed(4)}</span><br/>`;
              if (anomaly) result += `<span style="color:#f5222d;font-size:11px">规则${anomaly.rule}: ${anomaly.description}</span><br/>`;
            } else if (param.seriesName === (isIMR ? '单值' : '均值') && param.value !== null && param.value !== undefined) {
              result += `${param.marker} ${param.seriesName}: <strong>${(param.value as number).toFixed(4)}</strong><br/>`;
            }
          });
          return result;
        },
      },
      legend: { show: false },
      grid: {
        left: 55,
        right: 130,
        bottom: 45,
        top: 30,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: groupNumbers,
        name: '序号',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: chartSettings.fontSize - 3, color: '#666' },
        axisLabel: { fontSize: chartSettings.fontSize - 3, color: '#666', rotate: 0, margin: 8 },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: isIMR ? '单值' : '均值',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3, fontWeight: 'bold', color: '#555' },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          color: '#666',
          formatter: (value: number) => typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '0.00',
        },
        min: chartSettings.yAxisMin ?? undefined,
        max: chartSettings.yAxisMax ?? undefined,
        splitNumber: 5,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: isIMR ? '单值' : '均值',
          type: 'line',
          data: xBarData,
          itemStyle: { color: chartSettings.dataLineColor },
          lineStyle: { width: chartSettings.lineWidth, color: chartSettings.dataLineColor },
          symbol: 'circle',
          symbolSize: 5,
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            animation: false,
            data: [
              {
                yAxis: ucl,
                lineStyle: { type: 'dashed' as const, color: chartSettings.uclColor, width: 1.5 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: `UCL=${ucl.toFixed(4)}`,
                  color: chartSettings.uclColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
              {
                yAxis: center,
                lineStyle: { type: 'solid' as const, color: chartSettings.clColor, width: 2 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: centerLabel,
                  color: chartSettings.clColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
              {
                yAxis: lcl,
                lineStyle: { type: 'dashed' as const, color: chartSettings.lclColor, width: 1.5 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: `LCL=${lcl.toFixed(4)}`,
                  color: chartSettings.lclColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
            ],
          },
        },
        {
          name: '异常点',
          type: 'scatter',
          data: anomalyPoints,
          itemStyle: { color: chartSettings.anomalyColor },
          symbolSize: 11,
          symbol: 'circle',
          z: 10,
        },
      ],
    };
  }, [xBarData, controlLimits, anomalies, groupNumbers, title, chartSettings]);

  // R Chart Option
  const rChartOption: EChartsOption = useMemo(() => {
    if (!controlLimits || rData.length === 0) return {};

    const limits = 'r' in controlLimits ? controlLimits.r : controlLimits.movingRange;
    const { center, ucl, lcl } = limits;
    const isIMR = !('r' in controlLimits);
    const seriesName = isIMR ? '移动极差' : '极差';
    const centerLabel = isIMR ? `MR̄=${center.toFixed(4)}` : `R̄=${center.toFixed(4)}`;

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold', color: '#333' },
        top: 5,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: chartSettings.fontSize - 2, color: '#333' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:3px">序号 ${idx}</div>`;
          params.forEach((param: any) => {
            if (param.seriesName === seriesName && param.value !== null && param.value !== undefined) {
              result += `${param.marker} ${param.seriesName}: <strong>${(param.value as number).toFixed(4)}</strong><br/>`;
            }
          });
          return result;
        },
      },
      legend: { show: false },
      grid: {
        left: 55,
        right: 130,
        bottom: 45,
        top: 30,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: parameters?.chartType === 'xbar-r' ? groupNumbers : groupNumbers.slice(1),
        name: '序号',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: chartSettings.fontSize - 3, color: '#666' },
        axisLabel: { fontSize: chartSettings.fontSize - 3, color: '#666', rotate: 0, margin: 8 },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: seriesName,
        min: 0,
        nameTextStyle: { fontSize: chartSettings.fontSize - 3, fontWeight: 'bold', color: '#555' },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          color: '#666',
          formatter: (value: number) => typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '0.00',
        },
        max: chartSettings.yAxisMax ?? undefined,
        splitNumber: 5,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          data: rData,
          itemStyle: { color: chartSettings.dataLineColor },
          lineStyle: { width: chartSettings.lineWidth, color: chartSettings.dataLineColor },
          symbol: 'circle',
          symbolSize: 5,
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            animation: false,
            data: [
              {
                yAxis: ucl,
                lineStyle: { type: 'dashed' as const, color: chartSettings.uclColor, width: 1.5 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: `UCL=${ucl.toFixed(4)}`,
                  color: chartSettings.uclColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
              {
                yAxis: center,
                lineStyle: { type: 'solid' as const, color: chartSettings.clColor, width: 2 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: centerLabel,
                  color: chartSettings.clColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
              {
                yAxis: lcl,
                lineStyle: { type: 'dashed' as const, color: chartSettings.lclColor, width: 1.5 },
                label: {
                  show: true, position: 'end' as const,
                  formatter: `LCL=${lcl.toFixed(4)}`,
                  color: chartSettings.lclColor,
                  fontSize: chartSettings.fontSize - 4,
                  backgroundColor: '#fff', padding: [2, 3],
                },
              },
            ],
          },
        },
      ],
    };
  }, [rData, controlLimits, groupNumbers, parameters, title, chartSettings]);

  // Histogram Option
  const histogramOption: EChartsOption = useMemo(() => {
    if (!metrics || allData.length === 0) return {};

    const min = Math.min(...allData);
    const max = Math.max(...allData);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(allData.length)));
    const binWidth = (max - min) / binCount;

    const bins: number[] = [];
    const frequencies: number[] = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      bins.push((binStart + binEnd) / 2);
      const count = allData.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
      frequencies.push(count);
    }

    const normalCurve: number[] = bins.map(x => {
      const density = normalPDF(x, metrics.mean, metrics.stdDev);
      return density * allData.length * binWidth;
    });

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold' },
        top: 5,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontSize: chartSettings.fontSize - 2 },
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            let result = '';
            params.forEach((param: any) => {
              if (param.seriesName === '频数') {
                result += `${param.marker}${param.seriesName}: ${Math.round(param.value[1])}<br/>`;
              } else if (param.seriesName === '正态分布') {
                result += `${param.marker}${param.seriesName}: ${param.value[1] !== undefined ? param.value[1].toFixed(2) : 'N/A'}<br/>`;
              }
            });
            return result;
          }
          return '';
        }
      },
      legend: {
        data: ['频数', '正态分布', '规格上限', '规格下限', '均值'],
        top: 35,
        textStyle: { fontSize: chartSettings.fontSize - 3 },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '60px',
        top: '70px',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 2,
          formatter: (value: number) => {
            // 格式化X轴数值，保留2位小数，处理非数字情况
            return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '0.00';
          }
        },
      },
      yAxis: {
        type: 'value',
        name: '频数',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          formatter: (value: number) => {
            // Y轴是频数，显示为整数
            return Math.round(value).toString();
          }
        },
        min: 0, // 频数图从0开始
        max: chartSettings.yAxisMax ?? undefined,
        minInterval: 1, // 最小间隔为1，避免小数
        splitNumber: 5, // 建议分割为5段
      },
      series: [
        {
          name: '频数',
          type: 'bar',
          data: bins.map((bin, index) => [bin, frequencies[index]]),
          itemStyle: { color: chartSettings.dataLineColor, opacity: 0.7 },
          barWidth: '80%',
        },
        {
          name: '正态分布',
          type: 'line',
          data: bins.map((bin, index) => [bin, normalCurve[index]]),
          smooth: true,
          lineStyle: { color: chartSettings.clColor, width: chartSettings.lineWidth },
          symbol: 'none',
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            data: [{ xAxis: usl, label: { formatter: 'USL' } }],
            lineStyle: { color: chartSettings.uclColor, type: 'dashed', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            data: [{ xAxis: lsl, label: { formatter: 'LSL' } }],
            lineStyle: { color: chartSettings.lclColor, type: 'dashed', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            data: [{ xAxis: metrics.mean, label: { formatter: 'μ' } }],
            lineStyle: { color: '#722ed1', type: 'solid', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
      ],
    };
  }, [metrics, allData, usl, lsl, title, chartSettings]);

  // Boxplot Option (箱线图)
  const boxplotOption: EChartsOption = useMemo(() => {
    if (rawData.length === 0) return {};

    // 准备箱线图数据 - 计算每组的五数概括和离群点
    const boxData: number[][] = [];
    const outliers: any[] = [];
    const categories: string[] = [];

    rawData.forEach((row, index) => {
      const values = [...row.values].sort((a, b) => a - b);
      const n = values.length;

      // 计算五数概括：最小值、Q1、中位数、Q3、最大值
      const q1 = values[Math.floor(n * 0.25)];
      const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
      const q3 = values[Math.floor(n * 0.75)];
      const iqr = q3 - q1;

      // 计算离群点边界
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // 找出离群点和箱线图边界
      const inliers = values.filter(v => v >= lowerBound && v <= upperBound);
      const outliersInGroup = values.filter(v => v < lowerBound || v > upperBound);

      const min = inliers.length > 0 ? inliers[0] : values[0];
      const max = inliers.length > 0 ? inliers[inliers.length - 1] : values[n - 1];

      boxData.push([min, q1, median, q3, max]);
      categories.push(`${row.groupNo || index + 1}`);

      // 记录离群点
      outliersInGroup.forEach(outlier => {
        outliers.push([index, outlier]);
      });
    });

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold' },
        top: 5,
      },
      tooltip: {
        trigger: 'item',
        textStyle: { fontSize: chartSettings.fontSize - 2 },
        formatter: (params: any) => {
          if (params.seriesType === 'boxplot') {
            const data = params.data;
            return `组${params.name}<br/>
              最大值: ${data[4] !== undefined ? data[4].toFixed(2) : 'N/A'}<br/>
              Q3 (75%): ${data[3] !== undefined ? data[3].toFixed(2) : 'N/A'}<br/>
              中位数: ${data[2] !== undefined ? data[2].toFixed(2) : 'N/A'}<br/>
              Q1 (25%): ${data[1] !== undefined ? data[1].toFixed(2) : 'N/A'}<br/>
              最小值: ${data[0] !== undefined ? data[0].toFixed(2) : 'N/A'}`;
          } else if (params.seriesType === 'scatter') {
            return `组${params.name}<br/>离群点: ${params.value[1] !== undefined ? params.value[1].toFixed(2) : 'N/A'}`;
          }
          return '';
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '60px',
        top: '70px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        name: '组号',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 2,
          interval: Math.floor(categories.length / 20) || 0, // 自动调整标签间隔
          rotate: 0,
          margin: 15,
        },
        boundaryGap: true,
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          formatter: (value: number) => value.toFixed(2),
        },
        min: chartSettings.yAxisMin ?? undefined,
        max: chartSettings.yAxisMax ?? undefined,
        splitNumber: 6,
      },
      series: [
        {
          name: '箱线图',
          type: 'boxplot',
          data: boxData,
          boxWidth: ['30%', '80%'], // 箱体宽度自适应
          itemStyle: {
            color: '#7cb342', // 绿色填充
            borderColor: '#558b2f', // 深绿色边框
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              color: '#9ccc65', // 高亮时更亮的绿色
              borderColor: '#33691e',
              borderWidth: 2,
            }
          },
        },
        {
          name: '离群点',
          type: 'scatter',
          data: outliers,
          symbolSize: 6,
          itemStyle: {
            color: '#f5222d', // 红色离群点
            borderColor: '#cf1322',
            borderWidth: 1,
          },
        },
      ],
    };
  }, [rawData, title, chartSettings]);

  // Rainbow Chart Option (彩虹图 - 多条趋势线)
  const rainbowOption: EChartsOption = useMemo(() => {
    if (rawData.length === 0) return {};

    const maxValues = Math.max(...rawData.map(row => row.values.length));
    const seriesData: any[] = [];
    const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

    // 为每个测量值位置创建一条线
    for (let i = 0; i < maxValues; i++) {
      const data = rawData.map((row, index) => [index + 1, row.values[i] || null]);
      seriesData.push({
        name: `测量${i + 1}`,
        type: 'line',
        data: data,
        lineStyle: { width: chartSettings.lineWidth, color: colors[i % colors.length] },
        itemStyle: { color: colors[i % colors.length] },
        symbol: 'circle',
        symbolSize: 4,
      });
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold' },
        top: 5,
      },
      tooltip: {
        trigger: 'axis',
        textStyle: { fontSize: chartSettings.fontSize - 2 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let result = `组${params[0].axisValue}<br/>`;
          params.forEach((param: any) => {
            if (param.value[1] !== null && param.value[1] !== undefined) {
              result += `${param.marker}${param.seriesName}: ${param.value[1].toFixed(2)}<br/>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: Array.from({ length: maxValues }, (_, i) => `测量${i + 1}`),
        top: 35,
        textStyle: { fontSize: chartSettings.fontSize - 3 },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '60px',
        top: '70px',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '组号',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 2,
        },
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          formatter: (value: number) => value.toFixed(2),
        },
        min: chartSettings.yAxisMin ?? undefined,
        max: chartSettings.yAxisMax ?? undefined,
        splitNumber: 6,
      },
      series: seriesData,
    };
  }, [rawData, title, chartSettings]);

  // Scatter Chart Option (散点图)
  const scatterOption: EChartsOption = useMemo(() => {
    if (allData.length === 0) return {};

    // 计算趋势线（线性回归）
    const n = allData.length;
    const xValues = Array.from({ length: n }, (_, i) => i + 1);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = allData.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * allData[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trendLineData = xValues.map(x => [x, slope * x + intercept]);

    // 准备散点数据
    const scatterData = allData.map((value, index) => [index + 1, value]);

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: chartSettings.fontSize, fontWeight: 'bold' },
        top: 5,
      },
      tooltip: {
        trigger: 'item',
        textStyle: { fontSize: chartSettings.fontSize - 2 },
        formatter: (params: any) => {
          if (params.seriesName === '数据点') {
            return `序号: ${params.data[0]}<br/>测量值: ${params.data[1] !== undefined ? params.data[1].toFixed(3) : 'N/A'}`;
          }
          return `${params.seriesName}: ${params.data[1] !== undefined ? params.data[1].toFixed(3) : 'N/A'}`;
        },
      },
      legend: {
        data: ['数据点', '趋势线', '规格上限', '规格下限', '均值'],
        top: 35,
        textStyle: { fontSize: chartSettings.fontSize - 3 },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '60px',
        top: '70px',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '数据序号',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 2,
        },
        min: 0,
        max: n + 1,
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: chartSettings.fontSize - 3 },
        axisLabel: {
          fontSize: chartSettings.fontSize - 4,
          formatter: (value: number) => value.toFixed(2),
        },
        min: chartSettings.yAxisMin ?? undefined,
        max: chartSettings.yAxisMax ?? undefined,
        splitNumber: 6,
      },
      series: [
        {
          name: '数据点',
          type: 'scatter',
          data: scatterData,
          itemStyle: { color: chartSettings.dataLineColor },
          symbolSize: 6,
          symbol: 'circle',
        },
        {
          name: '趋势线',
          type: 'line',
          data: trendLineData,
          lineStyle: { color: '#722ed1', width: chartSettings.lineWidth, type: 'solid' },
          symbol: 'none',
          smooth: false,
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            data: [{ yAxis: usl, label: { formatter: 'USL', position: 'end' } }],
            lineStyle: { color: chartSettings.uclColor, type: 'dashed', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            data: [{ yAxis: lsl, label: { formatter: 'LSL', position: 'end' } }],
            lineStyle: { color: chartSettings.lclColor, type: 'dashed', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            data: [{ yAxis: metrics?.mean || 0, label: { formatter: 'μ', position: 'end' } }],
            lineStyle: { color: chartSettings.clColor, type: 'solid', width: chartSettings.lineWidth * 0.75 },
            symbol: 'none',
          },
        },
      ],
    };
  }, [allData, usl, lsl, metrics, title, chartSettings]);

  // 异常规则描述
  const RULE_DESC: Record<number, string> = {
    1: '超出3σ控制限', 2: '连续9点在中心线同侧', 3: '连续6点单调递增/降',
    4: '连续14点交替上下', 5: '连续2/3点超出2σ', 6: '连续4/5点超出1σ',
    7: '连续15点在±1σ内', 8: '连续8点在±1σ外',
  };

  // 图表下方异常面板（仅 xbar 类型展示）
  const renderAnomalyPanel = () => {
    if (chartType !== 'xbar') return null;
    const xbarAnomalies = anomalies.filter(a => a.level === 'critical' || a.level === 'warning');
    if (xbarAnomalies.length === 0) return (
      <div style={{ padding: '5px 12px 6px', borderTop: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#52c41a', fontSize: 12 }}>✓ 过程受控，无异常点</span>
        <span style={{ color: '#bbb', fontSize: 11 }}>更新: {new Date().toLocaleString('zh-CN', { hour12: false })}</span>
      </div>
    );
    const groups: Record<number, number[]> = {};
    xbarAnomalies.forEach(a => { if (!groups[a.rule]) groups[a.rule] = []; groups[a.rule].push(a.index + 1); });
    const ooc = (xbarAnomalies.length / Math.max(xBarData.length, 1) * 100).toFixed(4);
    return (
      <div style={{ padding: '5px 12px 8px', borderTop: '2px solid #fff1f0', background: '#fff8f8' }}>
        {Object.entries(groups).map(([rule, idxs]) => (
          <div key={rule} style={{ color: '#cf1322', fontSize: 12, marginBottom: 2, display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 14 }}>•</span>
            <span>{idxs.length}个点{RULE_DESC[+rule] || `规则${rule}`}: <strong>{idxs.join(', ')}</strong></span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#cf1322', fontSize: 12, fontWeight: 500 }}>OOC: {xbarAnomalies.length}/{xBarData.length}={ooc}%</span>
          <span style={{ color: '#bbb', fontSize: 11 }}>更新: {new Date().toLocaleString('zh-CN', { hour12: false })}</span>
        </div>
      </div>
    );
  };

  let option: EChartsOption = {};
  if (chartType === 'xbar') {
    option = xBarChartOption;
  } else if (chartType === 'r') {
    option = rChartOption;
  } else if (chartType === 'histogram') {
    option = histogramOption;
  } else if (chartType === 'boxplot') {
    option = boxplotOption;
  } else if (chartType === 'rainbow') {
    option = rainbowOption;
  } else if (chartType === 'scatter') {
    option = scatterOption;
  }

  return (
    <>
      <Card
        title={title}
        extra={
          <Space>
            <Button type="text" icon={<FullscreenOutlined />} size="small" onClick={() => setFullscreen(true)} />
            <Button type="text" icon={<SettingOutlined />} size="small" onClick={() => setSettingsOpen(true)} />
            <Button type="text" icon={<DownloadOutlined />} size="small" onClick={handleDownload} />
          </Space>
        }
        style={{ minHeight: '400px' }}
        bodyStyle={{ padding: 0 }}
      >
        {Object.keys(option).length > 0 ? (
          <>
            <div style={{ padding: '4px 8px 0' }}>
              <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '320px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            {renderAnomalyPanel()}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '340px', color: '#999' }}>
            暂无数据
          </div>
        )}
      </Card>

      <Modal
        title={title}
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={
          <Space>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载图表
            </Button>
            <Button onClick={() => setFullscreen(false)}>
              关闭
            </Button>
          </Space>
        }
        width="90%"
        style={{ top: 20 }}
      >
        <ReactECharts option={option} style={{ height: '70vh' }} />
      </Modal>

      {/* 图表设置抽屉 */}
      <Drawer
        title="图表设置"
        placement="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        width={360}
      >
        <Form layout="vertical">
          <Divider>字体设置</Divider>

          <Form.Item label="字体大小">
            <Slider
              min={10}
              max={24}
              value={chartSettings.fontSize}
              onChange={(value) => setChartSettings({ ...chartSettings, fontSize: value })}
              marks={{ 10: '10', 14: '14', 18: '18', 24: '24' }}
            />
          </Form.Item>

          <Form.Item label="线条宽度">
            <Slider
              min={1}
              max={5}
              step={0.5}
              value={chartSettings.lineWidth}
              onChange={(value) => setChartSettings({ ...chartSettings, lineWidth: value })}
              marks={{ 1: '1', 2: '2', 3: '3', 5: '5' }}
            />
          </Form.Item>

          <Divider>颜色设置</Divider>

          <Form.Item label="数据曲线颜色">
            <ColorPicker
              value={chartSettings.dataLineColor}
              onChange={(_, hex) => setChartSettings({ ...chartSettings, dataLineColor: hex })}
              showText
            />
          </Form.Item>

          <Form.Item label="上限UCL颜色">
            <ColorPicker
              value={chartSettings.uclColor}
              onChange={(_, hex) => setChartSettings({ ...chartSettings, uclColor: hex })}
              showText
            />
          </Form.Item>

          <Form.Item label="中心线CL颜色">
            <ColorPicker
              value={chartSettings.clColor}
              onChange={(_, hex) => setChartSettings({ ...chartSettings, clColor: hex })}
              showText
            />
          </Form.Item>

          <Form.Item label="下限LCL颜色">
            <ColorPicker
              value={chartSettings.lclColor}
              onChange={(_, hex) => setChartSettings({ ...chartSettings, lclColor: hex })}
              showText
            />
          </Form.Item>

          <Form.Item label="异常点颜色">
            <ColorPicker
              value={chartSettings.anomalyColor}
              onChange={(_, hex) => setChartSettings({ ...chartSettings, anomalyColor: hex })}
              showText
            />
          </Form.Item>

          <Divider>Y轴范围</Divider>

          <Form.Item label="Y轴最小值（留空自动）">
            <InputNumber
              style={{ width: '100%' }}
              value={chartSettings.yAxisMin ?? undefined}
              onChange={(value) => setChartSettings({ ...chartSettings, yAxisMin: value })}
              placeholder="自动"
            />
          </Form.Item>

          <Form.Item label="Y轴最大值（留空自动）">
            <InputNumber
              style={{ width: '100%' }}
              value={chartSettings.yAxisMax ?? undefined}
              onChange={(value) => setChartSettings({ ...chartSettings, yAxisMax: value })}
              placeholder="自动"
            />
          </Form.Item>

          <Form.Item>
            <Button
              block
              type="default"
              onClick={applyAutoRange}
            >
              📊 趋势图自适应居中
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              block
              onClick={() => {
                message.success('设置已应用');
                setSettingsOpen(false);
              }}
            >
              应用设置
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              block
              onClick={() => {
                setChartSettings({
                  fontSize: 14,
                  lineWidth: 2,
                  dataLineColor: '#1a3a8a',
                  uclColor: '#f5222d',
                  clColor: '#00bcd4',
                  lclColor: '#f5222d',
                  anomalyColor: '#f5222d',
                  yAxisMin: null,
                  yAxisMax: null,
                });
                message.info('已恢复默认设置');
              }}
            >
              恢复默认
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default ChartCard;
