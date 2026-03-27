import React from 'react';
import {
  Card, Row, Col, Typography, Tag, Table, Alert, Tabs, Steps, Statistic, Space, Divider,
} from 'antd';
import {
  ExperimentOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// MSA 研究类型
const msaStudyTypes = [
  {
    key: '1',
    type: 'Gauge R&R（量具重复性与再现性）',
    purpose: '评价测量系统的重复性和再现性',
    when: '新量具验收、量具定期校验、过程改进前',
    method: '多人、多次、多零件测量',
    criteria: '%GRR < 10% 优；10~30% 可接受；> 30% 不合格',
    status: '已实现',
    color: 'success',
  },
  {
    key: '2',
    type: '偏倚分析（Bias）',
    purpose: '评估测量值与真实值的系统偏差',
    when: '量具首次使用、怀疑存在系统误差时',
    method: '用标准件重复测量 N 次，与参考值比较',
    criteria: 'Bias / TV < 5% 可接受',
    status: '已实现',
    color: 'success',
  },
  {
    key: '3',
    type: '线性分析（Linearity）',
    purpose: '评估在整个量程范围内偏倚是否一致',
    when: '量程范围宽、不同测量范围精度要求不同',
    method: '在不同尺寸点各测量多次',
    criteria: '线性回归斜率接近 0，R² > 0.9',
    status: '规划中',
    color: 'default',
  },
  {
    key: '4',
    type: '稳定性分析（Stability）',
    purpose: '评估量具随时间的一致性',
    when: '量具使用一段时间后定期评估',
    method: '定期（如每周）对同一标准件测量',
    criteria: '控制图中无趋势或异常点',
    status: '规划中',
    color: 'default',
  },
];

const msaColumns = [
  { title: 'MSA 研究类型', dataIndex: 'type', width: 220 },
  { title: '研究目的', dataIndex: 'purpose', width: 200 },
  { title: '实施时机', dataIndex: 'when', width: 200 },
  { title: '合格标准', dataIndex: 'criteria' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    render: (v: string, record: { color: string }) => <Tag color={record.color}>{v}</Tag>,
  },
];

// GRR 判定标准
const grrCriteria = [
  { range: '< 10%', grade: '优秀', desc: '测量系统无需改进，可用于生产', color: '#52c41a', action: '直接使用' },
  { range: '10% ~ 30%', grade: '可接受', desc: '视成本和重要性决定是否改进', color: '#faad14', action: '评估后决策' },
  { range: '> 30%', grade: '不合格', desc: '测量系统需立即改进或更换', color: '#f5222d', action: '必须整改' },
];

// 影响测量系统的因素
const influenceFactors = [
  { factor: '量具分辨率不足', effect: '读数粗糙，无法区分相邻公差等级', improve: '换用精度更高的量具' },
  { factor: '操作员方法不一致', effect: '再现性差（AV%高）', improve: '制定统一的测量操作规程，培训操作员' },
  { factor: '量具磨损或损坏', effect: '重复性差（EV%高）', improve: '校准或更换量具' },
  { factor: '零件定位不稳定', effect: '重复性差，数据离散', improve: '使用夹具固定零件，规范测量基准' },
  { factor: '环境变化（温度、振动）', effect: '测量值随环境漂移', improve: '控制测量环境，量具热平衡' },
  { factor: '零件本身变化', effect: '零件间差异被误认为量具误差', improve: '使用稳定的标准件，分析零件一致性' },
];

const factorColumns = [
  { title: '影响因素', dataIndex: 'factor', width: 180 },
  { title: '对测量的影响', dataIndex: 'effect', width: 200 },
  { title: '改进措施', dataIndex: 'improve' },
];

const MSAOverview: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <ExperimentOutlined style={{ marginRight: 8 }} />
        MSA 测量系统分析 — 概览
      </Title>

      <Alert
        type="info"
        showIcon
        message="MSA（Measurement System Analysis）是在进行 SPC 分析前必须完成的基础工作。一个不可信的测量系统会导致错误的过程决策。"
        style={{ marginBottom: 20 }}
      />

      <Tabs
        defaultActiveKey="intro"
        items={[
          {
            key: 'intro',
            label: '什么是 MSA',
            children: (
              <Row gutter={[16, 16]}>
                {/* 核心概念 */}
                <Col xs={24} md={8}>
                  <Card style={{ height: '100%', borderTop: '3px solid #1677ff' }}>
                    <Statistic title="重复性 (EV)" value="Repeatability" valueStyle={{ fontSize: 18, color: '#1677ff' }} />
                    <Divider style={{ margin: '12px 0' }} />
                    <Paragraph style={{ fontSize: 13 }}>
                      <Text strong>定义：</Text>同一操作员用同一量具对同一零件重复测量的变差<br />
                      <Text strong>代表：</Text>量具本身的精度（设备变差 EV）<br />
                      <Text strong>公式：</Text>EV = R̄ × K₁
                    </Paragraph>
                    <Tag color="blue" icon={<InfoCircleOutlined />}>量具固有精度</Tag>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card style={{ height: '100%', borderTop: '3px solid #52c41a' }}>
                    <Statistic title="再现性 (AV)" value="Reproducibility" valueStyle={{ fontSize: 18, color: '#52c41a' }} />
                    <Divider style={{ margin: '12px 0' }} />
                    <Paragraph style={{ fontSize: 13 }}>
                      <Text strong>定义：</Text>不同操作员用同一量具对同一零件测量结果的变差<br />
                      <Text strong>代表：</Text>操作员使用方法的差异（评价人变差 AV）<br />
                      <Text strong>公式：</Text>AV = √[(X̄diff × K₂)² - EV²/(n×r)]
                    </Paragraph>
                    <Tag color="green" icon={<InfoCircleOutlined />}>操作员技能差异</Tag>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card style={{ height: '100%', borderTop: '3px solid #faad14' }}>
                    <Statistic title="零件变差 (PV)" value="Part Variation" valueStyle={{ fontSize: 18, color: '#faad14' }} />
                    <Divider style={{ margin: '12px 0' }} />
                    <Paragraph style={{ fontSize: 13 }}>
                      <Text strong>定义：</Text>被测零件之间的实际差异<br />
                      <Text strong>代表：</Text>过程产生的零件差异（零件变差 PV）<br />
                      <Text strong>公式：</Text>PV = Rₚ × K₃
                    </Paragraph>
                    <Tag color="orange" icon={<InfoCircleOutlined />}>过程实际变差</Tag>
                  </Card>
                </Col>

                {/* 变差分解 */}
                <Col span={24}>
                  <Card title="测量系统变差分解图">
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ background: '#e6f4ff', border: '2px solid #1677ff', borderRadius: 8, padding: '12px 20px', minWidth: 200 }}>
                          <div style={{ fontWeight: 'bold', color: '#1677ff', marginBottom: 4 }}>总变差 (TV)</div>
                          <div style={{ fontSize: 12, color: '#666' }}>TV = √(GRR² + PV²)</div>
                        </div>
                        <Text style={{ fontSize: 20 }}>=</Text>
                        <div style={{ background: '#fff7e6', border: '2px solid #faad14', borderRadius: 8, padding: '12px 20px', minWidth: 200 }}>
                          <div style={{ fontWeight: 'bold', color: '#faad14', marginBottom: 4 }}>GR&R 变差</div>
                          <div style={{ fontSize: 12, color: '#666' }}>GRR = √(EV² + AV²)</div>
                        </div>
                        <Text style={{ fontSize: 20 }}>+</Text>
                        <div style={{ background: '#f6ffed', border: '2px solid #52c41a', borderRadius: 8, padding: '12px 20px', minWidth: 200 }}>
                          <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: 4 }}>零件变差 (PV)</div>
                          <div style={{ fontSize: 12, color: '#666' }}>PV = Rₚ × K₃</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                        <div style={{ background: '#fff7e6', border: '1px dashed #faad14', borderRadius: 8, padding: '8px 16px' }}>
                          <div style={{ fontSize: 12, color: '#fa8c16' }}>GRR = EV (重复性) + AV (再现性)</div>
                        </div>
                      </div>
                    </div>
                    <Divider />
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text strong>关键指标：NDC（可区分的类别数）</Text>
                        <Paragraph style={{ marginTop: 8 }}>
                          NDC = 1.41 × (PV / GRR)，向下取整<br />
                          <Text type="secondary">NDC ≥ 5：测量系统可以有效区分零件差异<br />
                          NDC &lt; 5：测量系统分辨率不足</Text>
                        </Paragraph>
                      </Col>
                      <Col span={12}>
                        <Text strong>%GRR 计算：</Text>
                        <Paragraph style={{ marginTop: 8 }}>
                          %GRR = (GRR / TV) × 100%<br />
                          <Text type="secondary">这是评价测量系统的最核心指标</Text>
                        </Paragraph>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'criteria',
            label: '判定标准',
            children: (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="%GRR 接受标准（AIAG MSA 手册）">
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      {grrCriteria.map(c => (
                        <Col xs={24} md={8} key={c.grade}>
                          <div style={{
                            border: `2px solid ${c.color}`,
                            borderRadius: 8,
                            padding: 20,
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 28, fontWeight: 'bold', color: c.color }}>{c.range}</div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', margin: '8px 0' }}>{c.grade}</div>
                            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{c.desc}</div>
                            <Tag color={c.color === '#52c41a' ? 'success' : c.color === '#faad14' ? 'warning' : 'error'}>
                              {c.action}
                            </Tag>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <Alert
                      type="warning"
                      showIcon
                      message="注意：10%~30% 区间是否可接受，需结合产品重要性、改进成本综合判断。安全相关、高价值产品应追求 < 10%。"
                    />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="MSA 研究类型总览">
                    <Table
                      dataSource={msaStudyTypes}
                      columns={msaColumns}
                      pagination={false}
                      size="middle"
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'bias',
            label: '偏倚分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Alert
                    type="info"
                    showIcon
                    message="偏倚（Bias）是测量值的均值与参考值（真值）之差。正偏倚表示测量值系统性偏高，负偏倚表示偏低。"
                    style={{ marginBottom: 16 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Card title="偏倚分析步骤">
                    <Steps
                      direction="vertical"
                      size="small"
                      items={[
                        { title: '获取参考值', description: '使用经过溯源的标准件，其参考值由更高精度量具确定', status: 'process' },
                        { title: '重复测量', description: '用被评价量具对标准件重复测量 ≥ 10 次（推荐 25 次）', status: 'process' },
                        { title: '计算偏倚', description: 'Bias = 测量均值 - 参考值', status: 'process' },
                        { title: '评估显著性', description: '使用 t 检验判断偏倚是否统计显著', status: 'process' },
                        { title: '计算 %偏倚', description: '%Bias = |Bias / TV| × 100%', status: 'process' },
                        { title: '判定是否合格', description: '%Bias < 5% 可接受，否则需校准量具', status: 'process' },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="偏倚计算公式">
                    <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontFamily: 'monospace', marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}><strong>偏倚 (Bias)：</strong></div>
                      Bias = X̄测量 - 参考值<br />
                      <br />
                      <div style={{ marginBottom: 8 }}><strong>重复性 (σ_r)：</strong></div>
                      σ_r = s（测量值的标准差）<br />
                      <br />
                      <div style={{ marginBottom: 8 }}><strong>偏倚显著性 t 检验：</strong></div>
                      t = Bias / (σ_r / √n)<br />
                      若 |t| &gt; t(α/2, n-1)，偏倚显著<br />
                      <br />
                      <div style={{ marginBottom: 8 }}><strong>%偏倚：</strong></div>
                      %Bias = |Bias / TV| × 100%
                    </div>
                    <Alert
                      type="info"
                      showIcon
                      message="TV（总变差）= 6σ，或使用公差范围代替。行业惯例：用公差范围（USL-LSL）作为分母计算%偏倚。"
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'factors',
            label: '影响因素',
            children: (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="影响测量系统的常见因素">
                    <Table
                      dataSource={influenceFactors.map((f, i) => ({ ...f, key: i }))}
                      columns={factorColumns}
                      pagination={false}
                      size="middle"
                    />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card title="MSA 实施建议">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Alert showIcon icon={<CheckCircleOutlined />} type="success"
                            message="推荐做法"
                            description={
                              <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                                <li>在 SPC 分析之前先完成 MSA</li>
                                <li>操作员不知道哪个零件是哪个（盲测）</li>
                                <li>随机化测量顺序，避免顺序效应</li>
                                <li>使用代表过程实际变差范围的零件</li>
                                <li>每年或设备变更后重新评估</li>
                              </ul>
                            }
                          />
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Alert showIcon icon={<WarningOutlined />} type="warning"
                            message="常见错误"
                            description={
                              <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                                <li>零件变差范围太小（所有零件几乎一样）</li>
                                <li>操作员知道其他人的测量结果（影响客观性）</li>
                                <li>测量环境与实际生产环境不一致</li>
                                <li>只测一个操作员（无法评估再现性）</li>
                                <li>零件数量太少（&lt; 10 个零件）</li>
                              </ul>
                            }
                          />
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default MSAOverview;
