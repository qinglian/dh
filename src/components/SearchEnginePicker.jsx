/*
 * SearchEnginePicker - 搜索引擎选择器与搜索面板
 * 功能：展示搜索引擎网格，支持自定义添加/删除/拖拽排序引擎，提供搜索输入框、历史搜索记录和保险箱快捷入口。
 *       编辑模式下可拖拽排序引擎、删除引擎（移入回收站），支持独立窗口毛玻璃效果控制。
 * Props：
 *   isEditMode                {boolean}          是否处于编辑模式
 *   independentGlassControl   {boolean}          是否启用独立窗口毛玻璃控制
 *   engines: propEngines      {Array}            搜索引擎列表（预留，本组件内部从 localStorage 管理）
 *   currentEngine: propCurrentEngine {string}    当前选中引擎ID（预留）
 *   onChangeEngine            {function}         切换引擎回调（预留）
 *   onSearch: propOnSearch    {function}         搜索回调（预留）
 *   searchHistory: propSearchHistory {Array}     搜索历史（预留）
 *   onClearHistory: propOnClearHistory {function} 清空历史回调（预留）
 *   searchHistoryEnabled      {boolean}          搜索历史是否启用
 *   blurLevel                 {number}           全局毛玻璃模糊级别
 *   opacityLevel              {number}           全局毛玻璃不透明度级别
 *   windowOverride            {object}           本窗口独立覆盖样式 { blurEnabled, blur, opacityEnabled, opacity, textEnabled, textColor1/2/3 }
 *   updateWindowOverride      {function}         更新本窗口覆盖样式的回调
 *   textColor1/2/3            {string}           全局默认文字颜色1/2/3
 */

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Globe, Plus, X, Search, Clock, GripVertical, Sliders } from 'lucide-react'
import GlassControls from './GlassControls'
import { getSafeBoxEnabled, verifySafeBoxPassword } from '../utils/safeBox'
import SafeBox from './SafeBox'
import ConfirmDialog from './ConfirmDialog'
import styles from './SearchEnginePicker.module.css'

/* 从 localStorage 读取搜索历史记录 */
function getSearchHistory() {
  const saved = localStorage.getItem('nav-search-history')
  return saved ? JSON.parse(saved) : []
}

/* 保存搜索历史到 localStorage */
function saveSearchHistory(history) {
  localStorage.setItem('nav-search-history', JSON.stringify(history))
}

/* 添加一条搜索记录：去重后插入到最前面，最多保留20条 */
function addSearchHistory(term) {
  if (!term.trim()) return
  const history = getSearchHistory()
  const newHistory = [term.trim(), ...history.filter(h => h !== term.trim())].slice(0, 20)
  saveSearchHistory(newHistory)
}

/* 移除单条搜索记录 */
function removeSearchHistory(term) {
  const history = getSearchHistory()
  saveSearchHistory(history.filter(h => h !== term))
}

/* 清空全部搜索记录 */
function clearSearchHistory() {
  saveSearchHistory([])
}

