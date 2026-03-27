import React, { useMemo, useState } from 'react';
import { Tabs, Empty, Modal, Button, Space, Select } from 'antd';
import { FullscreenOutlined, FontSizeOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ControlLimits, IMRLimits, AnomalyResult, ProcessMetrics } from '../../types';
import { normalPDF } from '../../utils/spcCalculator';

const { TabPane } = Tabs;

interface ChartsPanelProps {
  xBarData: number[];
  rData: number[];
  groupNumbers: number[];
  controlLimits: ControlLimits | IMRLimits | null;
  anomalies: AnomalyResult[];
  metrics: ProcessMetrics | null;
  allData: number[];
  usl: number;
  lsl: number;
  chartType: 'xbar-r' | 'i-mr';
}

// 异常规则描述
const RULE_DESCRIPTIONS: Record<number, string> = {
  1: '超出3σ控制限',
  2: '连续9点在中心线同侧',
  3: '连续6点持续上升或下降',
  4: '连续14点交替上下',
  5: '连续2/3点超出2σ区域',
  6: '连续4/5点超出1σ区域',
  7: '连续15点在±1σ内',
  8: '连续8点在±1σ外',
};

// 异常标注区块（图表下方）
const AnomalyPanel: React.FC<{
  anomalies: AnomalyResult[];
  total: number;
  updateTime: string;
}> = ({ anomalies, total, updateTime }) => {
  if (anomalies.length === 0) {
    return (
      <div style={{
        padding: '8px 20px 10px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#52c41a', fontSize: 13 }}>✓ 过程受控，无异常点</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>最后更新时间: {updateTime}</span>
      </div>
    );
  }

  // 按规则分组
  const ruleGroups: Record<number, { description: string; indices: number[] }> = {};
  anomalies.forEach(a => {
    if (!ruleGroups[a.rule]) {
      ruleGroups[a.rule] = {
        description: RULE_DESCRIPTIONS[a.rule] || a.description,
        indices: [],
      };
    }
    ruleGroups[a.rule].indices.push(a.index + 1);
  });

  const oocPct = total > 0 ? (anomalies.length / total * 100).toFixed(4) : '0.0000';

  return (
    <div style={{
      padding: '8px 20px 12px',
      borderTop: '2px solid #fff1f0',
      background: '#fff8f8',
    }}>
      {Object.entries(ruleGroups).map(([rule, { description, indices }]) => (
        <div key={rule} style={{ color: '#cf1322', fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>•</span>
          <span>
            {indices.length}个点{description}: <strong>{indices.join(', ')}</strong>
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ color: '#cf1322', fontSize: 13, fontWeight: 500 }}>
          OOC: {anomalies.length}/{total}={oocPct}%
        </span>
        <span style={{ color: '#aaa', fontSize: 12 }}>最后更新时间: {updateTime}</span>
      </div>
    </div>
  );
};

const ChartsPanel: React.FC<ChartsPanelProps> = ({
  xBarData,
  rData,
  groupNumbers,
  controlLimits,
  anomalies,
  metrics,
  allData,
  usl,
  lsl,
  chartType,
}) => {
  const [fullscreenChart, setFullscreenChart] = useState<'xbar' | 'r' | 'histogram' | 'scatter' | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const fontSizeMap = {
    small: { title: 14, legend: 11, axis: 10, axisName: 11, tooltip: 11 },
    medium: { title: 16, legend: 13, axis: 12, axisName: 13, tooltip: 13 },
    large: { title: 18, legend: 15, axis: 14, axisName: 15, tooltip: 15 },
  };

  const currentFontSize = fontSizeMap[fontSize];
  const updateTime = new Date().toLocaleString('zh-CN', { hour12: false });

  // X-bar (or Individual) Chart Option
  const xBarChartOption: EChartsOption = useMemo(() => {
    if (!controlLimits || xBarData.length === 0) return {};

    const limits = 'xBar' in controlLimits ? controlLimits.xBar : controlLimits.individual;
    const { center, ucl, lcl } = limits;

    // 异常点：大红圆点
    const anomalyPoints = anomalies
      .filter(a => a.level === 'critical' || a.level === 'warning')
      .map(a => [a.index, a.value]);

    const seriesName = chartType === 'xbar-r' ? '均值' : '单值';
    const centerLabel = chartType === 'xbar-r' ? `X̄=${center.toFixed(4)}` : `X̄=${center.toFixed(4)}`;

    return {
      title: {
        text: chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)',
        left: 'center',
        top: 10,
        textStyle: { fontSize: currentFontSize.title, fontWeight: 'bold', color: '#333' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: currentFontSize.tooltip, color: '#333' },
        formatter: (params: any) => {
          const idx = params[0]?.axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:4px">序号 ${idx}</div>`;
          params.forEach((param: any) => {
            if (param.seriesName === '异常点' && param.data) {
              const anomaly = anomalies.find(a => a.index === param.data[0]);
              result += `${param.marker} <span style="color:#f5222d;font-weight:bold">异常: ${param.data[1].toFixed(4)}</span><br/>`;
              if (anomaly) {
                result += `<span style="color:#f5222d;font-size:11px">规则${anomaly.rule}: ${anomaly.description}</span><br/>`;
              }
            } else if (param.seriesName === seriesName && param.value !== null && param.value !== undefined) {
              result += `${param.marker} ${param.seriesName}: <strong>${(param.value as number).toFixed(4)}</strong><br/>`;
            }
          });
          return result;
        },
      },
      legend: { show: false },
      grid: {
        left: 60,
        right: 130,
        bottom: 40,
        top: 50,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: groupNumbers,
        name: '序号',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: currentFontSize.axisName, color: '#666' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666' },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: chartType === 'xbar-r' ? '均值' : '单值',
        nameTextStyle: { fontSize: currentFontSize.axisName, fontWeight: 'bold', color: '#555' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666', formatter: (v: number) => v.toFixed(2) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          data: xBarData,
          itemStyle: { color: '#1a3a8a' },
          lineStyle: { width: 2, color: '#1a3a8a' },
          symbol: 'circle',
          symbolSize: 7,
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            animation: false,
            data: [
              {
                yAxis: ucl,
                lineStyle: { type: 'dashed' as const, color: '#f5222d', width: 1.5 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: `UCL=${ucl.toFixed(4)}`,
                  color: '#f5222d',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
              {
                yAxis: center,
                lineStyle: { type: 'solid' as const, color: '#00bcd4', width: 2 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: centerLabel,
                  color: '#00868a',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
              {
                yAxis: lcl,
                lineStyle: { type: 'dashed' as const, color: '#f5222d', width: 1.5 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: `LCL=${lcl.toFixed(4)}`,
                  color: '#f5222d',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
            ],
          },
        },
        {
          name: '异常点',
          type: 'scatter',
          data: anomalyPoints,
          itemStyle: { color: '#f5222d' },
          symbolSize: 12,
          symbol: 'circle',
          z: 10,
        },
      ],
    };
  }, [xBarData, controlLimits, anomalies, groupNumbers, chartType, currentFontSize]);

  // R (or MR) Chart Option
  const rChartOption: EChartsOption = useMemo(() => {
    if (!controlLimits || rData.length === 0) return {};

    const limits = 'r' in controlLimits ? controlLimits.r : controlLimits.movingRange;
    const { center, ucl, lcl } = limits;

    const seriesName = chartType === 'xbar-r' ? '极差' : '移动极差';
    const centerLabel = chartType === 'xbar-r' ? `R̄=${center.toFixed(4)}` : `MR̄=${center.toFixed(4)}`;

    return {
      title: {
        text: chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)',
        left: 'center',
        top: 10,
        textStyle: { fontSize: currentFontSize.title, fontWeight: 'bold', color: '#333' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: currentFontSize.tooltip, color: '#333' },
        formatter: (params: any) => {
          const idx = params[0]?.axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:4px">序号 ${idx}</div>`;
          params.forEach((param: any) => {
            if (param.value !== null && param.value !== undefined && param.seriesName === seriesName) {
              result += `${param.marker} ${param.seriesName}: <strong>${(param.value as number).toFixed(4)}</strong><br/>`;
            }
          });
          return result;
        },
      },
      legend: { show: false },
      grid: {
        left: 60,
        right: 130,
        bottom: 40,
        top: 50,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: chartType === 'xbar-r' ? groupNumbers : groupNumbers.slice(1),
        name: '序号',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: currentFontSize.axisName, color: '#666' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666' },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: seriesName,
        min: 0,
        nameTextStyle: { fontSize: currentFontSize.axisName, fontWeight: 'bold', color: '#555' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666', formatter: (v: number) => v.toFixed(2) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          data: rData,
          itemStyle: { color: '#1a3a8a' },
          lineStyle: { width: 2, color: '#1a3a8a' },
          symbol: 'circle',
          symbolSize: 7,
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            animation: false,
            data: [
              {
                yAxis: ucl,
                lineStyle: { type: 'dashed' as const, color: '#f5222d', width: 1.5 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: `UCL=${ucl.toFixed(4)}`,
                  color: '#f5222d',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
              {
                yAxis: center,
                lineStyle: { type: 'solid' as const, color: '#00bcd4', width: 2 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: centerLabel,
                  color: '#00868a',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
              {
                yAxis: lcl,
                lineStyle: { type: 'dashed' as const, color: '#f5222d', width: 1.5 },
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: `LCL=${lcl.toFixed(4)}`,
                  color: '#f5222d',
                  fontSize: currentFontSize.axis,
                  backgroundColor: '#fff',
                  padding: [2, 4],
                },
              },
            ],
          },
        },
      ],
    };
  }, [rData, controlLimits, groupNumbers, chartType, currentFontSize]);

  // Histogram with Normal Curve
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
        text: '过程能力分布直方图',
        left: 'center',
        top: 10,
        textStyle: { fontSize: currentFontSize.title, fontWeight: 'bold', color: '#333' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: currentFontSize.tooltip },
      },
      legend: {
        data: ['频数', '正态分布'],
        top: 40,
        textStyle: { fontSize: currentFontSize.legend },
        itemGap: 20,
      },
      grid: { left: 60, right: 80, bottom: 40, top: 80, containLabel: false },
      xAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: currentFontSize.axisName, color: '#666' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666', formatter: (v: number) => v.toFixed(2) },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: '频数',
        nameTextStyle: { fontSize: currentFontSize.axisName, color: '#666' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: '频数',
          type: 'bar',
          data: bins.map((bin, index) => [bin, frequencies[index]]),
          itemStyle: { color: '#4a90d9', opacity: 0.75, borderColor: '#2671b5', borderWidth: 0.5 },
          barWidth: '90%',
        },
        {
          name: '正态分布',
          type: 'line',
          data: bins.map((bin, index) => [bin, normalCurve[index]]),
          smooth: true,
          lineStyle: { color: '#f5a623', width: 2.5 },
          symbol: 'none',
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ xAxis: usl }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            label: { formatter: `USL=${usl.toFixed(4)}`, color: '#f5222d', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ xAxis: lsl }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            label: { formatter: `LSL=${lsl.toFixed(4)}`, color: '#f5222d', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ xAxis: metrics.mean }],
            lineStyle: { color: '#722ed1', type: 'solid', width: 2 },
            label: { formatter: `μ=${metrics.mean.toFixed(4)}`, color: '#722ed1', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
      ],
    };
  }, [metrics, allData, usl, lsl, currentFontSize]);

  // Scatter Chart Option
  const scatterChartOption: EChartsOption = useMemo(() => {
    if (allData.length === 0) return {};

    const n = allData.length;
    const xValues = Array.from({ length: n }, (_, i) => i + 1);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = allData.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * allData[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const trendLineData = xValues.map(x => [x, slope * x + intercept]);
    const scatterData = allData.map((value, index) => [index + 1, value]);

    return {
      title: {
        text: '数据散点图（含趋势线）',
        left: 'center',
        top: 10,
        textStyle: { fontSize: currentFontSize.title, fontWeight: 'bold', color: '#333' },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: { fontSize: currentFontSize.tooltip },
        formatter: (params: any) => {
          if (params.seriesName === '数据点') {
            return `序号: ${params.data[0]}<br/>测量值: <strong>${params.data[1].toFixed(4)}</strong>`;
          }
          return `${params.seriesName}: ${params.data[1].toFixed(4)}`;
        },
      },
      legend: {
        data: ['数据点', '趋势线'],
        top: 40,
        textStyle: { fontSize: currentFontSize.legend },
        itemGap: 20,
      },
      grid: { left: 60, right: 80, bottom: 40, top: 80, containLabel: false },
      xAxis: {
        type: 'value',
        name: '数据序号',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: currentFontSize.axisName, color: '#666' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666' },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
        min: 0,
        max: n + 1,
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { fontSize: currentFontSize.axisName, fontWeight: 'bold', color: '#555' },
        axisLabel: { fontSize: currentFontSize.axis, color: '#666', formatter: (v: number) => v.toFixed(2) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      },
      series: [
        {
          name: '数据点',
          type: 'scatter',
          data: scatterData,
          itemStyle: { color: '#1a3a8a' },
          symbolSize: 7,
          symbol: 'circle',
        },
        {
          name: '趋势线',
          type: 'line',
          data: trendLineData,
          lineStyle: { color: '#f5a623', width: 2, type: 'solid' },
          symbol: 'none',
          smooth: false,
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ yAxis: usl }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            label: { formatter: `USL=${usl.toFixed(4)}`, color: '#f5222d', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ yAxis: lsl }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            label: { formatter: `LSL=${lsl.toFixed(4)}`, color: '#f5222d', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            data: [{ yAxis: metrics?.mean || 0 }],
            lineStyle: { color: '#00bcd4', type: 'solid', width: 2 },
            label: { formatter: `μ=${(metrics?.mean || 0).toFixed(4)}`, color: '#00868a', fontSize: currentFontSize.axis, position: 'end' },
          },
        },
      ],
    };
  }, [allData, usl, lsl, metrics, currentFontSize]);

  if (xBarData.length === 0) {
    return (
      <div style={{ background: '#fff', padding: 24, textAlign: 'center', minHeight: 500 }}>
        <Empty description="暂无数据，请上传数据并配置参数" />
      </div>
    );
  }

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 4 }}>
        {/* 工具栏 */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: '#fafafa',
        }}>
          <Space>
            <FontSizeOutlined style={{ color: '#888' }} />
            <span style={{ color: '#666', fontSize: 13 }}>字体：</span>
            <Select
              value={fontSize}
              onChange={setFontSize}
              size="small"
              style={{ width: 80 }}
              options={[
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ]}
            />
          </Space>
        </div>

        <Tabs defaultActiveKey="1" size="large" style={{ padding: '0 4px' }}>
          {/* 均值/单值图 */}
          <TabPane tab={chartType === 'xbar-r' ? '均值图 (X-bar)' : '单值图 (I)'} key="1">
            <div style={{ position: 'relative', paddingTop: 12 }}>
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={() => setFullscreenChart('xbar')}
                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
              >
                放大
              </Button>
              <ReactECharts option={xBarChartOption} style={{ height: 520 }} />
            </div>
            <AnomalyPanel anomalies={anomalies} total={xBarData.length} updateTime={updateTime} />
          </TabPane>

          {/* 极差/移动极差图 */}
          <TabPane tab={chartType === 'xbar-r' ? '极差图 (R)' : '移动极差图 (MR)'} key="2">
            <div style={{ position: 'relative', paddingTop: 12 }}>
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={() => setFullscreenChart('r')}
                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
              >
                放大
              </Button>
              <ReactECharts option={rChartOption} style={{ height: 520 }} />
            </div>
            <AnomalyPanel anomalies={[]} total={rData.length} updateTime={updateTime} />
          </TabPane>

          {/* 直方图 */}
          <TabPane tab="过程能力分析" key="3">
            <div style={{ position: 'relative', paddingTop: 12 }}>
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={() => setFullscreenChart('histogram')}
                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
              >
                放大
              </Button>
              <ReactECharts option={histogramOption} style={{ height: 520 }} />
            </div>
          </TabPane>

          {/* 散点图 */}
          <TabPane tab="散点图" key="4">
            <div style={{ position: 'relative', paddingTop: 12 }}>
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={() => setFullscreenChart('scatter')}
                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
              >
                放大
              </Button>
              <ReactECharts option={scatterChartOption} style={{ height: 520 }} />
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* 全屏 Modal - 均值/单值图 */}
      <Modal
        title={chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)'}
        open={fullscreenChart === 'xbar'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="92%"
        style={{ top: 20 }}
      >
        <ReactECharts option={xBarChartOption} style={{ height: '70vh' }} />
        <AnomalyPanel anomalies={anomalies} total={xBarData.length} updateTime={updateTime} />
      </Modal>

      {/* 全屏 Modal - 极差/移动极差图 */}
      <Modal
        title={chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)'}
        open={fullscreenChart === 'r'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="92%"
        style={{ top: 20 }}
      >
        <ReactECharts option={rChartOption} style={{ height: '70vh' }} />
        <AnomalyPanel anomalies={[]} total={rData.length} updateTime={updateTime} />
      </Modal>

      {/* 全屏 Modal - 直方图 */}
      <Modal
        title="过程能力分布直方图"
        open={fullscreenChart === 'histogram'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="92%"
        style={{ top: 20 }}
      >
        <ReactECharts option={histogramOption} style={{ height: '70vh' }} />
      </Modal>

      {/* 全屏 Modal - 散点图 */}
      <Modal
        title="数据散点图（含趋势线）"
        open={fullscreenChart === 'scatter'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="92%"
        style={{ top: 20 }}
      >
        <ReactECharts option={scatterChartOption} style={{ height: '70vh' }} />
      </Modal>
    </>
  );
};

export default ChartsPanel;
