/**
 * quickAccess.js - 快捷入口数据管理工具模块
 *
 * 功能概述：
 *   管理导航门户的"快捷入口"功能区，包含四个子分类：最近使用、最多使用、
 *   最近上新、置顶。负责记录用户点击行为、统计使用频率、管理置顶列表等。
 *   所有数据持久化到 localStorage，按不同 key 分别存储。
 *
 * 子分类说明：
 *   - recent: 最近使用 —— 按最后点击时间倒序排列
 *   - most:   最多使用 —— 按累计点击次数倒序排列
 *   - new:    最近上新 —— 按网站 id（时间戳）倒序近似表示添加时间
 *   - pinned: 置顶     —— 用户手动固定的常用网站
 *
 * 数据存储 Key：
 *   - nav-quickaccess-enabled:  快捷入口总开关（字符串 "true"/"false"）
 *   - nav-quickaccess-sections: 子分类配置（JSON）
 *   - nav-quickaccess-clicks:   网站点击记录（JSON）
 *   - nav-quickaccess-pinned:   置顶网站列表（JSON）
 */

/** 快捷入口总开关 key */
const QA_ENABLED_KEY = 'nav-quickaccess-enabled'

/** 子分类配置 key */
const QA_SECTIONS_KEY = 'nav-quickaccess-sections'

/** 点击记录 key */
const QA_CLICKS_KEY = 'nav-quickaccess-clicks'

/** 置顶列表 key */
const QA_PINNED_KEY = 'nav-quickaccess-pinned'

/**
 * DEFAULT_SECTIONS - 默认子分类配置
 *
 * 定义快捷入口的四个子分类及其默认属性：
 *   - id:      子分类唯一标识
 *   - name:    子分类显示名称
 *   - visible: 是否可见（默认全部可见）
 *   - order:   排序序号
 *
 * @constant {Array<{id: string, name: string, visible: boolean, order: number}>}
 */
const DEFAULT_SECTIONS = [
  { id: 'recent', name: '最近使用', visible: true, order: 0 },
  { id: 'most', name: '最多使用', visible: true, order: 1 },
  { id: 'new', name: '最近上新', visible: true, order: 2 },
  { id: 'pinned', name: '置顶', visible: true, order: 3 },
]

/**
 * getQuickAccessEnabled - 获取快捷入口总开关状态
 *
 * 默认开启（当 localStorage 中无记录时返回 true）。
 *
 * @returns {boolean} true 表示快捷入口功能开启
 */
export function getQuickAccessEnabled() {
  return localStorage.getItem(QA_ENABLED_KEY) !== 'false'
}

/**
 * saveQuickAccessEnabled - 保存快捷入口总开关状态
 *
 * @param {boolean} enabled - 是否启用快捷入口
 */
export function saveQuickAccessEnabled(enabled) {
  localStorage.setItem(QA_ENABLED_KEY, enabled.toString())
}

/**
 * getQuickAccessSections - 获取子分类配置
 *
 * 从 localStorage 读取保存的子分类配置，与默认配置合并后返回。
 * 合并策略：以默认配置为基础，用户自定义配置覆盖同 id 的项，
 * 确保版本升级后新增的默认分类不会被遗漏。
 *
 * @returns {Array<Object>} 按 order 排序的子分类配置数组
 */
export function getQuickAccessSections() {
  const saved = localStorage.getItem(QA_SECTIONS_KEY)
  if (!saved) return [...DEFAULT_SECTIONS]
  try {
    const parsed = JSON.parse(saved)
    // 确保所有默认子分类都存在（防止版本升级后缺失）
    const merged = DEFAULT_SECTIONS.map(def => {
      const found = parsed.find(p => p.id === def.id)
      return found ? { ...def, ...found } : def
    })
    return merged.sort((a, b) => a.order - b.order)
  } catch {
    return [...DEFAULT_SECTIONS]
  }
}

/**
 * saveQuickAccessSections - 保存子分类配置
 *
 * @param {Array<Object>} sections - 子分类配置数组
 */
export function saveQuickAccessSections(sections) {
  localStorage.setItem(QA_SECTIONS_KEY, JSON.stringify(sections))
}

/**
 * resetQuickAccessSections - 重置子分类配置为默认值
 *
 * 删除 localStorage 中的自定义配置，下次读取时将返回默认值。
 */
export function resetQuickAccessSections() {
  localStorage.removeItem(QA_SECTIONS_KEY)
}

// ========== 点击记录 ==========

/**
 * recordSiteClick - 记录一次网站点击
 *
 * 以网站 URL 为键，记录点击次数、首次点击时间和最后点击时间。
 * 每次调用会更新对应站点的 site 信息（防止名称等属性变更后数据过期）。
 *
 * @param {Object} site - 被点击的网站对象（需包含 url 属性）
 */
