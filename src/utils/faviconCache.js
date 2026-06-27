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


/** 通过 canvas 像素分析检测 Google S2 返回的默认地球图标
 *  地球图特征：白色背景 + 中心蓝色圆形 + 少量颜色种类
 */

export function getCachedFavicon(domain) {
  const cache = getCache()
  const entry = cache[domain]
  if (entry && entry.url) return entry.url
  return null
}


/** 通过 canvas 像素分析检测 Google S2 返回的默认地球图标
 *  地球图特征：白色背景 + 中心蓝色圆形 + 少量颜色种类
 */
export function detectGoogleGlobe(img) {
  try {
    if (!img || !img.naturalWidth || !img.naturalHeight) return false
    // 极小尺寸必为地球图
    if (img.naturalWidth <= 16 || img.naturalHeight <= 16) return true
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.drawImage(img, 0, 0, 8, 8)
    const data = ctx.getImageData(0, 0, 8, 8).data
    // 统计量化颜色种类（32级量化防噪）
    const colors = new Set()
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 32) * 32
      const g = Math.round(data[i + 1] / 32) * 32
      const b = Math.round(data[i + 2] / 32) * 32
      colors.add(r + ',' + g + ',' + b)
    }
    // 地球图颜色极简（白+蓝系 ≤ 12 种），真实 favicon 通常多彩
    if (colors.size > 12) return false
    // 检查四角是否为白色/透明
    const corners = [[0, 0], [7, 0], [0, 7], [7, 7]]
    let whiteCorners = 0
    for (const [cx, cy] of corners) {
      const idx = (cy * 8 + cx) * 4
      if (data[idx + 3] < 20 || (data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240)) {
        whiteCorners++
      }
    }
    if (whiteCorners < 3) return false
    // 检查中心是否有蓝色调
    const ci = (4 * 8 + 4) * 4
    const cr = data[ci], cg = data[ci + 1], cb = data[ci + 2]
    if (!(cb > cr + 20 && cb > cg + 10)) return false
    return true
  } catch (_) { return false }
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
        if (img.naturalWidth > 20 && img.naturalHeight > 20) {
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
