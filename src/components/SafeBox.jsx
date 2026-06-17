import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Lock, Settings, Power, Shield, Globe, Link2 } from 'lucide-react'
import {
  getSafeBoxSites,
  addSafeBoxSite,
  removeSafeBoxSite,
  getSafeBoxPassword,
  saveSafeBoxPassword,
  saveSafeBoxEnabled,
} from '../utils/safeBox'
import styles from './SafeBox.module.css'

export default function SafeBox({ onClose }) {
  const [sites, setSites] = useState(() => getSafeBoxSites())
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', url: '', description: '' })
  const [password, setPassword] = useState(() => getSafeBoxPassword())
  const [newPassword, setNewPassword] = useState('')
  const settingsRef = useRef(null)

  // 禁止背景滚动
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // 点击外部关闭设置下拉
  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    // 使用 mousedown 以便更快响应
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSettings])

  const handleAdd = () => {
    if (!newSite.name.trim() || !newSite.url.trim()) return
    let url = newSite.url.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    const success = addSafeBoxSite({
      name: newSite.name.trim(),
      url,
      description: newSite.description.trim(),
    })
    if (success) {
      setSites(getSafeBoxSites())
      setNewSite({ name: '', url: '', description: '' })
      setShowAdd(false)
    }
  }

  const handleRemove = (id) => {
    removeSafeBoxSite(id)
    setSites(getSafeBoxSites())
  }

  const handleOpen = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSavePassword = () => {
    if (newPassword.trim()) {
      saveSafeBoxPassword(newPassword.trim())
      setPassword(newPassword.trim())
      setNewPassword('')
    }
  }

  const handleDisable = () => {
    saveSafeBoxEnabled(false)
    window.dispatchEvent(new CustomEvent('safeBoxToggled'))
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.titleIconBg}>
              <Shield size={18} />
            </div>
            <div>
              <span className={styles.titleText}>保险箱</span>
              <span className={styles.titleBadge}>{sites.length} 个网站</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.settingsWrapper} ref={settingsRef}>
              <button
                className={`${styles.iconBtn} ${showSettings ? styles.iconBtnActive : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }}
                title="设置"
              >
                <Settings size={15} />
              </button>
              {/* 设置下拉菜单 */}
              {showSettings && (
                <div className={styles.settingsDropdown} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.settingsItem}>
                    <span className={styles.settingsLabel}>修改密码</span>
                    <div className={styles.settingsRow}>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={password ? '输入新密码...' : '设置密码...'}
                        className={styles.settingsInput}
                        autoFocus
                      />
                      <button
                        className={styles.settingsSave}
                        onClick={handleSavePassword}
                        disabled={!newPassword.trim()}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                  <div className={styles.settingsDivider} />
                  <button className={styles.settingsDanger} onClick={handleDisable}>
                    <Power size={13} />
                    <span>关闭保险箱</span>
                  </button>
                </div>
              )}
            </div>
            <button className={styles.iconBtn} onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Sites List */}
        <div className={styles.content}>
          {sites.length === 0 && !showAdd && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Shield size={32} />
              </div>
              <p className={styles.emptyTitle}>保险箱是空的</p>
              <p className={styles.emptyHint}>点击下方按钮添加需要隐藏的网站</p>
            </div>
          )}

          {sites.length > 0 && (
            <div className={styles.sitesGrid}>
              {sites.map(site => (
                <div key={site.id} className={styles.siteCard} onClick={() => handleOpen(site.url)}>
                  <div className={styles.siteIcon}>{site.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.siteDetails}>
                    <span className={styles.siteName}>{site.name}</span>
                    {site.description && (
                      <span className={styles.siteDesc}>{site.description}</span>
                    )}
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => { e.stopPropagation(); handleRemove(site.id) }}
                    title="删除"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Form */}
          {showAdd && (
            <div className={styles.addForm}>
              <div className={styles.addFormHeader}>
                <Globe size={14} />
                <span>添加新网站</span>
              </div>
              <input
                type="text"
                placeholder="网站名称"
                value={newSite.name}
                onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                className={styles.input}
                autoFocus
              />
              <input
                type="text"
                placeholder="网址 (如: example.com)"
                value={newSite.url}
                onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="描述（可选）"
                value={newSite.description}
                onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                className={styles.input}
              />
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => setShowAdd(false)}>取消</button>
                <button className={styles.confirmBtn} onClick={handleAdd}>
                  <Link2 size={13} />
                  添加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAdd && (
          <div className={styles.footer}>
            <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
              <Plus size={15} />
              <span>添加网站</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
