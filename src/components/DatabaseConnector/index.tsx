import React, { useState } from 'react';
import {
  Steps, Card, Form, Input, InputNumber, Select, Button, Space, Alert, Table,
  Tag, Row, Col, Divider, Typography, Tooltip, Switch, Spin,
  message,
} from 'antd';
import {
  DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LinkOutlined, ApiOutlined, CloudServerOutlined, ReloadOutlined,
  PlusOutlined, DeleteOutlined, EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { RawDataRow } from '../../types';

const { Text } = Typography;
const { Option } = Select;
const { Password } = Input;

// ─── 类型定义 ────────────────────────────────────────────────────────────────

type DBType = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle' | 'rest';

interface ConnConfig {
  type: DBType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  // REST API 专用
  url: string;
  method: 'GET' | 'POST';
}

interface FieldMapping {
  timestampCol: string;
  groupCol: string;
  valueCols: string[];
}

interface HeaderPair { key: string; value: string; }

// ─── 数据库配置常量 ───────────────────────────────────────────────────────────

const DB_META: Record<DBType, { label: string; port: number; color: string; icon: React.ReactNode }> = {
  mysql:      { label: 'MySQL',      port: 3306, color: '#4479A1', icon: <span>🐬</span> },
  postgresql: { label: 'PostgreSQL', port: 5432, color: '#336791', icon: <span>🐘</span> },
  sqlserver:  { label: 'SQL Server', port: 1433, color: '#CC2927', icon: <span>📊</span> },
  oracle:     { label: 'Oracle DB',  port: 1521, color: '#F80000', icon: <span>🔴</span> },
  rest:       { label: 'REST API',   port: 443,  color: '#52c41a', icon: <ApiOutlined /> },
};

// ─── 演示数据生成 ─────────────────────────────────────────────────────────────

const genDemoRows = (count = 30): RawDataRow[] => {
  const base = 16.85;
  const sigma = 0.35;
  const subSize = 5;
  const groups = Math.ceil(count / subSize);
  return Array.from({ length: groups }, (_, g) => ({
    timestamp: new Date(Date.now() - (groups - g) * 3_600_000)
      .toISOString().replace('T', ' ').slice(0, 19),
    groupNo: g + 1,
    values: Array.from({ length: subSize }, () =>
      parseFloat((base + (Math.random() - 0.5) * 2 * sigma).toFixed(4))
    ),
  }));
};

// ─── 辅助组件 ─────────────────────────────────────────────────────────────────

const ConnStatusBadge: React.FC<{ status: 'idle' | 'testing' | 'connected' | 'error' }> = ({ status }) => {
  const map = {
    idle:      { color: 'default',  icon: <LinkOutlined />,             text: '未连接' },
    testing:   { color: 'processing', icon: <Spin size="small" />,     text: '连接中…' },
    connected: { color: 'success',  icon: <CheckCircleOutlined />,      text: '已连接' },
    error:     { color: 'error',    icon: <CloseCircleOutlined />,      text: '连接失败' },
  };
  const { color, icon, text } = map[status];
  return (
    <Tag color={color} icon={icon} style={{ fontSize: 13, padding: '3px 10px' }}>
      {text}
    </Tag>
  );
};

// ─── 主组件 ──────────────────────────────────────────────────────────────────

interface DatabaseConnectorProps {
  onDataImported: (data: RawDataRow[], metadata?: { usl?: number; lsl?: number; target?: number }) => void;
}

const DatabaseConnector: React.FC<DatabaseConnectorProps> = ({ onDataImported }) => {
  const [step, setStep] = useState(0);
  const [dbType, setDbType] = useState<DBType>('mysql');
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connForm] = Form.useForm();
  const [queryForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RawDataRow[]>([]);
  const [headers, setHeaders] = useState<HeaderPair[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [savedConn, setSavedConn] = useState<ConnConfig | null>(null);
  const [availableCols] = useState(['timestamp', 'group_no', 'val1', 'val2', 'val3', 'val4', 'val5']);
  const [fieldMap, setFieldMap] = useState<FieldMapping>({
    timestampCol: 'timestamp',
    groupCol: 'group_no',
    valueCols: ['val1', 'val2', 'val3', 'val4', 'val5'],
  });
  const [usl, setUsl] = useState<number | null>(null);
  const [lsl, setLsl] = useState<number | null>(null);

  // ── Step 1: 测试连接 ──────────────────────────────────────────────────────

  const handleTestConn = async () => {
    const vals = await connForm.validateFields().catch(() => null);
    if (!vals) return;

    setConnStatus('testing');
    setLoading(true);

    try {
      if (dbType === 'rest') {
        // 真实请求测试 REST API
        const hdrs: Record<string, string> = {};
        headers.forEach(h => { if (h.key) hdrs[h.key] = h.value; });
        const resp = await fetch(vals.url, { method: 'HEAD', headers: hdrs }).catch(() =>
          fetch(vals.url, { method: 'GET', headers: hdrs })
        );
        if (!resp.ok && resp.status !== 0) throw new Error(`HTTP ${resp.status}`);
        setConnStatus('connected');
        message.success('REST API 连通性验证成功！');
      } else {
        // 浏览器无法直连数据库，模拟延迟后成功（演示模式）
        await new Promise(r => setTimeout(r, 1600));
        setConnStatus('connected');
        message.success(`${DB_META[dbType].label} 演示连接成功！（实际部署需要后端代理）`);
      }
      setSavedConn({ ...vals, type: dbType, ssl: vals.ssl ?? false });
    } catch (err) {
      setConnStatus('error');
      message.error(`连接失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: 获取预览数据 ───────────────────────────────────────────────────

  const handleFetchPreview = async () => {
    const qvals = await queryForm.validateFields().catch(() => null);
    if (!qvals) return;

    setLoading(true);

    try {
      if (dbType === 'rest') {
        // 真实 REST API 拉取
        const hdrs: Record<string, string> = {};
        headers.forEach(h => { if (h.key) hdrs[h.key] = h.value; });
        const url = savedConn?.url || '';
        const resp = await fetch(url, { headers: hdrs });
        const json = await resp.json();

        // 按 dataPath 导航到数据数组
        const arr: any[] = qvals.dataPath
          ? qvals.dataPath.split('.').reduce((o: any, k: string) => o?.[k], json)
          : json;

        if (!Array.isArray(arr)) throw new Error('返回格式不是数组，请检查数据路径');

        const rows: RawDataRow[] = arr.slice(0, qvals.limit || 100).map((item, i) => ({
          timestamp: item[fieldMap.timestampCol] ?? new Date().toISOString(),
          groupNo: Number(item[fieldMap.groupCol] ?? i + 1),
          values: fieldMap.valueCols
            .map(col => parseFloat(item[col]))
            .filter(v => !isNaN(v)),
        }));

        setPreviewData(rows);
        message.success(`REST API 返回 ${rows.length} 行数据`);
      } else {
        // 演示模式：生成仿真 SPC 数据
        await new Promise(r => setTimeout(r, 1000));
        const demo = genDemoRows(qvals.limit || 30);
        setPreviewData(demo);
        message.success(`从 ${DB_META[dbType].label} 获取 ${demo.length} 组演示数据`);
      }
      setStep(2);
    } catch (err) {
      message.error(`获取数据失败: ${err instanceof Error ? err.message : '未知错误'}`);
      // 回退演示数据
      const demo = genDemoRows(30);
      setPreviewData(demo);
      message.warning('已加载演示数据');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: 确认导入 ──────────────────────────────────────────────────────

  const handleImport = () => {
    if (previewData.length === 0) {
      message.warning('无可导入数据');
      return;
    }
    const metadata = (usl !== null && lsl !== null)
      ? { usl, lsl, target: (usl + lsl) / 2 }
      : undefined;
    onDataImported(previewData, metadata);
    message.success(`成功导入 ${previewData.length} 组数据`);
  };

  // ─── 预览表格列 ───────────────────────────────────────────────────────────

  const previewCols = [
    { title: '组号', dataIndex: 'groupNo', width: 70 },
    { title: '时间戳', dataIndex: 'timestamp', width: 180, render: (v: string) => v || '-' },
    {
      title: '测量值',
      dataIndex: 'values',
      render: (vals: number[]) => vals.map(v => v.toFixed(4)).join(', '),
    },
  ];

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">

      {/* 步骤条 */}
      <Steps
        current={step}
        size="small"
        items={[
          { title: '配置连接' },
          { title: '查询设置' },
          { title: '预览 & 导入' },
        ]}
      />

      {/* ── Step 0: 连接配置 ───────────────────────────────────────────── */}
      {step === 0 && (
        <Card
          title={<Space><CloudServerOutlined /> 数据库连接配置</Space>}
          extra={<ConnStatusBadge status={connStatus} />}
        >
          {/* 数据库类型选择 */}
          <Row gutter={8} style={{ marginBottom: 16 }}>
            {(Object.keys(DB_META) as DBType[]).map(t => (
              <Col key={t} span={t === 'rest' ? 24 : undefined} style={{ flex: t !== 'rest' ? 1 : undefined, marginTop: t === 'rest' ? 8 : 0 }}>
                <Button
                  block
                  type={dbType === t ? 'primary' : 'default'}
                  onClick={() => {
                    setDbType(t);
                    setConnStatus('idle');
                    connForm.setFieldValue('port', DB_META[t].port);
                  }}
                  style={{ borderColor: dbType === t ? DB_META[t].color : undefined }}
                >
                  {DB_META[t].icon} {DB_META[t].label}
                </Button>
              </Col>
            ))}
          </Row>

          <Form form={connForm} layout="vertical" initialValues={{ port: DB_META[dbType].port, method: 'GET', ssl: false }}>
            {dbType !== 'rest' ? (
              <>
                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item label="主机地址" name="host" rules={[{ required: true, message: '请输入主机地址' }]}>
                      <Input prefix={<CloudServerOutlined />} placeholder="192.168.1.100 或 localhost" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label="端口" name="port" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} min={1} max={65535} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label="数据库名称" name="database" rules={[{ required: true, message: '请输入数据库名称' }]}>
                      <Input placeholder="spc_db" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                      <Input prefix={<LinkOutlined />} placeholder="root / spc_user" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="密码" name="password">
                      <Password placeholder="数据库密码" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="ssl" valuePropName="checked" label={null}>
                  <Switch checkedChildren="SSL 加密开启" unCheckedChildren="SSL 关闭" />
                </Form.Item>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="浏览器安全说明"
                  description="由于浏览器安全限制，无法从页面直接连接数据库。点击「测试连接」将进入演示模式，展示完整功能；实际生产环境需部署后端代理服务。"
                />
              </>
            ) : (
              <>
                <Form.Item label="API 地址" name="url" rules={[{ required: true, message: '请输入 API 地址' }, { type: 'url', message: '请输入有效 URL' }]}>
                  <Input prefix={<ApiOutlined />} placeholder="https://api.example.com/measurements" />
                </Form.Item>
                <Form.Item label="请求方法" name="method">
                  <Select style={{ width: 120 }}>
                    <Option value="GET">GET</Option>
                    <Option value="POST">POST</Option>
                  </Select>
                </Form.Item>
                {/* 请求头配置 */}
                <Divider plain style={{ marginTop: 0 }}>请求头 (Headers)</Divider>
                {headers.map((h, idx) => (
                  <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={10}>
                      <Input
                        size="small"
                        placeholder="Header 名"
                        value={h.key}
                        onChange={e => {
                          const next = [...headers];
                          next[idx].key = e.target.value;
                          setHeaders(next);
                        }}
                      />
                    </Col>
                    <Col span={12}>
                      <Input
                        size="small"
                        placeholder="值"
                        value={h.value}
                        onChange={e => {
                          const next = [...headers];
                          next[idx].value = e.target.value;
                          setHeaders(next);
                        }}
                      />
                    </Col>
                    <Col span={2}>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                      />
                    </Col>
                  </Row>
                ))}
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                >
                  添加请求头
                </Button>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 12 }}
                  message="跨域说明"
                  description="API 服务需允许跨域访问（CORS）。若测试失败，请检查 API 服务是否设置了 Access-Control-Allow-Origin 响应头。"
                />
              </>
            )}
          </Form>

          <Divider style={{ margin: '12px 0' }} />
          <Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={handleTestConn}
            >
              测试连接
            </Button>
            {connStatus === 'connected' && (
              <Button
                type="default"
                icon={<EyeOutlined />}
                onClick={() => setStep(1)}
              >
                下一步：设置查询
              </Button>
            )}
          </Space>
        </Card>
      )}

      {/* ── Step 1: 查询设置 ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card
          title={<Space><DatabaseOutlined /> 查询设置</Space>}
          extra={
            <Space>
              <ConnStatusBadge status={connStatus} />
              <Button size="small" onClick={() => setStep(0)}>← 返回</Button>
            </Space>
          }
        >
          <Form
            form={queryForm}
            layout="vertical"
            initialValues={{ limit: 100, sql: 'SELECT timestamp, group_no, val1, val2, val3, val4, val5\nFROM measurements\nWHERE timestamp >= \'2024-01-01\'\nORDER BY timestamp DESC\nLIMIT 100' }}
          >
            {dbType !== 'rest' ? (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={`目标数据库：${DB_META[dbType].label} — 演示模式`}
                  description="以下 SQL 语句仅作展示，点击「获取数据」将加载模拟 SPC 数据。"
                />
                <Form.Item label="SQL 查询语句" name="sql" rules={[{ required: true }]}>
                  <Input.TextArea
                    rows={5}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="SELECT timestamp, group_no, val1, val2, val3 FROM measurements LIMIT 100"
                  />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item
                  label="数据路径（JSON Path）"
                  name="dataPath"
                  tooltip="如果数据在 JSON 响应的 data.rows 字段中，填写 data.rows；若数组在根级别，留空"
                >
                  <Input placeholder="data.rows（可选，留空表示根数组）" />
                </Form.Item>
              </>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="获取行数上限" name="limit">
                  <InputNumber min={1} max={10000} style={{ width: '100%' }} addonAfter="行" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={null} style={{ paddingTop: 30 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>建议先取 50~200 行预览后再全量导入</Text>
                </Form.Item>
              </Col>
            </Row>

            {/* 字段映射 */}
            <Divider plain>字段映射</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="时间戳字段" tooltip="对应数据表中的时间列">
                  <Select
                    value={fieldMap.timestampCol}
                    onChange={v => setFieldMap(prev => ({ ...prev, timestampCol: v }))}
                  >
                    {availableCols.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="分组/批次字段">
                  <Select
                    value={fieldMap.groupCol}
                    onChange={v => setFieldMap(prev => ({ ...prev, groupCol: v }))}
                  >
                    {availableCols.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="测量值字段（多选）">
                  <Select
                    mode="multiple"
                    value={fieldMap.valueCols}
                    onChange={v => setFieldMap(prev => ({ ...prev, valueCols: v }))}
                    maxTagCount={3}
                  >
                    {availableCols.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 规格限（可选） */}
            <Divider plain>规格限（可选，从数据库填充）</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="规格上限 USL">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={usl ?? undefined}
                    onChange={v => setUsl(v)}
                    placeholder="从数据库读取或手动输入"
                    step={0.01}
                    precision={4}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="规格下限 LSL">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={lsl ?? undefined}
                    onChange={v => setLsl(v)}
                    placeholder="从数据库读取或手动输入"
                    step={0.01}
                    precision={4}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Divider style={{ margin: '12px 0' }} />
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              loading={loading}
              onClick={handleFetchPreview}
            >
              获取数据预览
            </Button>
          </Space>
        </Card>
      )}

      {/* ── Step 2: 预览 & 导入 ─────────────────────────────────────────── */}
      {step === 2 && (
        <Card
          title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> 数据预览</Space>}
          extra={
            <Button size="small" onClick={() => setStep(1)}>← 重新查询</Button>
          }
        >
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 12 }}
            message={`已获取 ${previewData.length} 组数据，每组 ${previewData[0]?.values?.length ?? 0} 个测量值`}
            description={
              dbType !== 'rest'
                ? `数据来源：${DB_META[dbType].label} 演示模式 | 如需真实数据，请部署后端代理并连接实际数据库`
                : `数据来源：REST API（${savedConn?.url ?? ''}）`
            }
          />

          {usl !== null && lsl !== null && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`将自动设置规格限：USL=${usl}，LSL=${lsl}，Target=${((usl + lsl) / 2).toFixed(4)}`}
            />
          )}

          <Table
            columns={previewCols}
            dataSource={previewData.slice(0, 20)}
            rowKey={(_, i) => i!}
            size="small"
            pagination={false}
            style={{ marginBottom: 16 }}
            footer={() => (
              <Text type="secondary">
                显示前 20 行，共 {previewData.length} 行
              </Text>
            )}
          />

          <Space>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleImport}
            >
              确认导入 ({previewData.length} 组)
            </Button>
            <Tooltip title="重新从数据源获取最新数据">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { setStep(1); setPreviewData([]); }}
              >
                重新获取
              </Button>
            </Tooltip>
          </Space>
        </Card>
      )}
    </Space>
  );
};

export default DatabaseConnector;
