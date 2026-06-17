import { useState, useEffect, useRef } from 'react'
import { GripVertical, Eye, EyeOff, Pin, Clock, TrendingUp, Sparkles, Zap, Sliders } from 'lucide-react'
import {
  getQuickAccessSections,
  saveQuickAccessSections,
  getRecentSites,
  getMostUsedSites,
  getNewestSites,
  getPinnedSites,
  reorderPinnedSites,
} from '../utils/quickAccess'
import SiteCard from './SiteCard'
import styles from './QuickAccess.module.css'
import GlassControls from './GlassControls'

// 子分类 lucide 线条图标
const SECTION_ICONS = {
  recent: Clock,
  most: TrendingUp,
  new: Sparkles,
  pinned: Pin,
}

const MAX_SITES = 12

export default function QuickAccess({ isEditMode, independentGlassControl, allCategories, onSiteContextMenu, siteStatusEnabled, hiddenCategories = [], reorderCategories = null, blurLevel, opacityLevel, windowOverride, updateWindowOverride, textColor1, textColor2, textColor3 }) {
  const [showGlassControls, setShowGlassControls] = useState(false)
  const [glassAnchor, setGlassAnchor] = useState(null)
  const glassBtnRef = useRef(null)
  const scrollToCategory = (categoryId) => {
    const el = document.getElementById(`category-${categoryId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // 滚动完成后触发闪动效果
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('categoryFlash', { detail: { categoryId } }))
      }, 400)
    }
  }
  const [sections, setSections] = useState(() => getQuickAccessSections())
  const [activeTab, setActiveTab] = useState(null)
  const [sitesMap, setSitesMap] = useState({})
  const [pinnedChanged, setPinnedChanged] = useState(0)
  const tabsRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [dragDisplaySections, setDragDisplaySections] = useState(sections)

  // 编辑模式下分类快捷按钮的拖拽排序状态
  const [dragCatDisplay, setDragCatDisplay] = useState(allCategories)
  const [dragCatIndex, setDragCatIndex] = useState(null)
  const dragCatIndexRef = useRef(null)

  useEffect(() => {
    setDragDisplaySections(sections)
  }, [sections])

  useEffect(() => {
    setDragCatDisplay(allCategories)
  }, [allCategories])

  useEffect(() => {
    const handler = () => setPinnedChanged(p => p + 1)
    window.addEventListener('pinnedSitesChanged', handler)
    return () => window.removeEventListener('pinnedSitesChanged', handler)
  }, [])

  // 胶囊开关
  const [tagCapsuleEnabled, setTagCapsuleEnabled] = useState(() => localStorage.getItem('nav-tag-shape') !== 'rect')
  useEffect(() => {
    const handler = () => setTagCapsuleEnabled(localStorage.getItem('nav-tag-shape') !== 'rect')
    window.addEventListener('tagShapeChanged', handler)
    return () => window.removeEventListener('tagShapeChanged', handler)
  }, [])

  // 加载各分类数据（非置顶分类最多12个）
  useEffect(() => {
    const map = {}
    map.recent = getRecentSites(MAX_SITES)
    map.most = getMostUsedSites(MAX_SITES)
    map.new = getNewestSites(allCategories, MAX_SITES)
    map.pinned = getPinnedSites()
    setSitesMap(map)

    const visible = sections.filter(s => s.visible)
    if (visible.length > 0 && !activeTab) {
      setActiveTab(visible[0].id)
    }
  }, [allCategories, sections, activeTab, pinnedChanged])

  // 监听置顶变化事件
  useEffect(() => {
    const handler = () => setPinnedChanged(c => c + 1)
    window.addEventListener('quickAccessPinnedChanged', handler)
    return () => window.removeEventListener('quickAccessPinnedChanged', handler)
  }, [])

  // 水滴吸附指示器位置更新
  useEffect(() => {
    updateIndicator(activeTab)
  }, [activeTab, sections, isEditMode])

  const updateIndicator = (tabId) => {
    if (!tabsRef.current || !tabId) return
    const wrapper = tabsRef.current.querySelector(`.${styles.tabWrapper}`)
    const activeButton = tabsRef.current.querySelector(`[data-tab="${tabId}"]`)
    if (wrapper && activeButton) {
      const wrapperRect = wrapper.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      setIndicatorStyle({
        left: buttonRect.left - wrapperRect.left,
        width: buttonRect.width,
      })
    }
  }

  // 切换标签
  const handleTabClick = (id) => {
    if (isEditMode) return
    setActiveTab(id)
  }

  // 切换可见性（编辑模式）
  const toggleVisibility = (sectionId) => {
    const updated = sections.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
    setSections(updated)
    saveQuickAccessSections(updated)
    if (activeTab === sectionId && updated.find(s => s.id === sectionId)?.visible === false) {
      const firstVisible = updated.find(s => s.visible)
      if (firstVisible) setActiveTab(firstVisible.id)
    }
  }

  // ========== 子分类拖拽排序 - 实时预览 ==========
  const [dragSectionIndex, setDragSectionIndex] = useState(null)
  const dragSectionIndexRef = useRef(null)

  const handleDragStart = (e, index) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    dragSectionIndexRef.current = index
    setDragSectionIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {}
  }

  const handleDragEnd = () => {
    if (dragSectionIndexRef.current !== null) {
      const newSections = [...dragDisplaySections]
      newSections.forEach((s, i) => { s.order = i })
      setSections(newSections)
      saveQuickAccessSections(newSections)
    }
    dragSectionIndexRef.current = null
    setDragSectionIndex(null)
    setDragDisplaySections(sections)
  }

  const handleDragOver = (e, index) => {
    if (!isEditMode || dragSectionIndexRef.current === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSectionIndexRef.current === index) return
    const newSections = [...dragDisplaySections]
    const [moved] = newSections.splice(dragSectionIndexRef.current, 1)
    newSections.splice(index, 0, moved)
    dragSectionIndexRef.current = index
    setDragSectionIndex(index)
    setDragDisplaySections(newSections)
  }

  const handleDrop = (e) => {
    e.preventDefault()
  }

  // ========== 分类快捷按钮拖拽排序 - 实时预览 ==========
  const handleCatDragStart = (e, index) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    dragCatIndexRef.current = index
    setDragCatIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {}
  }

  const handleCatDragOver = (e, index) => {
    if (!isEditMode || dragCatIndexRef.current === null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragCatIndexRef.current === index) return
    const newCats = [...dragCatDisplay]
    const [moved] = newCats.splice(dragCatIndexRef.current, 1)
    newCats.splice(index, 0, moved)
    dragCatIndexRef.current = index
    setDragCatIndex(index)
    setDragCatDisplay(newCats)
    // 实时同步到下方分类卡片
    if (reorderCategories) {
      reorderCategories(newCats)
    }
  }

  const handleCatDragEnd = () => {
    dragCatIndexRef.current = null
    setDragCatIndex(null)
  }

  const handleCatDrop = (e) => {
    e.preventDefault()
    dragCatIndexRef.current = null
    setDragCatIndex(null)
  }

  // ========== 置顶网站拖拽排序 ==========
  const [pinnedDragIndex, setPinnedDragIndex] = useState(null)
  const pinnedDragIndexRef = useRef(null)

  const handlePinnedDragStart = (e, index) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    pinnedDragIndexRef.current = index
    setPinnedDragIndex(index)
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'qa-pinned',
      fromIndex: index,
    }))
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {}
  }

  const handlePinnedDragEnd = () => {
    pinnedDragIndexRef.current = null
    setPinnedDragIndex(null)
  }

  const handlePinnedDragOver = (e, index) => {
    if (!isEditMode || pinnedDragIndexRef.current === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (pinnedDragIndexRef.current === index) return
    const pinned = [...sitesMap.pinned]
    const [moved] = pinned.splice(pinnedDragIndexRef.current, 1)
    pinned.splice(index, 0, moved)
    reorderPinnedSites(pinned)
    setSitesMap(prev => ({ ...prev, pinned }))
    pinnedDragIndexRef.current = index
    setPinnedDragIndex(index)
  }

  const handlePinnedDrop = (e) => {
    e.preventDefault()
    pinnedDragIndexRef.current = null
    setPinnedDragIndex(null)
  }

  const currentSites = sitesMap[activeTab] || []
  const visibleSections = dragDisplaySections.filter(s => s.visible)
  const displaySections = isEditMode ? dragDisplaySections : visibleSections

  return (
    <section className={styles.section} data-spotlight-target>
      <div className={styles.container} data-spotlight-group
        style={(() => {
          const s = {}
          if (windowOverride?.blurEnabled) {
            const b = `blur(${(windowOverride.blur / 100) * 40}px)`
            s.backdropFilter = b + ' saturate(150%)'
            s.WebkitBackdropFilter = b + ' saturate(150%)'
          }
          if (windowOverride?.opacityEnabled) {
            const theme = document.documentElement.getAttribute('data-theme')
            const base = theme === 'dark' ? 0.04 : 0.35
            s.background = `rgba(255,255,255,${((base * windowOverride.opacity) / 100).toFixed(3)})`
          }
          if (windowOverride?.textEnabled) {
            s['--text-primary'] = windowOverride.textColor1
            s['--text-secondary'] = windowOverride.textColor2
            s['--text-tertiary'] = windowOverride.textColor3
          }
          return s
        })()}
      >
        {isEditMode && independentGlassControl && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
            {showGlassControls ? (
              <GlassControls
                anchorRect={glassAnchor}
                blurEnabled={windowOverride?.blurEnabled || false}
                onToggleBlur={() => updateWindowOverride({ blurEnabled: !(windowOverride?.blurEnabled), blur: windowOverride?.blur ?? blurLevel })}
                blurValue={windowOverride?.blur ?? blurLevel}
                onSetBlur={(v) => updateWindowOverride({ blur: v })}
                opacityEnabled={windowOverride?.opacityEnabled || false}
                onToggleOpacity={() => updateWindowOverride({ opacityEnabled: !(windowOverride?.opacityEnabled), opacity: windowOverride?.opacity ?? opacityLevel })}
                opacityValue={windowOverride?.opacity ?? opacityLevel}
                onSetOpacity={(v) => updateWindowOverride({ opacity: v })}
                textEnabled={windowOverride?.textEnabled || false}
                onToggleText={() => updateWindowOverride({ textEnabled: !(windowOverride?.textEnabled), textColor1: windowOverride?.textColor1 ?? textColor1, textColor2: windowOverride?.textColor2 ?? textColor2, textColor3: windowOverride?.textColor3 ?? textColor3 })}
                textColor1={windowOverride?.textColor1 ?? textColor1}
                onSetTextColor1={v => updateWindowOverride({ textColor1: v })}
                textColor2={windowOverride?.textColor2 ?? textColor2}
                onSetTextColor2={v => updateWindowOverride({ textColor2: v })}
                textColor3={windowOverride?.textColor3 ?? textColor3}
                onSetTextColor3={v => updateWindowOverride({ textColor3: v })}
                onClose={() => setShowGlassControls(false)}
              />
            ) : (
              <button ref={glassBtnRef} onClick={() => { setShowGlassControls(true); setGlassAnchor(glassBtnRef.current?.getBoundingClientRect()) }} style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `1px solid ${showGlassControls ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                background: showGlassControls ? 'var(--accent-primary)' : 'var(--glass-bg)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: showGlassControls ? '#fff' : 'var(--text-secondary)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
                boxShadow: showGlassControls ? '0 2px 12px rgba(0,122,255,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => { if (showGlassControls) return; e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
              onMouseLeave={e => { if (showGlassControls) return; e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
              title="窗口效果控制"
              ><Sliders size={13} /></button>
            )}
          </div>
        )}
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <div className={styles.titleIcon}><Zap size={16} /></div>
            <h2 className={styles.title}>快捷入口</h2>
          </div>

          {/* 分类快捷跳转按钮 - 编辑模式下也显示，支持拖拽排序 */}
          {allCategories.length > 0 && (
            <div className={styles.catShortcuts}>
              {(isEditMode ? dragCatDisplay : allCategories.filter(cat => !hiddenCategories.includes(cat.id)))
                .map((cat, index) => (
                  <button
                    key={cat.id}
                    className={`${styles.catShortcutBtn} ${isEditMode ? styles.catShortcutDraggable : ''} ${dragCatIndex === index ? styles.catShortcutDragging : ''} ${hiddenCategories.includes(cat.id) ? styles.catShortcutHidden : ''}`}
                    onClick={() => !isEditMode && scrollToCategory(cat.id)}
                    title={cat.name}
                    draggable={isEditMode}
                    onDragStart={(e) => handleCatDragStart(e, index)}
                    onDragEnd={handleCatDragEnd}
                    onDragOver={(e) => handleCatDragOver(e, index)}
                    onDrop={(e) => handleCatDrop(e)}
                  >
                    {isEditMode && <GripVertical size={10} className={styles.catDragIcon} />}
                    <span className={styles.catShortcutIcon}>{cat.name.charAt(0)}</span>
                    <span className={styles.catShortcutName}>{cat.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 子分类标签 - 水滴吸附动效 */}
        <div className={styles.tagContainer} ref={tabsRef}>
          <div className={styles.tabWrapper}>
            {displaySections.map((section, index) => {
              const Icon = SECTION_ICONS[section.id]
              const isHidden = !section.visible
              return (
                <button
                  key={section.id}
                  data-tab={section.id}
                  data-spotlight-tag
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`${styles.tab} ${activeTab === section.id && !isEditMode ? styles.tabActive : ''} ${isEditMode ? styles.tabDraggable : ''} ${isHidden ? styles.tabHidden : ''} ${dragSectionIndex === index ? styles.tabDragging : ''}`}
                  onClick={() => handleTabClick(section.id)}
                >
                  {isEditMode && <GripVertical size={10} className={styles.dragIcon} />}
                  {Icon && <Icon size={12} className={styles.tabIcon} />}
                  <span>{section.name}</span>
                  {isEditMode && (
                    <span
                      className={styles.visibilityToggle}
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id) }}
                      title={isHidden ? '显示' : '隐藏'}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </span>
                  )}
                </button>
              )
            })}

            {/* 水滴吸附指示器 */}
            {!isEditMode && (
              <div
                className={styles.tabIndicator}
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                  borderRadius: tagCapsuleEnabled ? '9999px' : 'var(--radius-sm)',
                }}
              />
            )}
          </div>
        </div>

        {/* 网站列表 */}
        {!isEditMode && activeTab && (
          <div className={styles.sitesList}>
            {currentSites.length > 0 ? (
              currentSites.map((site, index) => (
                <div
                  key={site.url || site.id}
                  draggable={isEditMode && activeTab === 'pinned'}
                  onDragStart={(e) => handlePinnedDragStart(e, index)}
                  onDragEnd={handlePinnedDragEnd}
                  onDragOver={(e) => handlePinnedDragOver(e, index)}
                  onDrop={(e) => handlePinnedDrop(e)}
                  className={`${isEditMode && activeTab === 'pinned' ? styles.draggable : ''} ${pinnedDragIndex === index ? styles.siteDragging : ''}`}
                >
                  <SiteCard
                    site={site}
                    isEditMode={isEditMode}
                    onContextMenu={onSiteContextMenu}
                    siteStatusEnabled={siteStatusEnabled}
                  />
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                {activeTab === 'recent' && '暂无最近使用记录，点击网站卡片即可记录'}
                {activeTab === 'most' && '暂无使用记录，多访问几次就会出现在这里'}
                {activeTab === 'new' && '暂无新添加的网站'}
                {activeTab === 'pinned' && '暂无置顶网站，右键点击网站卡片选择置顶'}
              </div>
            )}
          </div>
        )}

        {/* 编辑模式下的提示 */}
        {isEditMode && (
          <div className={styles.editHint}>
            编辑模式下可以拖拽排序子分类，点击眼睛图标可显示/隐藏子分类
          </div>
        )}
      </div>
    </section>
  )
}
