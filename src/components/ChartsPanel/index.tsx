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
    small: { title: 16, legend: 12, axis: 11, axisName: 12, tooltip: 12 },
    medium: { title: 18, legend: 14, axis: 13, axisName: 14, tooltip: 14 },
    large: { title: 20, legend: 16, axis: 15, axisName: 16, tooltip: 16 },
  };

  const currentFontSize = fontSizeMap[fontSize];

  // X-bar (or Individual) Chart Option
  const xBarChartOption: EChartsOption = useMemo(() => {
    if (!controlLimits || xBarData.length === 0) return {};

    const limits = 'xBar' in controlLimits ? controlLimits.xBar : controlLimits.individual;
    const { center, ucl, lcl } = limits;

    // Prepare anomaly points
    const anomalyPoints = anomalies
      .filter(a => a.level === 'critical' || a.level === 'warning')
      .map(a => [a.index, a.value]);

    return {
      title: {
        text: chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)',
        left: 'center',
        textStyle: {
          fontSize: currentFontSize.title,
          fontWeight: 'bold',
        },
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontSize: currentFontSize.tooltip,
        },
        formatter: (params: any) => {
          let result = `组号 ${params[0].axisValue}<br/>`;
          params.forEach((param: any) => {
            if (param.seriesName === '异常点' && param.data) {
              const anomaly = anomalies.find(a => a.index === param.data[0]);
              result += `${param.marker} ${param.seriesName}: ${param.data[1].toFixed(3)}<br/>`;
              if (anomaly) {
                result += `<span style="color: #999">规则${anomaly.rule}: ${anomaly.description}</span><br/>`;
              }
            } else if (param.value !== null) {
              result += `${param.marker} ${param.seriesName}: ${typeof param.value === 'number' ? param.value.toFixed(3) : param.value}<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: [chartType === 'xbar-r' ? '均值' : '单值', '上限UCL', '中心线', '下限LCL', '异常点'],
        top: 45,
        textStyle: {
          fontSize: currentFontSize.legend,
        },
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '100px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: groupNumbers,
        name: '组号',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      series: [
        {
          name: chartType === 'xbar-r' ? '均值' : '单值',
          type: 'line',
          data: xBarData,
          itemStyle: { color: '#1890ff' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '上限UCL',
          type: 'line',
          data: Array(xBarData.length).fill(ucl),
          lineStyle: { type: 'dashed', color: '#f5222d', width: 2 },
          symbol: 'none',
        },
        {
          name: '中心线',
          type: 'line',
          data: Array(xBarData.length).fill(center),
          lineStyle: { type: 'solid', color: '#52c41a', width: 2 },
          symbol: 'none',
        },
        {
          name: '下限LCL',
          type: 'line',
          data: Array(xBarData.length).fill(lcl),
          lineStyle: { type: 'dashed', color: '#f5222d', width: 2 },
          symbol: 'none',
        },
        {
          name: '异常点',
          type: 'scatter',
          data: anomalyPoints,
          itemStyle: { color: '#ff4d4f' },
          symbolSize: 10,
          symbol: 'diamond',
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

    return {
      title: {
        text: chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)',
        left: 'center',
        textStyle: {
          fontSize: currentFontSize.title,
          fontWeight: 'bold',
        },
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontSize: currentFontSize.tooltip,
        },
        formatter: (params: any) => {
          let result = `组号 ${params[0].axisValue}<br/>`;
          params.forEach((param: any) => {
            if (param.value !== null) {
              result += `${param.marker} ${param.seriesName}: ${typeof param.value === 'number' ? param.value.toFixed(3) : param.value}<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: [chartType === 'xbar-r' ? '极差' : '移动极差', '上限UCL', '中心线', '下限LCL'],
        top: 45,
        textStyle: {
          fontSize: currentFontSize.legend,
        },
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '100px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartType === 'xbar-r' ? groupNumbers : groupNumbers.slice(1),
        name: '组号',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      yAxis: {
        type: 'value',
        name: chartType === 'xbar-r' ? '极差' : '移动极差',
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      series: [
        {
          name: chartType === 'xbar-r' ? '极差' : '移动极差',
          type: 'line',
          data: rData,
          itemStyle: { color: '#722ed1' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '上限UCL',
          type: 'line',
          data: Array(rData.length).fill(ucl),
          lineStyle: { type: 'dashed', color: '#f5222d', width: 2 },
          symbol: 'none',
        },
        {
          name: '中心线',
          type: 'line',
          data: Array(rData.length).fill(center),
          lineStyle: { type: 'solid', color: '#52c41a', width: 2 },
          symbol: 'none',
        },
        {
          name: '下限LCL',
          type: 'line',
          data: Array(rData.length).fill(lcl),
          lineStyle: { type: 'dashed', color: '#f5222d', width: 2 },
          symbol: 'none',
        },
      ],
    };
  }, [rData, controlLimits, groupNumbers, chartType, currentFontSize]);

  // Histogram with Normal Curve
  const histogramOption: EChartsOption = useMemo(() => {
    if (!metrics || allData.length === 0) return {};

    // Calculate histogram bins
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

    // Generate normal distribution curve
    const normalCurve: number[] = bins.map(x => {
      const density = normalPDF(x, metrics.mean, metrics.stdDev);
      return density * allData.length * binWidth; // Scale to match histogram
    });

    return {
      title: {
        text: '过程能力分布直方图',
        left: 'center',
        textStyle: {
          fontSize: currentFontSize.title,
          fontWeight: 'bold',
        },
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: {
          fontSize: currentFontSize.tooltip,
        },
      },
      legend: {
        data: ['频数', '正态分布', '规格上限', '规格下限', '均值'],
        top: 45,
        textStyle: {
          fontSize: currentFontSize.legend,
        },
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '100px',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      yAxis: {
        type: 'value',
        name: '频数',
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      series: [
        {
          name: '频数',
          type: 'bar',
          data: bins.map((bin, index) => [bin, frequencies[index]]),
          itemStyle: { color: '#1890ff', opacity: 0.7 },
          barWidth: '80%',
        },
        {
          name: '正态分布',
          type: 'line',
          data: bins.map((bin, index) => [bin, normalCurve[index]]),
          smooth: true,
          lineStyle: { color: '#52c41a', width: 3 },
          symbol: 'none',
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            data: [{ xAxis: usl, label: { formatter: 'USL' } }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            symbol: 'none',
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            data: [{ xAxis: lsl, label: { formatter: 'LSL' } }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            symbol: 'none',
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            data: [{ xAxis: metrics.mean, label: { formatter: 'μ' } }],
            lineStyle: { color: '#722ed1', type: 'solid', width: 2 },
            symbol: 'none',
          },
        },
      ],
    };
  }, [metrics, allData, usl, lsl, currentFontSize]);

  // Scatter Chart Option - 散点图
  const scatterChartOption: EChartsOption = useMemo(() => {
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
        text: '散点图分析',
        left: 'center',
        textStyle: {
          fontSize: currentFontSize.title,
          fontWeight: 'bold',
        },
        top: 10,
      },
      tooltip: {
        trigger: 'item',
        textStyle: {
          fontSize: currentFontSize.tooltip,
        },
        formatter: (params: any) => {
          if (params.seriesName === '数据点') {
            return `序号: ${params.data[0]}<br/>测量值: ${params.data[1].toFixed(3)}`;
          }
          return `${params.seriesName}: ${params.data[1].toFixed(3)}`;
        },
      },
      legend: {
        data: ['数据点', '趋势线', '规格上限', '规格下限', '均值'],
        top: 45,
        textStyle: {
          fontSize: currentFontSize.legend,
        },
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '100px',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '数据序号',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
        min: 0,
        max: n + 1,
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: {
          fontSize: currentFontSize.axisName,
          fontWeight: 'bold',
        },
        axisLabel: {
          fontSize: currentFontSize.axis,
        },
      },
      series: [
        {
          name: '数据点',
          type: 'scatter',
          data: scatterData,
          itemStyle: { color: '#1890ff' },
          symbolSize: 8,
          symbol: 'circle',
        },
        {
          name: '趋势线',
          type: 'line',
          data: trendLineData,
          lineStyle: { color: '#722ed1', width: 2, type: 'solid' },
          symbol: 'none',
          smooth: false,
        },
        {
          name: '规格上限',
          type: 'line',
          markLine: {
            data: [{ yAxis: usl, label: { formatter: 'USL', position: 'end' } }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            symbol: 'none',
          },
        },
        {
          name: '规格下限',
          type: 'line',
          markLine: {
            data: [{ yAxis: lsl, label: { formatter: 'LSL', position: 'end' } }],
            lineStyle: { color: '#f5222d', type: 'dashed', width: 2 },
            symbol: 'none',
          },
        },
        {
          name: '均值',
          type: 'line',
          markLine: {
            data: [{ yAxis: metrics?.mean || 0, label: { formatter: 'μ', position: 'end' } }],
            lineStyle: { color: '#52c41a', type: 'solid', width: 2 },
            symbol: 'none',
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
      <div style={{ background: '#fff' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Space>
            <FontSizeOutlined />
            <span>字体大小：</span>
            <Select
              value={fontSize}
              onChange={setFontSize}
              style={{ width: 100 }}
              options={[
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ]}
            />
          </Space>
        </div>
        <Tabs defaultActiveKey="1" size="large">
          <TabPane tab={chartType === 'xbar-r' ? '均值图' : '单值图'} key="1">
            <div style={{ position: 'relative', padding: '24px 0 0 0' }}>
              <Button
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreenChart('xbar')}
                style={{ position: 'absolute', right: 10, top: 10, zIndex: 10 }}
              >
                放大查看
              </Button>
              <ReactECharts option={xBarChartOption} style={{ height: '600px' }} />
            </div>
          </TabPane>
          <TabPane tab={chartType === 'xbar-r' ? '极差图' : '移动极差图'} key="2">
            <div style={{ position: 'relative', padding: '24px 0 0 0' }}>
              <Button
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreenChart('r')}
                style={{ position: 'absolute', right: 10, top: 10, zIndex: 10 }}
              >
                放大查看
              </Button>
              <ReactECharts option={rChartOption} style={{ height: '600px' }} />
            </div>
          </TabPane>
          <TabPane tab="过程能力分析" key="3">
            <div style={{ position: 'relative', padding: '24px 0 0 0' }}>
              <Button
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreenChart('histogram')}
                style={{ position: 'absolute', right: 10, top: 10, zIndex: 10 }}
              >
                放大查看
              </Button>
              <ReactECharts option={histogramOption} style={{ height: '600px' }} />
            </div>
          </TabPane>
          <TabPane tab="散点图" key="4">
            <div style={{ position: 'relative', padding: '24px 0 0 0' }}>
              <Button
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreenChart('scatter')}
                style={{ position: 'absolute', right: 10, top: 10, zIndex: 10 }}
              >
                放大查看
              </Button>
              <ReactECharts option={scatterChartOption} style={{ height: '600px' }} />
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* Fullscreen Modal for X-bar Chart */}
      <Modal
        title={chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)'}
        open={fullscreenChart === 'xbar'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <ReactECharts option={xBarChartOption} style={{ height: '70vh' }} />
      </Modal>

      {/* Fullscreen Modal for R Chart */}
      <Modal
        title={chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)'}
        open={fullscreenChart === 'r'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <ReactECharts option={rChartOption} style={{ height: '70vh' }} />
      </Modal>

      {/* Fullscreen Modal for Histogram */}
      <Modal
        title="过程能力分布直方图"
        open={fullscreenChart === 'histogram'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <ReactECharts option={histogramOption} style={{ height: '70vh' }} />
      </Modal>

      {/* Fullscreen Modal for Scatter Chart */}
      <Modal
        title="散点图分析"
        open={fullscreenChart === 'scatter'}
        onCancel={() => setFullscreenChart(null)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <ReactECharts option={scatterChartOption} style={{ height: '70vh' }} />
      </Modal>
    </>
  );
};

export default ChartsPanel;
