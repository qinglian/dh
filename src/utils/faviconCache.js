/** faviconCache.js - 网页图标缓存模块
 * 
 * 优先级：Google S2 (高清) > favicon.im (免VPN) > 首字母兜底
 * 策略：首次加载时按优先级尝试获取，成功后写入缓存和站点数据
 *       后续打开直接显示已保存的图标，后台异步检查是否有更高优先级源可用
 */
const CACHE_KEY = 'nav-favicon-cache-v3'
const MAX_CACHE_SIZE = 500

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

export function getCachedFavicon(domain) {
  const cache = getCache()
  const entry = cache[domain]
  if (entry && entry.url) return entry.url
  return null
}

export function getCachedFaviconSource(domain) {
  const cache = getCache()
  const entry = cache[domain]
  return entry?.source || null
}

export function cacheFavicon(domain, url, source = 'faviconim') {
  if (!url || !domain) return
  const cache = getCache()
  const existing = cache[domain]
  const newPriority = SOURCE_PRIORITY[source] || 99
  const oldPriority = existing?.source ? (SOURCE_PRIORITY[existing.source] || 99) : 99
  if (!existing || newPriority <= oldPriority || !existing.url) {
    cache[domain] = { url, source, ts: Date.now() }
    saveCache(cache)
  }
}

export function getFaviconUrls(domain) {
  return [
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, source: 'google', priority: 1 },
    { url: `https://favicon.im/${domain}`, source: 'faviconim', priority: 2 },
  ]
}

export function getFaviconUrl(domain) {
  return getFaviconUrls(domain).map(u => u.url)
}

/**
 * 后台静默检查：按优先级链依次尝试获取 favicon
 * 直接对比当前 iconUrl，如果当前非 Google S2 则尝试升级
 * @param {string} domain - 域名
 * @param {string} currentIconUrl - 当前站点保存的 iconUrl
 * @returns {Promise<{url: string, source: string}|null>}
 */
export function tryUpgradeFavicon(domain, currentIconUrl = '') {
  return new Promise((resolve) => {
    const candidates = getFaviconUrls(domain)
    // 如果当前已经是 Google S2 URL，无需升级
    if (currentIconUrl && currentIconUrl.includes('google.com/s2/favicons')) {
      resolve(null); return
    }
    tryNext(0)

    function tryNext(index) {
      if (index >= candidates.length) { resolve(null); return }
      const candidate = candidates[index]
      // 跳过与当前相同的源 URL
      if (currentIconUrl && candidate.url === currentIconUrl) {
        tryNext(index + 1); return
      }
      const img = new Image()
      let settled = false
      const done = (result) => { if (!settled) { settled = true; resolve(result) } }
      const timeout = setTimeout(() => { tryNext(index + 1) }, 4000)
      img.onload = () => {
        clearTimeout(timeout)
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          cacheFavicon(domain, candidate.url, candidate.source)
          done({ url: candidate.url, source: candidate.source })
        } else {
          tryNext(index + 1)
        }
      }
      img.onerror = () => { clearTimeout(timeout); tryNext(index + 1) }
      img.onabort = () => { clearTimeout(timeout); tryNext(index + 1) }
      img.src = candidate.url
    }
  })
}

export function isGoogleSource(domain) {
  return getCachedFaviconSource(domain) === 'google'
}
