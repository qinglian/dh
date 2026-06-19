/**
 * defaultConfig.js - 内置默认配置模块
 *
 * 将用户导出的配置 JSON 作为源码内置默认值。
 * 应用首次加载时（localStorage 为空），自动将这些默认值写入 localStorage。
 * 这样新用户首次访问即可看到配置好的效果，无需手动导入。
 */

/**
 * DEFAULT_CONFIG - 内置默认配置
 * 从用户导出的 清炼导航_配置_2026-6-19.json 转换而来（不含天气数据）
 */
export const DEFAULT_CONFIG = {
  // 主题模式
  'nav-theme-mode': 'dark',

  // 当前视图
  'nav-current-view': 'nav',
  'nav-startpage-current-page': 'default',

  // 网站标题
  'nav-site-title': '清炼导航',
  'nav-site-subtitle': 'qinglian',

  // 站点状态检测
  'nav-site-status': 'true',

  // 动效背景
  'nav-animated-bg': 'true',
  'nav-bg-effects': '["weather"]',
  'nav-bg-multi': 'false',

  // 壁纸
  'nav-wallpaper': 'default',
  'nav-bg-blur': '0',
  'nav-bg-opacity': '100',

  // 搜索历史
  'nav-search-history-enabled': 'true',
  'nav-search-history': '[]',

  // 隐藏分类
  'nav-hidden-categories': '[]',

  // 深色模式聚光灯
  'nav-dark-mouse-spotlight': 'true',
  'nav-dark-spotlight-size': '110',
  'nav-dark-spotlight-opacity': '40',
  'nav-dark-spotlight-mask': 'true',
  'nav-dark-spotlight-color1': '#000000',
  'nav-dark-spotlight-color2': '#339bf0',
  'nav-dark-spotlight-colorMix': '46',

  // 浅色模式聚光灯
  'nav-light-mouse-spotlight': 'true',
  'nav-light-spotlight-size': '150',
  'nav-light-spotlight-opacity': '45',
  'nav-light-spotlight-mask': 'true',
  'nav-light-spotlight-color1': '#ffffff',
  'nav-light-spotlight-color2': '#7850f2',
  'nav-light-spotlight-colorMix': '49',

  // 深色模式玻璃效果
  'nav-glass-dark-blur-enabled': 'true',
  'nav-glass-dark-blur-level': '50',
  'nav-glass-dark-opacity-enabled': 'true',
  'nav-glass-dark-opacity-level': '50',
  'nav-glass-dark-text-color-enabled': 'false',
  'nav-glass-dark-text-color1': '#f5f5f7',
  'nav-glass-dark-text-color2': '#a1a1a6',
  'nav-glass-dark-text-color3': '#636366',

  // 浅色模式玻璃效果
  'nav-glass-light-blur-enabled': 'true',
  'nav-glass-light-blur-level': '50',
  'nav-glass-light-opacity-enabled': 'true',
  'nav-glass-light-opacity-level': '100',
  'nav-glass-light-text-color-enabled': 'false',
  'nav-glass-light-text-color1': '#1c1c1e',
  'nav-glass-light-text-color2': '#3a3a3c',
  'nav-glass-light-text-color3': '#8e8e93',

  // 版权
  'nav-copyright-text': '清炼',
}

/**
 * hasAnyNavConfig - 检查是否已有任何导航配置
 * 通过检查几个关键 key 来判断用户是否已有配置
 */
function hasAnyNavConfig() {
  const keys = [
    'nav-theme-mode',
    'nav-site-title',
    'nav-animated-bg',
    'nav-current-view',
  ]
  return keys.some(key => localStorage.getItem(key) !== null)
}

/**
 * applyDefaultConfig - 应用默认配置
 * 如果 localStorage 中没有任何导航配置，则将内置默认值写入
 */
export function applyDefaultConfig() {
  if (hasAnyNavConfig()) {
    return false // 已有配置，不覆盖
  }

  Object.entries(DEFAULT_CONFIG).forEach(([key, value]) => {
    localStorage.setItem(key, value)
  })

  return true
}
