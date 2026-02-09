import React, { useState } from 'react';
import {
  Drawer,
  Tabs,
  Button,
  Upload,
  Table,
  Alert,
  Space,
  message,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Divider,
  Typography,
  Card,
  Modal,
  Tag,
} from 'antd';
import {
  FileExcelOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { parseExcelFile, parseCSVFile, validateData } from '../../utils/excelHandler';
import { downloadTemplate, downloadCSVTemplate } from '../../utils/templateGenerator';
import type { RawDataRow, ExcelData, ValidationResult } from '../../types';

const { TabPane } = Tabs;
const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

interface DataImportDrawerProps {
  visible: boolean;
  onClose: () => void;
  onDataImported: (data: RawDataRow[], metadata?: ExcelData['metadata']) => void;
}

interface ErrorRow {
  rowIndex: number;
  errors: string[];
  data: any;
}

const DataImportDrawer: React.FC<DataImportDrawerProps> = ({
  visible,
  onClose,
  onDataImported,
}) => {
  const [activeTab, setActiveTab] = useState<string>('file');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RawDataRow[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [errorRows, setErrorRows] = useState<ErrorRow[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [manualForm] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState<ErrorRow | null>(null);

  // 文件上传处理
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setValidation(null);
    setErrorRows([]);

    try {
      let excelData: ExcelData;

      // 根据文件扩展名解析
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'csv') {
        excelData = await parseCSVFile(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        excelData = await parseExcelFile(file);
      } else {
        throw new Error('不支持的文件格式。请上传 .xlsx、.xls 或 .csv 文件。');
      }

      // 数据校验
      const validationResult = validateData(excelData.data);
      setValidation(validationResult);

      // 检查每行数据的完整性
      const errors: ErrorRow[] = [];
      excelData.data.forEach((row, index) => {
        const rowErrors: string[] = [];

        // 检查测量值
        if (!row.values || row.values.length === 0) {
          rowErrors.push('缺少测量值');
        }

        // 检查无效值
        row.values.forEach((value, valueIndex) => {
          if (isNaN(value) || !isFinite(value)) {
            rowErrors.push(`测量值${valueIndex + 1}无效`);
          }
        });

        if (rowErrors.length > 0) {
          errors.push({
            rowIndex: index,
            errors: rowErrors,
            data: row,
          });
        }
      });

      setErrorRows(errors);

      // 如果有错误，显示错误但允许修正
      if (errors.length > 0) {
        message.warning(`发现 ${errors.length} 行数据存在问题，请查看并修正`);
      }

      // 设置预览数据
      setPreviewData(excelData.data.slice(0, 20));
      setFileInfo({ name: file.name, size: file.size });

      // 如果校验通过且没有错误行，自动导入
      if (validationResult.valid && errors.length === 0) {
        message.success('数据导入成功！');
        onDataImported(excelData.data, excelData.metadata);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件解析失败');
      setValidation({
        valid: false,
        errors: [error instanceof Error ? error.message : '发生未知错误'],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      handleFileUpload(file);
      return false; // 阻止自动上传
    },
  };

  // 模板下载处理
  const handleDownloadTemplate = (type: 'excel' | 'csv', format: 'multi-value' | 'single-value') => {
    try {
      if (type === 'excel') {
        downloadTemplate(format);
      } else {
        downloadCSVTemplate(format);
      }
      message.success('模板下载成功！');
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  // 修正错误行
  const handleEditErrorRow = (errorRow: ErrorRow) => {
    setCurrentEditRow(errorRow);
    setEditModalVisible(true);
  };

  // 删除错误行
  const handleDeleteErrorRow = (rowIndex: number) => {
    const newData = previewData.filter((_, index) => index !== rowIndex);
    setPreviewData(newData);
    setErrorRows(errorRows.filter(err => err.rowIndex !== rowIndex));
    message.success('已删除错误行');
  };

  // 确认导入（忽略错误）
  const handleConfirmImport = () => {
    if (previewData.length === 0) {
      message.warning('没有可导入的数据');
      return;
    }

    // 过滤掉错误行
    const validData = previewData.filter((_, index) =>
      !errorRows.some(err => err.rowIndex === index)
    );

    if (validData.length === 0) {
      message.error('所有数据行都存在错误，无法导入');
      return;
    }

    onDataImported(validData);
    message.success(`成功导入 ${validData.length} 行数据`);
    handleDrawerClose();
  };

  // 手动录入处理
  const handleManualSubmit = (values: any) => {
    const { timestamp, groupNo, measurements } = values;

    // 解析测量值（逗号分隔）
    const valueArray = measurements
      .split(',')
      .map((v: string) => parseFloat(v.trim()))
      .filter((v: number) => !isNaN(v));

    if (valueArray.length === 0) {
      message.error('请输入有效的测量值');
      return;
    }

    const newRow: RawDataRow = {
      timestamp: timestamp || new Date().toISOString(),
      groupNo: groupNo || 1,
      values: valueArray,
    };

    const currentData = [...previewData, newRow];
    setPreviewData(currentData);
    message.success('数据添加成功！');
    manualForm.resetFields();
  };

  // 关闭抽屉
  const handleDrawerClose = () => {
    setPreviewData([]);
    setValidation(null);
    setErrorRows([]);
    setFileInfo(null);
    setActiveTab('file');
    onClose();
  };

  // 预览表格列
  const previewColumns = [
    {
      title: '行号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => {
        const hasError = errorRows.some(err => err.rowIndex === index);
        return (
          <Space>
            {hasError && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            {index + 1}
          </Space>
        );
      },
    },
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '组号',
      dataIndex: 'groupNo',
      key: 'groupNo',
      width: 80,
      render: (text: number) => text || '-',
    },
    {
      title: '测量值',
      dataIndex: 'values',
      key: 'values',
      render: (values: number[]) => values.map(v => v.toFixed(3)).join(', '),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, _record: RawDataRow, index: number) => {
        const errorRow = errorRows.find(err => err.rowIndex === index);
        return errorRow ? (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditErrorRow(errorRow)}
            >
              修正
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDeleteErrorRow(index)}
            >
              删除
            </Button>
          </Space>
        ) : (
          <Tag color="success">正常</Tag>
        );
      },
    },
  ];

  return (
    <>
      <Drawer
        title="数据采集与导入"
        width={900}
        onClose={handleDrawerClose}
        open={visible}
        extra={
          <Space>
            {previewData.length > 0 && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmImport}
                disabled={previewData.length === 0}
              >
                确认导入 ({previewData.length} 行)
              </Button>
            )}
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Excel/CSV 导入 */}
          <TabPane
            tab={
              <span>
                <FileExcelOutlined />
                Excel/CSV 导入
              </span>
            }
            key="file"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 模板下载区域 */}
              <Card title="下载导入模板" size="small">
                <Paragraph type="secondary">
                  请先下载模板，按照模板格式填写数据后再上传。支持 Excel 和 CSV 两种格式。
                </Paragraph>
                <Space wrap>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadTemplate('excel', 'multi-value')}
                  >
                    Excel模板（多值格式）
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadTemplate('excel', 'single-value')}
                  >
                    Excel模板（单值格式）
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadTemplate('csv', 'multi-value')}
                  >
                    CSV模板（多值格式）
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadTemplate('csv', 'single-value')}
                  >
                    CSV模板（单值格式）
                  </Button>
                </Space>
              </Card>

              {/* 文件上传区域 */}
              <Dragger {...uploadProps} disabled={loading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 Excel (.xlsx, .xls) 和 CSV (.csv) 文件
                  <br />
                  文件将自动进行格式和完整性校验
                </p>
              </Dragger>

              {/* 文件信息 */}
              {fileInfo && (
                <Alert
                  message={`文件已加载: ${fileInfo.name}`}
                  description={`文件大小: ${(fileInfo.size / 1024).toFixed(2)} KB | 数据行数: ${previewData.length}`}
                  type="success"
                  icon={<FileExcelOutlined />}
                  showIcon
                />
              )}

              {/* 校验结果 - 错误 */}
              {validation && !validation.valid && (
                <Alert
                  message="数据校验失败"
                  description={
                    <div>
                      {validation.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  }
                  type="error"
                  showIcon
                />
              )}

              {/* 校验结果 - 警告 */}
              {validation && validation.warnings.length > 0 && (
                <Alert
                  message="数据警告"
                  description={
                    <div>
                      {validation.warnings.map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </div>
                  }
                  type="warning"
                  showIcon
                />
              )}

              {/* 错误行汇总 */}
              {errorRows.length > 0 && (
                <Alert
                  message={`发现 ${errorRows.length} 行数据存在问题`}
                  description="请在下方预览表格中修正或删除错误数据"
                  type="error"
                  showIcon
                  action={
                    <Button size="small" danger onClick={() => {
                      // 删除所有错误行
                      const validIndices = new Set(errorRows.map(err => err.rowIndex));
                      const newData = previewData.filter((_, index) => !validIndices.has(index));
                      setPreviewData(newData);
                      setErrorRows([]);
                      message.success('已删除所有错误行');
                    }}>
                      删除所有错误行
                    </Button>
                  }
                />
              )}

              {/* 数据预览 */}
              {previewData.length > 0 && (
                <div>
                  <Title level={5}>数据预览</Title>
                  <Table
                    columns={previewColumns}
                    dataSource={previewData}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey={(_, index) => index!}
                    scroll={{ x: 800 }}
                    rowClassName={(_record, index) =>
                      errorRows.some(err => err.rowIndex === index) ? 'error-row' : ''
                    }
                  />
                </div>
              )}
            </Space>
          </TabPane>

          {/* 手动录入 */}
          <TabPane
            tab={
              <span>
                <EditOutlined />
                手动录入
              </span>
            }
            key="manual"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="手动录入数据"
                description="逐条输入测量数据，支持单个或多个测量值（多个值用逗号分隔）"
                type="info"
                showIcon
              />

              <Form
                form={manualForm}
                layout="vertical"
                onFinish={handleManualSubmit}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="时间戳"
                      name="timestamp"
                      tooltip="选填，留空则使用当前时间"
                    >
                      <Input placeholder="2024-01-01 08:00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="组号"
                      name="groupNo"
                      tooltip="选填，留空则自动编号"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        placeholder="1"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label="测量值"
                      name="measurements"
                      rules={[{ required: true, message: '请输入测量值' }]}
                      tooltip="多个值用逗号分隔，如: 10.1, 10.2, 10.3"
                    >
                      <Input placeholder="10.1, 10.2, 10.3" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      添加数据
                    </Button>
                    <Button onClick={() => manualForm.resetFields()}>
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>

              <Divider />

              {/* 手动录入的数据预览 */}
              {previewData.length > 0 && (
                <div>
                  <Title level={5}>已录入数据 ({previewData.length} 行)</Title>
                  <Table
                    columns={previewColumns.filter(col => col.key !== 'action')}
                    dataSource={previewData}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey={(_, index) => index!}
                    scroll={{ x: 600 }}
                  />
                </div>
              )}
            </Space>
          </TabPane>

          {/* 数据库直连 */}
          <TabPane
            tab={
              <span>
                <DatabaseOutlined />
                数据库直连
              </span>
            }
            key="database"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="功能开发中"
                description="数据库直连功能正在开发中，敬请期待。将支持 MySQL、PostgreSQL、SQL Server 等主流数据库。"
                type="info"
                showIcon
              />

              <Card title="预留接口说明" size="small">
                <Paragraph>
                  未来将支持以下功能：
                </Paragraph>
                <ul>
                  <li>配置数据库连接（主机、端口、用户名、密码）</li>
                  <li>选择数据表和字段映射</li>
                  <li>设置数据筛选条件（时间范围、特定产品等）</li>
                  <li>实时数据同步与自动更新</li>
                </ul>
              </Card>
            </Space>
          </TabPane>
        </Tabs>
      </Drawer>

      {/* 错误行修正弹窗 */}
      <Modal
        title="修正数据"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => {
          // TODO: 实现数据修正逻辑
          setEditModalVisible(false);
          message.success('数据修正成功');
        }}
      >
        {currentEditRow && (
          <div>
            <Alert
              message="错误信息"
              description={currentEditRow.errors.join('；')}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form layout="vertical">
              <Form.Item label="测量值">
                <Input
                  defaultValue={currentEditRow.data.values?.join(', ')}
                  placeholder="用逗号分隔多个值"
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <style>{`
        .error-row {
          background-color: #fff1f0;
        }
      `}</style>
    </>
  );
};

export default DataImportDrawer;
