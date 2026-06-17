/**
 * siteStatus.js - 网站状态检测工具模块
 *
 * 功能概述：
 *   检测导航门户中的网站链接是否可访问。采用双重检测机制（favicon 图片加载
 *   和 fetch HEAD 请求）互相印证，30 分钟内缓存检测结果，避免频繁请求。
 *   对于可能被屏蔽的海外网站（如 GitHub、Google 等），会标记为"无法确定"状态，
 *   提示用户可能需要 VPN 访问。
 *
 * 检测机制：
 *   1. checkByImage:  通过 Google Favicon 服务加载网站图标，判断域名是否可达
 *   2. checkByFetch:  发送 no-cors HEAD 请求，判断网站是否有响应
 *
 *   两种方法并行执行，任一成功即判定为在线；全部失败时根据 URL 特征判断是否
 *   属于疑似被屏蔽的网站。
 *
 * 缓存策略：
 *   - 缓存 key: nav-site-status-cache
 *   - 缓存时长: 30 分钟（STATUS_CACHE_DURATION）
 *   - 过期缓存自动清理
 */

/** localStorage 缓存 key */
const STATUS_CACHE_KEY = 'nav-site-status-cache'

/** 缓存有效期：30 分钟（单位：毫秒） */
const STATUS_CACHE_DURATION = 1000 * 60 * 30

/**
 * getCache - 读取并过滤有效缓存
 *
 * 从 localStorage 读取缓存的检测结果，剔除已过期的条目后返回。
 *
 * @returns {Object} 以 URL 为键的有效缓存映射表
 */
function getCache() {
  try {
    const cached = localStorage.getItem(STATUS_CACHE_KEY)
    if (!cached) return {}
    const data = JSON.parse(cached)
    const now = Date.now()
    const valid = {}
    for (const [url, item] of Object.entries(data)) {
      if (now - item.timestamp < STATUS_CACHE_DURATION) {
        valid[url] = item
      }
    }
    return valid
  } catch {
    return {}
  }
}

/**
 * saveCache - 保存缓存到 localStorage
 *
 * @param {Object} cache - 缓存映射表
 */
function saveCache(cache) {
  localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(cache))
}

/**
 * checkSiteStatus - 检测单个网站的在线状态
 *
 * 优先返回缓存结果；无缓存时并行执行 favicon 检测和 fetch 检测，
 * 综合判断网站是否可访问。对疑似被屏蔽的网站标记为 unknown 状态。
 *
 * 返回的状态对象包含：
 *   - online:    {boolean} 是否在线（任一检测方法成功即为 true）
 *   - unknown:   {boolean} 是否无法确定（可能被屏蔽/需要 VPN）
 *   - checkedAt: {string}  检测时间（ISO 8601 格式）
 *
 * @param {string} url - 要检测的网站 URL
 * @returns {Promise<Object>} 状态对象 { online, unknown, checkedAt }
 */
export async function checkSiteStatus(url) {
  const cache = getCache()

  // 命中缓存直接返回
  if (cache[url]) {
    return cache[url].status
  }

  // 并行执行两种检测方法
  const results = await Promise.allSettled([
    checkByImage(url),
    checkByFetch(url)
  ])

  const isOnline = results.some(r => r.status === 'fulfilled' && r.value === true)

  // 如果所有检测方法都返回 false，判断是否属于疑似被屏蔽网站
  const hasError = results.every(r => r.status === 'fulfilled' && r.value === false)
  const isUnknown = hasError && isVpnOrBlockedSite(url)

  const status = {
    online: isOnline,
    unknown: isUnknown, // 无法确定（可能是VPN/墙）
    checkedAt: new Date().toISOString()
  }

  cache[url] = { status, timestamp: Date.now() }
  saveCache(cache)

  return status
}

/**
 * isVpnOrBlockedSite - 判断 URL 是否属于疑似被屏蔽/需要 VPN 的网站
 *
 * 基于预定义的域名正则匹配列表，涵盖常见海外服务。当所有检测方法都失败时，
 * 若命中此列表，状态将被标记为 unknown（而非 offline），提示用户可能
 * 需要特殊网络环境访问。
 *
 * @param {string} url - 要判断的 URL
 * @returns {boolean} true 表示该网站疑似被屏蔽
 */
