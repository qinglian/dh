/*
 * StartPage - 浏览器起始页
 * 功能：展示问候语、实时时钟、多引擎搜索框、快捷网页图标，支持主题切换、快捷网页编辑/拖拽排序。
 *       支持多页面（pageId）模式下独立保存每个页面的快捷方式和设置。
 * Props：
 *   onGoToNav         {function}  点击"导航"按钮的回调，跳转到导航页
 *   pageId            {string}    当前页面ID，默认 'default'，用于多页面数据隔离
 *   onSettingsChange  {function}  设置变更时回调，通知父组件刷新
 *   onToggleSidebar   {function}  切换侧边栏的回调（多页切换按钮）
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ChevronDown, ArrowRight, Moon, Sun, Compass, Pencil, X, Plus, Settings, Monitor, Sunrise, Layers, LayoutGrid } from 'lucide-react'
import { useTheme, THEME_MODES } from '../context/ThemeContext'
import StartPageSettings from './StartPageSettings'
import WidgetPanel from './WidgetPanel'
import { getSettings } from '../utils/startPageSettings'
import { getPageDataKey, getPages } from '../utils/startPagePages'
import styles from './StartPage.module.css'

/* localStorage 中快捷方式数据的存储 key */
const SHORTCUTS_KEY = 'nav-shortcuts'

/*
 * 从 localStorage 读取指定页面的快捷方式列表
 * 兼容新旧两种 key 格式：
 *   - 新格式: nav-startpage-nav-shortcuts-{pageId}
 *   - 旧格式: nav-{pageId}-nav-shortcuts
 */
function getSavedShortcuts(pageId = 'default') {
  const newKey = getPageDataKey(pageId, SHORTCUTS_KEY)
  const oldKey = `nav-${pageId}-${SHORTCUTS_KEY}`
  const saved = localStorage.getItem(newKey) || localStorage.getItem(oldKey)
  if (!saved) return []
  try {
    return JSON.parse(saved)
  } catch {
    return []
  }
}

/* 将快捷方式列表保存到指定页面的 localStorage（使用新格式） */
function saveShortcuts(pageId, list) {
  const key = getPageDataKey(pageId, SHORTCUTS_KEY)
  localStorage.setItem(key, JSON.stringify(list))
}

/* 小部件存储 key */
const WIDGETS_KEY = 'nav-widgets'

/*
 * 从 localStorage 读取指定页面的小部件列表
 * 兼容新旧两种 key 格式
 */
function getSavedWidgets(pageId = 'default') {
  const newKey = getPageDataKey(pageId, WIDGETS_KEY)
  const oldKey = `nav-${pageId}-${WIDGETS_KEY}`
  const saved = localStorage.getItem(newKey) || localStorage.getItem(oldKey)
  if (!saved) return []
  try { return JSON.parse(saved) } catch { return [] }
}

/* 将小部件列表保存到指定页面的 localStorage（使用新格式） */
function saveWidgets(pageId, list) {
  const key = getPageDataKey(pageId, WIDGETS_KEY)
  localStorage.setItem(key, JSON.stringify(list))
}

