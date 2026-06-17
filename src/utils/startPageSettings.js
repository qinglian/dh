/**
 * startPageSettings.js - 起始页设置数据管理模块（按页面隔离）
 *
 * 功能概述：
 *   管理起始页的显示设置，支持按页面 id 独立存储各页面的设置项。
 *   包括搜索框、时间组件、侧边栏、自由布局、搜索历史等模块的可见性控制。
 *
 * 设置项说明：
 *   - searchBox:     { visible }           搜索框是否显示
 *   - timeWidget:    { visible }           时间组件是否显示
 *   - pageSidebar:   { visible, compact }  页面侧边栏是否显示及是否为紧凑模式
 *   - freeLayout:    { enabled }           自由布局是否启用
 *   - searchHistory: { visible }           搜索历史是否显示
 *
 * 数据存储 Key：
 *   - nav-startpage-settings-{pageId}: 每个页面独立的设置项（JSON 对象）
 *
 * 读取策略：
 *   从 localStorage 读取的设置与 DEFAULT_SETTINGS 进行浅合并，
 *   确保新增的设置项有默认值。
 */

/**
 * DEFAULT_SETTINGS - 默认起始页设置
 *
 * 定义所有设置项的默认值，作为新页面和重置后的初始配置。
 *
 * @constant {Object}
 */
export const DEFAULT_SETTINGS = {
  searchBox: {
    visible: true,
  },
  timeWidget: {
    visible: true,
  },
  pageSidebar: {
    visible: true,
    compact: true,
  },
  freeLayout: {
    enabled: false,
  },
  searchHistory: {
    visible: true,
  },
}

/**
 * getSettings - 获取指定页面的设置
 *
 * 返回合并后的完整设置对象。若 localStorage 中有保存的设置，
 * 则与默认设置合并（保存值优先）；否则返回默认设置的深拷贝。
 *
 * @param {string} [pageId='default'] - 页面 id，默认为 'default'
 * @returns {Object} 合并后的设置对象，包含所有设置项的当前值
 */
export function getSettings(pageId = 'default') {
  const key = `nav-startpage-settings-${pageId}`
  const saved = localStorage.getItem(key)
  if (!saved) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  try { return { ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), ...JSON.parse(saved) } } catch { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) }
}

/**
 * saveSettings - 保存指定页面的完整设置
 *
 * 直接覆盖该页面的所有设置项。
 *
 * @param {string} pageId   - 页面 id
 * @param {Object} settings - 完整的设置对象
 */
export function saveSettings(pageId, settings) {
  const key = `nav-startpage-settings-${pageId}`
  localStorage.setItem(key, JSON.stringify(settings))
}

/**
 * updateSetting - 更新指定页面的单个设置项
 *
 * 先读取当前设置，修改指定分类下的指定属性，然后保存。
 * 若 settings 中不存在该分类，则自动创建一个空对象。
 *
 * @param {string} pageId   - 页面 id
 * @param {string} category - 设置分类名（如 'searchBox'、'timeWidget'）
 * @param {string} key      - 要更新的属性名（如 'visible'、'enabled'）
 * @param {*}      value    - 新值
 * @returns {Object} 更新后的完整设置对象
 */
export function updateSetting(pageId, category, key, value) {
  const settings = getSettings(pageId)
  if (!settings[category]) settings[category] = {}
  settings[category][key] = value
  saveSettings(pageId, settings)
  return settings
}
