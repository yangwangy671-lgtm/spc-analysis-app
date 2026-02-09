import React from 'react';
import { Card, Form, InputNumber, Select, Row, Col, Divider, Collapse, Checkbox, ColorPicker, Space, Typography, Switch } from 'antd';
import { SettingOutlined, LineChartOutlined, BgColorsOutlined, EyeOutlined } from '@ant-design/icons';
import type { SPCParameters } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface ConfigOverviewProps {
  parameters: SPCParameters;
  onParametersChange: (params: SPCParameters) => void;
}

interface ChartConfig {
  showGrid: boolean;
  showLegend: boolean;
  showDataLabels: boolean;
  lineWidth: number;
  pointSize: number;
  colors: {
    ucl: string;
    lcl: string;
    cl: string;
    data: string;
    warning: string;
    critical: string;
  };
}

const ConfigOverview: React.FC<ConfigOverviewProps> = ({ parameters, onParametersChange }) => {
  const [form] = Form.useForm();
  const [chartConfig, setChartConfig] = React.useState<ChartConfig>({
    showGrid: true,
    showLegend: true,
    showDataLabels: false,
    lineWidth: 2,
    pointSize: 4,
    colors: {
      ucl: '#ff4d4f',
      lcl: '#ff4d4f',
      cl: '#52c41a',
      data: '#1677ff',
      warning: '#faad14',
      critical: '#ff4d4f',
    },
  });

  React.useEffect(() => {
    form.setFieldsValue(parameters);
  }, [parameters, form]);

  const handleFieldChange = (field: string, value: any) => {
    const updatedParams = { ...parameters, [field]: value };
    onParametersChange(updatedParams);
  };

  const handleChartConfigChange = (field: keyof ChartConfig, value: any) => {
    setChartConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (colorKey: string, color: any) => {
    setChartConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [colorKey]: color.toHexString() }
    }));
  };

  return (
    <div className="config-overview" style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        配置总览
      </Title>

      {/* 规格限配置 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>规格限配置</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="上限 (USL)" name="usl">
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.1}
                  precision={4}
                  onChange={(value) => handleFieldChange('usl', value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="下限 (LSL)" name="lsl">
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.1}
                  precision={4}
                  onChange={(value) => handleFieldChange('lsl', value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="目标值 (Target)" name="target">
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.1}
                  precision={4}
                  onChange={(value) => handleFieldChange('target', value)}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 控制图配置 */}
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>控制图配置</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="图表类型" name="chartType">
                <Select onChange={(value) => handleFieldChange('chartType', value)}>
                  <Option value="xbar-r">X-bar & R 图</Option>
                  <Option value="i-mr">I-MR 图</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="子组大小" name="subgroupSize">
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={25}
                  onChange={(value) => handleFieldChange('subgroupSize', value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="异常检测规则" style={{ marginBottom: 0 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选择 {parameters.anomalyRules.length} 项规则
                </Text>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <Collapse
            ghost
            items={[
              {
                key: 'anomaly-rules',
                label: '异常检测规则详细配置',
                children: (
                  <Checkbox.Group
                    value={parameters.anomalyRules}
                    onChange={(values) => handleFieldChange('anomalyRules', values)}
                    style={{ width: '100%' }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Checkbox value={1}>规则1: 连续1点超出控制限</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={2}>规则2: 连续9点在中心线同一侧</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={3}>规则3: 连续6点持续上升或下降</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={4}>规则4: 连续14点交替上下</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={5}>规则5: 3点中有2点距中心线2σ以上</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={6}>规则6: 5点中有4点距中心线1σ以上</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={7}>规则7: 连续15点在中心线±1σ内</Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox value={8}>规则8: 连续8点在中心线±1σ外</Checkbox>
                      </Col>
                    </Row>
                  </Checkbox.Group>
                ),
              },
            ]}
          />
        </Form>
      </Card>

      {/* 图表显示配置 */}
      <Card
        title={
          <Space>
            <EyeOutlined />
            <span>图表显示配置</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>网格线</Text>
              <Switch
                checked={chartConfig.showGrid}
                onChange={(checked) => handleChartConfigChange('showGrid', checked)}
                checkedChildren="显示"
                unCheckedChildren="隐藏"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>图例</Text>
              <Switch
                checked={chartConfig.showLegend}
                onChange={(checked) => handleChartConfigChange('showLegend', checked)}
                checkedChildren="显示"
                unCheckedChildren="隐藏"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>数据标签</Text>
              <Switch
                checked={chartConfig.showDataLabels}
                onChange={(checked) => handleChartConfigChange('showDataLabels', checked)}
                checkedChildren="显示"
                unCheckedChildren="隐藏"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>线条粗细</Text>
              <InputNumber
                min={1}
                max={5}
                value={chartConfig.lineWidth}
                onChange={(value) => handleChartConfigChange('lineWidth', value)}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>数据点大小</Text>
              <InputNumber
                min={2}
                max={10}
                value={chartConfig.pointSize}
                onChange={(value) => handleChartConfigChange('pointSize', value)}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 颜色配置 */}
      <Card
        title={
          <Space>
            <BgColorsOutlined />
            <span>颜色配置</span>
          </Space>
        }
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>上控制限 (UCL)</Text>
              <ColorPicker
                value={chartConfig.colors.ucl}
                onChange={(color) => handleColorChange('ucl', color)}
                showText
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>下控制限 (LCL)</Text>
              <ColorPicker
                value={chartConfig.colors.lcl}
                onChange={(color) => handleColorChange('lcl', color)}
                showText
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>中心线 (CL)</Text>
              <ColorPicker
                value={chartConfig.colors.cl}
                onChange={(color) => handleColorChange('cl', color)}
                showText
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>数据点</Text>
              <ColorPicker
                value={chartConfig.colors.data}
                onChange={(color) => handleColorChange('data', color)}
                showText
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>警告异常</Text>
              <ColorPicker
                value={chartConfig.colors.warning}
                onChange={(color) => handleColorChange('warning', color)}
                showText
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>严重异常</Text>
              <ColorPicker
                value={chartConfig.colors.critical}
                onChange={(color) => handleColorChange('critical', color)}
                showText
              />
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ConfigOverview;
