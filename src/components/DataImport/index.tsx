import React, { useState } from 'react';
import { Upload, Table, Alert, Space, Card } from 'antd';
import { InboxOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { parseExcelFile, parseCSVFile, validateData } from '../../utils/excelHandler';
import type { RawDataRow, ExcelData, ValidationResult } from '../../types';

const { Dragger } = Upload;

interface DataImportProps {
  onDataImported: (data: RawDataRow[], metadata?: ExcelData['metadata']) => void;
}

const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RawDataRow[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setValidation(null);

    try {
      let excelData: ExcelData;

      // Parse based on file extension
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'csv') {
        excelData = await parseCSVFile(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        excelData = await parseExcelFile(file);
      } else {
        throw new Error('不支持的文件格式。请上传 .xlsx、.xls 或 .csv 文件。');
      }

      // Validate data
      const validationResult = validateData(excelData.data);
      setValidation(validationResult);

      if (!validationResult.valid) {
        setLoading(false);
        return;
      }

      // Set preview data (first 10 rows)
      setPreviewData(excelData.data.slice(0, 10));
      setFileInfo({ name: file.name, size: file.size });

      // If validation passed, import the data with metadata
      onDataImported(excelData.data, excelData.metadata);
    } catch (error) {
      setValidation({
        valid: false,
        errors: [error instanceof Error ? error.message : '发生未知错误'],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      handleFileUpload(file);
      return false; // Prevent auto upload
    },
  };

  // Prepare preview table columns
  const previewColumns = [
    {
      title: '行号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (text: string) => text || '无',
    },
    {
      title: '组号',
      dataIndex: 'groupNo',
      key: 'groupNo',
      width: 90,
      render: (text: number) => text || '无',
    },
    {
      title: '测量值',
      dataIndex: 'values',
      key: 'values',
      render: (values: number[]) => values.map(v => v.toFixed(3)).join(', '),
    },
  ];

  return (
    <Card title="数据导入" style={{ height: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Dragger {...uploadProps} disabled={loading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 Excel (.xlsx, .xls) 和 CSV (.csv) 文件
            <br />
            预期格式：时间戳, 组号, 测量值1, 测量值2, ...
          </p>
        </Dragger>

        {fileInfo && (
          <Alert
            message={`文件已加载: ${fileInfo.name}`}
            description={`文件大小: ${(fileInfo.size / 1024).toFixed(2)} KB | 数据行数: ${previewData.length > 0 ? `${previewData.length}+ (显示前10行)` : '0'}`}
            type="success"
            icon={<FileExcelOutlined />}
            showIcon
          />
        )}

        {validation && !validation.valid && (
          <Alert
            message="数据验证失败"
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

        {validation && validation.warnings.length > 0 && (
          <Alert
            message="警告"
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

        {previewData.length > 0 && (
          <div>
            <h4>数据预览（前10行）</h4>
            <Table
              columns={previewColumns}
              dataSource={previewData}
              pagination={false}
              size="small"
              rowKey={(_, index) => index!}
              scroll={{ x: 600 }}
            />
          </div>
        )}
      </Space>
    </Card>
  );
};

export default DataImport;
