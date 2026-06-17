import { useState, useEffect, useRef } from 'react'
import { X, Settings, Plus, Trash2, GripVertical, Pencil, RotateCcw, Home, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { getSettings, updateSetting } from '../utils/startPageSettings'
import { addPage } from '../utils/startPagePages'
import styles from './StartPageSettings.module.css'
import ConfirmDialog from './ConfirmDialog'

const DEFAULT_ENGINES = [
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', color: '#008373' },
  { id: 'google', name: '谷歌', url: 'https://www.google.com/search?q=', color: '#4285f4' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', color: '#2932e1' },
  { id: 'metaso', name: '秘塔AI', url: 'https://metaso.cn/?q=', color: '#00b4d8' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
  { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=', color: '#fb5100' },
]

function getEngines() {
  const saved = localStorage.getItem('nav-search-engines')
  return saved ? JSON.parse(saved) : DEFAULT_ENGINES
}

function saveEngines(engines) {
  localStorage.setItem('nav-search-engines', JSON.stringify(engines))
  window.dispatchEvent(new CustomEvent('nav-engines-changed'))
}

function getTrash() {
  const saved = localStorage.getItem('nav-trash')
  return saved ? JSON.parse(saved) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [] }
}

function saveTrash(trash) {
  localStorage.setItem('nav-trash', JSON.stringify(trash))
}

const CATEGORIES = [
  { id: 'basic', name: '基础设置' },
  { id: 'engines', name: '搜索引擎' },
  { id: 'trash', name: '回收站' },
]

export default function StartPageSettings({ onClose, onSettingsChange, pageId, pageName }) {
  const [activeCategory, setActiveCategory] = useState('basic')
  const [settings, setSettings] = useState(() => getSettings(pageId))
  const isDefault = pageId === 'default'

  // 搜索引擎管理
  const [engines, setEngines] = useState(() => getEngines())
  const [showAddEngine, setShowAddEngine] = useState(false)
  const [newEngineName, setNewEngineName] = useState('')
  const [newEngineUrl, setNewEngineUrl] = useState('')
  const [editingEngineId, setEditingEngineId] = useState(null)
  const [editEngineName, setEditEngineName] = useState('')
  const [editEngineUrl, setEditEngineUrl] = useState('')
  const [dragEngineIdx, setDragEngineIdx] = useState(null)

  // 回收站 state
  const [trash, setTrash] = useState(() => getTrash())

  // 确认弹窗 state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCountdown, setConfirmCountdown] = useState(0)
  const confirmActionRef = useRef(null)

  const handleChange = (category, key, value) => {
    const newSettings = updateSetting(pageId, category, key, value)
    setSettings({ ...newSettings })
    if (onSettingsChange) onSettingsChange(newSettings)
  }

  const title = isDefault ? '起始页设置' : `起始页设置 - ${pageName || ''}`

  // 确认弹窗
  const openConfirm = (title, message, action, countdown = 0) => {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setConfirmCountdown(countdown)
    confirmActionRef.current = action
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (confirmActionRef.current) confirmActionRef.current()
    setConfirmOpen(false)
    confirmActionRef.current = null
    setConfirmCountdown(0)
  }

  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    confirmActionRef.current = null
    setConfirmCountdown(0)
  }

  // 添加搜索引擎
  const addEngine = () => {
    if (!newEngineName.trim() || !newEngineUrl.trim()) return
    let url = newEngineUrl.trim()
    if (!url.endsWith('=')) {
      url += url.includes('?') ? '&q=' : '?q='
    }
    const id = 'custom_' + Date.now()
    const newEng = { id, name: newEngineName.trim(), url, color: '#6366f1' }
    const updated = [...engines, newEng]
    setEngines(updated)
    saveEngines(updated)
    setNewEngineName('')
    setNewEngineUrl('')
    setShowAddEngine(false)
  }

  // 删除搜索引擎（放入回收站）
  const removeEngine = (id) => {
    const engine = engines.find(e => e.id === id)
    if (!engine) return
    openConfirm('删除搜索引擎', `确定要删除搜索引擎「${engine.name}」吗？`, () => {
      const updated = engines.filter(e => e.id !== id)
      setEngines(updated)
      saveEngines(updated)
      const currentId = localStorage.getItem('nav-current-engine')
      if (currentId === id) {
        localStorage.setItem('nav-current-engine', updated[0]?.id || '')
      }
      // 放入回收站
      const trashData = getTrash()
      trashData.deletedEngines.push({
        id: engine.id,
        name: engine.name,
        url: engine.url,
        color: engine.color,
        deletedAt: Date.now(),
      })
      saveTrash(trashData)
      setTrash(trashData)
    })
  }

  // 开始编辑
  const startEdit = (engine) => {
    setEditingEngineId(engine.id)
    setEditEngineName(engine.name)
    setEditEngineUrl(engine.url)
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editEngineName.trim() || !editEngineUrl.trim()) return
    const updated = engines.map(e =>
      e.id === editingEngineId
        ? { ...e, name: editEngineName.trim(), url: editEngineUrl.trim() }
        : e
    )
    setEngines(updated)
    saveEngines(updated)
    setEditingEngineId(null)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingEngineId(null)
    setEditEngineName('')
    setEditEngineUrl('')
  }

  // 拖拽排序
  const handleEngineDragStart = (idx) => {
    setDragEngineIdx(idx)
  }

  const handleEngineDragOver = (e, idx) => {
    e.preventDefault()
    if (dragEngineIdx === null || dragEngineIdx === idx) return
    const updated = [...engines]
    const [moved] = updated.splice(dragEngineIdx, 1)
    updated.splice(idx, 0, moved)
    setEngines(updated)
    setDragEngineIdx(idx)
  }

  const handleEngineDragEnd = () => {
    setDragEngineIdx(null)
    saveEngines(engines)
  }

  // 回收站操作
  const handleRestoreEngine = (item) => {
    const trashData = getTrash()
    trashData.deletedEngines = trashData.deletedEngines.filter(e => e.id !== item.id)
    saveTrash(trashData)
    setTrash(trashData)
    const updated = [...engines, { id: item.id, name: item.name, url: item.url, color: item.color }]
    setEngines(updated)
    saveEngines(updated)
  }

  const handlePermanentDeleteEngine = (item) => {
    openConfirm('彻底删除', `确定要彻底删除搜索引擎「${item.name}」吗？此操作不可恢复。`, () => {
      const trashData = getTrash()
      trashData.deletedEngines = trashData.deletedEngines.filter(e => e.id !== item.id)
      saveTrash(trashData)
      setTrash(trashData)
    })
  }

  const handleRestorePage = (item) => {
    const trashData = getTrash()
    trashData.deletedPages = trashData.deletedPages.filter(p => p.id !== item.id)
    saveTrash(trashData)
    setTrash(trashData)
    addPage(item.name, item.icon)
    window.dispatchEvent(new CustomEvent('pagesChanged'))
  }

  const handlePermanentDeletePage = (item) => {
    openConfirm('彻底删除', `确定要彻底删除多页「${item.name}」吗？此操作不可恢复。`, () => {
      const trashData = getTrash()
      trashData.deletedPages = trashData.deletedPages.filter(p => p.id !== item.id)
      saveTrash(trashData)
      setTrash(trashData)
    })
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 多页模式是否开启
  const multiPageEnabled = settings.pageSidebar?.visible !== false

  return (
    <div className={styles.overlayWrapper}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Settings size={18} />
            <span>{title}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className={styles.body}>
          {/* 左侧分类 */}
          <div className={styles.sidebar}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.categoryActive : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 右侧设置项 */}
          <div className={styles.content}>
            {activeCategory === 'basic' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle}>组件显示</h3>

                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>搜索栏</span>
                    <button
                      className={`${styles.toggle} ${settings.searchBox?.visible !== false ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleChange('searchBox', 'visible', settings.searchBox?.visible === false)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>时间显示</span>
                    <button
                      className={`${styles.toggle} ${settings.timeWidget?.visible !== false ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleChange('timeWidget', 'visible', settings.timeWidget?.visible === false)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {isDefault && (
                  <>
                    <div className={styles.settingItem}>
                      <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>多页</span>
                        <button
                          className={`${styles.toggle} ${settings.pageSidebar?.visible !== false ? styles.toggleOn : styles.toggleOff}`}
                          onClick={() => handleChange('pageSidebar', 'visible', settings.pageSidebar?.visible === false)}
                        >
                          <span className={styles.toggleThumb} />
                        </button>
                      </div>
                    </div>
                    {settings.pageSidebar?.visible !== false && (
                      <div className={styles.settingItem} style={{ paddingLeft: 16 }}>
                        <div className={styles.toggleRow}>
                          <span className={styles.toggleLabel} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>小图标模式</span>
                          <button
                            className={`${styles.toggle} ${settings.pageSidebar?.compact !== false ? styles.toggleOn : styles.toggleOff}`}
                            onClick={() => handleChange('pageSidebar', 'compact', settings.pageSidebar?.compact === false)}
                          >
                            <span className={styles.toggleThumb} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>历史搜索</span>
                    <button
                      className={`${styles.toggle} ${settings.searchHistory?.visible !== false ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleChange('searchHistory', 'visible', settings.searchHistory?.visible === false)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'engines' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle}>搜索引擎管理</h3>
                <p className={styles.groupDesc}>拖拽排序 · 与导航页同步</p>

                <div className={styles.engineList}>
                  {engines.map((engine, index) => (
                    <div
                      key={engine.id}
                      className={`${styles.engineItem} ${dragEngineIdx === index ? styles.engineItemDragging : ''}`}
                      draggable={editingEngineId !== engine.id}
                      onDragStart={() => handleEngineDragStart(index)}
                      onDragOver={(e) => handleEngineDragOver(e, index)}
                      onDragEnd={handleEngineDragEnd}
                    >
                      {editingEngineId === engine.id ? (
                        <div className={styles.engineEditForm}>
                          <input
                            type="text"
                            value={editEngineName}
                            onChange={(e) => setEditEngineName(e.target.value)}
                            placeholder="引擎名称"
                            className={styles.addEngineInput}
                          />
                          <input
                            type="text"
                            value={editEngineUrl}
                            onChange={(e) => setEditEngineUrl(e.target.value)}
                            placeholder="搜索URL"
                            className={styles.addEngineInput}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                          <div className={styles.engineEditActions}>
                            <button className={styles.addEngineCancel} onClick={cancelEdit}>取消</button>
                            <button className={styles.addEngineConfirm} onClick={saveEdit}>保存</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.engineItemLeft}>
                            <GripVertical size={14} className={styles.gripIcon} />
                            <span className={styles.engineDot} style={{ background: engine.color || '#6366f1' }} />
                            <span className={styles.engineItemName}>{engine.name}</span>
                          </div>
                          <div className={styles.engineItemRight}>
                            <span className={styles.engineItemUrl}>{engine.url}</span>
                            <button className={styles.engineEditBtn} onClick={(e) => { e.stopPropagation(); startEdit(engine) }} title="编辑">
                              <Pencil size={13} />
                            </button>
                            <button
                              className={engine.hidden ? styles.engineRemoveBtn : styles.engineEditBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                const updated = engines.map(e => e.id === engine.id ? { ...e, hidden: !e.hidden } : e)
                                setEngines(updated)
                                saveEngines(updated)
                              }}
                              title={engine.hidden ? '显示搜索引擎' : '隐藏搜索引擎'}
                            >
                              {engine.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button className={styles.engineRemoveBtn} onClick={(e) => { e.stopPropagation(); removeEngine(engine.id) }} title="删除">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {showAddEngine ? (
                  <div className={styles.addEngineForm}>
                    <input
                      type="text"
                      placeholder="引擎名称（如：Yandex）"
                      value={newEngineName}
                      onChange={(e) => setNewEngineName(e.target.value)}
                      className={styles.addEngineInput}
                    />
                    <input
                      type="text"
                      placeholder="搜索URL（如：https://yandex.com/search/?text=）"
                      value={newEngineUrl}
                      onChange={(e) => setNewEngineUrl(e.target.value)}
                      className={styles.addEngineInput}
                      onKeyDown={(e) => e.key === 'Enter' && addEngine()}
                    />
                    <div className={styles.addEngineActions}>
                      <button className={styles.addEngineCancel} onClick={() => { setShowAddEngine(false); setNewEngineName(''); setNewEngineUrl('') }}>取消</button>
                      <button className={styles.addEngineConfirm} onClick={addEngine}>添加</button>
                    </div>
                  </div>
                ) : (
                  <button className={styles.addEngineBtn} onClick={() => setShowAddEngine(true)}>
                    <Plus size={14} />
                    <span>添加搜索引擎</span>
                  </button>
                )}
              </div>
            )}

            {activeCategory === 'trash' && (
              <div className={styles.settingsGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 className={styles.groupTitle} style={{ margin: 0 }}>回收站</h3>
                  {((trash.deletedEngines || []).length > 0 || (trash.deletedPages || []).length > 0) && (
                    <button
                      className={styles.clearTrashBtn}
                      onClick={() => openConfirm(
                        '清空回收站',
                        '确定要清空回收站吗？所有已删除的搜索引擎和多页将被彻底删除，此操作不可恢复。',
                        () => {
                          const trashData = getTrash()
                          trashData.deletedEngines = []
                          trashData.deletedPages = []
                          saveTrash(trashData)
                          setTrash(trashData)
                        },
                        3
                      )}
                    >
                      <Trash2 size={12} />
                      清空
                    </button>
                  )}
                </div>
                <p className={styles.groupDesc}>最近删除的搜索引擎和多页</p>

                {(trash.deletedEngines || []).length === 0 && ((trash.deletedPages || []).length === 0 || !multiPageEnabled) && (
                  <div className={styles.emptyState}>回收站为空</div>
                )}

                <div className={styles.engineList}>
                  {/* 搜索引擎 */}
                  {(trash.deletedEngines || []).map((item) => (
                    <div key={item.id} className={styles.engineItem} style={{ cursor: 'default' }}>
                      <div className={styles.engineItemLeft}>
                        <span className={styles.engineDot} style={{ background: item.color || '#6366f1' }} />
                        <span className={styles.engineItemName}>{item.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>搜索引擎</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{formatTime(item.deletedAt)}</span>
                      </div>
                      <div className={styles.engineItemRight}>
                        <button
                          className={styles.engineEditBtn}
                          onClick={() => handleRestoreEngine(item)}
                          title="还原"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className={styles.engineRemoveBtn}
                          onClick={() => handlePermanentDeleteEngine(item)}
                          title="彻底删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 多页 - 仅在多页模式开启时显示 */}
                  {multiPageEnabled && (trash.deletedPages || []).map((item) => (
                    <div key={item.id} className={styles.engineItem} style={{ cursor: 'default' }}>
                      <div className={styles.engineItemLeft}>
                        <Home size={14} style={{ color: 'var(--text-tertiary)', marginRight: 6 }} />
                        <span className={styles.engineItemName}>{item.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>多页</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{formatTime(item.deletedAt)}</span>
                      </div>
                      <div className={styles.engineItemRight}>
                        <button
                          className={styles.engineEditBtn}
                          onClick={() => handleRestorePage(item)}
                          title="还原"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className={styles.engineRemoveBtn}
                          onClick={() => handlePermanentDeletePage(item)}
                          title="彻底删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 多页模式关闭时的提示 */}
                {!multiPageEnabled && (trash.deletedPages || []).length > 0 && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    多页模式已关闭，{(trash.deletedPages || []).length} 个已删除的多页已隐藏。开启多页模式后可查看。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        countdown={confirmCountdown}
      />
    </div>
  )
}
