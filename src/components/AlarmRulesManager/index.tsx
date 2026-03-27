import React, { useState } from 'react';
import {
  Card, Table, Switch, Select, Space, Typography, Tag, Button, Modal,
  Form, Input, InputNumber, Tabs, Row, Col, Statistic, Popconfirm,
  message, Collapse, Alert,
} from 'antd';
import {
  BellOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { SPCParameters, CustomAlarmRule } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface StandardRuleDef {
  id: number;
  name: string;
  shortDesc: string;
  detail: string;
  example: string;
  defaultLevel: 'critical' | 'warning' | 'info';
}

const STANDARD_RULES: StandardRuleDef[] = [
  {
    id: 1,
    name: '超出控制限',
    shortDesc: '1点超出3σ控制限',
    detail: '任意一个点落在上控制限(UCL)或下控制限(LCL)之外。这是最基本、最重要的判异准则，超出概率约0.27%，表明存在特殊原因。',
    example: '设备故障、原材料异常、操作失误等突发性变化。',
    defaultLevel: 'critical',
  },
  {
    id: 2,
    name: '连续同侧',
    shortDesc: '9点在中心线同侧',
    detail: '连续9个点落在中心线的同一侧（均在上方或均在下方）。表明过程均值发生了偏移，概率约0.39%。',
    example: '工具磨损、原材料批次变化、操作方法改变等系统性偏移。',
    defaultLevel: 'warning',
  },
  {
    id: 3,
    name: '持续趋势',
    shortDesc: '6点持续上升或下降',
    detail: '连续6个点呈现单调递增或单调递减趋势。表明过程存在系统性漂移，概率约0.27%。',
    example: '刀具磨损、环境温度变化、操作员疲劳等趋势性变化。',
    defaultLevel: 'warning',
  },
  {
    id: 4,
    name: '交替振荡',
    shortDesc: '14点交替上下',
    detail: '连续14个点交替地上下变化（呈锯齿状）。可能存在两个交替的均值或周期性干扰，概率约0.006%。',
    example: '两台设备交替使用、两个供应商材料交替、班次差异等周期性变化。',
    defaultLevel: 'warning',
  },
  {
    id: 5,
    name: '2σ区域异常',
    shortDesc: '3中2点在2σ以上（同侧）',
    detail: '连续3个点中有2个点落在中心线2σ以外区域（同侧）。表明过程均值可能已偏移，概率约0.44%。',
    example: '比规则1更灵敏的早期过程均值偏移检测。',
    defaultLevel: 'warning',
  },
  {
    id: 6,
    name: '1σ区域异常',
    shortDesc: '5中4点在1σ以上（同侧）',
    detail: '连续5个点中有4个点落在中心线1σ以外区域（同侧）。表明过程均值存在小幅持续偏移，概率约0.54%。',
    example: '检测过程均值的微小持续偏移，灵敏度高于规则2。',
    defaultLevel: 'info',
  },
  {
    id: 7,
    name: '1σ内集中',
    shortDesc: '15点在±1σ范围内',
    detail: '连续15个点都落在中心线±1σ区域内。虽看似稳定，但可能表明数据分层、测量系统问题或数据被修改，概率约0.32%。',
    example: '数据分层现象、测量精度不足、数据被人为修改等异常情况。',
    defaultLevel: 'info',
  },
  {
    id: 8,
    name: '1σ外离散',
    shortDesc: '8点在±1σ范围外',
    detail: '连续8个点都落在中心线±1σ区域外（两侧均可）。表明数据分布异常，可能存在混合分布，概率约0.15%。',
    example: '数据来自两个不同总体、两个设备混合生产、混批等情况。',
    defaultLevel: 'warning',
  },
];

const LEVEL_COLORS: Record<string, string> = { critical: 'red', warning: 'orange', info: 'blue' };
const LEVEL_LABELS: Record<string, string> = { critical: '严重', warning: '警告', info: '提示' };

const RULE_TYPE_LABELS: Record<string, string> = {
  consecutive_outside: '连续N点超出Xσ',
  n_of_m_outside: 'M中N点超出Xσ',
  consecutive_inside: '连续N点在Xσ内',
  consecutive_alternating: '连续N点交替变化',
};

interface AlarmRulesManagerProps {
  parameters: SPCParameters;
  onParametersChange: (params: SPCParameters) => void;
}

const AlarmRulesManager: React.FC<AlarmRulesManagerProps> = ({ parameters, onParametersChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomAlarmRule | null>(null);
  const [form] = Form.useForm();

  const alarmLevels = parameters.alarmLevels || {};
  const customRules = parameters.customAlarmRules || [];
  const enabledRules = parameters.anomalyRules;

  const getRuleLevel = (id: number): 'critical' | 'warning' | 'info' => {
    if (alarmLevels[id]) return alarmLevels[id];
    return STANDARD_RULES.find(r => r.id === id)?.defaultLevel || 'warning';
  };

  const handleToggleRule = (id: number, enabled: boolean) => {
    const newRules = enabled
      ? [...enabledRules, id].sort((a, b) => a - b)
      : enabledRules.filter(r => r !== id);
    onParametersChange({ ...parameters, anomalyRules: newRules });
  };

  const handleLevelChange = (id: number, level: 'critical' | 'warning' | 'info') => {
    onParametersChange({ ...parameters, alarmLevels: { ...alarmLevels, [id]: level } });
  };

  const handleResetDefaults = () => {
    onParametersChange({
      ...parameters,
      anomalyRules: [1, 2, 3, 4, 5, 6, 7, 8],
      alarmLevels: {},
      customAlarmRules: [],
    });
    message.success('已恢复默认报警规则设置');
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    form.setFieldsValue({
      level: 'warning', ruleType: 'consecutive_outside',
      totalCount: 3, sigmaThreshold: 2, enabled: true,
    });
    setModalVisible(true);
  };

  const handleOpenEdit = (rule: CustomAlarmRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalVisible(true);
  };

  const handleDeleteCustomRule = (id: number) => {
    onParametersChange({ ...parameters, customAlarmRules: customRules.filter(r => r.id !== id) });
    message.success('已删除自定义规则');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRule) {
        const updated = customRules.map(r => r.id === editingRule.id ? { ...r, ...values } : r);
        onParametersChange({ ...parameters, customAlarmRules: updated });
        message.success('已更新自定义规则');
      } else {
        const newId = customRules.length > 0 ? Math.max(...customRules.map(r => r.id)) + 1 : 101;
        onParametersChange({ ...parameters, customAlarmRules: [...customRules, { ...values, id: newId }] });
        message.success('已添加自定义规则');
      }
      setModalVisible(false);
    } catch (_) { /* form validation */ }
  };

  // 统计数据
  const enabledStandardCount = enabledRules.filter(id => id <= 8).length;
  const enabledCustomCount = customRules.filter(r => r.enabled).length;
  const criticalCount = STANDARD_RULES.filter(r => enabledRules.includes(r.id) && getRuleLevel(r.id) === 'critical').length;
  const disabledCount = 8 - enabledStandardCount;

  const standardColumns = [
    {
      title: '规则',
      dataIndex: 'id',
      width: 72,
      render: (id: number) => <Tag color="blue" style={{ fontWeight: 'bold' }}>规则 {id}</Tag>,
    },
    {
      title: '名称 / 触发条件',
      width: 180,
      render: (_: unknown, record: StandardRuleDef) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.shortDesc}</Text>
        </Space>
      ),
    },
    {
      title: '规则说明',
      dataIndex: 'detail',
      render: (detail: string) => <Text style={{ fontSize: 12 }}>{detail}</Text>,
    },
    {
      title: '报警级别',
      width: 110,
      render: (_: unknown, record: StandardRuleDef) => (
        <Select
          value={getRuleLevel(record.id)}
          onChange={(val: 'critical' | 'warning' | 'info') => handleLevelChange(record.id, val)}
          style={{ width: 90 }}
          size="small"
        >
          <Option value="critical"><Tag color="red">严重</Tag></Option>
          <Option value="warning"><Tag color="orange">警告</Tag></Option>
          <Option value="info"><Tag color="blue">提示</Tag></Option>
        </Select>
      ),
    },
    {
      title: '启用',
      width: 65,
      render: (_: unknown, record: StandardRuleDef) => (
        <Switch
          size="small"
          checked={enabledRules.includes(record.id)}
          onChange={(checked) => handleToggleRule(record.id, checked)}
        />
      ),
    },
  ];

  const customColumns = [
    { title: '规则名称', dataIndex: 'name', width: 140 },
    { title: '描述', dataIndex: 'description' },
    {
      title: '条件',
      width: 180,
      render: (_: unknown, record: CustomAlarmRule) => {
        const label = RULE_TYPE_LABELS[record.ruleType] || record.ruleType;
        const params = record.ruleType === 'n_of_m_outside'
          ? `${record.totalCount}中${record.triggerCount}点超出±${record.sigmaThreshold}σ`
          : `${label.replace('N', String(record.totalCount)).replace('X', String(record.sigmaThreshold)).replace('M', String(record.totalCount))}`;
        return <Text style={{ fontSize: 12 }}>{params}</Text>;
      },
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 75,
      render: (level: string) => <Tag color={LEVEL_COLORS[level]}>{LEVEL_LABELS[level]}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 70,
      render: (enabled: boolean) => <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      width: 130,
      render: (_: unknown, record: CustomAlarmRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此规则？" onConfirm={() => handleDeleteCustomRule(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          报警规则管理
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleResetDefaults}>恢复默认</Button>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="已启用规则" value={enabledStandardCount + enabledCustomCount} suffix="条" valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="严重级别" value={criticalCount} suffix="条" valueStyle={{ color: '#f5222d' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="自定义规则" value={customRules.length} suffix="条" valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已禁用" value={disabledCount} suffix="条" valueStyle={{ color: '#8c8c8c' }} /></Card>
        </Col>
      </Row>

      {/* 主内容 Tabs */}
      <Tabs
        defaultActiveKey="standard"
        items={[
          {
            key: 'standard',
            label: '标准判异规则（8条）',
            children: (
              <Card>
                <Alert
                  type="info"
                  showIcon
                  message="以下8条规则基于西屋电气（Western Electric）判异准则，是SPC领域的工业标准。可按需启用/禁用各规则并自定义报警级别。"
                  style={{ marginBottom: 16 }}
                />
                <Table
                  dataSource={STANDARD_RULES}
                  columns={standardColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  rowClassName={(record) =>
                    !enabledRules.includes(record.id) ? 'alarm-rule-row-disabled' : ''
                  }
                />
              </Card>
            ),
          },
          {
            key: 'custom',
            label: `自定义规则（${customRules.length}条）`,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
                    添加自定义规则
                  </Button>
                }
              >
                <Alert
                  type="warning"
                  showIcon
                  message="自定义规则仅作标记与记录，当前版本暂不参与实时检测计算。未来版本将支持完整的自定义规则检测引擎。"
                  style={{ marginBottom: 16 }}
                />
                {customRules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#bfbfbf' }}>
                    <BellOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
                    <Text type="secondary">暂无自定义规则，点击右上角按钮创建</Text>
                  </div>
                ) : (
                  <Table
                    dataSource={customRules}
                    columns={customColumns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'reference',
            label: '规则说明参考',
            children: (
              <Card>
                <Alert
                  type="info"
                  showIcon
                  message="以下为各判异规则的详细说明及典型适用场景，供参考使用。"
                  style={{ marginBottom: 16 }}
                />
                <Collapse
                  items={STANDARD_RULES.map(rule => ({
                    key: String(rule.id),
                    label: (
                      <Space wrap>
                        <Tag color="blue" style={{ fontWeight: 'bold' }}>规则 {rule.id}</Tag>
                        <Text strong>{rule.name}</Text>
                        <Text type="secondary">— {rule.shortDesc}</Text>
                        <Tag color={LEVEL_COLORS[getRuleLevel(rule.id)]}>{LEVEL_LABELS[getRuleLevel(rule.id)]}</Tag>
                        {enabledRules.includes(rule.id)
                          ? <Tag color="success">已启用</Tag>
                          : <Tag>已禁用</Tag>}
                      </Space>
                    ),
                    children: (
                      <div style={{ lineHeight: 2 }}>
                        <p><Text strong>触发条件：</Text>{rule.shortDesc}</p>
                        <p><Text strong>详细说明：</Text>{rule.detail}</p>
                        <p><Text strong>典型场景：</Text>{rule.example}</p>
                      </div>
                    ),
                  }))}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 自定义规则 Modal */}
      <Modal
        title={editingRule ? '编辑自定义规则' : '添加自定义规则'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={520}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="规则名称" name="name" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="例如：连续5点超出2.5σ" />
          </Form.Item>
          <Form.Item label="规则描述" name="description" rules={[{ required: true, message: '请输入规则描述' }]}>
            <Input.TextArea rows={2} placeholder="描述该规则的触发条件及适用场景" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="条件类型" name="ruleType" rules={[{ required: true }]}>
                <Select>
                  <Option value="consecutive_outside">连续N点超出Xσ</Option>
                  <Option value="n_of_m_outside">M中N点超出Xσ</Option>
                  <Option value="consecutive_inside">连续N点在Xσ内</Option>
                  <Option value="consecutive_alternating">连续N点交替变化</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="报警级别" name="level" rules={[{ required: true }]}>
                <Select>
                  <Option value="critical"><Tag color="red">严重</Tag></Option>
                  <Option value="warning"><Tag color="orange">警告</Tag></Option>
                  <Option value="info"><Tag color="blue">提示</Tag></Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="点数 (N)" name="totalCount" rules={[{ required: true, message: '必填' }]}>
                <InputNumber min={2} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="触发数 (M)" name="triggerCount">
                <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="仅M中N使用" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="σ 阈值" name="sigmaThreshold" rules={[{ required: true, message: '必填' }]}>
                <InputNumber min={0.5} max={4} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="默认启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlarmRulesManager;
