import { useState, useRef, useEffect } from 'react'
import { Plus, Edit2, Trash2, EyeOff, GripVertical, Sliders } from 'lucide-react'
import SiteCard from './SiteCard'
import styles from './CategorySection.module.css'
import GlassControls from './GlassControls'

export default function CategorySection({
  category,
  isEditMode,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onEditCategory,
  onDeleteCategory,
  onDeleteTag,
  onReorderSites,
  onReorderTags,
  onReorderCategories,
  onToggleCategoryVisibility,
  categoryIndex,
  allCategories,
  onSiteContextMenu,
  siteStatusEnabled,
  isHidden,
  catDragId,
  catDropTargetId,
  onCatDragStart,
  onCatDragEnter,
  onCatDragEnd,
  independentGlassControl,
  blurLevel,
  opacityLevel,
  windowOverride,
  updateWindowOverride,
  textColor1,
  textColor2,
  textColor3
}) {
  const [showGlassControls, setShowGlassControls] = useState(false)
  const [glassAnchor, setGlassAnchor] = useState(null)
  const glassBtnRef = useRef(null)
  const [activeTag, setActiveTag] = useState('全部')
  const tagContainerRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [flash, setFlash] = useState(false)
  const [tagCapsuleEnabled, setTagCapsuleEnabled] = useState(() => localStorage.getItem('nav-tag-shape') !== 'rect')

  // 拖拽排序状态
  const [siteDragOverIndex, setSiteDragOverIndex] = useState(null)

  // 监听滚动定位闪动
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.categoryId === category.id) {
        setFlash(true)
        setTimeout(() => setFlash(false), 1200)
      }
    }
    window.addEventListener('categoryFlash', handler)
    return () => window.removeEventListener('categoryFlash', handler)
  }, [category.id])

  // 监听胶囊开关变化
  useEffect(() => {
    const handler = () => setTagCapsuleEnabled(localStorage.getItem('nav-tag-shape') !== 'rect')
    window.addEventListener('tagShapeChanged', handler)
    return () => window.removeEventListener('tagShapeChanged', handler)
  }, [])

  const tagNames = category.tags || []
  
  const filteredSites = activeTag === '全部' 
    ? (category.sites || [])
    : (category.sites || []).filter(site => site.tag === activeTag)

  // 水滴吸附动效
  useEffect(() => {
    updateIndicator(activeTag)
  }, [activeTag, tagNames])

  const updateIndicator = (tag) => {
    if (!tagContainerRef.current) return
    const wrapper = tagContainerRef.current.querySelector(`.${styles.tagWrapper}`)
    const activeButton = tagContainerRef.current.querySelector(`[data-tag="${tag}"]`)
    if (wrapper && activeButton) {
      const wrapperRect = wrapper.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      setIndicatorStyle({
        left: buttonRect.left - wrapperRect.left,
        width: buttonRect.width,
      })
    }
  }

  // ========== 分类拖拽排序 - 使用 mouse events（避免 HTML5 DnD 嵌套问题）==========
  const isCatDragging = catDragId === category.id
  const isCatDropTarget = catDropTargetId === category.id
  const onCatDragEndRef = useRef(onCatDragEnd)
  useEffect(() => { onCatDragEndRef.current = onCatDragEnd }, [onCatDragEnd])

  const handleCatMouseDown = (e) => {
    if (!isEditMode) return
    e.stopPropagation()
    e.preventDefault()
    onCatDragStart && onCatDragStart(category.id)

    // 添加全局样式防止文本选择
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    let lastTargetId = null

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault()
      // 使用 elementFromPoint 精确检测鼠标下方的分类（更跟手）
      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      if (!elem) return
      const section = elem.closest('[data-cat-section]')
      if (section) {
        const targetId = section.dataset.catSection
        if (targetId && targetId !== lastTargetId && targetId !== category.id) {
          lastTargetId = targetId
          onCatDragEnter && onCatDragEnter(targetId)
        }
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      // 传递最终目标分类ID（使用 ref 避免闭包过期）
      onCatDragEndRef.current && onCatDragEndRef.current(lastTargetId)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp)
  }

  // ========== 子分类标签拖拽排序 - 实时预览 ==========
  const [tagDragOverIndex, setTagDragOverIndex] = useState(null)
  const [tagDragIndex, setTagDragIndex] = useState(null)
  const tagDragIndexRef = useRef(null)

  const handleTagDragStart = (e, tagIndex) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    tagDragIndexRef.current = tagIndex
    setTagDragIndex(tagIndex)
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {}
  }

  const handleTagDragEnd = () => {
    tagDragIndexRef.current = null
    setTagDragIndex(null)
    setTagDragOverIndex(null)
  }

  const handleTagDragOver = (e, index) => {
    if (!isEditMode || tagDragIndexRef.current === null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (tagDragIndexRef.current === index) return
    const newTags = [...tagNames]
    const [moved] = newTags.splice(tagDragIndexRef.current, 1)
    newTags.splice(index, 0, moved)
    onReorderTags(category.id, newTags)
    tagDragIndexRef.current = index
    setTagDragIndex(index)
  }

  const handleTagDragLeave = () => {
    setTagDragOverIndex(null)
  }

  const handleTagDrop = (e) => {
    e.preventDefault()
    tagDragIndexRef.current = null
    setTagDragIndex(null)
    setTagDragOverIndex(null)
  }

  // ========== 网站拖拽排序 - 实时预览 ==========
  const [siteDragIndex, setSiteDragIndex] = useState(null)
  const siteDragIndexRef = useRef(null)

  const handleSiteDragStart = (e, siteIndex) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    siteDragIndexRef.current = siteIndex
    setSiteDragIndex(siteIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/site-index', String(siteIndex))
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {}
  }

  const handleSiteDragOver = (e, index) => {
    if (!isEditMode || siteDragIndexRef.current === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (siteDragIndexRef.current === index) return
    const newSites = [...(category.sites || [])]
    const [moved] = newSites.splice(siteDragIndexRef.current, 1)
    newSites.splice(index, 0, moved)
    onReorderSites(category.id, newSites)
    siteDragIndexRef.current = index
    setSiteDragIndex(index)
  }

  const handleSiteDragLeave = () => {
    setSiteDragOverIndex(null)
  }

  const handleSiteDrop = (e) => {
    e.preventDefault()
    siteDragIndexRef.current = null
    setSiteDragIndex(null)
    setSiteDragOverIndex(null)
  }

  const handleSiteDragEnd = () => {
    siteDragIndexRef.current = null
    setSiteDragIndex(null)
    setSiteDragOverIndex(null)
  }

  return (
    <>
    <section 
      className={`${styles.section} ${flash ? styles.flash : ''} ${isCatDragging ? styles.catDragging : ''} ${isCatDropTarget ? styles.catDropTarget : ''}`}
      id={`category-${category.id}`}
      data-cat-section={category.id}
      data-spotlight-target
    >
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
        {/* Header */}
        <div className={styles.header}>
          {isEditMode && (
            <div 
              className={styles.catDragHandle}
              onMouseDown={handleCatMouseDown}
              onClick={(e) => e.stopPropagation()}
              title="拖动排序"
            >
              <GripVertical size={16} />
            </div>
          )}
          <div className={styles.titleWrapper}>
            <div className={styles.titleIcon}>
              {category.name.charAt(0)}
            </div>
            <h2 className={styles.title}>{category.name}</h2>
            <span className={styles.count}>{(category.sites || []).length}</span>
          </div>
          
          {isEditMode && (
            <div className={styles.actions}>
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onToggleCategoryVisibility && onToggleCategoryVisibility(category.id)} 
                className={`${styles.hideBtn} ${isHidden ? styles.hideBtnActive : ''}`} 
                title={isHidden ? '取消隐藏' : '隐藏分类'}
              >
                <EyeOff size={14} />
              </button>
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onAddSite(category.id)} className={styles.addBtn} title="添加网站">
                <Plus size={14} />
              </button>
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onEditCategory(category)} className={styles.editBtn} title="编辑分类">
                <Edit2 size={14} />
              </button>
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onDeleteCategory(category.id)} className={styles.deleteBtn} title="删除分类">
                <Trash2 size={14} />
              </button>
              {independentGlassControl && (
                <button ref={glassBtnRef} onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowGlassControls(true); setGlassAnchor(glassBtnRef.current?.getBoundingClientRect()) }} style={{
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
                title="窗口效果控制"><Sliders size={13} /></button>
              )}
              {showGlassControls && (
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
              )}
            </div>
          )}
        </div>

        {/* Tag Pills */}
        <div className={styles.tagContainer} ref={tagContainerRef}>
          <div className={styles.tagWrapper}>
            {/* "全部" 标签 - 不可拖拽 */}
            <button
              className={`${styles.tag} ${activeTag === '全部' ? styles.active : ''}`}
              data-tag="全部"
              onClick={() => setActiveTag('全部')}
            >
              全部
            </button>

            {/* 可拖拽的子分类标签 */}
            {tagNames.map((tag, index) => (
              <button
                key={tag}
                draggable={isEditMode}
                data-tag={tag}
                data-spotlight-tag
                onClick={() => setActiveTag(tag)}
                onDragStart={(e) => handleTagDragStart(e, index)}
                onDragEnd={handleTagDragEnd}
                onDragOver={(e) => handleTagDragOver(e, index)}
                onDragLeave={handleTagDragLeave}
                onDrop={(e) => handleTagDrop(e, index)}
                className={`${styles.tag} ${activeTag === tag ? styles.active : ''} ${isEditMode ? styles.tagDraggable : ''} ${tagDragIndex === index ? styles.tagDragging : ''} ${tagDragOverIndex === index ? styles.tagDragOver : ''}`}
              >
                {isEditMode && <GripVertical size={10} style={{ flexShrink: 0, marginRight: 2 }} />}
                {tag}
              </button>
            ))}

            {/* 水滴吸附指示器 */}
            <div 
              className={styles.tagIndicator}
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                borderRadius: tagCapsuleEnabled ? '9999px' : 'var(--radius-sm)',
              }}
            />
          </div>
        </div>

        {/* Sites */}
        <div className={styles.sitesList}>
          {filteredSites.map((site, index) => (
            <div
              key={site.id}
              draggable={isEditMode}
              onDragStart={(e) => handleSiteDragStart(e, index)}
              onDragOver={(e) => handleSiteDragOver(e, index)}
              onDragLeave={handleSiteDragLeave}
              onDrop={(e) => handleSiteDrop(e, index)}
              onDragEnd={handleSiteDragEnd}
              className={`${isEditMode ? styles.draggable : ''} ${siteDragIndex === index ? styles.siteDragging : ''}`}
            >
              <SiteCard
                site={site}
                isEditMode={isEditMode}
                onEdit={() => onEditSite(category.id, site)}
                onDelete={() => onDeleteSite(category.id, site.id)}
                onContextMenu={onSiteContextMenu}
                siteStatusEnabled={siteStatusEnabled}
                dragOver={siteDragOverIndex === index}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  )
}
