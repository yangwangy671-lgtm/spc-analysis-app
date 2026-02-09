import React, { useEffect } from 'react';
import { Form, InputNumber, Select, Checkbox, Space, Divider, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { SPCParameters } from '../../types';

const { Option } = Select;
const { Text, Link } = Typography;

interface ParameterPanelProps {
  parameters: SPCParameters;
  onParametersChange: (params: SPCParameters) => void;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({ parameters, onParametersChange }) => {
  const [form] = Form.useForm();

  // Update form values when parameters prop changes (e.g., from Excel import)
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
    { label: '规则1: 超出3σ限', value: 1 },
    { label: '规则2: 连续9点同侧', value: 2 },
    { label: '规则3: 连续6点趋势', value: 3 },
    { label: '规则4: 连续14点交替', value: 4 },
    { label: '规则5: 2/3点在A区', value: 5 },
    { label: '规则6: 4/5点在B区', value: 6 },
    { label: '规则7: 15点在C区', value: 7 },
    { label: '规则8: 8点超出C区', value: 8 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 16 }}>参数配置</Text>
        <Link onClick={() => window.open('/SPC使用说明.html', '_blank')} style={{ fontSize: 12 }}>
          <InfoCircleOutlined /> 帮助
        </Link>
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={parameters}
        onValuesChange={handleValuesChange}
      >
        <Divider>规格限设置</Divider>

        <Form.Item
          label="规格上限 (USL)"
          name="usl"
          rules={[
            { required: true, message: '请输入规格上限' },
            {
              validator: (_, value) => {
                if (value && form.getFieldValue('lsl') && value <= form.getFieldValue('lsl')) {
                  return Promise.reject('规格上限必须大于规格下限');
                }
                return Promise.resolve();
              },
            },
          ]}
          tooltip="产品质量特性允许的最大值"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="例如: 11.0"
            step={0.1}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          label="规格下限 (LSL)"
          name="lsl"
          rules={[
            { required: true, message: '请输入规格下限' },
            {
              validator: (_, value) => {
                if (value && form.getFieldValue('usl') && value >= form.getFieldValue('usl')) {
                  return Promise.reject('规格下限必须小于规格上限');
                }
                return Promise.resolve();
              },
            },
          ]}
          tooltip="产品质量特性允许的最小值"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="例如: 9.5"
            step={0.1}
            precision={4}
          />
        </Form.Item>

        <Form.Item
          label="目标值 (可选)"
          name="target"
          tooltip="过程中心的理想目标值，通常为规格中心"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="例如: 10.25"
            step={0.1}
            precision={4}
          />
        </Form.Item>

        <Divider>控制图配置</Divider>

        <Form.Item
          label="控制图类型"
          name="chartType"
          tooltip="X-bar & R图用于子组数据，I-MR图用于单值数据"
        >
          <Select>
            <Option value="xbar-r">均值-极差图 (X-bar & R)</Option>
            <Option value="i-mr">单值-移动极差图 (I-MR)</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="子组大小"
          name="subgroupSize"
          rules={[{ required: true, message: '请输入子组大小' }]}
          tooltip="每个子组包含的测量值数量，通常为2-25之间"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={2}
            max={25}
            placeholder="例如: 5"
          />
        </Form.Item>

        <Divider>异常检测规则</Divider>

        <Form.Item
          label="检测规则"
          name="anomalyRules"
          tooltip="选择要应用的异常检测规则（西方电气规则）"
        >
          <Checkbox.Group
            options={anomalyRuleOptions}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          />
        </Form.Item>

        <Divider />

        <Space direction="vertical" style={{ width: '100%', fontSize: '12px', color: '#666' }}>
          <Text strong>控制图说明：</Text>
          <div>• <strong>X-bar & R:</strong> 用于子组数据，展示均值和极差变化</div>
          <div>• <strong>I-MR:</strong> 用于单值数据或时间序列分析</div>
          <br />
          <Text strong>过程能力指标：</Text>
          <div>• <strong>CP:</strong> 过程能力指数（仅考虑分布宽度）</div>
          <div>• <strong>CPK:</strong> 修正过程能力指数（考虑偏移）</div>
          <div>• CPK ≥ 1.33: <span style={{ color: '#52c41a' }}>能力充分</span></div>
          <div>• 1.0 ≤ CPK &lt; 1.33: <span style={{ color: '#faad14' }}>能力边缘</span></div>
          <div>• CPK &lt; 1.0: <span style={{ color: '#f5222d' }}>能力不足</span></div>
          <br />
          <Text type="secondary">
            <InfoCircleOutlined /> 点击右上角"帮助"查看详细说明
          </Text>
        </Space>
      </Form>
    </div>
  );
};

export default ParameterPanel;
