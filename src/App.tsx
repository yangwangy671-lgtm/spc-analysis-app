import { useState, useEffect, useMemo } from 'react';
import { Layout, Row, Col, Button, Space, message, Card } from 'antd';
import { GithubOutlined, UploadOutlined, FileExcelOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import SideNavigation from './components/SideNavigation';
import HorizontalParameterPanel from './components/ParameterPanel/HorizontalPanel';
import ConfigOverview from './components/ConfigOverview';
import ChartCard from './components/ChartCard';
import SPCRecommendation from './components/SPCRecommendation';
import DataImportDrawer from './components/DataImportDrawer';
import { exportProfessionalReport } from './utils/excelReportExporter';
import { calculateAllMetrics, calculateXbarRLimits, calculateIMRLimits, mean, range, shapiroWilkTest } from './utils/spcCalculator';
import { detectAllAnomalies } from './utils/anomalyDetector';
import type { RawDataRow, ProcessedDataRow, SPCParameters, ProcessMetrics, ControlLimits, IMRLimits, AnomalyResult } from './types';
import './App.css';

const { Header, Content, Sider } = Layout;

type ViewMode =
  | 'home'           // 首页仪表盘
  | 'summary'        // 摘要报告
  | 'data-import'    // 数据导入
  | 'param-config'   // 参数配置
  | 'control-chart'  // 控制图分析
  | 'capability'     // 过程能力分析
  | 'anomaly'        // 异常检测
  | 'xbar-r'         // X-bar & R 图
  | 'i-mr'           // I-MR 图
  | 'histogram'      // 直方图
  | 'realtime'       // 实时监控
  | 'alarm'          // 报警管理
  | 'cpk'            // CPK 计算
  | 'normality'      // 正态性检验
  | 'trend'          // 趋势分析
  | 'config'         // 配置总览
  | 'dashboard';     // 默认仪表盘

function App() {
  // State management
  const [rawData, setRawData] = useState<RawDataRow[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; rows: number } | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedDataRow[]>([]);
  const [parameters, setParameters] = useState<SPCParameters>({
    usl: 11.0,
    lsl: 9.5,
    target: 10.25,
    subgroupSize: 5,
    anomalyRules: [1, 2, 3, 4, 5, 6, 7, 8],
    chartType: 'xbar-r',
  });
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const [controlLimits, setControlLimits] = useState<ControlLimits | IMRLimits | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 菜单键值映射到视图模式
  const menuKeyToViewMode = (key: string): ViewMode => {
    const mapping: Record<string, ViewMode> = {
      'home': 'home',
      'summary': 'summary',
      'start-1': 'data-import',
      'start-2': 'param-config',
      'detection-1': 'control-chart',
      'detection-2': 'capability',
      'detection-3': 'anomaly',
      'dashboard-1': 'xbar-r',
      'dashboard-2': 'i-mr',
      'dashboard-3': 'histogram',
      'monitor-1': 'realtime',
      'monitor-2': 'alarm',
      'analysis-1': 'cpk',
      'analysis-2': 'normality',
      'analysis-3': 'trend',
      'data-1': 'data-import',
      'data-2': 'data-import',
      'data-3': 'data-import',
      'config': 'config',
      'config-1': 'config',
      'config-2': 'config',
    };
    return mapping[key] || 'dashboard';
  };

  // Process data when raw data or parameters change
  useEffect(() => {
    if (rawData.length === 0) {
      setProcessedData([]);
      setMetrics(null);
      setControlLimits(null);
      setAnomalies([]);
      return;
    }

    try {
      processData();
    } catch (error) {
      message.error(`数据处理错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [rawData, parameters]);

  const processData = () => {
    const { usl, lsl, subgroupSize, anomalyRules, chartType } = parameters;

    // Validate parameters
    if (usl <= lsl) {
      message.error('规格上限必须大于规格下限');
      return;
    }

    // Flatten all data for overall metrics
    const allValues = rawData.flatMap(row => row.values);

    if (allValues.length === 0) {
      return;
    }

    // Calculate overall metrics
    const calculatedMetrics = calculateAllMetrics(allValues, usl, lsl);

    // Add normality test
    try {
      calculatedMetrics.normalityPValue = shapiroWilkTest(allValues);
    } catch (error) {
      console.warn('Normality test failed:', error);
    }

    setMetrics(calculatedMetrics);

    // Calculate control limits based on chart type
    let limits: ControlLimits | IMRLimits;
    let xBarValues: number[];
    let rValues: number[];

    if (chartType === 'i-mr' || subgroupSize === 1) {
      // I-MR Chart
      const individualValues = rawData.map(row => row.values[0]);
      limits = calculateIMRLimits(individualValues);
      xBarValues = individualValues;

      // Calculate moving ranges
      rValues = [];
      for (let i = 1; i < individualValues.length; i++) {
        rValues.push(Math.abs(individualValues[i] - individualValues[i - 1]));
      }
    } else {
      // X-bar & R Chart
      // Group data into subgroups
      const subgroups: number[][] = [];

      if (rawData[0].values.length === subgroupSize) {
        // Data is already in subgroups
        subgroups.push(...rawData.map(row => row.values));
      } else if (rawData[0].values.length === 1) {
        // Single column data, group into subgroups
        for (let i = 0; i < rawData.length; i += subgroupSize) {
          const subgroup = rawData.slice(i, i + subgroupSize).map(row => row.values[0]);
          if (subgroup.length === subgroupSize) {
            subgroups.push(subgroup);
          }
        }
      } else {
        // Use first N values from each row
        subgroups.push(...rawData.map(row => row.values.slice(0, subgroupSize)));
      }

      if (subgroups.length === 0) {
        message.error('无法按指定子组大小分组数据');
        return;
      }

      limits = calculateXbarRLimits(subgroups, subgroupSize);
      xBarValues = subgroups.map(group => mean(group));
      rValues = subgroups.map(group => range(group));
    }

    setControlLimits(limits);

    // Detect anomalies
    const detectedAnomalies = detectAllAnomalies(xBarValues, limits, anomalyRules);
    setAnomalies(detectedAnomalies);

    // Create anomaly map for quick lookup
    const anomalyMap = new Map<number, AnomalyResult[]>();
    detectedAnomalies.forEach(anomaly => {
      const existing = anomalyMap.get(anomaly.index) || [];
      existing.push(anomaly);
      anomalyMap.set(anomaly.index, existing);
    });

    // Process data rows with status
    const processed: ProcessedDataRow[] = rawData.map((row, index) => {
      const rowAnomalies = anomalyMap.get(index) || [];
      let status: 'normal' | 'warning' | 'critical' = 'normal';

      if (rowAnomalies.some(a => a.level === 'critical')) {
        status = 'critical';
      } else if (rowAnomalies.some(a => a.level === 'warning')) {
        status = 'warning';
      }

      return {
        ...row,
        id: index + 1,
        mean: mean(row.values),
        range: range(row.values),
        status,
        anomalies: rowAnomalies.length > 0 ? rowAnomalies : undefined,
      };
    });

    setProcessedData(processed);
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!controlLimits) {
      return {
        xBarData: [],
        rData: [],
        groupNumbers: [],
        allData: [],
      };
    }

    const { chartType, subgroupSize } = parameters;

    if (chartType === 'i-mr' || subgroupSize === 1) {
      const individualValues = rawData.map(row => row.values[0]);
      const movingRanges: number[] = [];

      for (let i = 1; i < individualValues.length; i++) {
        movingRanges.push(Math.abs(individualValues[i] - individualValues[i - 1]));
      }

      return {
        xBarData: individualValues,
        rData: movingRanges,
        groupNumbers: rawData.map((_, i) => i + 1),
        allData: individualValues,
      };
    } else {
      const subgroups: number[][] = [];

      if (rawData[0].values.length === subgroupSize) {
        subgroups.push(...rawData.map(row => row.values));
      } else if (rawData[0].values.length === 1) {
        for (let i = 0; i < rawData.length; i += subgroupSize) {
          const subgroup = rawData.slice(i, i + subgroupSize).map(row => row.values[0]);
          if (subgroup.length === subgroupSize) {
            subgroups.push(subgroup);
          }
        }
      } else {
        subgroups.push(...rawData.map(row => row.values.slice(0, subgroupSize)));
      }

      const xBarValues = subgroups.map(group => mean(group));
      const rValues = subgroups.map(group => range(group));
      const groupNumbers = subgroups.map((_, i) => i + 1);
      const allData = subgroups.flatMap(g => g);

      return {
        xBarData: xBarValues,
        rData: rValues,
        groupNumbers,
        allData,
      };
    }
  }, [rawData, controlLimits, parameters]);

  const handleExport = () => {
    if (!metrics || processedData.length === 0 || !controlLimits) {
      message.warning('没有可导出的数据');
      return;
    }

    try {
      exportProfessionalReport(
        rawData,
        metrics,
        anomalies,
        controlLimits,
        parameters,
        {
          company: '您的公司名称',
          author: 'Admin',
          projectName: '测试数据>>物料>>成品',
          itemId: '001',
          unit: 'mm',
        }
      );
      message.success('专业SPC报告导出成功');
    } catch (error) {
      message.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDataImported = (data: RawDataRow[], metadata?: { usl?: number; lsl?: number; target?: number }) => {
    console.log('handleDataImported called with metadata:', metadata);

    setRawData(data);
    setFileInfo({ name: '数据文件', rows: data.length });

    // Auto-fill parameters from metadata if available
    if (metadata) {
      const updatedParams = { ...parameters };
      let hasUpdates = false;

      if (metadata.usl !== undefined) {
        updatedParams.usl = metadata.usl;
        hasUpdates = true;
        console.log('Setting USL to:', metadata.usl);
      }
      if (metadata.lsl !== undefined) {
        updatedParams.lsl = metadata.lsl;
        hasUpdates = true;
        console.log('Setting LSL to:', metadata.lsl);
      }
      if (metadata.target !== undefined) {
        updatedParams.target = metadata.target;
        hasUpdates = true;
        console.log('Setting Target to:', metadata.target);
      }

      if (hasUpdates) {
        console.log('Updating parameters to:', updatedParams);
        setParameters(updatedParams);
        message.success(`成功导入 ${data.length} 行数据，已自动填充规格限参数：USL=${metadata.usl}, LSL=${metadata.lsl}`);
      } else {
        message.success(`成功导入 ${data.length} 行数据`);
      }
    } else {
      console.warn('No metadata provided');
      message.success(`成功导入 ${data.length} 行数据`);
    }

    // 关闭抽屉
    setDrawerVisible(false);
  };

  const handleApplySuggestedLimits = (usl: number, lsl: number) => {
    const updatedParams = {
      ...parameters,
      usl,
      lsl,
      target: (usl + lsl) / 2,  // Auto-calculate target as midpoint
    };

    setParameters(updatedParams);
    message.success(`已应用建议规格限：USL=${usl.toFixed(4)}, LSL=${lsl.toFixed(4)}`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    // 如果没有数据，显示欢迎页面
    if (!rawData || rawData.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }}>欢迎使用 SPC 分析系统</h1>
          <p style={{ fontSize: 18, color: '#666', marginBottom: 32 }}>
            请先导入数据开始分析
          </p>
          <Button
            type="primary"
            size="large"
            icon={<UploadOutlined />}
            onClick={() => setDrawerVisible(true)}
          >
            立即导入数据
          </Button>
        </div>
      );
    }

    // 根据 viewMode 渲染不同内容
    switch (viewMode) {
      case 'home':
      case 'dashboard':
        // 默认仪表盘 - 显示所有图表
        return renderDashboard();

      case 'summary':
        // 摘要报告 - 只显示关键指标和建议
        return renderSummary();

      case 'param-config':
        // 参数配置 - 显示配置总览
        return (
          <ConfigOverview
            parameters={parameters}
            onParametersChange={setParameters}
          />
        );

      case 'control-chart':
        // 控制图分析 - 显示均值图和极差图
        return renderControlCharts();

      case 'capability':
        // 过程能力分析 - 显示直方图和能力指数
        return renderCapabilityAnalysis();

      case 'anomaly':
        // 异常检测 - 显示异常列表和建议
        return renderAnomalyDetection();

      case 'xbar-r':
        // X-bar & R 图专项
        return renderXbarRCharts();

      case 'i-mr':
        // I-MR 图专项
        return renderIMRCharts();

      case 'histogram':
        // 直方图专项
        return renderHistogramView();

      case 'cpk':
        // CPK 计算器
        return renderCPKCalculator();

      case 'normality':
        // 正态性检验
        return renderNormalityTest();

      case 'trend':
        // 趋势分析
        return renderTrendAnalysis();

      case 'config':
        // 配置总览
        return (
          <ConfigOverview
            parameters={parameters}
            onParametersChange={setParameters}
          />
        );

      default:
        return renderDashboard();
    }
  };

  // 渲染完整仪表盘
  const renderDashboard = () => (
    <>
      {/* 参数配置区 - 横向布局 */}
      <div style={{ marginBottom: 16 }}>
        <HorizontalParameterPanel
          parameters={parameters}
          onParametersChange={setParameters}
        />
      </div>

      {/* 图表和数据区 */}
      <Row gutter={[16, 16]}>
        {/* 第一行：均值图 + 极差图 */}
        <Col xs={24} lg={12}>
          <Card
            className="spc-chart-card"
            title={parameters.chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)'}
          >
            <ChartCard
              title=""
              chartType="xbar"
              xBarData={chartData.xBarData}
              rData={chartData.rData}
              groupNumbers={chartData.groupNumbers}
              controlLimits={controlLimits}
              anomalies={anomalies}
              parameters={parameters}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className="spc-chart-card"
            title={parameters.chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)'}
          >
            <ChartCard
              title=""
              chartType="r"
              xBarData={chartData.xBarData}
              rData={chartData.rData}
              groupNumbers={chartData.groupNumbers}
              controlLimits={controlLimits}
              anomalies={anomalies}
              parameters={parameters}
            />
          </Card>
        </Col>

        {/* 第二行：过程能力直方图（全宽） */}
        <Col xs={24}>
          <Card className="spc-chart-card" title="过程能力分布直方图">
            <ChartCard
              title=""
              chartType="histogram"
              allData={chartData.allData}
              metrics={metrics}
              usl={parameters.usl}
              lsl={parameters.lsl}
            />
          </Card>
        </Col>

        {/* 第三行：散点图（全宽） */}
        <Col xs={24}>
          <Card className="spc-chart-card" title="散点图分析">
            <ChartCard
              title=""
              chartType="scatter"
              allData={chartData.allData}
              metrics={metrics}
              usl={parameters.usl}
              lsl={parameters.lsl}
            />
          </Card>
        </Col>

        {/* 第四行：箱线图 + 彩虹图 */}
        <Col xs={24} lg={12}>
          <Card className="spc-chart-card" title="箱线图">
            <ChartCard
              title=""
              chartType="boxplot"
              rawData={rawData}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="spc-chart-card" title="彩虹图（多测量值趋势）">
            <ChartCard
              title=""
              chartType="rainbow"
              rawData={rawData}
            />
          </Card>
        </Col>

        {/* 第五行：SPC结果建议（全宽） */}
        <Col span={24}>
          <SPCRecommendation
            metrics={metrics}
            anomalies={anomalies}
            processedData={processedData}
            controlLimits={controlLimits}
            xBarData={chartData.xBarData}
            rData={chartData.rData}
            onApplySuggestedLimits={handleApplySuggestedLimits}
          />
        </Col>
      </Row>
    </>
  );

  // 渲染摘要报告
  const renderSummary = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <SPCRecommendation
          metrics={metrics}
          anomalies={anomalies}
          processedData={processedData}
          controlLimits={controlLimits}
          xBarData={chartData.xBarData}
          rData={chartData.rData}
          onApplySuggestedLimits={handleApplySuggestedLimits}
        />
      </Col>
    </Row>
  );

  // 渲染控制图
  const renderControlCharts = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <HorizontalParameterPanel
          parameters={parameters}
          onParametersChange={setParameters}
        />
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            className="spc-chart-card"
            title={parameters.chartType === 'xbar-r' ? '均值控制图 (X-bar)' : '单值控制图 (I)'}
          >
            <ChartCard
              title=""
              chartType="xbar"
              xBarData={chartData.xBarData}
              rData={chartData.rData}
              groupNumbers={chartData.groupNumbers}
              controlLimits={controlLimits}
              anomalies={anomalies}
              parameters={parameters}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="spc-chart-card"
            title={parameters.chartType === 'xbar-r' ? '极差控制图 (R)' : '移动极差控制图 (MR)'}
          >
            <ChartCard
              title=""
              chartType="r"
              xBarData={chartData.xBarData}
              rData={chartData.rData}
              groupNumbers={chartData.groupNumbers}
              controlLimits={controlLimits}
              anomalies={anomalies}
              parameters={parameters}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  // 渲染过程能力分析
  const renderCapabilityAnalysis = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card className="spc-chart-card" title="过程能力分布直方图">
          <ChartCard
            title=""
            chartType="histogram"
            allData={chartData.allData}
            metrics={metrics}
            usl={parameters.usl}
            lsl={parameters.lsl}
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="过程能力指标">
          <Row gutter={16}>
            <Col span={6}>
              <Card.Grid style={{ width: '100%', textAlign: 'center' }} hoverable={false}>
                <div style={{ fontSize: 14, color: '#666' }}>CP</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {metrics?.cp.toFixed(3) || '-'}
                </div>
              </Card.Grid>
            </Col>
            <Col span={6}>
              <Card.Grid style={{ width: '100%', textAlign: 'center' }} hoverable={false}>
                <div style={{ fontSize: 14, color: '#666' }}>CPK</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {metrics?.cpk.toFixed(3) || '-'}
                </div>
              </Card.Grid>
            </Col>
            <Col span={6}>
              <Card.Grid style={{ width: '100%', textAlign: 'center' }} hoverable={false}>
                <div style={{ fontSize: 14, color: '#666' }}>PP</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                  {metrics?.pp.toFixed(3) || '-'}
                </div>
              </Card.Grid>
            </Col>
            <Col span={6}>
              <Card.Grid style={{ width: '100%', textAlign: 'center' }} hoverable={false}>
                <div style={{ fontSize: 14, color: '#666' }}>PPK</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                  {metrics?.ppk.toFixed(3) || '-'}
                </div>
              </Card.Grid>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );

  // 渲染异常检测
  const renderAnomalyDetection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <HorizontalParameterPanel
          parameters={parameters}
          onParametersChange={setParameters}
        />
      </div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <SPCRecommendation
            metrics={metrics}
            anomalies={anomalies}
            processedData={processedData}
            controlLimits={controlLimits}
            xBarData={chartData.xBarData}
            rData={chartData.rData}
            onApplySuggestedLimits={handleApplySuggestedLimits}
          />
        </Col>
      </Row>
    </>
  );

  // 渲染 X-bar & R 图
  const renderXbarRCharts = () => {
    // 自动切换到 X-bar & R 模式
    if (parameters.chartType !== 'xbar-r') {
      setParameters({ ...parameters, chartType: 'xbar-r' });
    }
    return renderControlCharts();
  };

  // 渲染 I-MR 图
  const renderIMRCharts = () => {
    // 自动切换到 I-MR 模式
    if (parameters.chartType !== 'i-mr') {
      setParameters({ ...parameters, chartType: 'i-mr', subgroupSize: 1 });
    }
    return renderControlCharts();
  };

  // 渲染直方图视图
  const renderHistogramView = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card className="spc-chart-card" title="过程能力分布直方图">
          <ChartCard
            title=""
            chartType="histogram"
            allData={chartData.allData}
            metrics={metrics}
            usl={parameters.usl}
            lsl={parameters.lsl}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染 CPK 计算器
  const renderCPKCalculator = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card title="CPK 能力指数计算器" extra={<Button type="primary" onClick={() => setViewMode('capability')}>查看详细分析</Button>}>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <h3 style={{ marginBottom: 24 }}>过程能力指数 (Process Capability)</h3>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card type="inner">
                      <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>CP (潜在能力)</div>
                      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>
                        {metrics?.cp.toFixed(3) || '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                        {metrics && metrics.cp >= 1.33 ? '✓ 优秀' : metrics && metrics.cp >= 1.0 ? '⚠ 一般' : '✗ 不足'}
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card type="inner">
                      <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>CPK (实际能力)</div>
                      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#52c41a' }}>
                        {metrics?.cpk.toFixed(3) || '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                        {metrics && metrics.cpk >= 1.33 ? '✓ 优秀' : metrics && metrics.cpk >= 1.0 ? '⚠ 一般' : '✗ 不足'}
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card type="inner">
                      <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>PP (整体能力)</div>
                      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#faad14' }}>
                        {metrics?.pp.toFixed(3) || '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                        长期表现
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card type="inner">
                      <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>PPK (整体实际)</div>
                      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#f5222d' }}>
                        {metrics?.ppk.toFixed(3) || '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                        长期偏移
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Card type="inner" title="评价标准">
                <ul style={{ lineHeight: 2 }}>
                  <li><strong>CPK ≥ 1.67:</strong> 优秀 - 过程能力非常充足</li>
                  <li><strong>1.33 ≤ CPK &lt; 1.67:</strong> 良好 - 过程能力充足</li>
                  <li><strong>1.0 ≤ CPK &lt; 1.33:</strong> 一般 - 过程能力勉强可接受</li>
                  <li><strong>CPK &lt; 1.0:</strong> 不足 - 过程能力不足，需改进</li>
                </ul>
                <div style={{ marginTop: 24, padding: 16, background: '#f0f2f5', borderRadius: 4 }}>
                  <h4>当前状态：</h4>
                  <p style={{ marginBottom: 8 }}>
                    <strong>合格率:</strong> {metrics?.passRate.toFixed(2)}%
                  </p>
                  <p style={{ marginBottom: 8 }}>
                    <strong>样本数量:</strong> {metrics?.n || 0}
                  </p>
                  <p>
                    <strong>标准差:</strong> {metrics?.stdDev.toFixed(4) || '-'}
                  </p>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );

  // 渲染正态性检验
  const renderNormalityTest = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card title="正态性检验" extra={<Button onClick={() => setViewMode('histogram')}>查看分布图</Button>}>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <h3>Shapiro-Wilk 检验</h3>
                <div style={{ fontSize: 48, fontWeight: 'bold', color: metrics && metrics.normalityPValue && metrics.normalityPValue > 0.05 ? '#52c41a' : '#f5222d', margin: '24px 0' }}>
                  P = {metrics?.normalityPValue?.toFixed(4) || '-'}
                </div>
                <div style={{ fontSize: 18 }}>
                  {metrics && metrics.normalityPValue && metrics.normalityPValue > 0.05
                    ? '✓ 数据符合正态分布 (α=0.05)'
                    : '✗ 数据不符合正态分布 (α=0.05)'}
                </div>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Card type="inner" title="检验说明">
                <ul style={{ lineHeight: 2 }}>
                  <li><strong>P 值 &gt; 0.05:</strong> 接受原假设，数据符合正态分布</li>
                  <li><strong>P 值 ≤ 0.05:</strong> 拒绝原假设，数据不符合正态分布</li>
                </ul>
                <div style={{ marginTop: 24, padding: 16, background: '#f0f2f5', borderRadius: 4 }}>
                  <h4>基本统计量：</h4>
                  <p><strong>均值:</strong> {metrics?.mean.toFixed(4) || '-'}</p>
                  <p><strong>标准差:</strong> {metrics?.stdDev.toFixed(4) || '-'}</p>
                  <p><strong>样本数:</strong> {metrics?.n || 0}</p>
                </div>
                <div style={{ marginTop: 16, padding: 16, background: '#e6f7ff', borderRadius: 4 }}>
                  <strong>注意:</strong> 如果数据不符合正态分布，CPK/PPK 等指标可能不准确，建议先对数据进行转换或使用非参数方法。
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
      <Col xs={24}>
        <Card className="spc-chart-card" title="分布直方图">
          <ChartCard
            title=""
            chartType="histogram"
            allData={chartData.allData}
            metrics={metrics}
            usl={parameters.usl}
            lsl={parameters.lsl}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染趋势分析
  const renderTrendAnalysis = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card className="spc-chart-card" title="散点图趋势分析">
          <ChartCard
            title=""
            chartType="scatter"
            allData={chartData.allData}
            metrics={metrics}
            usl={parameters.usl}
            lsl={parameters.lsl}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card className="spc-chart-card" title="箱线图分布">
          <ChartCard
            title=""
            chartType="boxplot"
            rawData={rawData}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card className="spc-chart-card" title="彩虹图（多测量值趋势）">
          <ChartCard
            title=""
            chartType="rainbow"
            rawData={rawData}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 左侧导航栏 */}
      <Sider
        width={240}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <SideNavigation
          onMenuClick={(key) => {
            const newViewMode = menuKeyToViewMode(key);
            setViewMode(newViewMode);

            // 特殊处理：数据导入菜单打开抽屉
            if (newViewMode === 'data-import') {
              setDrawerVisible(true);
            }
          }}
        />
      </Sider>

      {/* 右侧主内容区 */}
      <Layout style={{ marginLeft: 240 }}>
        <Header className="spc-header">
          <Row justify="end" align="middle" style={{ height: '100%', width: '100%' }}>
            <Col>
              <Space size="middle">
                <Button
                  icon={<UploadOutlined />}
                  type="primary"
                  ghost
                  onClick={() => setDrawerVisible(true)}
                >
                  数据采集
                </Button>

                {fileInfo && (
                  <div className="file-info-badge">
                    <FileExcelOutlined />
                    <span>{fileInfo.name} ({fileInfo.rows}行)</span>
                  </div>
                )}

                <Button
                  icon={<DownloadOutlined />}
                  type="primary"
                  ghost
                  onClick={handleExport}
                  disabled={!metrics}
                >
                  导出报告
                </Button>

                <Button
                  icon={<PrinterOutlined />}
                  type="primary"
                  ghost
                  onClick={handlePrintReport}
                  disabled={!metrics}
                >
                  打印
                </Button>

                <Button
                  type="text"
                  icon={<GithubOutlined />}
                  href="https://github.com"
                  target="_blank"
                >
                  GitHub
                </Button>
              </Space>
            </Col>
          </Row>
        </Header>

        {/* Main Content - Full Width */}
        <Content className="spc-content" style={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          {renderMainContent()}
        </Content>
      </Layout>

      {/* 数据导入抽屉 */}
      <DataImportDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onDataImported={handleDataImported}
      />
    </Layout>
  );
}

export default App;