/* 预置搜索引擎列表，用户可自定义添加 */
const DEFAULT_ENGINES = [
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', color: '#008373' },
  { id: 'google', name: '谷歌', url: 'https://www.google.com/search?q=', color: '#4285f4' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', color: '#2932e1' },
  { id: 'metaso', name: '秘塔AI', url: 'https://metaso.cn/?q=', color: '#00b4d8' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
  { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=', color: '#fb5100' },
]

/* 从 localStorage 读取搜索引擎列表，未保存时使用默认列表 */
function getEngines() {
  const saved = localStorage.getItem('nav-search-engines')
  return saved ? JSON.parse(saved) : DEFAULT_ENGINES
}

/* 从 localStorage 读取当前选中的搜索引擎ID，默认 'bing' */
function getCurrentEngineId() {
  return localStorage.getItem('nav-current-engine') || 'bing'
}

export default function StartPage({ onGoToNav, pageId = 'default', onSettingsChange, onToggleSidebar }) {
  const { theme, themeMode, setTheme } = useTheme()

  /* 搜索引擎列表，从 localStorage 读取并作为初始值 */
  const [engines, setEngines] = useState(() => getEngines())
  /* 当前选中的搜索引擎ID，从 localStorage 读取初始值 */
  const [currentEngineId, setCurrentEngineId] = useState(() => getCurrentEngineId())
  /* 搜索关键词 */
  const [query, setQuery] = useState('')
  /* 搜索引擎下拉选择器的显示/隐藏 */
  const [showEnginePicker, setShowEnginePicker] = useState(false)
  /* 主题下拉选择器的显示/隐藏 */
  const [showThemePicker, setShowThemePicker] = useState(false)
  /* 当前日期时间信息：时、分、秒、月、日、年、星期 */
  const [dateInfo, setDateInfo] = useState({ hour: 0, minute: 0, second: 0, month: '', day: 0, year: 0, weekday: '' })
  /* 快捷网页列表，从当前页面的 localStorage 读取 */
  const [shortcuts, setShortcuts] = useState(() => getSavedShortcuts(pageId))
  /* 搜索框网格行位置（默认第 0 行，即最顶部） */
  const [searchRow, setSearchRow] = useState(() => {
    const saved = localStorage.getItem(getPageDataKey(pageId, 'nav-search-row'))
    return saved !== null ? parseInt(saved) : 0
  })
  /* 时间栏网格行位置 */
  const [timeRow, setTimeRow] = useState(() => {
    const saved = localStorage.getItem(getPageDataKey(pageId, 'nav-time-row'))
    return saved !== null ? parseInt(saved) : 0
  })
  /* 小部件列表 */
  const [widgets, setWidgets] = useState(() => getSavedWidgets(pageId))
  /* 小部件面板显示状态 */
  const [showWidgetPanel, setShowWidgetPanel] = useState(false)
  /* 快捷网页编辑模式开关 */
  const [isEditShortcuts, setIsEditShortcuts] = useState(false)
  /* 添加快捷网页表单的显示状态 */
  const [showAddShortcut, setShowAddShortcut] = useState(false)
  /* 当前正在编辑的快捷网页ID，null 表示未在编辑 */
  const [editingId, setEditingId] = useState(null)
  /* 新增快捷网页表单数据：{ name, url, iconUrl } */
  const [newShortcut, setNewShortcut] = useState({ name: '', url: '', iconUrl: '' })
  /* 编辑中快捷网页表单数据 */
  const [editShortcut, setEditShortcut] = useState({ name: '', url: '', iconUrl: '' })
  /* 设置弹窗的显示状态 */
  const [showSettings, setShowSettings] = useState(false)
  /* 起始页设置项，从 localStorage 读取初始值，控制各组件的显示/隐藏 */
  const [startSettings, setStartSettings] = useState(() => getSettings(pageId))

  /*
   * 设置变更处理：更新本地设置并通知父组件
   */
  const handleSettingsChange = (newSettings) => {
    setStartSettings({ ...newSettings })
    if (onSettingsChange) onSettingsChange()
  }

  /* 拖拽悬停目标索引，用于高亮当前拖拽位置 */
  const [dragOverIndex, setDragOverIndex] = useState(null)
  /* 拖拽悬浮占位位置 { col, row } */
  const [dropTarget, setDropTarget] = useState(null)
  /* 拖拽项的原始索引，用于交换计算 */
  const dragItemIndex = useRef(null)
  /* 拖拽项的原始数据引用 */
  const dragItemData = useRef(null)
  /* 搜索框容器 DOM 引用 */
  const searchRef = useRef(null)
  /* 网格容器 DOM 引用，用于拖拽坐标偏移计算 */
  const gridRef = useRef(null)
  /* 页面容器 DOM 引用，用于时间栏/搜索框拖拽坐标计算 */
  const containerRef = useRef(null)
  /* 搜索输入框 DOM 引用 */
  const inputRef = useRef(null)
  /* 主题下拉容器 DOM 引用，用于检测外部点击 */
  const themePickerRef = useRef(null)
  /* 搜索引擎下拉容器 DOM 引用，用于检测外部点击 */
  const enginePickerRef = useRef(null)
  /* 顶部工具栏 DOM 引用 */
  const topBarRef = useRef(null)
  const hideTimerRef = useRef(null)

  /* 鼠标移开 5 秒后同步收起主题/引擎弹窗 */
  const scheduleHidePickups = () => {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setShowThemePicker(false)
      setShowEnginePicker(false)
    }, 5000)
  }
  const cancelHidePickups = () => clearTimeout(hideTimerRef.current)
  useEffect(() => () => clearTimeout(hideTimerRef.current), [])

  /* 自由布局模式开关（当前为关闭状态） */
  const freeLayoutEnabled = false

  /* 网格常量 — 正方形单元格 */
  const GRID_COLS = 6
  const CELL_SIZE = 80

  /*
   * 合并列表：快捷网页 + 小部件，每个项携带 col/row 坐标。
   * 旧数据没有 col/row 时，按数组顺序自动分配（兼容迁移）。
   */
  const gridItems = useMemo(() => {
    const sItems = shortcuts.map((s, i) => ({ ...s, itemType: 'shortcut', col: s.col ?? (i % GRID_COLS), row: s.row ?? Math.floor(i / GRID_COLS) }))
    const wItems = widgets.map((w, i) => ({ ...w, itemType: 'widget', col: w.col ?? ((shortcuts.length + i) % GRID_COLS), row: w.row ?? Math.floor((shortcuts.length + i) / GRID_COLS) }))
    return [...sItems, ...wItems]
  }, [shortcuts, widgets])

  /* 从合并列表分离并保存 */
  const updateFromGrid = (newGrid) => {
    const newShortcuts = newGrid.filter(i => i.itemType === 'shortcut').map(({ itemType, ...rest }) => rest)
    const newWidgets = newGrid.filter(i => i.itemType === 'widget').map(({ itemType, ...rest }) => rest)
    setShortcuts(newShortcuts)
    setWidgets(newWidgets)
    saveShortcuts(pageId, newShortcuts)
    saveWidgets(pageId, newWidgets)
  }

  /* 每秒更新一次时钟 */
  useEffect(() => {
    const updateDate = () => {
      const now = new Date()
      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      setDateInfo({
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        month: months[now.getMonth()],
        day: now.getDate(),
        year: now.getFullYear(),
        weekday: weekdays[now.getDay()],
      })
    }
    updateDate()
    const timer = setInterval(updateDate, 1000)
    return () => clearInterval(timer)
  }, [])

  /* 页面切换时重新加载该页面的快捷方式和设置，并退出编辑模式 */
  useEffect(() => {
    setShortcuts(getSavedShortcuts(pageId))
    setStartSettings(getSettings(pageId))
    setIsEditShortcuts(false)
  }, [pageId])

  /* 监听搜索引擎变更事件，同步更新本地引擎列表 */
  useEffect(() => {
    const handleEnginesChanged = () => {
      setEngines(getEngines())
    }
    window.addEventListener('nav-engines-changed', handleEnginesChanged)
    return () => window.removeEventListener('nav-engines-changed', handleEnginesChanged)
  }, [])

  /* 点击外部关闭主题下拉栏和搜索引擎下拉栏 */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false)
      }
      if (enginePickerRef.current && !enginePickerRef.current.contains(e.target)) {
        setShowEnginePicker(false)
      }
    }
    if (showThemePicker || showEnginePicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemePicker, showEnginePicker])

  /* 根据当前小时数生成问候语，通过 useMemo 避免无关重渲染 */
  const greeting = useMemo(() => {
    const h = dateInfo.hour
    if (h < 6) return '夜深了，注意休息'
    if (h < 9) return '早上好，开启美好的一天'
    if (h < 12) return '上午好，工作愉快'
    if (h < 14) return '中午好，记得午休'
    if (h < 18) return '下午好，继续加油'
    if (h < 22) return '晚上好，放松一下'
    return '夜深了，注意休息'
  }, [dateInfo.hour])

  /* 当前引擎对象：过滤掉隐藏引擎后，根据 currentEngineId 匹配，若未匹配则选中第一个可见引擎 */
  const visibleEngines = engines.filter(e => !e.hidden)
  const activeEngine = visibleEngines.find(e => e.id === currentEngineId) || visibleEngines[0]

  /*
   * 切换搜索引擎：更新当前引擎ID，同步到 localStorage，关闭下拉并聚焦搜索框
   */
  const handleEngineChange = (engineId) => {
    setCurrentEngineId(engineId)
    localStorage.setItem('nav-current-engine', engineId)
    setShowEnginePicker(false)
    inputRef.current?.focus()
  }

  /* 历史搜索记录，从 localStorage 读取初始值 */
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('nav-search-history')
    return saved ? JSON.parse(saved) : []
  })

  /* 保存历史搜索记录到 localStorage 并更新 state */
  const saveSearchHistory = (history) => {
    localStorage.setItem('nav-search-history', JSON.stringify(history))
    setSearchHistory(history)
  }

  /* 添加一条搜索记录：去重后插入到最前面，最多保留20条 */
  const addSearchHistory = (term) => {
    if (!term.trim()) return
    const newHistory = [term.trim(), ...searchHistory.filter(h => h !== term.trim())].slice(0, 20)
    saveSearchHistory(newHistory)
  }

  /* 移除指定搜索记录 */
  const removeSearchHistory = (term) => {
    const newHistory = searchHistory.filter(h => h !== term)
    saveSearchHistory(newHistory)
  }

  /* 清空全部搜索记录 */
  const clearSearchHistory = () => {
    saveSearchHistory([])
  }

  /*
   * 执行搜索：记录搜索关键词，拼接搜索引擎 URL 并在新标签页打开
   */
  const handleSearch = () => {
    if (!query.trim()) return
    addSearchHistory(query.trim())
    const url = activeEngine.url + encodeURIComponent(query)
    window.open(url, '_blank')
    setQuery('')
  }

  /* 键盘事件：按下 Enter 触发搜索 */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  /*
   * 添加快捷网页：校验名称和URL非空，自动补全 https:// 前缀，
   * 保存后关闭添加表单
   */
  const handleAddShortcut = () => {
    if (!newShortcut.name.trim() || !newShortcut.url.trim()) return
    const url = newShortcut.url.startsWith('http') ? newShortcut.url : 'https://' + newShortcut.url
    const iconUrl = newShortcut.iconUrl.trim() || ''
    const item = {
      id: Date.now().toString(),
      name: newShortcut.name.trim(),
      url,
      iconUrl,
      pos: undefined,
    }
    const updated = [...shortcuts, item]
    setShortcuts(updated)
    saveShortcuts(pageId, updated)
    setNewShortcut({ name: '', url: '', iconUrl: '' })
    setShowAddShortcut(false)
  }

  /* 删除指定快捷网页 */
  const handleRemoveShortcut = (id) => {
    const updated = shortcuts.filter((s) => s.id !== id)
    setShortcuts(updated)
    saveShortcuts(pageId, updated)
  }

  /* 添加小部件 */
  const handleAddWidget = (widgetData) => {
    const newWidget = {
      ...widgetData,
      id: Date.now().toString(),
    }
    const updated = [...widgets, newWidget]
    setWidgets(updated)
    saveWidgets(pageId, updated)
  }

  /* 删除小部件 */
  const handleRemoveWidget = (id) => {
    const updated = widgets.filter(w => w.id !== id)
    setWidgets(updated)
    saveWidgets(pageId, updated)
  }

  /* 开始编辑某个快捷网页，填充编辑表单 */
  const startEdit = (site) => {
    setEditingId(site.id)
    setEditShortcut({ name: site.name, url: site.url, iconUrl: site.iconUrl || '' })
  }

  /* 保存编辑：校验非空，自动补全 URL，更新列表 */
  const saveEdit = () => {
    if (!editShortcut.name.trim() || !editShortcut.url.trim()) return
    const updated = shortcuts.map((s) =>
      s.id === editingId
        ? { ...s, name: editShortcut.name.trim(), url: editShortcut.url.startsWith('http') ? editShortcut.url : 'https://' + editShortcut.url, iconUrl: editShortcut.iconUrl.trim() || '' }
        : s
    )
    setShortcuts(updated)
    saveShortcuts(pageId, updated)
    setEditingId(null)
  }

  /*
   * 获取快捷网页的图标URL：
   * - 优先使用自定义 iconUrl
   * - 否则通过 Google S2 favicon 服务自动获取网站图标
   */
  const getIconUrl = (site) => {
    if (site.iconUrl) return site.iconUrl
    try {
      const domain = new URL(site.url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      return ''
    }
  }

  /*
   * 拖拽开始：仅在编辑模式下生效，记录拖拽索引和数据
   */
  const handleDragStart = (e, index) => {
    if (!isEditShortcuts) return
    dragItemIndex.current = index
    dragItemData.current = gridItems[index]
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'item:' + index)
  }

  /*
   * 计算鼠标相对于 CSS grid 内容区域的网格坐标
   * 考虑 grid 在容器内水平居中的偏移
   */
  const getGridPos = (clientX, clientY) => {
    const gap = 8
    const cellTotal = CELL_SIZE + gap
    const gridEl = gridRef.current
    if (!gridEl) return null
    const rect = gridEl.getBoundingClientRect()
    // grid 内容总宽度（不含最右边 gap）
    const gridContentWidth = GRID_COLS * cellTotal - gap
    // grid 内容在容器内的水平居中偏移
    const gridOffsetX = (rect.width - gridContentWidth) / 2
    const offsetX = clientX - rect.left - gridOffsetX
    const offsetY = clientY - rect.top
    return {
      col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(offsetX / cellTotal))),
      row: Math.max(0, Math.floor(offsetY / cellTotal)),
    }
  }

  /* 拖拽结束：重置所有拖拽引用 */
  const handleDragEnd = (e) => {
    dragItemIndex.current = null
    dragItemData.current = null
    setDropTarget(null)
    setDragOverIndex(null)
  }

  /*
   * 在 document 级别监听拖拽事件，确保整个页面（包括 topBar、时间栏、搜索框等区域）
   * 都能响应 dragover/drop，不受子元素事件冒泡阻断影响
   */
  useEffect(() => {
    const onDragOver = (e) => {
      if (!isEditShortcuts) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const pos = getGridPos(e.clientX, e.clientY)
      if (pos) {
        setDropTarget(pos)
      }
    }

    const onDrop = (e) => {
      if (!isEditShortcuts) return
      e.preventDefault()

      const pos = getGridPos(e.clientX, e.clientY)
      if (!pos) return
      const { col, row } = pos

      const dragData = e.dataTransfer.getData('text/plain')

      if (dragData === 'search-box') {
        setSearchRow(row)
        localStorage.setItem(getPageDataKey(pageId, 'nav-search-row'), String(row))
      } else if (dragData === 'time-section') {
        setTimeRow(row)
        localStorage.setItem(getPageDataKey(pageId, 'nav-time-row'), String(row))
      } else if (dragData.startsWith('item:')) {
        const idx = parseInt(dragData.split(':')[1])
        if (!isNaN(idx) && idx >= 0 && idx < gridItems.length) {
          const newGrid = [...gridItems]
          newGrid[idx] = { ...newGrid[idx], col, row }
          updateFromGrid(newGrid)
        }
      }

      dragItemIndex.current = null
      dragItemData.current = null
      setDropTarget(null)
      setDragOverIndex(null)
    }

    const onDragEnd = () => {
      dragItemIndex.current = null
      dragItemData.current = null
      setDropTarget(null)
      setDragOverIndex(null)
    }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    document.addEventListener('dragend', onDragEnd)

    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
      document.removeEventListener('dragend', onDragEnd)
    }
  }, [isEditShortcuts, pageId, gridItems])

  return (
    /*
     * 容器类名切换：
     * - container: 基础布局
     * - containerCentered: 当没有快捷网页时，使内容在垂直方向居中
     */
    <div
      ref={containerRef}
      className={`${styles.container} ${shortcuts.length === 0 ? styles.containerCentered : ''}`}
    >
      {/* 顶部工具栏 */}
      <div className={`${styles.topBar} ${isEditShortcuts ? styles.topBarVisible : ''}`}
        ref={topBarRef}
        onMouseEnter={cancelHidePickups}
        onMouseLeave={scheduleHidePickups}
      >
        {/* 主题选择器 */}
        <div className={styles.themePickerWrapper} ref={themePickerRef}>
          <button className={styles.topBtn} onClick={(e) => { e.stopPropagation(); setShowThemePicker(!showThemePicker) }} title="主题模式">
            {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          {showThemePicker && (
            <div className={styles.themeDropdown}>
              {[
                { mode: 'light', icon: <Sun size={14} />, label: '亮色模式' },
                { mode: 'dark', icon: <Moon size={14} />, label: '深色模式' },
                { mode: 'system', icon: <Monitor size={14} />, label: '跟随系统' },
                { mode: 'sunrise-sunset', icon: <Sunrise size={14} />, label: '日出日落' },
              ].map(item => (
                <button
                  key={item.mode}
                  /*
                   * 主题选项高亮：themeOptionActive 类在当前激活的主题上添加
                   */
                  className={`${styles.themeOption} ${themeMode === item.mode ? styles.themeOptionActive : ''}`}
                  onClick={() => { setTheme(item.mode); setShowThemePicker(false) }}
                >
                  <span className={styles.themeOptionIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                  {themeMode === item.mode && <span className={styles.themeOptionCheck}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 编辑快捷网页按钮：编辑模式下高亮 */}
        <button
          /*
           * topBtnActive: 编辑模式激活时添加高亮样式
           */
          className={`${styles.topBtn} ${isEditShortcuts ? styles.topBtnActive : ''}`}
          onClick={() => setIsEditShortcuts(!isEditShortcuts)}
          title={isEditShortcuts ? '完成编辑' : '编辑快捷网页'}
        >
          <Pencil size={15} />
        </button>
        {/* 小部件添加按钮：仅在编辑模式下显示 */}
        {isEditShortcuts && (
          <button
            className={styles.topBtn}
            onClick={() => setShowWidgetPanel(true)}
            title="添加小部件"
          >
            <LayoutGrid size={15} />
          </button>
        )}
        {/* 多页切换按钮：仅在传入 onToggleSidebar 时显示 */}
        {onToggleSidebar && (
          <button
            className={styles.topBtn}
            onClick={onToggleSidebar}
            title="多页切换"
          >
            <Layers size={15} />
          </button>
        )}
        {/* 起始页设置按钮 */}
        <button
          className={styles.topBtn}
          onClick={() => setShowSettings(true)}
          title="起始页设置"
        >
          <Settings size={15} />
        </button>
        {/* 跳转导航页按钮 */}
        <button className={styles.navBtn} onClick={onGoToNav}>
          <Compass size={15} />
          <span>导航</span>
        </button>
      </div>

      {/* 问候语：根据设置项 timeWidget.visible 控制显示 */}
      {startSettings.timeWidget?.visible !== false && (
        <div className={styles.greeting}>{greeting}</div>
      )}

      {/* 时间日期：根据设置项 timeWidget.visible 控制显示 */}
      {startSettings.timeWidget?.visible !== false && (
        <div className={styles.timeSection} style={{ position: 'relative', cursor: isEditShortcuts ? 'grab' : undefined }}>
          {/* 编辑模式覆盖层：覆盖整个时间栏，用于拖拽 */}
          {isEditShortcuts && (
            <div
              draggable
              onDragStart={(e) => {
                dragItemData.current = { cols: 6, rows: 2 }
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', 'time-section')
              }}
              onDragEnd={handleDragEnd}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                cursor: 'grab',
              }}
            />
          )}
          <div className={styles.time}>
            <span className={styles.timeHour}>{String(dateInfo.hour).padStart(2, '0')}</span>
            <span className={styles.timeColon}>:</span>
            <span className={styles.timeMinute}>{String(dateInfo.minute).padStart(2, '0')}</span>
            <span className={styles.timeSecond}>:{String(dateInfo.second).padStart(2, '0')}</span>
          </div>
          <div className={styles.dateInfo}>
            <span>{dateInfo.month} {dateInfo.day}日, {dateInfo.year}</span>
            <span className={styles.dateDivider}>·</span>
            <span>{dateInfo.weekday}</span>
          </div>
        </div>
      )}

      {/* 搜索框：根据设置项 searchBox.visible 控制显示 */}
      {startSettings.searchBox?.visible !== false && (
        <div className={styles.searchWrapper} style={{ position: 'relative', cursor: isEditShortcuts ? 'grab' : undefined }}>
          {/* 编辑模式覆盖层：覆盖整个搜索框，用于拖拽 */}
          {isEditShortcuts && (
            <div
              draggable
              onDragStart={(e) => {
                dragItemData.current = { cols: 6, rows: 1 }
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', 'search-box')
              }}
              onDragEnd={handleDragEnd}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                cursor: 'grab',
              }}
            />
          )}
          {/* 编辑模式拖拽手柄 */}
          {isEditShortcuts && (
            <div className={styles.dragHandleBar}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2 }}>⠿</span>
            </div>
          )}
          <div className={styles.searchBox}>
            {/* 搜索引擎选择器下拉 */}
            <div className={styles.engineSelector} ref={enginePickerRef}>
              <button className={styles.engineBtn} onClick={() => setShowEnginePicker(!showEnginePicker)}>
                <span className={styles.engineDot} style={{ background: activeEngine?.color }} />
                <span className={styles.engineName}>{activeEngine?.name}</span>
                {/*
                 * 下拉箭头旋转动画：chevronOpen 类在下拉打开时添加，使箭头旋转 180°
                 */}
                <ChevronDown size={14} className={`${styles.chevron} ${showEnginePicker ? styles.chevronOpen : ''}`} />
              </button>
              {showEnginePicker && (
                <div className={styles.engineDropdown}>
                  {engines.filter(e => !e.hidden).map(engine => (
                    <button key={engine.id}
                      /*
                       * 引擎选项高亮：engineOptionActive 类在当前选中引擎上添加
                       */
                      className={`${styles.engineOption} ${engine.id === currentEngineId ? styles.engineOptionActive : ''}`}
                      onClick={() => handleEngineChange(engine.id)}>
                      <span className={styles.engineDot} style={{ background: engine.color }} />
                      <span>{engine.name}</span>
                      {engine.id === currentEngineId && <span className={styles.engineCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`使用 ${activeEngine?.name || '搜索引擎'} 搜索...`}
                className={styles.searchInput}
                autoComplete="off"
              />
              {/* 清除按钮：仅在输入框有内容时显示 */}
              {query && (
                <button className={styles.clearBtn} onClick={() => setQuery('')}>×</button>
              )}
            </div>
          </div>

          {/* 历史搜索记录：根据设置项 searchHistory.visible 和有记录时显示 */}
          {startSettings.searchHistory?.visible !== false && searchHistory.length > 0 && (
            <div className={styles.searchHistory}>
              <div className={styles.searchHistoryHeader}>
                <span className={styles.searchHistoryTitle}>历史搜索</span>
                <button className={styles.searchHistoryClear} onClick={clearSearchHistory}>清空</button>
              </div>
              <div className={styles.searchHistoryList}>
                {searchHistory.map((term) => (
                  <button
                    key={term}
                    className={styles.searchHistoryTag}
                    onClick={() => {
                      setQuery(term)
                      inputRef.current?.focus()
                    }}
                  >
                    <span>{term}</span>
                    <span
                      className={styles.searchHistoryRemove}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSearchHistory(term)
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 快捷网页区域 */}
      <div className={styles.shortcutsWrapper} style={{ pointerEvents: 'none' }}>
        {/* 添加快捷网页表单 */}
        {isEditShortcuts && showAddShortcut && (
          <div className={styles.shortcutForm} style={{ pointerEvents: 'auto' }}>
            <input type="text" placeholder="名称" value={newShortcut.name} onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })} className={styles.shortcutInput} />
            <input type="text" placeholder="网址" value={newShortcut.url} onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })} className={styles.shortcutInput} />
            <input type="text" placeholder="图标URL（可选，留空自动获取）" value={newShortcut.iconUrl} onChange={(e) => setNewShortcut({ ...newShortcut, iconUrl: e.target.value })} className={styles.shortcutInput} />
            <button className={styles.shortcutConfirm} onClick={handleAddShortcut}>添加</button>
          </div>
        )}
      </div>

      {/*
       * 网格布局列表：快捷网页 + 小部件混合排列
       * 直接放在 container 内部（position: absolute），确保 inset: 0 正确工作
       * 编辑模式下网格不可见，拖拽时显示占位
       */}
        <div
          className={styles.shortcutsList}
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
            gridAutoRows: `${CELL_SIZE}px`,
            gap: 8,
            justifyContent: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: '12.5vh',
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
        >
          {gridItems.map((item, index) => {
            const isWidget = item.itemType === 'widget'
            const cols = isWidget && item.cols ? item.cols : 1
            const rows = isWidget && item.rows ? item.rows : 1
            const col = item.col ?? (index % GRID_COLS)
            const row = item.row ?? Math.floor(index / GRID_COLS)

            return (
              <div
                key={item.id}
                className={`${styles.shortcutItem} ${isEditShortcuts ? styles.shortcutItemDraggable : ''} ${dragItemIndex.current === index ? styles.dragging : ''} ${dropTarget && dragItemIndex.current === index ? styles.dragSource : ''} ${isWidget ? styles.widgetItem : ''}`}
                style={{
                  gridColumn: `${col + 1} / span ${cols}`,
                  gridRow: `${row + 1} / span ${rows}`,
                  pointerEvents: 'auto',
                }}
                draggable={isEditShortcuts && !isWidget ? editingId !== item.id : isEditShortcuts}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
              >
                {isWidget ? (
                  /* 小部件渲染 */
                  <div className={styles.widgetContent} style={{ width: '100%', height: '100%', minHeight: CELL_SIZE * rows + (rows - 1) * 8 }}>
                    <div className={styles.widgetPlaceholder}>
                      <span style={{ fontSize: 24, opacity: 0.4 }}>📦</span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{item.name || '小部件'}</span>
                    </div>
                    {/* 编辑模式：删除按钮 */}
                    {isEditShortcuts && (
                      <div className={styles.shortcutActions}>
                        <button className={styles.shortcutActionBtn} onClick={() => handleRemoveWidget(item.id)} title="删除">
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : editingId === item.id ? (
                  /* 编辑快捷网页表单 */
                  <div
                    className={styles.editForm}
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => e.preventDefault()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrag={(e) => e.preventDefault()}
                  >
                    <input
                      type="text"
                      value={editShortcut.name}
                      onChange={(e) => setEditShortcut({ ...editShortcut, name: e.target.value })}
                      placeholder="名称"
                      className={styles.editInput}
                      draggable={false}
                    />
                    <input
                      type="text"
                      value={editShortcut.url}
                      onChange={(e) => setEditShortcut({ ...editShortcut, url: e.target.value })}
                      placeholder="网址"
                      className={styles.editInput}
                      draggable={false}
                    />
                    <input
                      type="text"
                      value={editShortcut.iconUrl}
                      onChange={(e) => setEditShortcut({ ...editShortcut, iconUrl: e.target.value })}
                      placeholder="图标URL（可选）"
                      className={styles.editInput}
                      draggable={false}
                    />
                    <div className={styles.editActions}>
                      <button className={styles.editCancel} onClick={() => setEditingId(null)}>取消</button>
                      <button className={styles.editSave} onClick={saveEdit}>保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 正常快捷网页链接 */}
                    <a
                      href={isEditShortcuts ? undefined : item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.shortcutLink}
                      title={item.name}
                      onClick={(e) => isEditShortcuts && e.preventDefault()}
                    >
                      <div className={styles.shortcutIcon}>
                        <img
                          src={getIconUrl(item)}
                          alt=""
                          draggable={false}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.textContent = item.name.charAt(0)
                          }}
                        />
                      </div>
                      <span className={styles.shortcutName}>{item.name}</span>
                    </a>
                    {isEditShortcuts && (
                      <div className={styles.shortcutActions}>
                        <button className={styles.shortcutActionBtn} onClick={() => startEdit(item)} title="编辑">
                          <Pencil size={11} />
                        </button>
                        <button className={styles.shortcutActionBtn} onClick={() => handleRemoveShortcut(item.id)} title="删除">
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {/* 编辑模式：显示"添加"按钮 */}
          {isEditShortcuts && (
            <button className={styles.shortcutAdd} onClick={() => setShowAddShortcut(!showAddShortcut)} title="添加快捷网页" style={{ pointerEvents: 'auto' }}>
              <Plus size={18} />
            </button>
          )}
          {/* 拖拽悬浮占位预览：使用 CSS grid 定位，坐标与快捷网页一致 */}
          {dropTarget && dragItemData.current && (
            <div
              className={styles.dropPlaceholder}
              style={{
                gridColumnStart: dropTarget.col + 1,
                gridRowStart: dropTarget.row + 1,
                gridColumnEnd: `span ${dragItemData.current.cols || 1}`,
                gridRowEnd: `span ${dragItemData.current.rows || 1}`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>



      {/* 设置弹窗 */}
      {showSettings && (
        <StartPageSettings onClose={() => setShowSettings(false)} onSettingsChange={handleSettingsChange} pageId={pageId} pageName={getPages().find(p => p.id === pageId)?.name} />
      )}
      {/* 小部件选择弹窗 */}
      {showWidgetPanel && (
        <WidgetPanel onClose={() => setShowWidgetPanel(false)} onAdd={handleAddWidget} />
      )}
    </div>
  )
}
