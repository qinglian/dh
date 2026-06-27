/** faviconCache.js - 网页图标缓存模块 */
const CACHE_KEY = 'nav-favicon-cache-v2'
const MAX_CACHE_SIZE = 500

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

export function cacheFavicon(domain, url) {
  const cache = getCache()
  cache[domain] = { url, ts: Date.now() }
  saveCache(cache)
}

export function getFaviconUrl(domain) {
  return [
    'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128',
    'https://favicon.im/' + domain,
  ]
}