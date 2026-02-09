import React, { useState } from 'react';
import { Menu } from 'antd';
import {
  MenuOutlined,
  HomeOutlined,
  BarChartOutlined,
  RocketOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  MonitorOutlined,
  FundOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface SideNavigationProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onMenuClick?: (key: string) => void;
}

type MenuItem = Required<MenuProps>['items'][number];

const SideNavigation: React.FC<SideNavigationProps> = ({ collapsed = false, onCollapse, onMenuClick }) => {
  const [selectedKey, setSelectedKey] = useState('home');

  const menuItems: MenuItem[] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: 'summary',
      icon: <BarChartOutlined />,
      label: '摘要',
    },
    {
      key: 'start',
      icon: <RocketOutlined />,
      label: '开始',
      children: [
        { key: 'start-1', label: '数据导入' },
        { key: 'start-2', label: '参数配置' },
      ],
    },
    {
      key: 'detection',
      icon: <ExperimentOutlined />,
      label: '检测项目',
      children: [
        { key: 'detection-1', label: '控制图分析' },
        { key: 'detection-2', label: '过程能力分析' },
        { key: 'detection-3', label: '异常检测' },
      ],
    },
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '看板',
      children: [
        { key: 'dashboard-1', label: 'X-bar & R 图' },
        { key: 'dashboard-2', label: 'I-MR 图' },
        { key: 'dashboard-3', label: '直方图' },
      ],
    },
    {
      key: 'monitor',
      icon: <MonitorOutlined />,
      label: '监控',
      children: [
        { key: 'monitor-1', label: '实时监控' },
        { key: 'monitor-2', label: '报警管理' },
      ],
    },
    {
      key: 'analysis',
      icon: <FundOutlined />,
      label: '分析工具',
      children: [
        { key: 'analysis-1', label: 'CPK 计算' },
        { key: 'analysis-2', label: '正态性检验' },
        { key: 'analysis-3', label: '趋势分析' },
      ],
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: '数据采集',
      children: [
        { key: 'data-1', label: 'Excel 导入' },
        { key: 'data-2', label: 'CSV 导入' },
        { key: 'data-3', label: '数据库连接' },
      ],
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        { key: 'system-1', label: '用户管理' },
        { key: 'system-2', label: '权限配置' },
      ],
    },
    {
      key: 'msa',
      icon: <CheckCircleOutlined />,
      label: 'MSA',
      children: [
        { key: 'msa-1', label: '测量系统分析' },
        { key: 'msa-2', label: 'GR&R' },
      ],
    },
    {
      key: 'config',
      icon: <FileTextOutlined />,
      label: '配置总览',
      children: [
        { key: 'config-1', label: '规格限配置' },
        { key: 'config-2', label: '控制限配置' },
      ],
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedKey(e.key);
    onMenuClick?.(e.key);
  };

  return (
    <div className="side-navigation">
      {/* 顶部 Logo 区域 */}
      <div className="side-nav-header">
        <MenuOutlined className="menu-icon" onClick={() => onCollapse?.(!collapsed)} />
        <span className="logo-text">SPC</span>
      </div>

      {/* 菜单区域 */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        items={menuItems}
        className="side-nav-menu"
        inlineCollapsed={collapsed}
      />
    </div>
  );
};

export default SideNavigation;