export function recordSiteClick(site) {
  const clicks = getClickRecords()
  const key = site.url
  const now = Date.now()

  if (!clicks[key]) {
    clicks[key] = { site, count: 0, firstClick: now, lastClick: now }
  }
  clicks[key].count += 1
  clicks[key].lastClick = now
  // 更新 site 信息（以防名称等变更）
  clicks[key].site = site

  localStorage.setItem(QA_CLICKS_KEY, JSON.stringify(clicks))
}

/**
 * getClickRecords - 获取所有网站的点击记录
 *
 * @returns {Object} 以 URL 为键的点击记录映射表，无记录时返回空对象 {}
 */
export function getClickRecords() {
  const saved = localStorage.getItem(QA_CLICKS_KEY)
  if (!saved) return {}
  try { return JSON.parse(saved) } catch { return {} }
}

/**
 * getRecentSites - 获取最近使用的网站列表
 *
 * 按最后点击时间（lastClick）倒序排列，取前 N 个。
 *
 * @param {number} [limit=8] - 返回的网站数量上限
 * @returns {Array<Object>} 最近使用的网站对象数组
 */
export function getRecentSites(limit = 8) {
  const clicks = getClickRecords()
  return Object.values(clicks)
    .sort((a, b) => b.lastClick - a.lastClick)
    .slice(0, limit)
    .map(item => item.site)
}

/**
 * getMostUsedSites - 获取最多使用的网站列表
 *
 * 按累计点击次数（count）倒序排列，取前 N 个。
 *
 * @param {number} [limit=8] - 返回的网站数量上限
 * @returns {Array<Object>} 最常使用的网站对象数组
 */
export function getMostUsedSites(limit = 8) {
  const clicks = getClickRecords()
  return Object.values(clicks)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(item => item.site)
}

// ========== 最近上新 ==========

/**
 * getNewestSites - 获取最近上新的网站列表
 *
 * 遍历所有分类下的所有网站，以网站 id（时间戳）作为创建时间的近似值，
 * 按 id 倒序排列，取前 N 个。
 * 注意：由于现有数据结构没有 createdAt 字段，使用 parseInt(site.id) 近似表示添加时间。
 *
 * @param {Array<Object>} allCategories - 所有分类数据（每个分类需包含 sites 数组）
 * @param {number}        [limit=8]     - 返回的网站数量上限
 * @returns {Array<Object>} 最近上新的网站对象数组，每个对象附加 _createdAt 和 _categoryName 字段
 */
export function getNewestSites(allCategories, limit = 8) {
  const allSites = []
  allCategories.forEach(cat => {
    (cat.sites || []).forEach(site => {
      allSites.push({
        ...site,
        _createdAt: parseInt(site.id) || 0,
        _categoryName: cat.name
      })
    })
  })
  return allSites
    .sort((a, b) => b._createdAt - a._createdAt)
    .slice(0, limit)
}

// ========== 置顶管理 ==========

/**
 * getPinnedSites - 获取置顶网站列表
 *
 * @returns {Array<Object>} 置顶网站对象数组，无置顶时返回空数组 []
 */
export function getPinnedSites() {
  const saved = localStorage.getItem(QA_PINNED_KEY)
  if (!saved) return []
  try { return JSON.parse(saved) } catch { return [] }
}

/**
 * addPinnedSite - 添加网站到置顶列表
 *
 * 按 URL 去重：若已存在相同 URL 的置顶项，则忽略添加。
 *
 * @param {Object} site - 要置顶的网站对象（需包含 url 属性）
 * @returns {boolean} true 表示添加成功；false 表示已存在（未添加）
 */
export function addPinnedSite(site) {
  const pinned = getPinnedSites()
  // 去重：按 URL
  const exists = pinned.find(p => p.url === site.url)
  if (exists) return false // 已存在
  pinned.push(site)
  localStorage.setItem(QA_PINNED_KEY, JSON.stringify(pinned))
  return true
}

/**
 * removePinnedSite - 从置顶列表中移除网站
 *
 * @param {string} siteUrl - 要移除的网站 URL
 */
export function removePinnedSite(siteUrl) {
  const pinned = getPinnedSites().filter(p => p.url !== siteUrl)
  localStorage.setItem(QA_PINNED_KEY, JSON.stringify(pinned))
}

/**
 * isPinned - 检查指定网站是否已置顶
 *
 * @param {string} siteUrl - 要检查的网站 URL
 * @returns {boolean} true 表示已置顶
 */
export function isPinned(siteUrl) {
  return getPinnedSites().some(p => p.url === siteUrl)
}

/**
 * reorderPinnedSites - 调整置顶网站的排列顺序
 *
 * @param {Array<Object>} sites - 重新排序后的置顶网站数组
 */
export function reorderPinnedSites(sites) {
  localStorage.setItem(QA_PINNED_KEY, JSON.stringify(sites))
}