function isVpnOrBlockedSite(url) {
  const vpnPatterns = [
    /github\.com/i,
    /youtube\.com/i,
    /google\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /reddit\.com/i,
    /discord\.com/i,
    /telegram\.org/i,
    /netflix\.com/i,
    /spotify\.com/i,
    /chatgpt\.com/i,
    /openai\.com/i,
    /claude\.ai/i,
    /anthropic\.com/i,
    /midjourney\.com/i,
    /vercel\.com/i,
    /stackoverflow\.com/i,
    /npmjs\.com/i,
    /dribbble\.com/i,
    /behance\.net/i,
    /unsplash\.com/i,
    /pexels\.com/i,
    /soundcloud\.com/i,
    /twitch\.tv/i,
    /medium\.com/i,
    /notion\.so/i,
    /figma\.com/i,
    /canva\.com/i,
    /dropbox\.com/i,
  ]
  return vpnPatterns.some(p => p.test(url))
}

/**
 * checkByImage - 方式一：通过加载网站 favicon 图标检测连通性
 *
 * 利用 Google 的 favicon 代理服务（https://www.google.com/s2/favicons）
 * 加载目标域名的图标。若图标加载成功，说明该域名可被访问。
 * 超时时间：8 秒。
 *
 * @param {string} url - 网站 URL
 * @returns {Promise<boolean>} true 表示图标加载成功（网站可达）
 */
function checkByImage(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url)
      const img = new Image()
      const timeout = setTimeout(() => resolve(false), 8000)

      img.onload = () => { clearTimeout(timeout); resolve(true) }
      img.onerror = () => { clearTimeout(timeout); resolve(false) }
      // 使用 Google Favicon 服务避免跨域限制，_t 参数防止缓存
      img.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16&_t=${Date.now()}`
    } catch {
      resolve(false)
    }
  })
}

/**
 * checkByFetch - 方式二：通过 fetch HEAD 请求检测连通性
 *
 * 使用 no-cors 模式发送 HEAD 请求，避免跨域限制。
 * 只要能收到响应（无论 HTTP 状态码），即判定为可达。
 * 超时时间：8 秒。
 *
 * @param {string} url - 网站 URL
 * @returns {Promise<boolean>} true 表示请求有响应（网站可达）
 */
function checkByFetch(url) {
  return new Promise((resolve) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => { controller.abort(); resolve(false) }, 8000)

    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store'
    })
      .then(() => { clearTimeout(timeout); resolve(true) })
      .catch(() => { clearTimeout(timeout); resolve(false) })
  })
}

/**
 * checkAllSites - 批量检测多个网站的在线状态
 *
 * 充分利用缓存：已缓存且未过期的网站直接使用缓存结果，仅对需要更新的
 * 网站发起检测请求。每次并发 5 个请求，避免同时发起过多网络请求。
 *
 * @param {Array<Object>} sites - 网站对象数组（每个对象需包含 url 属性）
 * @returns {Promise<Object>} 以 URL 为键的状态对象映射表
 */
export async function checkAllSites(sites) {
  const cache = getCache()
  const now = Date.now()

  // 筛选出需要重新检测的网站（无缓存或缓存已过期）
  const needCheck = sites.filter(site => {
    const cached = cache[site.url]
    return !cached || (now - cached.timestamp >= STATUS_CACHE_DURATION)
  })

  // 每次并发 5 个请求
  const batchSize = 5
  const results = {}

  for (let i = 0; i < needCheck.length; i += batchSize) {
    const batch = needCheck.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (site) => {
        const status = await checkSiteStatus(site.url)
        return { url: site.url, status }
      })
    )
    batchResults.forEach(r => { results[r.url] = r.status })
  }

  // 将缓存中已有的结果补充到返回值中
  for (const site of sites) {
    if (!results[site.url] && cache[site.url]) {
      results[site.url] = cache[site.url].status
    }
  }

  return results
}

/**
 * clearStatusCache - 清除所有网站状态缓存
 *
 * 删除 localStorage 中的状态缓存条目，下次检测将强制重新请求。
 */
export function clearStatusCache() {
  localStorage.removeItem(STATUS_CACHE_KEY)
}