/* 预置搜索引擎列表 */
const DEFAULT_ENGINES = [
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', color: '#008373' },
  { id: 'google', name: '谷歌', url: 'https://www.google.com/search?q=', color: '#4285f4' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', color: '#2932e1' },
  { id: 'metaso', name: '秘塔AI', url: 'https://metaso.cn/?q=', color: '#00b4d8' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
  { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=', color: '#fb5100' },
]

export default function SearchEnginePicker({ isEditMode, independentGlassControl, engines: propEngines, currentEngine: propCurrentEngine, onChangeEngine, onSearch: propOnSearch, searchHistory: propSearchHistory, onClearHistory: propOnClearHistory, searchHistoryEnabled, blurLevel, opacityLevel, windowOverride, updateWindowOverride, textColor1, textColor2, textColor3 }) {
  /* 毛玻璃控制面板的显示状态 */
  const [showGlassControls, setShowGlassControls] = useState(false)
  /* 毛玻璃控制按钮的位置锚点（getBoundingClientRect），用于弹出面板定位 */
  const [glassAnchor, setGlassAnchor] = useState(null)
  /* 毛玻璃控制按钮的 DOM 引用 */
  const glassBtnRef = useRef(null)
  /* 搜索引擎列表，从 localStorage 读取初始值 */
  const [engines, setEngines] = useState(() => {
    const saved = localStorage.getItem('nav-search-engines')
    return saved ? JSON.parse(saved) : DEFAULT_ENGINES
  })
  /* 当前选中的搜索引擎ID，从 localStorage 读取，默认 'bing' */
  const [currentEngine, setCurrentEngine] = useState(() => {
    return localStorage.getItem('nav-current-engine') || 'bing'
  })
  /* 搜索输入框的值 */
  const [searchInput, setSearchInput] = useState('')
  /* 自定义添加引擎表单的显示状态 */
  const [showAdd, setShowAdd] = useState(false)
  /* 自定义添加：引擎名称 */
  const [newName, setNewName] = useState('')
  /* 自定义添加：搜索 URL */
  const [newUrl, setNewUrl] = useState('')
  /* 保险箱弹窗的显示状态 */
  const [showSafeBox, setShowSafeBox] = useState(false)
  /* 删除引擎确认弹窗的打开状态 */
  const [engineDialogOpen, setEngineDialogOpen] = useState(false)
  /* 待删除的引擎ID */
  const [deleteEngineId, setDeleteEngineId] = useState(null)
  /* 搜索历史列表 */
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory())
  /* 搜索历史功能的启用状态，从 localStorage 读取，默认 true */
  const [historyEnabled, setHistoryEnabled] = useState(() => localStorage.getItem('nav-search-history-enabled') !== 'false')
  /* 自定义添加表单第一个输入框的 DOM 引用 */
  const inputRef = useRef(null)
  /* 当前展示的引擎列表（拖拽排序过程中实时更新） */
  const [displayEngines, setDisplayEngines] = useState(engines)

  /* engines 变化时同步更新 displayEngines */
  useEffect(() => {
    setDisplayEngines(engines)
  }, [engines])

  /* 自定义添加表单打开时自动聚焦第一个输入框 */
  useEffect(() => {
    if (showAdd && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showAdd])

  /* 监听搜索引擎变更事件（来自其他组件的修改），同步更新本地列表 */
  useEffect(() => {
    const handleEnginesChanged = () => {
      const saved = localStorage.getItem('nav-search-engines')
      if (saved) {
        setEngines(JSON.parse(saved))
      }
    }
    const handleHistoryToggle = () => {
      setHistoryEnabled(localStorage.getItem('nav-search-history-enabled') !== 'false')
    }
    window.addEventListener('nav-engines-changed', handleEnginesChanged)
    window.addEventListener('searchHistoryToggleChanged', handleHistoryToggle)
    return () => {
      window.removeEventListener('nav-engines-changed', handleEnginesChanged)
      window.removeEventListener('searchHistoryToggleChanged', handleHistoryToggle)
    }
  }, [])

  /*
   * 执行搜索：
   * - 检测是否为保险箱密码（打开保险箱而非搜索）
   * - 检测是否为"忘记密码"时间码（年月日时分）
   * - 否则记录搜索历史，打开搜索引擎结果页
   */
  const handleSearch = () => {
    const query = searchInput.trim()
    if (!query) return

    // 检测保险箱密码
    if (getSafeBoxEnabled() && verifySafeBoxPassword(query)) {
      setShowSafeBox(true)
      setSearchInput('')
      return
    }

    // 忘记密码：输入当前时间年月日时分（如 202606081637）
    if (getSafeBoxEnabled()) {
      const now = new Date()
      const timeCode =
        String(now.getFullYear()) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0')
      if (query === timeCode) {
        setShowSafeBox(true)
        setSearchInput('')
        return
      }
    }

    // 非保险箱搜索才记录历史
    if (historyEnabled) {
      addSearchHistory(query)
      setSearchHistory(getSearchHistory())
    }

    const engine = engines.find(en => en.id === currentEngine)
    if (engine) {
      window.open(engine.url + encodeURIComponent(query), '_blank')
      setSearchInput('')
    }
  }

  /* 键盘事件：按下 Enter 触发搜索 */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  /* 选中搜索引擎：更新 state 并同步到 localStorage */
  const selectEngine = (id) => {
    setCurrentEngine(id)
    localStorage.setItem('nav-current-engine', id)
  }

  /* 添加自定义搜索引擎：校验非空，自动补全 URL 中缺失的查询参数，保存后关闭表单 */
  const addEngine = () => {
    if (!newName.trim() || !newUrl.trim()) return
    const id = 'custom_' + Date.now()
    const newEng = {
      id,
      name: newName.trim(),
      url: newUrl.trim().endsWith('=') ? newUrl.trim() : newUrl.trim() + (newUrl.includes('?') ? '&q=' : '?q='),
      color: '#6366f1'
    }
    const updated = [...engines, newEng]
    setEngines(updated)
    localStorage.setItem('nav-search-engines', JSON.stringify(updated))
    setNewName('')
    setNewUrl('')
    setShowAdd(false)
  }

  /* 删除搜索引擎：从列表移除，若删除当前选中引擎则自动切换到第一个，同时将引擎放入回收站 */
  const removeEngine = (id) => {
    const engine = engines.find(en => en.id === id)
    if (!engine) return
    const updated = engines.filter(en => en.id !== id)
    setEngines(updated)
    localStorage.setItem('nav-search-engines', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('nav-engines-changed'))
    if (currentEngine === id) {
      setCurrentEngine(updated[0]?.id || '')
      localStorage.setItem('nav-current-engine', updated[0]?.id || '')
    }
    // 放入回收站，以便后续恢复
    const trashRaw = localStorage.getItem('nav-trash')
    const trash = trashRaw ? JSON.parse(trashRaw) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [] }
    trash.deletedEngines.push({
      id: engine.id,
      name: engine.name,
      url: engine.url,
      color: engine.color,
      deletedAt: Date.now(),
    })
    localStorage.setItem('nav-trash', JSON.stringify(trash))
  }

  // ========== 搜索引擎排序 - 纯拖拽模式（用 state 驱动实时 UI） ==========
  /* 当前可见的引擎列表（排除隐藏的） */
  const visibleEngines = displayEngines.filter(e => !e.hidden)
  /* 引擎容器 DOM 引用 */
  const enginesContainerRef = useRef(null)
  /* 当前拖拽项的索引，用于渲染样式 */
  const [dragIndex, setDragIndex] = useState(null)
  /* 同步跟踪拖拽索引的 ref，避免 state 异步造成拖拽逻辑错乱 */
  const dragIndexRef = useRef(null)
  /* 拖拽进行中标记，用于点击事件中判断是否跳过 selectEngine */
  const isDraggingRef = useRef(false)

  /* 应用新的引擎顺序：将可见引擎的新顺序与隐藏引擎合并保存 */
  const applyEngineOrder = (newVisible) => {
    const hiddenEngines = displayEngines.filter(eng => eng.hidden)
    const newEngines = [...newVisible, ...hiddenEngines]
    setDisplayEngines(newEngines)
    setEngines(newEngines)
    localStorage.setItem('nav-search-engines', JSON.stringify(newEngines))
    window.dispatchEvent(new CustomEvent('nav-engines-changed'))
  }

  /*
   * 引擎拖拽开始：仅编辑模式下有效，记录拖拽索引，设置拖拽图像
   */
  const handleEngineDragStart = (e, index) => {
    if (!isEditMode) {
      e.preventDefault()
      return
    }
    isDraggingRef.current = true
    dragIndexRef.current = index
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    // 使用元素自身作为拖拽图像，让用户能看到拖拽效果
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
    } catch (err) {
      // fallback: 不设置自定义图像
    }
  }

  /*
   * 引擎拖拽经过目标项：实时交换位置更新 UI
   */
  const handleEngineDragOver = (e, index) => {
    if (!isEditMode || dragIndexRef.current === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndexRef.current === index) return

    const currentIdx = dragIndexRef.current
    const newVisible = [...visibleEngines]
    const [moved] = newVisible.splice(currentIdx, 1)
    newVisible.splice(index, 0, moved)
    dragIndexRef.current = index
    setDragIndex(index)
    applyEngineOrder(newVisible)
  }

  /* 引擎拖拽放下：重置拖拽状态 */
  const handleEngineDrop = (e) => {
    e.preventDefault()
    dragIndexRef.current = null
    setDragIndex(null)
  }

  /* 引擎拖拽结束：重置所有拖拽引用，延迟重置拖拽标记防止 click 事件误触发 */
  const handleEngineDragEnd = () => {
    dragIndexRef.current = null
    setDragIndex(null)
    // 延迟重置拖拽标记，防止 click 事件触发
    setTimeout(() => { isDraggingRef.current = false }, 50)
  }

  /* 引擎点击：拖拽进行中不触发切换 */
  const handleEngineClick = (engine) => {
    if (isDraggingRef.current) return
    selectEngine(engine.id)
  }

  /* 当前激活的引擎对象：根据 currentEngine 从可见引擎中查找 */
  const activeEngine = visibleEngines.find(en => en.id === currentEngine) || visibleEngines[0]

  return (
    <div className={styles.picker} data-spotlight-target data-spotlight-group
      style={(() => {
        /* 根据 windowOverride 动态构建内联样式，实现独立窗口毛玻璃效果 */
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
      {/* 编辑模式 + 独立窗口控制：显示毛玻璃控制按钮（右上角浮动） */}
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
      <div className={styles.title}>
        <Globe size={14} />
        <span>网络搜索</span>
      </div>

      {/* 搜索引擎网格 */}
      <div
        className={styles.engines}
        ref={enginesContainerRef}
      >
        {visibleEngines.map((engine, index) => (
          <div
            key={engine.id}
            data-engine-id={engine.id}
            /*
             * 引擎卡片 CSS 类名切换：
             * - engineActive: 当前选中引擎高亮
             * - engineDragging: 正被拖拽的引擎使用半透明样式
             */
            className={`${styles.engineCard} ${engine.id === currentEngine ? styles.engineActive : ''} ${dragIndex === index ? styles.engineDragging : ''}`}
            onClick={() => handleEngineClick(engine)}
            draggable={isEditMode}
            onDragStart={(e) => handleEngineDragStart(e, index)}
            onDragOver={(e) => handleEngineDragOver(e, index)}
            onDrop={handleEngineDrop}
            onDragEnd={handleEngineDragEnd}
          >
            {/* 编辑模式：显示拖拽手柄 */}
            {isEditMode && (
              <span className={styles.dragHandle}>
                <GripVertical size={12} />
              </span>
            )}
            {/* 引擎颜色圆点 */}
            <div className={styles.engineDot} style={{ background: engine.color || 'var(--accent-primary)' }} />
            <span className={styles.engineName}>{engine.name}</span>
            {/* 编辑模式：显示删除按钮 */}
            {isEditMode && (
              <button
                className={styles.removeBtn}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteEngineId(engine.id)
                  setEngineDialogOpen(true)
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {/* 编辑模式且未展开添加表单：显示"自定义"添加按钮 */}
        {isEditMode && !showAdd && (
          <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            <span>自定义</span>
          </button>
        )}
      </div>

      {/* 自定义添加搜索引擎表单 */}
      {showAdd && (
        <div className={styles.addForm}>
          <input
            ref={inputRef}
            type="text"
            placeholder="引擎名称（如：Yandex）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={styles.formInput}
          />
          <input
            type="text"
            placeholder="搜索URL，关键词用 {keyword} 占位"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className={styles.formInput}
            onKeyDown={(e) => e.key === 'Enter' && addEngine()}
          />
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => { setShowAdd(false); setNewName(''); setNewUrl('') }}>取消</button>
            <button className={styles.confirmBtn} onClick={addEngine}>添加</button>
          </div>
        </div>
      )}

      {/* 搜索输入框 */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder={`使用 ${activeEngine?.name || '搜索引擎'} 搜索...`}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={styles.searchInput}
        />
        <button className={styles.searchBtn} onClick={handleSearch}>
          <Search size={16} />
          <span>搜索</span>
        </button>
      </div>

      {/* 历史搜索记录：仅在启用且有记录时显示 */}
      {historyEnabled && searchHistory.length > 0 && (
        <div className={styles.searchHistory}>
          <div className={styles.searchHistoryHeader}>
            <span className={styles.searchHistoryTitle}>
              <Clock size={12} />
              历史搜索
            </span>
            <button className={styles.searchHistoryClear} onClick={() => { clearSearchHistory(); setSearchHistory([]) }}>清空</button>
          </div>
          <div className={styles.searchHistoryList}>
            {searchHistory.map((term) => (
              <button
                key={term}
                className={styles.searchHistoryTag}
                onClick={() => {
                  setSearchInput(term)
                  inputRef.current?.focus()
                }}
              >
                <span>{term}</span>
                <span
                  className={styles.searchHistoryRemove}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSearchHistory(term)
                    setSearchHistory(getSearchHistory())
                  }}
                >
                  <X size={10} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 保险箱弹窗 - 通过 Portal 渲染到 body，避免 CSS 层级限制 */}
      {showSafeBox && createPortal(<SafeBox onClose={() => setShowSafeBox(false)} />, document.body)}

      {/* 搜索引擎删除确认弹窗 - 通过 Portal 渲染到 body */}
      {engineDialogOpen && createPortal(
        <ConfirmDialog
          isOpen={engineDialogOpen}
          title="删除搜索引擎"
          message="确定要删除这个搜索引擎吗？删除后可在回收站恢复。"
          onConfirm={() => {
            if (deleteEngineId) {
              removeEngine(deleteEngineId)
            }
            setEngineDialogOpen(false)
            setDeleteEngineId(null)
          }}
          onCancel={() => {
            setEngineDialogOpen(false)
            setDeleteEngineId(null)
          }}
        />,
        document.body
      )}
    </div>
  )
}
