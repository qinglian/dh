import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pin, PinOff, QrCode, Copy, ExternalLink } from 'lucide-react'
import { isPinned, addPinnedSite, removePinnedSite } from '../utils/quickAccess'
import styles from './ContextMenu.module.css'

export default function ContextMenu({ x, y, site, onClose, onEdit, onDelete }) {
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ x, y })
  const [pinned, setPinned] = useState(false)

  useEffect(() => { if (site) setPinned(isPinned(site.url)) }, [site])

  useEffect(() => {
    if (!site) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [site, onClose])

  useEffect(() => {
    if (!menuRef.current) { setPosition({ x, y }); return }
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth; const vh = window.innerHeight
    let newX = x; let newY = y
    if (x + rect.width > vw - 10) newX = vw - rect.width - 10
    if (y + rect.height > vh - 10) newY = vh - rect.height - 10
    if (newX < 10) newX = 10
    if (newY < 10) newY = 10
    setPosition({ x: newX, y: newY })
  }, [x, y])

  if (!site) return null

  return createPortal(
    <div ref={menuRef} className={styles.contextMenu} style={{ left: position.x, top: position.y }}>
      <button className={styles.contextMenuItem} onClick={() => {
        if (pinned) { removePinnedSite(site.url) } else { addPinnedSite(site) }
        const newPinned = !pinned
        setPinned(newPinned)
        window.dispatchEvent(new CustomEvent('pinnedSitesChanged', { detail: { url: site.url, pinned: newPinned } }))
        onClose()
      }}>
        {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        <span>{pinned ? '取消置顶' : '置顶到快捷入口'}</span>
      </button>

      <button className={styles.contextMenuItem} onClick={() => {
        const qrUrl = `https://api.qrcode-monkey.com/${encodeURIComponent(site.url)}?size=300`
        window.open(qrUrl, '_blank', 'noopener,noreferrer')
      }}>
        <QrCode size={14} />
        <span>二维码分享</span>
      </button>

      <button className={styles.contextMenuItem} onClick={() => {
        navigator.clipboard.writeText(site.name || site.url).then(() => onClose())
      }}>
        <Copy size={14} />
        <span>复制网站名称</span>
      </button>

      <button className={styles.contextMenuItem} onClick={() => {
        window.open(site.url, '_blank', 'noopener,noreferrer')
        onClose()
      }}>
        <ExternalLink size={14} />
        <span>在新标签页中打开</span>
      </button>
    </div>,
    document.body
  )
}
