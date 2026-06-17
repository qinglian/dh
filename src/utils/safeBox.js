/**
 * safeBox.js - 保险箱数据管理工具模块
 *
 * 功能概述：
 *   管理导航门户的"保险箱"功能，用于存储需要密码保护的私密网站链接。
 *   支持保险箱的启用/关闭、密码设置与验证、网站的增删查操作。
 *   所有数据持久化到 localStorage。
 *
 * 安全说明：
 *   密码以明文存储在 localStorage 中，适用于低安全需求的场景。
 *   不适用于存储真正的敏感数据（如银行密码等）。
 *
 * 数据存储 Key：
 *   - nav-safebox-enabled:  保险箱开关状态（字符串 "true"/"false"）
 *   - nav-safebox-password: 保险箱访问密码（明文字符串）
 *   - nav-safebox-sites:    保险箱内网站列表（JSON 数组）
 */

/** 保险箱开关状态 key */
const SAFE_BOX_ENABLED_KEY = 'nav-safebox-enabled'

/** 保险箱密码 key */
const SAFE_BOX_PASSWORD_KEY = 'nav-safebox-password'

/** 保险箱网站列表 key */
const SAFE_BOX_SITES_KEY = 'nav-safebox-sites'

/**
 * getSafeBoxEnabled - 获取保险箱开关状态
 *
 * 返回保险箱功能是否已启用。
 *
 * @returns {boolean} true 表示保险箱功能已启用
 */
export function getSafeBoxEnabled() {
  return localStorage.getItem(SAFE_BOX_ENABLED_KEY) === 'true'
}

/**
 * saveSafeBoxEnabled - 保存保险箱开关状态
 *
 * @param {boolean} enabled - 是否启用保险箱
 */
export function saveSafeBoxEnabled(enabled) {
  localStorage.setItem(SAFE_BOX_ENABLED_KEY, enabled.toString())
}

/**
 * getSafeBoxPassword - 获取保险箱密码
 *
 * 未设置密码时返回空字符串。
 *
 * @returns {string} 保险箱密码
 */
export function getSafeBoxPassword() {
  return localStorage.getItem(SAFE_BOX_PASSWORD_KEY) || ''
}

/**
 * saveSafeBoxPassword - 保存（设置或修改）保险箱密码
 *
 * @param {string} password - 新密码
 */
export function saveSafeBoxPassword(password) {
  localStorage.setItem(SAFE_BOX_PASSWORD_KEY, password)
}

/**
 * clearSafeBoxPassword - 清除保险箱密码
 *
 * 删除密码后，保险箱将不再需要密码验证即可访问。
 */
export function clearSafeBoxPassword() {
  localStorage.removeItem(SAFE_BOX_PASSWORD_KEY)
}

/**
 * verifySafeBoxPassword - 验证输入的密码是否正确
 *
 * 将用户输入与本地存储的密码进行字符串全等比较。
 *
 * @param {string} input - 用户输入的密码
 * @returns {boolean} true 表示密码正确
 */
export function verifySafeBoxPassword(input) {
  return input === getSafeBoxPassword()
}

/**
 * getSafeBoxSites - 获取保险箱中的网站列表
 *
 * @returns {Array<Object>} 网站对象数组，无数据时返回空数组 []
 */
export function getSafeBoxSites() {
  const saved = localStorage.getItem(SAFE_BOX_SITES_KEY)
  if (!saved) return []
  try { return JSON.parse(saved) } catch { return [] }
}

/**
 * saveSafeBoxSites - 保存保险箱网站列表
 *
 * 直接覆盖已有的网站列表。
 *
 * @param {Array<Object>} sites - 网站对象数组
 */
export function saveSafeBoxSites(sites) {
  localStorage.setItem(SAFE_BOX_SITES_KEY, JSON.stringify(sites))
}

/**
 * addSafeBoxSite - 添加网站到保险箱
 *
 * 按 URL 去重：若保险箱中已存在相同 URL 的网站，则不添加。
 * 若网站没有 id，则自动生成一个以 "safe_" 为前缀的时间戳 id。
 *
 * @param {Object} site - 要添加的网站对象（需包含 url 属性，id 可选）
 * @returns {boolean} true 表示添加成功；false 表示已存在相同 URL 的网站
 */
export function addSafeBoxSite(site) {
  const sites = getSafeBoxSites()
  // 去重：按 URL
  if (sites.find(s => s.url === site.url)) return false
  sites.push({ ...site, id: site.id || 'safe_' + Date.now() })
  saveSafeBoxSites(sites)
  return true
}

/**
 * removeSafeBoxSite - 从保险箱中移除指定网站
 *
 * @param {string} siteId - 要移除的网站 id
 */
export function removeSafeBoxSite(siteId) {
  const sites = getSafeBoxSites().filter(s => s.id !== siteId)
  saveSafeBoxSites(sites)
}

/**
 * resetSafeBox - 重置保险箱（清除所有数据）
 *
 * 同时清除：开关状态、密码、网站列表。
 * 执行后保险箱恢复为未配置状态。
 */
export function resetSafeBox() {
  localStorage.removeItem(SAFE_BOX_ENABLED_KEY)
  localStorage.removeItem(SAFE_BOX_PASSWORD_KEY)
  localStorage.removeItem(SAFE_BOX_SITES_KEY)
}
