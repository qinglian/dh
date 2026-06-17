/**
 * main.jsx - 应用程序入口文件
 *
 * 职责：
 * 1. 将 React 根组件 (App) 挂载到 DOM 中的 #root 容器上
 * 2. 使用 React.StrictMode 包裹以启用开发阶段的额外检查与警告
 * 3. 引入全局样式文件 index.css
 *
 * 该文件是整个导航门户 (nav-portal) 的启动点，不包含业务逻辑，
 * 所有业务逻辑由 App 及其子组件负责。
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/* 创建 React 根节点并渲染 App 组件，同时包裹 StrictMode 以激活严格模式检查 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
