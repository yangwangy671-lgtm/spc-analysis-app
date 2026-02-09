import React, { useMemo } from 'react';
import { Tag, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { ProcessedDataRow } from '../../types';

interface DataTableProps {
  data: ProcessedDataRow[];
  onExport?: () => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, onExport }) => {
  const columnDefs: ColDef<ProcessedDataRow>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: '行号',
        width: 80,
        pinned: 'left',
        sortable: true,
      },
      {
        field: 'timestamp',
        headerName: '时间戳',
        width: 160,
        sortable: true,
        filter: true,
        valueFormatter: (params) => params.value || '无',
      },
      {
        field: 'groupNo',
        headerName: '组号',
        width: 100,
        sortable: true,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'values',
        headerName: '测量值',
        width: 300,
        valueFormatter: (params) => {
          if (Array.isArray(params.value)) {
            return params.value.map(v => v.toFixed(3)).join(', ');
          }
          return '无';
        },
      },
      {
        field: 'mean',
        headerName: '均值',
        width: 120,
        sortable: true,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => params.value?.toFixed(4) || '无',
      },
      {
        field: 'range',
        headerName: '极差',
        width: 120,
        sortable: true,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => params.value?.toFixed(4) || '无',
      },
      {
        field: 'status',
        headerName: '状态',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const status = params.value;
          let color = 'default';
          let text = '正常';

          if (status === 'critical') {
            color = 'error';
            text = '严重';
          } else if (status === 'warning') {
            color = 'warning';
            text = '警告';
          } else if (status === 'normal') {
            color = 'success';
            text = '正常';
          }

          return <Tag color={color}>{text}</Tag>;
        },
      },
      {
        field: 'anomalies',
        headerName: '异常规则',
        width: 150,
        valueFormatter: (params) => {
          if (Array.isArray(params.value) && params.value.length > 0) {
            return params.value.map(a => `规则${a.rule}`).join(', ');
          }
          return '-';
        },
      },
    ],
    []
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const getRowStyle = (params: any) => {
    if (params.data.status === 'critical') {
      return { backgroundColor: '#fff2f0' };
    } else if (params.data.status === 'warning') {
      return { backgroundColor: '#fffbe6' };
    }
    return undefined;
  };

  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>数据表格</h3>
        {onExport && (
          <Button icon={<DownloadOutlined />} onClick={onExport} type="primary">
            导出Excel
          </Button>
        )}
      </div>
      <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
        <AgGridReact<ProcessedDataRow>
          rowData={data}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          getRowStyle={getRowStyle}
          domLayout="normal"
        />
      </div>
    </div>
  );
};

export default DataTable;
