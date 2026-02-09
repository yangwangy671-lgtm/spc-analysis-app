import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Checkbox, Row, Col, Card, Space, Collapse } from 'antd';
import { SettingOutlined, LineChartOutlined } from '@ant-design/icons';
import type { SPCParameters } from '../../types';

const { Option } = Select;
const { Panel } = Collapse;

interface HorizontalParameterPanelProps {
  parameters: SPCParameters;
  onParametersChange: (params: SPCParameters) => void;
}

const HorizontalParameterPanel: React.FC<HorizontalParameterPanelProps> = ({
  parameters,
  onParametersChange
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(parameters);
  }, [parameters, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    onParametersChange({
      ...parameters,
      ...allValues,
    });
  };

  const anomalyRuleOptions = [
    { label: '规则1', value: 1 },
    { label: '规则2', value: 2 },
    { label: '规则3', value: 3 },
    { label: '规则4', value: 4 },
    { label: '规则5', value: 5 },
    { label: '规则6', value: 6 },
    { label: '规则7', value: 7 },
    { label: '规则8', value: 8 },
  ];

  return (
    <Card
      className="spc-parameter-card"
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Form
        form={form}
        layout="inline"
        initialValues={parameters}
        onValuesChange={handleValuesChange}
      >
        <Row gutter={[16, 8]} style={{ width: '100%' }} align="middle">
          {/* 规格限设置 */}
          <Col>
            <Space size="small" align="center">
              <SettingOutlined style={{ fontSize: 16, color: '#667eea' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>规格限：</span>
            </Space>
          </Col>

          <Col>
            <Form.Item
              label="上限(USL)"
              name="usl"
              style={{ marginBottom: 0 }}
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: 100 }}
                placeholder="11.0"
                step={0.1}
                precision={2}
                size="small"
              />
            </Form.Item>
          </Col>

          <Col>
            <Form.Item
              label="下限(LSL)"
              name="lsl"
              style={{ marginBottom: 0 }}
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: 100 }}
                placeholder="9.5"
                step={0.1}
                precision={4}
                size="small"
              />
            </Form.Item>
          </Col>

          <Col>
            <Form.Item
              label="目标值"
              name="target"
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                style={{ width: 100 }}
                placeholder="10.25"
                step={0.1}
                precision={4}
                size="small"
              />
            </Form.Item>
          </Col>

          {/* 分隔线 */}
          <Col>
            <div style={{
              width: 1,
              height: 24,
              background: '#e0e0e0',
              margin: '0 8px'
            }} />
          </Col>

          {/* 控制图配置 */}
          <Col>
            <Space size="small" align="center">
              <LineChartOutlined style={{ fontSize: 16, color: '#667eea' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>控制图：</span>
            </Space>
          </Col>

          <Col>
            <Form.Item
              label="类型"
              name="chartType"
              style={{ marginBottom: 0 }}
            >
              <Select style={{ width: 160 }} size="small">
                <Option value="xbar-r">X-bar & R</Option>
                <Option value="i-mr">I-MR</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col>
            <Form.Item
              label="子组大小"
              name="subgroupSize"
              style={{ marginBottom: 0 }}
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: 80 }}
                min={2}
                max={25}
                placeholder="5"
                size="small"
              />
            </Form.Item>
          </Col>

          {/* 分隔线 */}
          <Col>
            <div style={{
              width: 1,
              height: 24,
              background: '#e0e0e0',
              margin: '0 8px'
            }} />
          </Col>

          {/* 异常检测规则 - 折叠面板 */}
          <Col flex="auto">
            <Collapse
              ghost
              size="small"
              style={{ background: 'transparent' }}
              items={[
                {
                  key: '1',
                  label: <span style={{ fontSize: 13, fontWeight: 500 }}>异常检测规则</span>,
                  children: (
                    <Form.Item
                      name="anomalyRules"
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox.Group
                        options={anomalyRuleOptions}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                      />
                    </Form.Item>
                  ),
                }
              ]}
            />
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default HorizontalParameterPanel;
