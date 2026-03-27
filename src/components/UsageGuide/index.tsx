import React from 'react';
import {
  Card, Tabs, Typography, Table, Tag, Row, Col, Steps, Alert, Divider, Timeline,
} from 'antd';
import {
  LineChartOutlined, BarChartOutlined, BulbOutlined,
  CheckCircleOutlined, QuestionCircleOutlined, BookOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 控制图选择决策数据
const chartSelectionData = [
  {
    key: '1',
    scenario: '每次测量多个样本（子组）',
    dataType: '计量型，每组 2~9 个数据',
    chart: 'X-bar & R 图',
    suitable: true,
    example: '每小时抽取 5 个零件测量尺寸',
  },
  {
    key: '2',
    scenario: '每次只有一个测量值',
    dataType: '计量型，单个数据',
    chart: 'I-MR 图',
    suitable: true,
    example: '每批次只能测一个样品（破坏性测试）',
  },
  {
    key: '3',
    scenario: '测量周期长、生产批量小',
    dataType: '计量型，数据产生慢',
    chart: 'I-MR 图',
    suitable: true,
    example: '化工批次生产、大型铸件加工',
  },
  {
    key: '4',
    scenario: '子组内变差很小，组间变差大',
    dataType: '计量型，多个测量值',
    chart: 'X-bar & R 图（需注意分层）',
    suitable: true,
    example: '多工位、多料流生产',
  },
  {
    key: '5',
    scenario: '不良品数量统计',
    dataType: '计数型，不合格品数',
    chart: 'P 图 / np 图（待开发）',
    suitable: false,
    example: '焊点缺陷数/批次',
  },
  {
    key: '6',
    scenario: '缺陷点统计',
    dataType: '计数型，单位缺陷数',
    chart: 'C 图 / u 图（待开发）',
    suitable: false,
    example: '每平方米织物的疵点数',
  },
];

const chartSelectionColumns = [
  { title: '使用场景', dataIndex: 'scenario', width: 200 },
  { title: '数据类型', dataIndex: 'dataType', width: 200 },
  {
    title: '推荐控制图',
    dataIndex: 'chart',
    width: 160,
    render: (chart: string, record: { suitable: boolean }) => (
      <Tag color={record.suitable ? 'blue' : 'default'}>{chart}</Tag>
    ),
  },
  { title: '典型示例', dataIndex: 'example' },
  {
    title: '当前支持',
    dataIndex: 'suitable',
    width: 90,
    render: (v: boolean) => v
      ? <Tag color="success">已支持</Tag>
      : <Tag color="default">规划中</Tag>,
  },
];

// 异常模式数据
const anomalyPatterns = [
  {
    key: '1',
    pattern: '单点超出控制限',
    appearance: '一个点突破 UCL 或 LCL',
    meaning: '过程中发生了突发性异常',
    action: '立即排查设备、原料、操作是否有异常变化',
    level: 'critical',
  },
  {
    key: '2',
    pattern: '连续点在同侧',
    appearance: '≥9 点连续在中心线同侧',
    meaning: '过程均值发生了持续性偏移',
    action: '检查刀具磨损、材料批次切换、操作方法变更',
    level: 'warning',
  },
  {
    key: '3',
    pattern: '持续上升/下降趋势',
    appearance: '≥6 点连续单调递增或递减',
    meaning: '过程存在系统性漂移',
    action: '检查环境温度、刀具磨损、操作员疲劳效应',
    level: 'warning',
  },
  {
    key: '4',
    pattern: '锯齿状交替',
    appearance: '≥14 点交替上下波动',
    meaning: '两个交替变化的均值混入数据',
    action: '检查是否有两台设备交替使用、两批材料交替投入',
    level: 'warning',
  },
  {
    key: '5',
    pattern: '过于集中在中心',
    appearance: '≥15 点落在 ±1σ 以内',
    meaning: '数据被人为修改或测量系统分辨率不足',
    action: '检查测量系统精度，核实数据来源真实性',
    level: 'info',
  },
  {
    key: '6',
    pattern: '向外离散',
    appearance: '≥8 点落在 ±1σ 以外',
    meaning: '数据来自两个不同分布',
    action: '检查是否混批、多供应商材料混用',
    level: 'info',
  },
];

const anomalyColumns = [
  { title: '异常模式', dataIndex: 'pattern', width: 140 },
  { title: '图形表现', dataIndex: 'appearance', width: 180 },
  { title: '含义', dataIndex: 'meaning', width: 200 },
  { title: '建议措施', dataIndex: 'action' },
  {
    title: '严重程度',
    dataIndex: 'level',
    width: 90,
    render: (l: string) => {
      const map: Record<string, { color: string; label: string }> = {
        critical: { color: 'red', label: '严重' },
        warning: { color: 'orange', label: '警告' },
        info: { color: 'blue', label: '提示' },
      };
      return <Tag color={map[l].color}>{map[l].label}</Tag>;
    },
  },
];

// 过程能力判定标准
const capabilityStandards = [
  { range: 'CPK ≥ 1.67', grade: 'A 级', desc: '过程能力非常充足，可考虑放宽检验', color: '#52c41a' },
  { range: '1.33 ≤ CPK < 1.67', grade: 'B 级', desc: '过程能力充足，维持现状并持续监控', color: '#1677ff' },
  { range: '1.00 ≤ CPK < 1.33', grade: 'C 级', desc: '过程能力勉强可接受，需加强监控', color: '#faad14' },
  { range: '0.67 ≤ CPK < 1.00', grade: 'D 级', desc: '过程能力不足，须立即采取改进措施', color: '#ff7a45' },
  { range: 'CPK < 0.67', grade: 'E 级', desc: '过程能力严重不足，产品无法满足规格要求', color: '#f5222d' },
];

const UsageGuide: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <BookOutlined style={{ marginRight: 8 }} />
        SPC 使用说明与控制图指南
      </Title>

      <Tabs
        defaultActiveKey="select"
        items={[
          {
            key: 'select',
            label: <span><QuestionCircleOutlined /> 如何选择控制图</span>,
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  message="控制图选择的核心原则：根据数据类型（计量型 vs 计数型）和每次采样数量来决定"
                  style={{ marginBottom: 20 }}
                />

                {/* 决策流程 */}
                <Card title="快速决策流程" style={{ marginBottom: 16 }}>
                  <Steps
                    direction="vertical"
                    size="small"
                    items={[
                      {
                        title: '第一步：判断数据类型',
                        description: '计量型（连续数据，如尺寸、重量、温度）→ 继续下一步；计数型（离散数据，如不良品数）→ 使用 P/np/C/u 图',
                        status: 'process',
                        icon: <span style={{ fontSize: 14, fontWeight: 'bold', color: '#1677ff' }}>1</span>,
                      },
                      {
                        title: '第二步：判断每次抽样数量',
                        description: '每次抽取 2~9 个样品（子组数据）→ X-bar & R 图；每次只有 1 个数据 → I-MR 图',
                        status: 'process',
                        icon: <span style={{ fontSize: 14, fontWeight: 'bold', color: '#1677ff' }}>2</span>,
                      },
                      {
                        title: '第三步：考虑生产节拍',
                        description: '生产速度快、每小时/每批可抽多个 → 优先 X-bar & R；生产慢、破坏性测试、批量小 → 使用 I-MR',
                        status: 'process',
                        icon: <span style={{ fontSize: 14, fontWeight: 'bold', color: '#1677ff' }}>3</span>,
                      },
                      {
                        title: '第四步：确认子组大小',
                        description: 'X-bar & R 图推荐子组大小 n=4 或 5，可代表短期变差；过大的子组会掩盖过程变化',
                        status: 'process',
                        icon: <span style={{ fontSize: 14, fontWeight: 'bold', color: '#1677ff' }}>4</span>,
                      },
                    ]}
                  />
                </Card>

                {/* 选择对比表 */}
                <Card title="控制图选择对照表">
                  <Table
                    dataSource={chartSelectionData}
                    columns={chartSelectionColumns}
                    pagination={false}
                    size="middle"
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'xbar-r',
            label: <span><LineChartOutlined /> X-bar & R 图</span>,
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Alert
                      type="success"
                      showIcon
                      message="X-bar & R 图是最常用的计量型控制图，适用于子组数据（每次抽取 2~9 个样品）"
                      style={{ marginBottom: 16 }}
                    />
                  </Col>

                  {/* X-bar 图说明 */}
                  <Col xs={24} lg={12}>
                    <Card title="均值图 (X-bar)" style={{ height: '100%' }}>
                      <Paragraph><Text strong>用途：</Text>监控过程均值的变化</Paragraph>
                      <Paragraph><Text strong>控制限计算：</Text></Paragraph>
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'monospace', marginBottom: 12 }}>
                        UCL = X̄̄ + A₂ × R̄<br />
                        CL  = X̄̄<br />
                        LCL = X̄̄ - A₂ × R̄<br />
                        <br />
                        A₂ 为控制图常数（n=5 时 A₂=0.577）
                      </div>
                      <Paragraph><Text strong>判读要点：</Text></Paragraph>
                      <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
                        <li>点在控制限内且随机分布 → 过程稳定</li>
                        <li>点超出控制限 → 存在特殊原因</li>
                        <li>持续上升/下降趋势 → 均值在漂移</li>
                        <li>连续点在同侧 → 均值已偏移</li>
                      </ul>
                    </Card>
                  </Col>

                  {/* R 图说明 */}
                  <Col xs={24} lg={12}>
                    <Card title="极差图 (R)" style={{ height: '100%' }}>
                      <Paragraph><Text strong>用途：</Text>监控过程离散程度（组内变差）</Paragraph>
                      <Paragraph><Text strong>控制限计算：</Text></Paragraph>
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'monospace', marginBottom: 12 }}>
                        UCL = D₄ × R̄<br />
                        CL  = R̄<br />
                        LCL = D₃ × R̄（n≤6 时 LCL=0）<br />
                        <br />
                        D₃、D₄ 为控制图常数
                      </div>
                      <Paragraph><Text strong>重要提示：</Text></Paragraph>
                      <Alert
                        type="warning"
                        message="必须先分析 R 图！只有当 R 图受控时，X-bar 图的分析才有意义。若 R 图失控，表明组内变差不稳定，X-bar 图的控制限也不可靠。"
                        showIcon
                        style={{ marginBottom: 8 }}
                      />
                    </Card>
                  </Col>

                  {/* 使用步骤 */}
                  <Col span={24}>
                    <Card title="X-bar & R 图分析步骤">
                      <Steps
                        size="small"
                        items={[
                          { title: '收集数据', description: '建议至少 25 个子组（共 100+ 个测量值），每组 4~5 个样品' },
                          { title: '计算组内均值和极差', description: '每个子组分别计算 X̄ 和 R' },
                          { title: '计算总均值和平均极差', description: '计算 X̄̄（所有组均值的平均）和 R̄（所有组极差的平均）' },
                          { title: '计算控制限', description: '使用 A₂、D₃、D₄ 常数计算 UCL、CL、LCL' },
                          { title: '先分析 R 图', description: '确认极差图受控（无异常点），才进行下一步' },
                          { title: '再分析 X-bar 图', description: '检查均值图是否有异常点或异常模式' },
                          { title: '持续监控', description: '建立控制限后，用于后续生产的实时监控' },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'imr',
            label: <span><BarChartOutlined /> I-MR 图</span>,
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Alert
                      type="info"
                      showIcon
                      message="I-MR 图（单值移动极差图）适用于每次只有一个测量值的场景，是连续生产中最常见的单值控制图"
                      style={{ marginBottom: 16 }}
                    />
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="单值图 (I - Individuals)">
                      <Paragraph><Text strong>用途：</Text>监控单个测量值的变化</Paragraph>
                      <Paragraph><Text strong>控制限计算：</Text></Paragraph>
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'monospace', marginBottom: 12 }}>
                        UCL = X̄ + 2.660 × MR̄<br />
                        CL  = X̄<br />
                        LCL = X̄ - 2.660 × MR̄<br />
                        <br />
                        系数 2.660 = 3/d₂ (d₂=1.128，n=2)
                      </div>
                      <Paragraph><Text strong>适用场景：</Text></Paragraph>
                      <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
                        <li>破坏性测试（测完即损坏）</li>
                        <li>化工/制药批次生产</li>
                        <li>大型铸件、锻件单件加工</li>
                        <li>生产节拍极慢（每天/每周一个）</li>
                        <li>自动化在线 100% 测量</li>
                      </ul>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title="移动极差图 (MR)">
                      <Paragraph><Text strong>用途：</Text>监控相邻两个测量值之间的变差</Paragraph>
                      <Paragraph><Text strong>控制限计算：</Text></Paragraph>
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'monospace', marginBottom: 12 }}>
                        UCL = D₄ × MR̄ = 3.267 × MR̄<br />
                        CL  = MR̄<br />
                        LCL = 0（D₃=0，n=2）<br />
                        <br />
                        MRᵢ = |Xᵢ - Xᵢ₋₁|
                      </div>
                      <Alert
                        type="warning"
                        showIcon
                        message="I-MR 图对数据正态性要求较高。如果数据严重偏态，控制限会不准确，建议先进行正态性检验。"
                      />
                    </Card>
                  </Col>

                  {/* X-bar&R vs I-MR 对比 */}
                  <Col span={24}>
                    <Card title="X-bar & R 图 vs I-MR 图 对比">
                      <Table
                        pagination={false}
                        size="middle"
                        dataSource={[
                          { key: '1', item: '适用数据', xbar: '子组数据（n=2~9）', imr: '单个测量值（n=1）' },
                          { key: '2', item: '灵敏度', xbar: '较高（均值图更敏感）', imr: '较低（对小偏移不敏感）' },
                          { key: '3', item: '对正态性要求', xbar: '较低（中心极限定理）', imr: '较高' },
                          { key: '4', item: '样本量需求', xbar: '25 组 × n 个 = 100+ 个', imr: '25~30 个单值' },
                          { key: '5', item: '过程能力评估', xbar: 'CP/CPK 更准确', imr: '需验证正态性' },
                          { key: '6', item: '典型行业', xbar: '机加工、注塑、冲压', imr: '化工、制药、铸造' },
                        ]}
                        columns={[
                          { title: '比较项目', dataIndex: 'item', width: 150 },
                          { title: 'X-bar & R 图', dataIndex: 'xbar', render: (v: string) => <Text style={{ color: '#1677ff' }}>{v}</Text> },
                          { title: 'I-MR 图', dataIndex: 'imr', render: (v: string) => <Text style={{ color: '#52c41a' }}>{v}</Text> },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'patterns',
            label: <span><BulbOutlined /> 图形判读与过程能力</span>,
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  {/* 异常模式 */}
                  <Col span={24}>
                    <Card title="8 大异常模式判读（Western Electric 准则）" style={{ marginBottom: 0 }}>
                      <Table
                        dataSource={anomalyPatterns}
                        columns={anomalyColumns}
                        pagination={false}
                        size="middle"
                      />
                    </Card>
                  </Col>

                  {/* 过程能力标准 */}
                  <Col span={24}>
                    <Card title="过程能力指数（CPK）评价标准">
                      <Row gutter={[12, 12]}>
                        {capabilityStandards.map(s => (
                          <Col xs={24} sm={12} md={8} lg={4} key={s.grade}>
                            <div style={{
                              border: `2px solid ${s.color}`,
                              borderRadius: 8,
                              padding: 12,
                              textAlign: 'center',
                              height: '100%',
                            }}>
                              <div style={{ fontSize: 18, fontWeight: 'bold', color: s.color, marginBottom: 4 }}>{s.grade}</div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{s.range}</div>
                              <div style={{ fontSize: 11, color: '#888' }}>{s.desc}</div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>

                  {/* 分析流程 */}
                  <Col span={24}>
                    <Card title="SPC 完整分析流程建议">
                      <Timeline
                        items={[
                          {
                            color: 'blue',
                            children: (
                              <div>
                                <Text strong>阶段一：数据收集</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  收集 25 组以上数据，确保数据来自稳定的测量系统（先做 MSA）。
                                  记录时间戳和批次信息，便于追溯。
                                </Paragraph>
                              </div>
                            ),
                          },
                          {
                            color: 'blue',
                            children: (
                              <div>
                                <Text strong>阶段二：初始控制图（第一阶段）</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  用历史数据建立初始控制限。先分析 R/MR 图，若受控再分析 X-bar/I 图。
                                  排除可查明原因的异常点后重新计算控制限。
                                </Paragraph>
                              </div>
                            ),
                          },
                          {
                            color: 'green',
                            children: (
                              <div>
                                <Text strong>阶段三：过程能力分析</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  过程受控后计算 CPK。CPK ≥ 1.33 才具有统计意义上的分析价值。
                                  如果过程失控，不应计算 CPK。
                                </Paragraph>
                              </div>
                            ),
                          },
                          {
                            color: 'green',
                            children: (
                              <div>
                                <Text strong>阶段四：持续监控（第二阶段）</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  以第一阶段的控制限监控后续生产。发现异常立即分析原因并纠正。
                                  定期（每季度或每批次）重新评估控制限。
                                </Paragraph>
                              </div>
                            ),
                          },
                          {
                            color: 'gray',
                            children: (
                              <div>
                                <Text strong>持续改进</Text>
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                  消除特殊原因 → 减少普通原因 → CPK 持续提升 → 降低检验频率。
                                </Paragraph>
                              </div>
                            ),
                          },
                        ]}
                      />
                      <Divider />
                      <Alert
                        type="warning"
                        showIcon
                        icon={<CheckCircleOutlined />}
                        message="黄金法则：先使过程受控（控制图），再评价过程能力（CPK）。失控的过程没有稳定的能力指数。"
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default UsageGuide;
