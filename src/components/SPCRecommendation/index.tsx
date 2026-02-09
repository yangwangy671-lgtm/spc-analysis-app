import React from 'react';
import { Card, Row, Col, Alert, Tag, Divider, Space, Typography, Statistic, Button, Collapse, List, Progress } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import type { ProcessMetrics, AnomalyResult, ProcessedDataRow, ControlLimits, IMRLimits } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface SPCRecommendationProps {
  metrics: ProcessMetrics | null;
  anomalies: AnomalyResult[];
  processedData: ProcessedDataRow[];
  controlLimits: ControlLimits | IMRLimits | null;
  xBarData: number[];
  rData: number[];
  onApplySuggestedLimits?: (usl: number, lsl: number) => void;
}

const SPCRecommendation: React.FC<SPCRecommendationProps> = ({
  metrics,
  anomalies,
  processedData,
  controlLimits,
  xBarData,
  rData,
  onApplySuggestedLimits,
}) => {
  if (!metrics || !controlLimits) {
    return (
      <Card>
        <Alert
          message="等待数据"
          description="请导入数据后查看SPC分析结果和建议"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  // 分析均值控制图趋势
  const analyzeXbarTrend = () => {
    if (!xBarData || xBarData.length < 2) return { type: 'stable', description: '数据不足，无法分析趋势' };

    const recentData = xBarData.slice(-10);
    const avgRecent = recentData.reduce((a, b) => a + b, 0) / recentData.length;
    const centerLine = 'xBar' in controlLimits ? controlLimits.xBar.center : controlLimits.individual.center;

    if (!centerLine || isNaN(avgRecent)) {
      return { type: 'stable', description: '数据不足，无法分析趋势' };
    }

    // 检查趋势
    let increasingCount = 0;
    let decreasingCount = 0;
    for (let i = 1; i < recentData.length; i++) {
      if (recentData[i] > recentData[i - 1]) increasingCount++;
      if (recentData[i] < recentData[i - 1]) decreasingCount++;
    }

    if (increasingCount >= 6) {
      return { type: 'increasing', description: '过程均值呈持续上升趋势，可能存在系统性原因导致数值偏高' };
    } else if (decreasingCount >= 6) {
      return { type: 'decreasing', description: '过程均值呈持续下降趋势，需要检查是否有系统性因素影响' };
    } else if (Math.abs(avgRecent - centerLine) > centerLine * 0.1) {
      return { type: 'shift', description: `过程均值偏离中心线${((avgRecent - centerLine) / centerLine * 100).toFixed(1)}%，存在偏移现象` };
    } else {
      return { type: 'stable', description: '过程均值相对稳定，围绕中心线波动' };
    }
  };

  // 分析极差控制图趋势
  const analyzeRangeTrend = () => {
    if (!rData || rData.length < 2) return { type: 'stable', description: '数据不足，无法分析趋势' };

    const recentR = rData.slice(-10);
    const avgR = recentR.reduce((a, b) => a + b, 0) / recentR.length;
    const rCL = 'r' in controlLimits ? controlLimits.r.center : controlLimits.movingRange.center;

    if (!rCL || isNaN(avgR)) {
      return { type: 'stable', description: '数据不足，无法分析趋势' };
    }

    // 检查离散度趋势
    let increasingCount = 0;
    for (let i = 1; i < recentR.length; i++) {
      if (recentR[i] > recentR[i - 1]) increasingCount++;
    }

    if (increasingCount >= 6) {
      return { type: 'increasing', description: '过程离散度持续增大，稳定性降低，需要检查测量系统或生产条件' };
    } else if (avgR > rCL * 1.2) {
      return { type: 'high', description: `过程离散度偏高（高出中心线${((avgR - rCL) / rCL * 100).toFixed(1)}%），一致性较差` };
    } else if (avgR < rCL * 0.5) {
      return { type: 'low', description: '过程离散度很小，一致性优秀' };
    } else {
      return { type: 'stable', description: '过程离散度稳定，波动在正常范围内' };
    }
  };

  // 分析过程能力
  const analyzeCapability = () => {
    if (!metrics || metrics.cpk === undefined || metrics.cpk === null || isNaN(metrics.cpk)) {
      return {
        level: 'unknown',
        description: '数据不足，无法评估过程能力',
        icon: <WarningOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />,
      };
    }

    const cpk = metrics.cpk;

    if (cpk >= 1.67) {
      return {
        level: 'excellent',
        description: `CPK=${cpk.toFixed(3)}，过程能力优秀（A级），远超最低要求，具有较高的质量保证能力`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />,
      };
    } else if (cpk >= 1.33) {
      return {
        level: 'good',
        description: `CPK=${cpk.toFixed(3)}，过程能力良好（B级），满足一般质量要求，建议持续改进`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />,
      };
    } else if (cpk >= 1.0) {
      return {
        level: 'marginal',
        description: `CPK=${cpk.toFixed(3)}，过程能力尚可（C级），需要加强过程控制和改进`,
        icon: <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />,
      };
    } else if (cpk >= 0.67) {
      return {
        level: 'poor',
        description: `CPK=${cpk.toFixed(3)}，过程能力不足（D级），存在较高不良率，必须立即改进`,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />,
      };
    } else {
      return {
        level: 'critical',
        description: `CPK=${cpk.toFixed(3)}，过程能力严重不足（E级），不良率极高，应停止生产并彻底改进`,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />,
      };
    }
  };

  // 生成改进建议
  const generateRecommendations = () => {
    const recommendations: { priority: 'high' | 'medium' | 'low'; content: string }[] = [];

    // 基于CPK的建议
    if (metrics && metrics.cpk !== undefined && metrics.cpk !== null && !isNaN(metrics.cpk)) {
      if (metrics.cpk < 1.0) {
        recommendations.push({
          priority: 'high',
          content: '过程能力不足，建议：(1)调整过程中心，使其接近规格中心；(2)减小过程变异，改善设备精度或操作方法',
        });
      } else if (metrics.cpk < 1.33) {
        recommendations.push({
          priority: 'medium',
          content: '过程能力需要提升，建议进行5M1E（人机料法环测）分析，找出关键影响因素',
        });
      }
    }

    // 基于异常点的建议
    if (anomalies.length > 0) {
      const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
      const warningAnomalies = anomalies.filter(a => a.level === 'warning');

      if (criticalAnomalies.length > 0) {
        recommendations.push({
          priority: 'high',
          content: `发现${criticalAnomalies.length}个严重异常点，建议立即检查这些点对应的生产记录，查找特殊原因`,
        });
      }

      if (warningAnomalies.length > 5) {
        recommendations.push({
          priority: 'medium',
          content: `存在${warningAnomalies.length}个警告异常，建议检查过程是否存在周期性波动或趋势性变化`,
        });
      }
    }

    // 基于趋势的建议
    const xbarTrend = analyzeXbarTrend();
    if (xbarTrend.type === 'increasing' || xbarTrend.type === 'decreasing') {
      recommendations.push({
        priority: 'high',
        content: '过程均值存在明显趋势，建议检查：(1)刀具/模具磨损；(2)原材料批次变化；(3)环境条件变化',
      });
    }

    const rangeTrend = analyzeRangeTrend();
    if (rangeTrend.type === 'increasing') {
      recommendations.push({
        priority: 'high',
        content: '过程离散度增大，建议：(1)检查测量系统是否稳定；(2)检查设备维护状况；(3)评估操作员熟练度',
      });
    }

    // 基于正态性的建议
    if (metrics && metrics.normalityPValue !== undefined && metrics.normalityPValue < 0.05) {
      recommendations.push({
        priority: 'medium',
        content: '数据不符合正态分布（P值<0.05），CPK计算结果可能不准确，建议查找特殊原因或使用非参数方法',
      });
    }

    // 基于过程偏移的建议
    // 注释掉，因为 metrics 不包含 usl/lsl
    /*
    if (metrics && metrics.mean !== undefined && metrics.usl !== undefined && metrics.lsl !== undefined &&
        !isNaN(metrics.mean) && !isNaN(metrics.usl) && !isNaN(metrics.lsl)) {
      const deviation = ((metrics.mean - (metrics.usl + metrics.lsl) / 2) / (metrics.usl - metrics.lsl)) * 100;
      if (!isNaN(deviation) && Math.abs(deviation) > 5) {
        recommendations.push({
          priority: 'medium',
          content: `过程中心偏离规格中心${Math.abs(deviation).toFixed(1)}%，建议调整过程参数使其居中，以提高CPK值`,
        });
      }
    }
    */

    // 通用改进建议
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        content: '过程整体稳定，建议：(1)持续监控关键参数；(2)定期校准测量设备；(3)保持标准作业程序',
      });
    }

    return recommendations;
  };

  const xbarTrend = analyzeXbarTrend();
  const rangeTrend = analyzeRangeTrend();
  const capability = analyzeCapability();
  const recommendations = generateRecommendations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 趋势分析卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            className="spc-analysis-card"
            title={
              <Space>
                <LineChartOutlined />
                <span>均值控制图分析</span>
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag
                  color={
                    xbarTrend.type === 'stable'
                      ? 'success'
                      : xbarTrend.type === 'increasing'
                      ? 'warning'
                      : xbarTrend.type === 'decreasing'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {xbarTrend.type === 'stable'
                    ? '稳定'
                    : xbarTrend.type === 'increasing'
                    ? '上升趋势'
                    : xbarTrend.type === 'decreasing'
                    ? '下降趋势'
                    : '偏移'}
                </Tag>
                {xbarTrend.type === 'increasing' && <ArrowUpOutlined style={{ color: '#faad14' }} />}
                {xbarTrend.type === 'decreasing' && <ArrowDownOutlined style={{ color: '#faad14' }} />}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {xbarTrend.description}
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            className="spc-analysis-card"
            title={
              <Space>
                <LineChartOutlined />
                <span>极差控制图分析</span>
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag
                  color={
                    rangeTrend.type === 'stable'
                      ? 'success'
                      : rangeTrend.type === 'low'
                      ? 'success'
                      : rangeTrend.type === 'increasing'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {rangeTrend.type === 'stable'
                    ? '稳定'
                    : rangeTrend.type === 'low'
                    ? '离散度低'
                    : rangeTrend.type === 'increasing'
                    ? '离散度增大'
                    : '离散度高'}
                </Tag>
                {rangeTrend.type === 'increasing' && <ArrowUpOutlined style={{ color: '#faad14' }} />}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {rangeTrend.description}
              </Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            className="spc-analysis-card"
            title={
              <Space>
                <LineChartOutlined />
                <span>过程能力分析</span>
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {capability.icon}
                <Tag
                  color={
                    capability.level === 'excellent' || capability.level === 'good'
                      ? 'success'
                      : capability.level === 'marginal'
                      ? 'warning'
                      : capability.level === 'unknown'
                      ? 'default'
                      : 'error'
                  }
                >
                  {capability.level === 'excellent'
                    ? 'A级-优秀'
                    : capability.level === 'good'
                    ? 'B级-良好'
                    : capability.level === 'marginal'
                    ? 'C级-尚可'
                    : capability.level === 'poor'
                    ? 'D级-不足'
                    : capability.level === 'unknown'
                    ? '未知'
                    : 'E级-严重'}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {capability.description}
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 异常点统计 */}
      {anomalies.length > 0 && (
        <Card
          title={
            <Space>
              <WarningOutlined />
              <span>异常点统计</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Space size="large">
                <div>
                  <Tag color="error">严重异常</Tag>
                  <Text strong style={{ fontSize: 16 }}>
                    {anomalies.filter(a => a.level === 'critical').length}
                  </Text>{' '}
                  <Text type="secondary">个</Text>
                </div>
                <div>
                  <Tag color="warning">警告异常</Tag>
                  <Text strong style={{ fontSize: 16 }}>
                    {anomalies.filter(a => a.level === 'warning').length}
                  </Text>{' '}
                  <Text type="secondary">个</Text>
                </div>
                <div>
                  <Tag color="default">提示异常</Tag>
                  <Text strong style={{ fontSize: 16 }}>
                    {anomalies.filter(a => a.level === 'info').length}
                  </Text>{' '}
                  <Text type="secondary">个</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* SPC改进建议 */}
      <Card
        title={
          <Space>
            <BulbOutlined />
            <span>SPC改进建议</span>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {recommendations.map((rec, index) => (
            <Alert
              key={index}
              message={
                <Space>
                  <Tag color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}>
                    {rec.priority === 'high' ? '高优先级' : rec.priority === 'medium' ? '中优先级' : '低优先级'}
                  </Tag>
                  <Text>建议 {index + 1}</Text>
                </Space>
              }
              description={rec.content}
              type={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: index === recommendations.length - 1 ? 0 : 0 }}
            />
          ))}

          <Divider style={{ margin: '16px 0' }} />

          {/* 综合评价 */}
          <div>
            <Title level={5}>过程能力总结报告</Title>

            {/* 过程能力指数 - 带标准对比 */}
            <Card
              type="inner"
              size="small"
              style={{
                marginBottom: 16,
                backgroundColor: metrics.cpk >= 1.33 ? '#f6ffed' : metrics.cpk >= 1.0 ? '#fffbe6' : '#fff2f0',
                borderColor: metrics.cpk >= 1.33 ? '#b7eb8f' : metrics.cpk >= 1.0 ? '#ffe58f' : '#ffccc7',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* CPK - 主要指标 */}
                <div>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>过程能力指数 CPK</Text>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{
                            fontSize: 32,
                            fontWeight: 'bold',
                            color: metrics.cpk >= 1.33 ? '#52c41a' : metrics.cpk >= 1.0 ? '#faad14' : '#ff4d4f',
                          }}>
                            {metrics.cpk.toFixed(3)}
                          </span>
                          {metrics.cpk >= 1.33 ? (
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                          ) : metrics.cpk >= 1.0 ? (
                            <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
                          )}
                        </div>
                      </Space>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>能力等级</Text>
                          <Tag color={
                            metrics.cpk >= 1.67 ? 'success' :
                            metrics.cpk >= 1.33 ? 'success' :
                            metrics.cpk >= 1.0 ? 'warning' :
                            metrics.cpk >= 0.67 ? 'error' : 'error'
                          }>
                            {metrics.cpk >= 1.67 ? 'A级 - 优秀' :
                             metrics.cpk >= 1.33 ? 'B级 - 良好' :
                             metrics.cpk >= 1.0 ? 'C级 - 尚可' :
                             metrics.cpk >= 0.67 ? 'D级 - 不足' : 'E级 - 严重不足'}
                          </Tag>
                        </div>
                        <Progress
                          percent={Math.min((metrics.cpk / 1.67) * 100, 100)}
                          strokeColor={{
                            '0%': metrics.cpk >= 1.67 ? '#52c41a' : metrics.cpk >= 1.33 ? '#73d13d' : metrics.cpk >= 1.0 ? '#faad14' : '#ff4d4f',
                            '100%': metrics.cpk >= 1.67 ? '#95de64' : metrics.cpk >= 1.33 ? '#95de64' : metrics.cpk >= 1.0 ? '#ffc53d' : '#ff7875',
                          }}
                          showInfo={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>0.67 (D级)</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>1.0 (C级)</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>1.33 (B级)</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>1.67 (A级)</Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {metrics.cpk < 1.33 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              距离良好标准(1.33)还需提升: <Text strong style={{ color: '#faad14' }}>{(1.33 - metrics.cpk).toFixed(3)}</Text>
                            </Text>
                          ) : metrics.cpk < 1.67 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              距离优秀标准(1.67)还需提升: <Text strong style={{ color: '#1677ff' }}>{(1.67 - metrics.cpk).toFixed(3)}</Text>
                            </Text>
                          ) : (
                            <Text style={{ color: '#52c41a', fontSize: 12 }}>
                              ✓ 已达到优秀标准，超出: <Text strong>{(metrics.cpk - 1.67).toFixed(3)}</Text>
                            </Text>
                          )}
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* CP、PPK、PP - 次要指标 */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>过程潜力指数 CP</Text>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <Text strong style={{ fontSize: 20, color: '#1677ff' }}>{metrics.cp.toFixed(3)}</Text>
                        <Tag color={metrics.cp >= 1.33 ? 'success' : metrics.cp >= 1.0 ? 'warning' : 'error'}>
                          {metrics.cp >= 1.33 ? '良好' : metrics.cp >= 1.0 ? '尚可' : '不足'}
                        </Tag>
                      </div>
                      <Progress
                        percent={Math.min((metrics.cp / 1.67) * 100, 100)}
                        strokeColor={metrics.cp >= 1.33 ? '#52c41a' : metrics.cp >= 1.0 ? '#faad14' : '#ff4d4f'}
                        showInfo={false}
                        size="small"
                      />
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        标准: ≥1.33
                        {metrics.cp < 1.33 && <Text type="danger"> (差{(1.33 - metrics.cp).toFixed(3)})</Text>}
                      </Text>
                    </Space>
                  </Col>

                  <Col xs={24} sm={8}>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>性能指数 PPK</Text>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <Text strong style={{ fontSize: 20, color: '#722ed1' }}>{metrics.ppk.toFixed(3)}</Text>
                        <Tag color={metrics.ppk >= 1.33 ? 'success' : metrics.ppk >= 1.0 ? 'warning' : 'error'}>
                          {metrics.ppk >= 1.33 ? '良好' : metrics.ppk >= 1.0 ? '尚可' : '不足'}
                        </Tag>
                      </div>
                      <Progress
                        percent={Math.min((metrics.ppk / 1.67) * 100, 100)}
                        strokeColor={metrics.ppk >= 1.33 ? '#52c41a' : metrics.ppk >= 1.0 ? '#faad14' : '#ff4d4f'}
                        showInfo={false}
                        size="small"
                      />
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        标准: ≥1.33
                        {metrics.ppk < 1.33 && <Text type="danger"> (差{(1.33 - metrics.ppk).toFixed(3)})</Text>}
                      </Text>
                    </Space>
                  </Col>

                  <Col xs={24} sm={8}>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>性能潜力 PP</Text>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <Text strong style={{ fontSize: 20, color: '#eb2f96' }}>{metrics.pp.toFixed(3)}</Text>
                        <Tag color={metrics.pp >= 1.33 ? 'success' : metrics.pp >= 1.0 ? 'warning' : 'error'}>
                          {metrics.pp >= 1.33 ? '良好' : metrics.pp >= 1.0 ? '尚可' : '不足'}
                        </Tag>
                      </div>
                      <Progress
                        percent={Math.min((metrics.pp / 1.67) * 100, 100)}
                        strokeColor={metrics.pp >= 1.33 ? '#52c41a' : metrics.pp >= 1.0 ? '#faad14' : '#ff4d4f'}
                        showInfo={false}
                        size="small"
                      />
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        标准: ≥1.33
                        {metrics.pp < 1.33 && <Text type="danger"> (差{(1.33 - metrics.pp).toFixed(3)})</Text>}
                      </Text>
                    </Space>
                  </Col>
                </Row>
              </Space>
            </Card>

            {/* 统计汇总 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card type="inner" size="small">
                  <Statistic
                    title="样本量"
                    value={metrics.n}
                    valueStyle={{ fontSize: 18, color: '#1677ff' }}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card type="inner" size="small">
                  <Statistic
                    title="合格率"
                    value={metrics.passRate !== undefined && !isNaN(metrics.passRate) ? metrics.passRate : 0}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      fontSize: 18,
                      color: (metrics.passRate || 0) >= 99 ? '#52c41a' : (metrics.passRate || 0) >= 95 ? '#faad14' : '#ff4d4f',
                    }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card type="inner" size="small">
                  <Statistic
                    title="均值 (μ)"
                    value={metrics.mean}
                    precision={4}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card type="inner" size="small">
                  <Statistic
                    title="标准差 (σ)"
                    value={metrics.stdDev}
                    precision={4}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 过程稳定性 */}
            <Paragraph style={{ fontSize: 14, marginBottom: 8 }}>
              <Text strong>过程稳定性：</Text>
              {anomalies.filter(a => a.level === 'critical').length === 0 ? (
                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>✓ 稳定</Text>
              ) : (
                <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>✗ 不稳定（存在特殊原因）</Text>
              )}
              <Text type="secondary" style={{ marginLeft: 8 }}>
                （共{processedData.length}组数据）
              </Text>
            </Paragraph>

            {/* 正态性检验 */}
            {metrics.normalityPValue !== undefined && (
              <Card
                type="inner"
                size="small"
                style={{
                  marginBottom: 16,
                  backgroundColor: metrics.normalityPValue >= 0.05 ? '#f6ffed' : '#fff2f0',
                  borderColor: metrics.normalityPValue >= 0.05 ? '#b7eb8f' : '#ffccc7',
                }}
              >
                <Space>
                  {metrics.normalityPValue >= 0.05 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <Text strong>正态性检验：</Text>
                  <Text>P值 = {metrics.normalityPValue.toFixed(4)}</Text>
                  <Tag color={metrics.normalityPValue >= 0.05 ? 'success' : 'error'}>
                    {metrics.normalityPValue >= 0.05 ? '正态分布' : '非正态分布'}
                  </Tag>
                </Space>
              </Card>
            )}

            {/* 规格限建议 */}
            <Card
              type="inner"
              size="small"
              style={{
                backgroundColor: '#e6f7ff',
                borderColor: '#91d5ff',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text strong>规格限建议（3σ原则）</Text>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="建议上限 (USL)"
                      value={metrics.mean + 3 * metrics.stdDev}
                      precision={4}
                      valueStyle={{ fontSize: 16, color: '#1677ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="建议下限 (LSL)"
                      value={metrics.mean - 3 * metrics.stdDev}
                      precision={4}
                      valueStyle={{ fontSize: 16, color: '#1677ff' }}
                    />
                  </Col>
                </Row>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  预测CPK: <Text strong style={{ fontSize: 14, color: '#52c41a' }}>1.000</Text>
                  {' '}(基于当前数据 μ={metrics.mean.toFixed(4)}, σ={metrics.stdDev.toFixed(4)})
                </Text>
                {onApplySuggestedLimits && (
                  <Button
                    type="primary"
                    block
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      const suggestedUSL = metrics.mean + 3 * metrics.stdDev;
                      const suggestedLSL = metrics.mean - 3 * metrics.stdDev;
                      onApplySuggestedLimits(suggestedUSL, suggestedLSL);
                    }}
                    style={{ marginTop: 8 }}
                  >
                    应用建议规格限
                  </Button>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  💡 提示: 建议规格限基于 μ±3σ 计算，确保约99.73%的数据在规格范围内
                </Text>
              </Space>
            </Card>

            {/* 异常详情（可折叠） */}
            {anomalies.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Collapse ghost>
                  <Collapse.Panel header={`查看异常详情 (共${anomalies.length}例)`} key="1">
                    <List
                      size="small"
                      dataSource={anomalies}
                      renderItem={(anomaly) => {
                        const groupNo = processedData[anomaly.index]
                          ? processedData[anomaly.index].groupNo
                          : anomaly.index + 1;

                        return (
                          <List.Item style={{ padding: '8px 0' }}>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                              <Space>
                                <Tag color={
                                  anomaly.level === 'critical' ? 'error' :
                                  anomaly.level === 'warning' ? 'warning' :
                                  'processing'
                                }>
                                  {anomaly.level === 'critical' ? '严重' :
                                   anomaly.level === 'warning' ? '警告' : '提示'}
                                </Tag>
                                <Text strong>第{groupNo}组</Text>
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                值: {anomaly.value !== undefined && !isNaN(anomaly.value) ? anomaly.value.toFixed(3) : 'N/A'} | 规则{anomaly.rule}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {anomaly.description}
                              </Text>
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </Collapse.Panel>
                </Collapse>
              </div>
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default SPCRecommendation;
