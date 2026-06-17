/**
 * startPagePages.js - 起始页多页面数据管理模块
 *
 * 功能概述：
 *   管理导航门户起始页的"多页面"特性，支持创建、编辑、删除、排序多个页面，
 *   每个页面拥有独立的 id、名称、图标和排序序号。
 *   所有页面数据持久化到 localStorage。
 *
 * 页面结构：
 *   每个页面对象包含以下字段：
 *     - id:    页面唯一标识（默认页为 "default"，新页面为 "page_时间戳"）
 *     - name:  页面显示名称
 *     - icon:  页面图标名称（对应图标库中的图标标识）
 *     - order: 页面排序序号
 *
 * 数据存储 Key：
 *   - nav-startpage-pages:         所有页面数据（JSON 数组）
 *   - nav-startpage-current-page:  当前活跃页面 id
 */

/** 所有页面数据 key */
const PAGES_KEY = 'nav-startpage-pages'

/** 当前活跃页面 id key */
const CURRENT_PAGE_KEY = 'nav-startpage-current-page'

/**
 * DEFAULT_PAGES - 默认页面列表
 *
 * 应用初始状态下包含一个默认"首页"页面。
 *
 * @constant {Array<{id: string, name: string, icon: string, order: number}>}
 */
export const DEFAULT_PAGES = [
  {
    id: 'default',
    name: '首页',
    icon: 'Home',
    order: 0,
  }
]

/**
 * getPages - 获取所有页面列表
 *
 * 从 localStorage 读取页面数据，无保存记录时返回默认页面列表。
 *
 * @returns {Array<Object>} 页面对象数组
 */
export function getPages() {
  const saved = localStorage.getItem(PAGES_KEY)
  if (!saved) return [...DEFAULT_PAGES]
  try { return JSON.parse(saved) } catch { return [...DEFAULT_PAGES] }
}

/**
 * savePages - 保存页面列表
 *
 * 直接覆盖已有的页面数据。
 *
 * @param {Array<Object>} pages - 页面对象数组
 */
export function savePages(pages) {
  localStorage.setItem(PAGES_KEY, JSON.stringify(pages))
}

/**
 * getCurrentPageId - 获取当前活跃页面的 id
 *
 * 无记录时默认返回 'default'（首页）。
 *
 * @returns {string} 当前页面 id
 */
export function getCurrentPageId() {
  return localStorage.getItem(CURRENT_PAGE_KEY) || 'default'
}

/**
 * setCurrentPageId - 设置当前活跃页面
 *
 * @param {string} id - 要切换到的页面 id
 */
export function setCurrentPageId(id) {
  localStorage.setItem(CURRENT_PAGE_KEY, id)
}

/**
 * addPage - 添加一个新页面
 *
 * 自动生成以 "page_时间戳" 为格式的唯一 id，order 基于当前页面总数。
 *
 * @param {string} name        - 新页面的名称
 * @param {string} [icon='Home'] - 新页面的图标名称（默认 'Home'）
 * @returns {Object} 新创建的页面对象
 */
export function addPage(name, icon = 'Home') {
  const pages = getPages()
  const newPage = {
    id: 'page_' + Date.now(),
    name,
    icon,
    order: pages.length,
  }
  pages.push(newPage)
  savePages(pages)
  return newPage
}

/**
 * updatePage - 更新指定页面的属性
 *
 * 使用对象展开合并：只覆盖传入的字段，未传入的字段保持不变。
 *
 * @param {string} id      - 要更新的页面 id
 * @param {Object} updates - 要更新的字段键值对（如 { name: '新名称', icon: 'Star' }）
 */
export function updatePage(id, updates) {
  const pages = getPages()
  const idx = pages.findIndex(p => p.id === id)
  if (idx !== -1) {
    pages[idx] = { ...pages[idx], ...updates }
    savePages(pages)
  }
}

/**
 * deletePage - 删除指定页面
 *
 * 删除后自动对剩余页面重新排序（order 从 0 开始连续编号）。
 *
 * @param {string} id - 要删除的页面 id
 */
export function deletePage(id) {
  const pages = getPages()
  const filtered = pages.filter(p => p.id !== id)
  // 重新排序
  filtered.forEach((p, i) => { p.order = i })
  savePages(filtered)
}

/**
 * reorderPages - 调整页面排列顺序
 *
 * 接受完整排序后的页面数组，自动为每个页面分配连续的 order 序号。
 *
 * @param {Array<Object>} pages - 重新排序后的页面对象数组
 */
export function reorderPages(pages) {
  pages.forEach((p, i) => { p.order = i })
  savePages(pages)
}

/**
 * getPageDataKey - 生成页面专属数据的 localStorage key
 *
 * 用于为每个页面独立存储不同类型的数据（如设置、书签等），
 * 生成格式为 "nav-startpage-{dataType}-{pageId}" 的 key。
 *
 * @param {string} pageId   - 页面 id
 * @param {string} dataType - 数据类型标识（如 "settings"、"bookmarks"）
 * @returns {string} 拼接后的 localStorage key
 */
export function getPageDataKey(pageId, dataType) {
  return `nav-startpage-${dataType}-${pageId}`
}
