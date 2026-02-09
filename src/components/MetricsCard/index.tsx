import React from 'react';
import { Card, Row, Col, Statistic, Badge, Space, Divider, Collapse, List, Tag, Button } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { ProcessMetrics, AnomalyResult, RawDataRow, ProcessedDataRow } from '../../types';

const { Panel } = Collapse;

interface MetricsCardProps {
  metrics: ProcessMetrics | null;
  anomalies: AnomalyResult[];
  rawData?: RawDataRow[];
  processedData?: ProcessedDataRow[];
  onApplySuggestedLimits?: (usl: number, lsl: number) => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics, anomalies, processedData, onApplySuggestedLimits }) => {
  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        <LineChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div>暂无数据</div>
        <div style={{ fontSize: 12 }}>上传数据并配置参数后查看指标</div>
      </div>
    );
  }

  const getStatusColor = (cpk: number): 'success' | 'warning' | 'error' => {
    if (cpk >= 1.33) return 'success';
    if (cpk >= 1.0) return 'warning';
    return 'error';
  };

  const getStatusIcon = (cpk: number) => {
    if (cpk >= 1.33) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (cpk >= 1.0) return <WarningOutlined style={{ color: '#faad14' }} />;
    return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
  };

  const getStatusText = (cpk: number): string => {
    if (cpk >= 1.33) return '能力充分';
    if (cpk >= 1.0) return '能力边缘';
    return '能力不足';
  };

  const criticalAnomalies = anomalies.filter(a => a.level === 'critical').length;
  const warningAnomalies = anomalies.filter(a => a.level === 'warning').length;
  const infoAnomalies = anomalies.filter(a => a.level === 'info').length;

  const cpkStatus = getStatusColor(metrics.cpk);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* Process Capability Status */}
      <Card
          type="inner"
          size="small"
          style={{
            backgroundColor: cpkStatus === 'success' ? '#f6ffed' : cpkStatus === 'warning' ? '#fffbe6' : '#fff2f0',
            borderColor: cpkStatus === 'success' ? '#b7eb8f' : cpkStatus === 'warning' ? '#ffe58f' : '#ffccc7',
          }}
        >
          <Space>
            {getStatusIcon(metrics.cpk)}
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>
              过程状态: {getStatusText(metrics.cpk)}
            </span>
          </Space>
        </Card>

        <Divider style={{ margin: '4px 0' }}>过程能力指数</Divider>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Statistic
              title="CPK"
              value={metrics.cpk}
              precision={3}
              valueStyle={{
                color: cpkStatus === 'success' ? '#52c41a' : cpkStatus === 'warning' ? '#faad14' : '#f5222d',
                fontWeight: 'bold',
              }}
              suffix={getStatusIcon(metrics.cpk)}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="CP"
              value={metrics.cp}
              precision={3}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="PPK"
              value={metrics.ppk}
              precision={3}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="PP"
              value={metrics.pp}
              precision={3}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '4px 0' }}>统计汇总</Divider>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Statistic
              title="样本数 (n)"
              value={metrics.n}
              valueStyle={{ fontSize: 18 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="合格率"
              value={metrics.passRate}
              precision={2}
              suffix="%"
              valueStyle={{
                fontSize: 18,
                color: metrics.passRate >= 99 ? '#52c41a' : metrics.passRate >= 95 ? '#faad14' : '#f5222d',
              }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="均值 (μ)"
              value={metrics.mean}
              precision={4}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="标准差 (σ)"
              value={metrics.stdDev}
              precision={4}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '4px 0' }}>异常统计</Divider>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Badge count={criticalAnomalies} showZero style={{ backgroundColor: '#f5222d' }}>
              <div style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: '#999' }}>严重</div>
              </div>
            </Badge>
          </Col>
          <Col span={8}>
            <Badge count={warningAnomalies} showZero style={{ backgroundColor: '#faad14' }}>
              <div style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: '#999' }}>警告</div>
              </div>
            </Badge>
          </Col>
          <Col span={8}>
            <Badge count={infoAnomalies} showZero style={{ backgroundColor: '#1890ff' }}>
              <div style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: '#999' }}>提示</div>
              </div>
            </Badge>
          </Col>
        </Row>

        {/* Anomaly Details List */}
        {anomalies.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Collapse ghost>
              <Panel header={`查看异常详情 (共${anomalies.length}例)`} key="1">
                <List
                  size="small"
                  dataSource={anomalies}
                  renderItem={(anomaly) => {
                    const groupNo = processedData && processedData[anomaly.index]
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
                            <span style={{ fontWeight: 'bold' }}>第{groupNo}组</span>
                          </Space>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            值: {anomaly.value !== undefined && !isNaN(anomaly.value) ? anomaly.value.toFixed(3) : 'N/A'} | 规则{anomaly.rule}
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {anomaly.description}
                          </div>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </Panel>
            </Collapse>
          </div>
        )}

        {metrics.normalityPValue !== undefined && (
          <>
            <Divider style={{ margin: '4px 0' }}>正态性检验</Divider>

            <Card
              type="inner"
              size="small"
              style={{
                backgroundColor: metrics.normalityPValue >= 0.05 ? '#f6ffed' : '#fff2f0',
                borderColor: metrics.normalityPValue >= 0.05 ? '#b7eb8f' : '#ffccc7',
              }}
            >
              <Space>
                {metrics.normalityPValue >= 0.05 ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <WarningOutlined style={{ color: '#f5222d' }} />
                )}
                <span>
                  P值: <strong>{metrics.normalityPValue.toFixed(4)}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                    ({metrics.normalityPValue >= 0.05 ? '正态分布' : '非正态分布'})
                  </span>
                </span>
              </Space>
            </Card>
          </>
        )}

        {/* Smart Spec Limit Recommendations based on 3σ principle */}
        <>
          <Divider style={{ margin: '4px 0' }}>规格限建议（3σ原则）</Divider>

          <Card
            type="inner"
            size="small"
            style={{
              backgroundColor: '#e6f7ff',
              borderColor: '#91d5ff',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic
                    title="建议上限 (USL)"
                    value={metrics.mean + 3 * metrics.stdDev}
                    precision={4}
                    valueStyle={{ fontSize: 16, color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="建议下限 (LSL)"
                    value={metrics.mean - 3 * metrics.stdDev}
                    precision={4}
                    valueStyle={{ fontSize: 16, color: '#1890ff' }}
                  />
                </Col>
              </Row>

              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                预测CPK: <strong style={{ fontSize: 14, color: '#52c41a' }}>1.000</strong>
                <span style={{ marginLeft: 8 }}>
                  (基于当前数据 μ={metrics.mean.toFixed(4)}, σ={metrics.stdDev.toFixed(4)})
                </span>
              </div>

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

              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                💡 提示: 建议规格限基于 μ±3σ 计算，确保约99.73%的数据在规格范围内
              </div>
            </Space>
          </Card>
        </>
    </Space>
  );
};

export default MetricsCard;
