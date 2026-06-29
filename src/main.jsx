/**
 * main.jsx - 应用程序入口文件
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return React.createElement('div', { style: { color: 'red', textAlign: 'center', paddingTop: 100 } }, React.createElement('h1', null, '页面出错了，请刷新重试'));
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(React.StrictMode, null, React.createElement(App))
  )
)
