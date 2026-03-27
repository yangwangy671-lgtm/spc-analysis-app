import React, { useState, useCallback } from 'react';
import {
  Card, Row, Col, InputNumber, Button, Typography, Tag, Alert,
  Statistic, Divider, Space, Table, Tabs,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { CalculatorOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// d2 基于子组大小（trials 数）
const D2: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326 };
// d2* 基于分组数（操作员数 or 零件数）
const D2STAR: Record<number, number> = {
  2: 1.41, 3: 1.91, 4: 2.24, 5: 2.48,
  6: 2.67, 7: 2.83, 8: 2.96, 9: 3.08, 10: 3.18,
};

const APPRAISER_NAMES = ['评价人 A', '评价人 B', '评价人 C'];

interface GRRResults {
  EV: number; AV: number; GRR: number; PV: number; TV: number;
  pctEV: number; pctAV: number; pctGRR: number; pctPV: number;
  NDC: number;
  appraiserMeans: number[];
  partMeans: number[];
  rbar: number;
}

interface Settings { appraisers: number; parts: number; trials: number; }

interface ResultRow {
  key: string;
  component: string;
  value: string;
  pct: number;
  note: string;
  bold?: boolean;
}

// 生成演示数据（模拟 3 人 × 10 零件 × 2 次 的典型 GR&R 数据）
const genDemoData = (s: Settings): number[][][] => {
  const base = [10.1, 10.3, 9.8, 10.5, 10.2, 9.9, 10.4, 10.0, 10.6, 9.7];
  return Array.from({ length: s.appraisers }, (_, a) =>
    Array.from({ length: s.parts }, (_, p) =>
      Array.from({ length: s.trials }, (_, t) => {
        const noise = (Math.random() - 0.5) * 0.15 + a * 0.03;
        return parseFloat((base[p % base.length] + noise + t * 0.01).toFixed(3));
      })
    )
  );
};

const GaugeRR: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({ appraisers: 2, parts: 10, trials: 2 });
  const [data, setData] = useState<number[][][]>(() => genDemoData({ appraisers: 2, parts: 10, trials: 2 }));
  const [results, setResults] = useState<GRRResults | null>(null);

  const handleSettingChange = (field: keyof Settings, value: number) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    setData(genDemoData(newSettings));
    setResults(null);
  };

  const handleDataChange = useCallback((a: number, p: number, t: number, val: number | null) => {
    setData(prev => {
      const copy = prev.map(ap => ap.map(pt => [...pt]));
      copy[a][p][t] = val ?? NaN;
      return copy;
    });
    setResults(null);
  }, []);

  const calculate = () => {
    const { appraisers: k, parts: n, trials: r } = settings;

    // 检查数据完整性
    for (let a = 0; a < k; a++)
      for (let p = 0; p < n; p++)
        for (let t = 0; t < r; t++)
          if (isNaN(data[a][p][t])) {
            alert(`请填写完整数据（评价人${a + 1} 零件${p + 1} 第${t + 1}次 未填写）`);
            return;
          }

    const K1 = 1 / (D2[r] || 1.128);
    const K2 = 1 / (D2STAR[k] || 1.41);
    const K3 = 1 / (D2STAR[n] || 3.18);

    // 每个评价人的平均极差
    const appraiserRanges = Array.from({ length: k }, (_, a) => {
      const ranges = Array.from({ length: n }, (_, p) => {
        const vals = data[a][p];
        return Math.max(...vals) - Math.min(...vals);
      });
      return ranges.reduce((s, v) => s + v, 0) / n;
    });

    const Rbar = appraiserRanges.reduce((s, v) => s + v, 0) / k;
    const EV = Rbar * K1;

    // 每个评价人的总均值
    const appraiserMeans = Array.from({ length: k }, (_, a) => {
      let sum = 0, cnt = 0;
      for (let p = 0; p < n; p++) for (let t = 0; t < r; t++) { sum += data[a][p][t]; cnt++; }
      return sum / cnt;
    });

    const Xdiff = Math.max(...appraiserMeans) - Math.min(...appraiserMeans);
    const avSq = Math.max(0, Math.pow(Xdiff * K2, 2) - Math.pow(EV, 2) / (n * r));
    const AV = Math.sqrt(avSq);
    const GRR = Math.sqrt(EV * EV + AV * AV);

    // 每个零件的总均值
    const partMeans = Array.from({ length: n }, (_, p) => {
      let sum = 0, cnt = 0;
      for (let a = 0; a < k; a++) for (let t = 0; t < r; t++) { sum += data[a][p][t]; cnt++; }
      return sum / cnt;
    });

    const Rp = Math.max(...partMeans) - Math.min(...partMeans);
    const PV = Rp * K3;
    const TV = Math.sqrt(GRR * GRR + PV * PV);

    const pct = (v: number) => TV > 0 ? parseFloat((v / TV * 100).toFixed(2)) : 0;
    const NDC = GRR > 0 ? Math.floor(1.41 * PV / GRR) : 0;

    setResults({
      EV, AV, GRR, PV, TV,
      pctEV: pct(EV), pctAV: pct(AV), pctGRR: pct(GRR), pctPV: pct(PV),
      NDC, appraiserMeans, partMeans, rbar: Rbar,
    });
  };

  const getGRRStatus = (pct: number) => {
    if (pct < 10) return { color: 'success', label: '优秀', tagColor: 'green' };
    if (pct < 30) return { color: 'warning', label: '可接受', tagColor: 'orange' };
    return { color: 'error', label: '不合格', tagColor: 'red' };
  };

  const chartOption = results ? {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    xAxis: { type: 'category', data: ['重复性 EV', '再现性 AV', 'GR&R', '零件变差 PV'] },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      name: '占总变差 %',
      type: 'bar',
      data: [
        { value: results.pctEV, itemStyle: { color: '#1677ff' } },
        { value: results.pctAV, itemStyle: { color: '#52c41a' } },
        { value: results.pctGRR, itemStyle: { color: results.pctGRR < 10 ? '#52c41a' : results.pctGRR < 30 ? '#faad14' : '#f5222d' } },
        { value: results.pctPV, itemStyle: { color: '#722ed1' } },
      ],
      label: { show: true, position: 'top', formatter: '{c}%' },
    }],
  } : null;

  const { appraisers: k, parts: n, trials: r } = settings;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <ExperimentOutlined style={{ marginRight: 8 }} />
        量具 GR&R 分析（极差法）
      </Title>

      {/* 参数设置 */}
      <Card title="实验参数设置" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>评价人数量</Text>
            <InputNumber min={2} max={3} value={k} onChange={v => handleSettingChange('appraisers', v || 2)}
              style={{ width: '100%', marginTop: 4 }} addonAfter="人" />
          </Col>
          <Col xs={24} sm={6}>
            <Text strong>零件数量</Text>
            <InputNumber min={5} max={10} value={n} onChange={v => handleSettingChange('parts', v || 10)}
              style={{ width: '100%', marginTop: 4 }} addonAfter="个" />
          </Col>
          <Col xs={24} sm={6}>
            <Text strong>重复测量次数</Text>
            <InputNumber min={2} max={3} value={r} onChange={v => handleSettingChange('trials', v || 2)}
              style={{ width: '100%', marginTop: 4 }} addonAfter="次" />
          </Col>
          <Col xs={24} sm={6} style={{ paddingTop: 22 }}>
            <Space>
              <Button type="primary" icon={<CalculatorOutlined />} onClick={calculate} size="large">
                计算 GR&R
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => { setData(genDemoData(settings)); setResults(null); }}>
                重置演示数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="input"
        items={[
          {
            key: 'input',
            label: '数据录入',
            children: (
              <Card>
                <Alert type="info" showIcon style={{ marginBottom: 16 }}
                  message={`当前设置：${k} 个评价人 × ${n} 个零件 × ${r} 次重复，共 ${k * n * r} 个测量值`}
                />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>零件编号</th>
                        {Array.from({ length: k }, (_, a) =>
                          Array.from({ length: r }, (_, t) => (
                            <th key={`${a}-${t}`} style={{ ...thStyle, background: a % 2 === 0 ? '#e6f4ff' : '#f6ffed', color: a % 2 === 0 ? '#1677ff' : '#52c41a' }}>
                              {APPRAISER_NAMES[a]} T{t + 1}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: n }, (_, p) => (
                        <tr key={p} style={{ background: p % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={tdStyle}>零件 {p + 1}</td>
                          {Array.from({ length: k }, (_, a) =>
                            Array.from({ length: r }, (_, t) => (
                              <td key={`${a}-${t}`} style={tdStyle}>
                                <InputNumber
                                  value={isNaN(data[a]?.[p]?.[t]) ? undefined : data[a][p][t]}
                                  onChange={v => handleDataChange(a, p, t, v)}
                                  style={{ width: 80 }}
                                  size="small"
                                  precision={4}
                                />
                              </td>
                            ))
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ),
          },
          {
            key: 'results',
            label: results ? `计算结果（%GRR: ${results.pctGRR}%）` : '计算结果',
            children: !results ? (
              <Alert type="info" showIcon message="请先在「数据录入」标签页填写数据，然后点击「计算 GR&R」按钮" />
            ) : (
              <div>
                {/* 核心结论 */}
                <Card style={{ marginBottom: 16, borderLeft: `4px solid ${getGRRStatus(results.pctGRR).tagColor}` }}>
                  <Row gutter={16} align="middle">
                    <Col xs={24} md={8}>
                      <Statistic
                        title="%GRR（测量系统变差占比）"
                        value={results.pctGRR}
                        suffix="%"
                        valueStyle={{ color: getGRRStatus(results.pctGRR).tagColor, fontSize: 36 }}
                      />
                      <Tag color={getGRRStatus(results.pctGRR).tagColor} style={{ marginTop: 8, fontSize: 14, padding: '2px 12px' }}>
                        {getGRRStatus(results.pctGRR).label}
                      </Tag>
                    </Col>
                    <Col xs={24} md={8}>
                      <Statistic title="可区分类别数 NDC" value={results.NDC} suffix="类"
                        valueStyle={{ color: results.NDC >= 5 ? '#52c41a' : '#f5222d' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>NDC ≥ 5 为合格（当前：{results.NDC >= 5 ? '✓ 合格' : '✗ 不合格'}）</Text>
                    </Col>
                    <Col xs={24} md={8}>
                      <Alert
                        type={results.pctGRR < 10 ? 'success' : results.pctGRR < 30 ? 'warning' : 'error'}
                        showIcon
                        message={results.pctGRR < 10
                          ? '测量系统优秀，可直接用于生产监控'
                          : results.pctGRR < 30
                            ? '测量系统可接受，建议评估是否需要改进'
                            : '测量系统不合格，必须整改后才能用于 SPC 分析'}
                      />
                    </Col>
                  </Row>
                </Card>

                {/* 详细结果表 */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={14}>
                    <Card title="变差分量汇总">
                      <Table
                        size="small"
                        pagination={false}
                        dataSource={[
                          { key: 'ev', component: '重复性 (EV)', value: results.EV.toFixed(4), pct: results.pctEV, note: '量具本身精度' },
                          { key: 'av', component: '再现性 (AV)', value: results.AV.toFixed(4), pct: results.pctAV, note: '操作员方法差异' },
                          { key: 'grr', component: 'GR&R（测量系统）', value: results.GRR.toFixed(4), pct: results.pctGRR, note: 'EV 和 AV 的合成', bold: true },
                          { key: 'pv', component: '零件变差 (PV)', value: results.PV.toFixed(4), pct: results.pctPV, note: '过程实际产生的变差' },
                          { key: 'tv', component: '总变差 (TV)', value: results.TV.toFixed(4), pct: 100, note: '所有变差合成' },
                        ]}
                        columns={[
                          {
                            title: '变差分量', dataIndex: 'component',
                          render: (v: string, r: ResultRow) => r.bold ? <Text strong>{v}</Text> : v,
                          },
                          { title: '标准差', dataIndex: 'value', width: 90 },
                          {
                            title: '% 占比', dataIndex: 'pct', width: 100,
                            render: (v: number, r: ResultRow) => {
                              const color = r.key === 'grr' ? (v < 10 ? '#52c41a' : v < 30 ? '#faad14' : '#f5222d') : '#1677ff';
                              return <Text strong style={{ color }}>{v}%</Text>;
                            },
                          },
                          { title: '含义', dataIndex: 'note', render: (v: string) => <Text type="secondary">{v}</Text> },
                        ]}
                      />
                      <Divider style={{ margin: '12px 0' }} />
                      <Row gutter={16}>
                        <Col span={12}><Text type="secondary">平均极差 R̄ = <Text strong>{results.rbar.toFixed(4)}</Text></Text></Col>
                        <Col span={12}><Text type="secondary">NDC = <Text strong style={{ color: results.NDC >= 5 ? '#52c41a' : '#f5222d' }}>{results.NDC}</Text></Text></Col>
                      </Row>
                    </Card>
                  </Col>
                  <Col xs={24} md={10}>
                    <Card title="评价人均值">
                      {results.appraiserMeans.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <Text>{APPRAISER_NAMES[i]}</Text>
                          <Text strong>{m.toFixed(4)}</Text>
                        </div>
                      ))}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">评价人间极差 (Xdiff)</Text>
                        <Text strong>{(Math.max(...results.appraiserMeans) - Math.min(...results.appraiserMeans)).toFixed(4)}</Text>
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* 柱状图 */}
                {chartOption && (
                  <Card title="变差分量占比图">
                    <ReactECharts option={chartOption} style={{ height: 280 }} />
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #e8e8e8',
  background: '#fafafa', fontWeight: 'bold', textAlign: 'center', fontSize: 12, whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid #f0f0f0', textAlign: 'center',
};

export default GaugeRR;
