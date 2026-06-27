import { useState, useEffect, useRef } from 'react'
import { Edit2, Trash2, GripVertical } from 'lucide-react'
import { checkSiteStatus } from '../utils/siteStatus'
import { recordSiteClick } from '../utils/quickAccess'
import { getCachedFavicon, cacheFavicon, getFaviconUrls, tryUpgradeFavicon } from '../utils/faviconCache'
import styles from './SiteCard.module.css'

/**
 * 获取站点 favicon URL，按优先级：site.iconUrl → 缓存 → Google S2 → favicon.im → null
 * @returns {{ url: string, source: string } | null}
 */
function getAutoFaviconUrl(url, siteIconUrl) {
  // 1. 优先使用已保存到站点数据中的 iconUrl
  if (siteIconUrl) return { url: siteIconUrl, source: 'saved' }
  try {
    const domain = new URL(url).hostname
    // 2. 检查缓存
    const cached = getCachedFavicon(domain)
    if (cached) return { url: cached, source: 'cache' }
    // 3. 按优先级尝试外部源：Google S2 → favicon.im
    const candidates = getFaviconUrls(domain)
    return candidates[0] || null
  } catch {
    return null
  }
}

function generateColor(url) {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 70%, 55%)`
}

/** 判断 favicon URL 属于哪个来源 */
function detectSource(faviconUrl) {
  if (!faviconUrl) return null
  if (faviconUrl.includes('google.com/s2/favicons')) return 'google'
  if (faviconUrl.includes('favicon.im')) return 'faviconim'
  return null
}

export default function SiteCard({ site, isEditMode, onEdit, onDelete, onContextMenu, siteStatusEnabled = true, dragOver, onDragStart, onDragEnd }) {
  const [iconError, setIconError] = useState(false)
  const [iconSrc, setIconSrc] = useState(null)
  const [siteStatus, setSiteStatus] = useState(null)
  const [showStatus, setShowStatus] = useState(false)
  const cardRef = useRef(null)

  const fallbackColor = generateColor(site.url)

  // 初始化 favicon URL
  useEffect(() => {
    setIconError(false)
    const result = getAutoFaviconUrl(site.url, site.iconUrl)
    setIconSrc(result?.url || null)
  }, [site.url, site.iconUrl])

  // favicon 加载成功：缓存并通知数据层保存
  const handleIconLoad = (e) => {
    try {
      const domain = new URL(site.url).hostname
      const url = e.target.currentSrc || e.target.src
      const source = detectSource(url)
      if (source) {
        cacheFavicon(domain, url, source)
      } else {
        cacheFavicon(domain, url, 'faviconim')
      }
      // 通知数据层更新站点 iconUrl
      window.dispatchEvent(new CustomEvent('faviconCached', {
        detail: { siteUrl: site.url, faviconUrl: url }
      }))
    } catch (_) {}
  }

  // favicon 加载失败：尝试下一个候选源
  const handleIconError = () => {
    try {
      const domain = new URL(site.url).hostname
      const candidates = getFaviconUrls(domain)
      const currentSrc = iconSrc || ''
      const idx = candidates.findIndex(c => c.url === currentSrc)
      const next = idx >= 0 && idx < candidates.length - 1 ? candidates[idx + 1] : null
      if (next) {
        // 尝试下一个源
        setIconSrc(next.url)
      } else {
        // 所有源都失败，显示首字母
        setIconError(true)
      }
    } catch {
      setIconError(true)
    }
  }

  // 后台检查是否有更高优先级的 favicon 可用
  useEffect(() => {
    if (!site.url) return
    let mounted = true
    const check = async () => {
      try {
        const domain = new URL(site.url).hostname
        const result = await tryUpgradeFavicon(domain, site.iconUrl || '')
        if (mounted && result) {
          // 升级成功，更新图标
          setIconSrc(result.url)
          window.dispatchEvent(new CustomEvent('faviconCached', {
            detail: { siteUrl: site.url, faviconUrl: result.url }
          }))
        }
      } catch (_) {}
    }
    // 延迟执行，不阻塞初始渲染
    const timer = setTimeout(check, 2000)
    return () => { mounted = false; clearTimeout(timer) }
  }, [site.url])

  useEffect(() => {
    if (!siteStatusEnabled) return
    let mounted = true
    const detect = async () => {
      const status = await checkSiteStatus(site.url)
      if (mounted) {
        setSiteStatus(status)
        setShowStatus(true)
      }
    }
    detect()
    return () => { mounted = false }
  }, [site.url, siteStatusEnabled])

  const handleClick = () => {
    if (!isEditMode) {
      recordSiteClick(site)
      window.open(site.url, '_blank', 'noopener,noreferrer')
    }
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const handleContextMenu = (e) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu && onContextMenu(e, site)
    }
    card.addEventListener('contextmenu', handleContextMenu)
    return () => card.removeEventListener('contextmenu', handleContextMenu)
  }, [site, onContextMenu])

  const shouldShowOffline = siteStatusEnabled && siteStatus && siteStatus.online === false && !siteStatus.unknown
  const shouldShowUnknown = siteStatusEnabled && siteStatus && siteStatus.unknown === true

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${shouldShowOffline ? styles.cardOffline : ''} ${dragOver ? styles.dragOver : ''}`}
      data-site-card="true"
      data-spotlight-card
      onClick={handleClick}
      title={shouldShowOffline ? '该网站暂时无法访问' : shouldShowUnknown ? '状态未知（可能需要VPN）' : site.url}
    >
      {siteStatusEnabled && showStatus && !isEditMode && (
        <div
          className={`${styles.statusDot} ${
            shouldShowOffline ? styles.statusDotOffline :
            shouldShowUnknown ? styles.statusDotUnknown :
            styles.statusDotOnline
          }`}
        />
      )}

      <div className={`${styles.iconWrapper} ${shouldShowOffline ? styles.iconWrapperOffline : ''}`} style={{ background: fallbackColor }}>
        {iconSrc && !iconError ? (
          <img
            src={iconSrc}
            alt={site.name}
            className={styles.icon}
            onError={handleIconError}
            onLoad={handleIconLoad}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className={styles.fallbackIcon}>
            {site.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={`${styles.name} ${shouldShowOffline ? styles.nameOffline : ''}`}>{site.name}</h3>
        {site.description && <p className={styles.description}>{site.description}</p>}
      </div>

      {isEditMode && (
        <>
          <div className={styles.dragHandle}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            title="拖动排序"
          >
            <GripVertical size={12} />
          </div>
          <div className={styles.actions}>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }} className={styles.actionBtn}>
              <Edit2 size={12} />
            </button>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`${styles.actionBtn} ${styles.deleteBtn}`}>
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}