/** faviconCache.js - 网页图标缓存模块
 * 
 * 优先级：Google S2 (高清) > favicon.im (免VPN) > 首字母兜底
 * 策略：首次加载时按优先级尝试获取，成功后写入缓存和站点数据
 *       后续打开直接显示已保存的图标，后台异步检查是否有更高优先级源可用
 */
const CACHE_KEY = 'nav-favicon-cache-v3'
const MAX_CACHE_SIZE = 500

// 来源优先级：数字越小优先级越高
const SOURCE_PRIORITY = { google: 1, faviconim: 2 }

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} } catch { return {} }
}

function saveCache(cache) {
  const entries = Object.entries(cache)
  if (entries.length > MAX_CACHE_SIZE) {
    entries.sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0))
    const keep = Object.fromEntries(entries.slice(-MAX_CACHE_SIZE))
    localStorage.setItem(CACHE_KEY, JSON.stringify(keep))
  } else {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  }
}

/**
 * 获取缓存的 favicon URL
 */
export function getCachedFavicon(domain) {
  const cache = getCache()
  const entry = cache[domain]
  if (entry && entry.url) return entry.url
  return null
}

/**
 * 获取缓存的 favicon 来源
 */
export function getCachedFaviconSource(domain) {
  const cache = getCache()
  const entry = cache[domain]
  return entry?.source || null
}

/**
 * 缓存 favicon，记录来源和获取时的时间戳
 * @param {string} domain - 域名
 * @param {string} url - favicon URL
 * @param {string} source - 来源：'google' | 'faviconim'
 */
export function cacheFavicon(domain, url, source = 'faviconim') {
  if (!url || !domain) return
  const cache = getCache()
  const existing = cache[domain]
  const newPriority = SOURCE_PRIORITY[source] || 99
  const oldPriority = existing?.source ? (SOURCE_PRIORITY[existing.source] || 99) : 99
  // 只有更高或同等优先级才更新（保留更高优先级的来源）
  if (!existing || newPriority <= oldPriority || !existing.url) {
    cache[domain] = { url, source, ts: Date.now() }
    saveCache(cache)
  }
}

/**
 * 获取指定域名的 favicon 候选 URL 列表（按优先级排序）
 * 返回：[{ url, source, priority }]
 */
export function getFaviconUrls(domain) {
  return [
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, source: 'google', priority: 1 },
    { url: `https://favicon.im/${domain}`, source: 'faviconim', priority: 2 },
  ]
}

// 保留旧接口兼容
export function getFaviconUrl(domain) {
  return getFaviconUrls(domain).map(u => u.url)
}

/**
 * 后台静默检查：用 Image 对象测试 Google S2 是否可用
 * 如果当前缓存不是 Google 源且 Google 可用，则升级缓存
 * @param {string} domain - 域名
 * @returns {Promise<{url: string, source: string}|null>}
 */
export function tryUpgradeFavicon(domain) {
  return new Promise((resolve) => {
    const currentSource = getCachedFaviconSource(domain)
    // 已经是 Google 源，不需要升级
    if (currentSource === 'google') { resolve(null); return }
    
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    const img = new Image()
    const timeout = setTimeout(() => { resolve(null) }, 3000)
    img.onload = () => {
      clearTimeout(timeout)
      cacheFavicon(domain, googleUrl, 'google')
      resolve({ url: googleUrl, source: 'google' })
    }
    img.onerror = () => {
      clearTimeout(timeout)
      resolve(null)
    }
    img.src = googleUrl
  })
}