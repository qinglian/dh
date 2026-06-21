import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Settings, Plus, Trash2, GripVertical, Pencil, Eye, EyeOff, RotateCcw, Search, ChevronDown, ChevronRight, Check, Info } from 'lucide-react'
import styles from './StartPageSettings.module.css'
import ConfirmDialog from './ConfirmDialog'

/* 卡片高亮颜色行组件 - 颜色按钮 + 不透明度滑块 */
function HlRow({ label, color, opacity, onColorChange, onOpacityChange, onOpenPicker }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 36, flexShrink: 0 }}>{label}</span>
      <button
        onClick={onOpenPicker}
        title={color}
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: color,
          border: '2px solid var(--glass-border)',
          cursor: 'pointer', padding: 0,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
          transition: 'transform .12s cubic-bezier(.34,1.56,.64,1), filter .15s ease',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.85)'; e.currentTarget.style.filter = 'brightness(0.85)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none' }}
      />
      <input
        type="range"
        min={0} max={100} step={1}
        value={opacity}
        onChange={(e) => onOpacityChange(parseInt(e.target.value))}
        style={{
          flex: 1, height: 4, borderRadius: 2,
          WebkitAppearance: 'none', appearance: 'none',
          background: `linear-gradient(to right, transparent, ${color})`,
          outline: 'none', cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 30, textAlign: 'right', flexShrink: 0 }}>{opacity}%</span>
    </div>
  )
}

/* 卡片高亮颜色 localStorage key 工具：深色/浅色模式隔离 */
function hlKey(base) {
  const theme = document.documentElement.getAttribute('data-theme') || 'light'
  return `nav-hl-${theme}-${base}`
}

import ColorPicker from './ColorPicker'
import { getWeatherEnabled, saveWeatherEnabled, getSavedCity, saveCity as saveWeatherCity, searchCity } from '../utils/weather'
import { getQuickAccessEnabled, saveQuickAccessEnabled } from '../utils/quickAccess'
import { getSafeBoxEnabled, saveSafeBoxEnabled, saveSafeBoxPassword } from '../utils/safeBox'

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
  return saved ? JSON.parse(saved) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [], deletedSites: [] }
}

function saveTrash(trash) {
  localStorage.setItem('nav-trash', JSON.stringify(trash))
}

const DEFAULT_CATEGORIES = [
  { id: 'basic', name: '基础设置' },
  { id: 'category-sort', name: '分类排序' },
  { id: 'engines', name: '搜索引擎' },
  { id: 'api', name: 'API' },
  { id: 'trash', name: '回收站' },
]

function getSettingsCategories() {
  const saved = localStorage.getItem('nav-settings-categories-order')
  if (saved) {
    try {
      const order = JSON.parse(saved)
      const result = order.map(id => DEFAULT_CATEGORIES.find(c => c.id === id)).filter(Boolean)
      // 合并 DEFAULT_CATEGORIES 中新增的分类（不在已保存顺序中的）
      for (const dc of DEFAULT_CATEGORIES) {
        if (!result.find(r => r.id === dc.id)) result.push(dc)
      }
      return result
    } catch {}
  }
  return [...DEFAULT_CATEGORIES]
}

function saveSettingsCategories(categories) {
  localStorage.setItem('nav-settings-categories-order', JSON.stringify(categories.map(c => c.id)))
}

export default function NavPageSettings({
  onClose,
  siteStatusEnabled,
  onToggleSiteStatus,
  siteTitle,
  siteSubtitle,
  onUpdateSiteTitle,
  onUpdateSiteSubtitle,
  categories,
  reorderCategories,
  updateCategory,
  deleteCategory,
  addCategory,
  hiddenCategories,
  setHiddenCategories,
  mouseSpotlight,
  onToggleMouseSpotlight,
  spotlightSize,
  onUpdateSpotlightSize,
  spotlightOpacity,
  onUpdateSpotlightOpacity,
  spotlightMaskMode,
  onToggleSpotlightMaskMode,
  spotlightColor1,
  onUpdateSpotlightColor1,
  spotlightColor2,
  onUpdateSpotlightColor2,
  spotlightColorMix,
  onUpdateSpotlightColorMix,
  blurLevel,
  onUpdateBlurLevel,
  blurEnabled,
  onToggleBlurEnabled,
  opacityLevel,
  onUpdateOpacityLevel,
  opacityEnabled,
  onToggleOpacityEnabled,
  independentGlassControl,
  onToggleIndependentGlassControl,
  textColor1,
  onUpdateTextColor1,
  textColor2,
  onUpdateTextColor2,
  textColor3,
  onUpdateTextColor3,
  textColorEnabled,
  onToggleTextColorEnabled,
  getGlassKey,
  copyrightEnabled,
  onToggleCopyrightEnabled,
}) {
  const [activeCategory, setActiveCategory] = useState('basic')
  const [settingCategories, setSettingCategories] = useState(() => getSettingsCategories())
  const [dragCatIdx, setDragCatIdx] = useState(null)

  // 基础设置 state
  const [weatherEnabled, setWeatherEnabled] = useState(() => getWeatherEnabled())
  const [weatherAnimationEnabled, setWeatherAnimationEnabled] = useState(() => {
    return localStorage.getItem('nav-weather-animation-enabled') !== 'false'
  })
  const [siteInfoEnabled, setSiteInfoEnabled] = useState(() => {
    return localStorage.getItem('nav-site-info-enabled') !== 'false'
  })
  const [quickAccessEnabled, setQuickAccessEnabled] = useState(() => getQuickAccessEnabled())
  const [safeBoxEnabled, setSafeBoxEnabled] = useState(() => getSafeBoxEnabled())
  const [safeBoxPasswordInput, setSafeBoxPasswordInput] = useState('')
  const [safeBoxSettingUp, setSafeBoxSettingUp] = useState(false)
  const [cardHighlightEnabled, setCardHighlightEnabled] = useState(() => localStorage.getItem('nav-card-highlight-enabled') !== 'false')
  const [hlBorderColor, setHlBorderColor] = useState(() => localStorage.getItem(hlKey('border-color')) || '#007aff')
  const [hlBorderOpacity, setHlBorderOpacity] = useState(() => { const v = localStorage.getItem(hlKey('border-opacity')); return v !== null ? parseInt(v) : 50 })
  const [hlBgColor, setHlBgColor] = useState(() => localStorage.getItem(hlKey('bg-color')) || '#007aff')
  const [hlBgOpacity, setHlBgOpacity] = useState(() => { const v = localStorage.getItem(hlKey('bg-opacity')); return v !== null ? parseInt(v) : 8 })
  const [hlTitleColor, setHlTitleColor] = useState(() => localStorage.getItem(hlKey('title-color')) || '#007aff')
  const [hlTitleOpacity, setHlTitleOpacity] = useState(() => { const v = localStorage.getItem(hlKey('title-opacity')); return v !== null ? parseInt(v) : 0 })
  const [hlDescColor, setHlDescColor] = useState(() => localStorage.getItem(hlKey('desc-color')) || '#007aff')
  const [hlDescOpacity, setHlDescOpacity] = useState(() => { const v = localStorage.getItem(hlKey('desc-opacity')); return v !== null ? parseInt(v) : 0 })
  const [hlPickerTarget, setHlPickerTarget] = useState(null)
  const [searchHistoryEnabled, setSearchHistoryEnabled] = useState(() => localStorage.getItem('nav-search-history-enabled') !== 'false')
  const [tagShape, setTagShape] = useState(() => localStorage.getItem('nav-tag-shape') === 'rect' ? 'rect' : 'capsule')
  const [showTagShapeDropdown, setShowTagShapeDropdown] = useState(false)
  const tagDdRef = useRef(null)
  const tagBtnRef = useRef(null)
  const [currentCity, setCurrentCity] = useState(() => {
    const saved = getSavedCity()
    if (saved) {
      try { return JSON.parse(saved).name } catch {}
    }
    return ''
  })
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [pageTitle, setPageTitle] = useState(() => document.title)
  const [copyrightText, setCopyrightText] = useState(() => {
    return localStorage.getItem('nav-copyright-text') || '清炼导航-qinglian'
  })
  const [weatherApiUrl, setWeatherApiUrl] = useState(() => localStorage.getItem('nav-weather-api-url') || '')
  const [sunriseTime, setSunriseTime] = useState(() => localStorage.getItem('nav-sunrise-time') || '06:00')
  const [sunsetTime, setSunsetTime] = useState(() => localStorage.getItem('nav-sunset-time') || '18:00')
  const [apiInfoShow, setApiInfoShow] = useState(false)
  const apiInfoRef = useRef(null)
  const [apiSunData, setApiSunData] = useState(() => {
    try {
      const raw = localStorage.getItem('nav-weather-cache')
      if (!raw) return null
      const p = JSON.parse(raw)
      const d = p?.data
      if (d && typeof d.sunrise === 'string' && typeof d.sunset === 'string') return d
      return null
    } catch { return null }
  })
  // 弹窗打开后每 3 秒轮询天气缓存（天气数据可能在弹窗打开后才获取到）
  useEffect(() => {
    const poll = () => {
      try {
        const raw = localStorage.getItem('nav-weather-cache')
        if (!raw) { setApiSunData(null); return }
        const p = JSON.parse(raw)
        const d = p?.data
        if (d && typeof d.sunrise === 'string' && typeof d.sunset === 'string' && d.sunrise !== 'NaN:NaN') {
          setApiSunData(d)
        } else {
          setApiSunData(null)
        }
      } catch { setApiSunData(null) }
    }
    poll()
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [])
  const searchTimeoutRef = useState(null)[0]

  // 搜索引擎管理
  const [engines, setEngines] = useState(() => getEngines())
  const [showAddEngine, setShowAddEngine] = useState(false)
  const [newEngineName, setNewEngineName] = useState('')
  const [newEngineUrl, setNewEngineUrl] = useState('')
  const [editingEngineId, setEditingEngineId] = useState(null)
  const [editEngineName, setEditEngineName] = useState('')
  const [colorPickerTarget, setColorPickerTarget] = useState(null) // 'color1' | 'color2' | null
  const [colorPickerMode, setColorPickerMode] = useState(null) // 'text-primary' | 'text-secondary' | 'text-tertiary' | null
  const [tempColor, setTempColor] = useState('')
  const [colorBtnAnim, setColorBtnAnim] = useState(null) // 'color1' | 'color2' | 'text' — 按压动画目标
  const [editEngineUrl, setEditEngineUrl] = useState('')

  // 注入滑块 thumb 样式
  useEffect(() => {
    const id = 'glass-slider-thumb-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 20px; height: 20px; border-radius: 50%;
        background: #fff; border: 2px solid var(--accent-primary, #007aff);
        box-shadow: 0 2px 10px rgba(0,0,0,0.16); cursor: pointer;
        transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        margin-top: -7px;
      }
      input[type=range]::-webkit-slider-thumb:hover { box-shadow: 0 3px 14px rgba(0,0,0,0.25); }
      input[type=range]::-webkit-slider-thumb:active { transform: scale(1.1); box-shadow: 0 2px 18px rgba(0,122,255,0.35); border-color: var(--accent-primary); }
      input[type=range]::-moz-range-thumb {
        width: 20px; height: 20px; border-radius: 50%;
        background: #fff; border: 2px solid var(--accent-primary, #007aff);
        box-shadow: 0 2px 10px rgba(0,0,0,0.16); cursor: pointer;
      }
      input[type=range]::-moz-range-thumb:active { transform: scale(1.1); }
      input[type=range]::-webkit-slider-runnable-track {
        width: 100%; height: 6px; border-radius: 3px; cursor: pointer;
      }
      input[type=range]::-moz-range-track {
        width: 100%; height: 6px; border-radius: 3px; cursor: pointer; background: transparent;
      }
    `
    document.head.appendChild(el)
  }, [])
  const [dragEngineIdx, setDragEngineIdx] = useState(null)

  // 分类排序 state
  const [localCategories, setLocalCategories] = useState(() => categories || [])
  const [expandedCatId, setExpandedCatId] = useState(null)
  const [editingCatNameId, setEditingCatNameId] = useState(null)
    const [editCatNameValue, setEditCatNameValue] = useState('')
    const [dragTagCatId, setDragTagCatId] = useState(null)
  const [dragTagIdx, setDragTagIdx] = useState(null)
  const [editTagCatId, setEditTagCatId] = useState(null)
  const [editTagIdx, setEditTagIdx] = useState(null)
  const [editTagName, setEditTagName] = useState('')

  // 确认弹窗 state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCountdown, setConfirmCountdown] = useState(0)
  const confirmActionRef = useRef(null)

  // 回收站 state
  const [trash, setTrash] = useState(() => getTrash())

  // 同步外部 categories 变化
  useEffect(() => {
    setLocalCategories(categories || [])
  }, [categories])

  // 点击外部关闭形状下拉
  useEffect(() => {
    if (!showTagShapeDropdown) return
    const h = e => {
      if (tagBtnRef.current && tagBtnRef.current.contains(e.target)) return
      if (tagDdRef.current && tagDdRef.current.contains(e.target)) return
      setShowTagShapeDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showTagShapeDropdown])

  // 全局 mouseup 释放颜色按钮按压动画
  useEffect(() => {
    const u = () => setColorBtnAnim(null)
    window.addEventListener('mouseup', u)
    return () => window.removeEventListener('mouseup', u)
  }, [])

  // 城市搜索
  const handleCitySearch = (value) => {
    setCitySearch(value)
    if (searchTimeoutRef) clearTimeout(searchTimeoutRef)
    if (!value.trim()) { setCityResults([]); return }
    const timer = setTimeout(async () => {
      const results = await searchCity(value)
      setCityResults(results)
    }, 500)
    // 简单处理：用模块级变量
  }

  const handleSelectCity = (city) => {
    saveWeatherCity({ id: city.id, name: city.name, lat: city.lat, lon: city.lon })
    setCurrentCity(city.name)
    setCitySearch('')
    setCityResults([])
    window.dispatchEvent(new CustomEvent('weatherCityChanged'))
  }

  // 搜索引擎操作
  const addEngine = () => {
    if (!newEngineName.trim() || !newEngineUrl.trim()) return
    let url = newEngineUrl.trim()
    if (!url.endsWith('=')) url += url.includes('?') ? '&q=' : '?q='
    const id = 'custom_' + Date.now()
    const updated = [...engines, { id, name: newEngineName.trim(), url, color: '#6366f1' }]
    setEngines(updated)
    saveEngines(updated)
    setNewEngineName('')
    setNewEngineUrl('')
    setShowAddEngine(false)
  }

  const removeEngine = (id) => {
    const engine = engines.find(e => e.id === id)
    if (!engine) return
    openConfirm('删除搜索引擎', `确定要删除搜索引擎「${engine.name}」吗？`, () => {
      const updated = engines.filter(e => e.id !== id)
      setEngines(updated)
      saveEngines(updated)
      const currentId = localStorage.getItem('nav-current-engine')
      if (currentId === id) localStorage.setItem('nav-current-engine', updated[0]?.id || '')
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

  const startEdit = (engine) => {
    setEditingEngineId(engine.id)
    setEditEngineName(engine.name)
    setEditEngineUrl(engine.url)
  }

  const saveEdit = () => {
    if (!editEngineName.trim() || !editEngineUrl.trim()) return
    const updated = engines.map(e => e.id === editingEngineId ? { ...e, name: editEngineName.trim(), url: editEngineUrl.trim() } : e)
    setEngines(updated)
    saveEngines(updated)
    setEditingEngineId(null)
  }

  const cancelEdit = () => { setEditingEngineId(null) }

  const handleEngineDragStart = (idx) => setDragEngineIdx(idx)
  const handleEngineDragOver = (e, idx) => {
    e.preventDefault()
    if (dragEngineIdx === null || dragEngineIdx === idx) return
    const updated = [...engines]
    const [moved] = updated.splice(dragEngineIdx, 1)
    updated.splice(idx, 0, moved)
    setEngines(updated)
    setDragEngineIdx(idx)
  }
  const handleEngineDragEnd = () => { setDragEngineIdx(null); saveEngines(engines) }

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

  // 分类操作
  const handleToggleHidden = (catId) => {
    const newHidden = hiddenCategories.includes(catId)
      ? hiddenCategories.filter(id => id !== catId)
      : [...hiddenCategories, catId]
    setHiddenCategories(newHidden)
  }

  const handleDeleteCategory = (cat) => {
    openConfirm('删除分类', `确定要删除分类「${cat.name}」吗？该分类下的所有网站也将被删除。`, () => {
      const trashData = getTrash()
      trashData.deletedCategories.push({
        id: cat.id,
        name: cat.name,
        tags: cat.tags || [],
        sites: cat.sites || [],
        deletedAt: Date.now(),
      })
      saveTrash(trashData)
      setTrash(trashData)
      deleteCategory(cat.id)
      if (expandedCatId === cat.id) setExpandedCatId(null)
    })
  }

  const handleAddCategory = () => {
    const name = '新分类'
    addCategory({ name, tags: [], sites: [] })
  }

  // 设置目录拖拽排序
  const handleCatDragStart = (idx) => {
    setDragCatIdx(idx)
  }

  const handleCatDragOver = (e, idx) => {
    e.preventDefault()
    if (dragCatIdx === null || dragCatIdx === idx) return
    const updated = [...settingCategories]
    const [moved] = updated.splice(dragCatIdx, 1)
    updated.splice(idx, 0, moved)
    setSettingCategories(updated)
    setDragCatIdx(idx)
  }

  const handleCatDragEnd = () => {
    saveSettingsCategories(settingCategories)
    setDragCatIdx(null)
  }

  // 子分类(tag)操作
  const handleTagDragStart = (catId, idx) => {
    setDragTagCatId(catId)
    setDragTagIdx(idx)
  }

  const handleTagDragOver = (e, catId, idx) => {
    e.preventDefault()
    if (dragTagCatId !== catId || dragTagIdx === null || dragTagIdx === idx) return
    const cat = localCategories.find(c => c.id === catId)
    if (!cat || !cat.tags) return
    const updatedTags = [...cat.tags]
    const [moved] = updatedTags.splice(dragTagIdx, 1)
    updatedTags.splice(idx, 0, moved)
    updateCategory(catId, { tags: updatedTags })
    setDragTagIdx(idx)
  }

  const handleTagDragEnd = () => {
    setDragTagCatId(null)
    setDragTagIdx(null)
  }

  const startEditTag = (catId, idx, name) => {
    setEditTagCatId(catId)
    setEditTagIdx(idx)
    setEditTagName(name)
  }

  const saveEditTag = (catId, idx) => {
    if (!editTagName.trim()) return
    const cat = localCategories.find(c => c.id === catId)
    if (!cat || !cat.tags) return
    const oldName = cat.tags[idx]
    const updatedTags = cat.tags.map((t, i) => i === idx ? editTagName.trim() : t)
    updateCategory(catId, { tags: updatedTags })
    // 同步更新所有 sites 中对应的 tag 字段
    if (oldName && oldName !== editTagName.trim()) {
      const updatedSites = cat.sites.map(site =>
        site.tag === oldName ? { ...site, tag: editTagName.trim() } : site
      )
      updateCategory(catId, { sites: updatedSites })
    }
    setEditTagCatId(null)
    setEditTagIdx(null)
    setEditTagName('')
  }

  const cancelEditTag = () => {
    setEditTagCatId(null)
    setEditTagIdx(null)
    setEditTagName('')
  }

  const handleDeleteTag = (catId, idx) => {
    const cat = localCategories.find(c => c.id === catId)
    if (!cat || !cat.tags) return
    const tagName = cat.tags[idx]
    openConfirm('删除子分类', `确定要删除子分类「${tagName}」吗？`, () => {
      const trashData = getTrash()
      trashData.deletedTags.push({
        id: 'tag_' + Date.now() + '_' + idx,
        name: tagName,
        categoryId: catId,
        categoryName: cat.name,
        deletedAt: Date.now(),
      })
      saveTrash(trashData)
      setTrash(trashData)
      const updatedTags = cat.tags.filter((_, i) => i !== idx)
      updateCategory(catId, { tags: updatedTags })
    })
  }

  const handleAddTag = (catId) => {
    const cat = localCategories.find(c => c.id === catId)
    if (!cat) return
    const updatedTags = [...(cat.tags || []), '新子分类']
    updateCategory(catId, { tags: updatedTags })
  }

  // 回收站操作
  const handleRestoreCategory = (item) => {
    if (!item || !item.name) return
    const trashData = getTrash()
    trashData.deletedCategories = trashData.deletedCategories.filter(c => c.id !== item.id)
    saveTrash(trashData)
    setTrash(trashData)
    addCategory({ name: item.name, tags: item.tags || [], sites: item.sites || [] })
  }

  const handleRestoreTag = (item) => {
    if (!item || !item.name) return
    const trashData = getTrash()
    trashData.deletedTags = trashData.deletedTags.filter(t => t.id !== item.id)
    saveTrash(trashData)
    setTrash(trashData)
    const cat = localCategories.find(c => c.id === item.categoryId)
    if (cat) {
      const updatedTags = [...(cat.tags || []), item.name]
      updateCategory(item.categoryId, { tags: updatedTags })
    } else {
      // 原分类不存在，创建新分类
      addCategory({ name: item.categoryName || '未命名分类', tags: [item.name], sites: [] })
    }
  }

  const handlePermanentDeleteCategory = (item) => {
    openConfirm('彻底删除', `确定要彻底删除分类「${item.name}」吗？此操作不可恢复。`, () => {
      const trashData = getTrash()
      trashData.deletedCategories = trashData.deletedCategories.filter(c => c.id !== item.id)
      saveTrash(trashData)
      setTrash(trashData)
    })
  }

  const handlePermanentDeleteTag = (item) => {
    openConfirm('彻底删除', `确定要彻底删除子分类「${item.name}」吗？此操作不可恢复。`, () => {
      const trashData = getTrash()
      trashData.deletedTags = trashData.deletedTags.filter(t => t.id !== item.id)
      saveTrash(trashData)
      setTrash(trashData)
    })
  }

  // 搜索引擎回收站操作
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

  const formatTime = (ts) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /* 统一滑块内联样式 — 渐变轨道 + 圆形拇指 */
  const sliderStyle = (pct) => ({
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: `linear-gradient(to right, var(--accent-primary, #007aff) 0%, var(--accent-primary, #007aff) ${pct}, rgba(0,0,0,0.08) ${pct}, rgba(0,0,0,0.08) 100%)`,
    outline: 'none',
    cursor: 'pointer',
    margin: '4px 0',
  })

  return (
    <div className={styles.overlayWrapper}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Settings size={18} />
            <span>导航页设置</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            {settingCategories.map((cat, idx) => (
              <button
                key={cat.id}
                className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.categoryActive : ''} ${dragCatIdx === idx ? styles.dragging : ''}`}
                draggable
                onDragStart={() => handleCatDragStart(idx)}
                onDragOver={(e) => handleCatDragOver(e, idx)}
                onDragEnd={handleCatDragEnd}
                onClick={() => setActiveCategory(cat.id)}
              >
                <GripVertical size={14} className={styles.dragHandle} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {activeCategory === 'basic' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle}>功能开关</h3>

                {/* 网站状态检测 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>网站状态检测</span>
                    <button
                      className={`${styles.toggle} ${siteStatusEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => onToggleSiteStatus && onToggleSiteStatus()}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>


                {/* 快捷入口 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>快捷入口</span>
                    <button
                      className={`${styles.toggle} ${quickAccessEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => {
                        const newVal = !quickAccessEnabled
                        setQuickAccessEnabled(newVal)
                        saveQuickAccessEnabled(newVal)
                        window.dispatchEvent(new CustomEvent('quickAccessToggleChanged'))
                      }}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* 保险箱 */}
                {!safeBoxEnabled && (
                  <div className={styles.settingItem}>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>保险箱</span>
                      <button
                        className={`${styles.toggle} ${safeBoxSettingUp ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => {
                          setSafeBoxSettingUp(!safeBoxSettingUp)
                          if (safeBoxSettingUp) setSafeBoxPasswordInput('')
                        }}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>
                    {safeBoxSettingUp && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <input
                          type="password"
                          value={safeBoxPasswordInput}
                          onChange={(e) => setSafeBoxPasswordInput(e.target.value)}
                          placeholder="设置保险箱密码..."
                          className={styles.addEngineInput}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && safeBoxPasswordInput.trim()) {
                              saveSafeBoxPassword(safeBoxPasswordInput.trim())
                              setSafeBoxEnabled(true)
                              saveSafeBoxEnabled(true)
                              setSafeBoxPasswordInput('')
                              setSafeBoxSettingUp(false)
                            }
                          }}
                        />
                        {safeBoxPasswordInput.trim() && (
                          <button className={styles.addEngineConfirm} style={{ alignSelf: 'flex-end' }} onClick={() => {
                            saveSafeBoxPassword(safeBoxPasswordInput.trim())
                            setSafeBoxEnabled(true)
                            saveSafeBoxEnabled(true)
                            setSafeBoxPasswordInput('')
                            setSafeBoxSettingUp(false)
                          }}>
                            确认开启
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 搜索历史 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>搜索历史</span>
                    <button
                      className={`${styles.toggle} ${searchHistoryEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => {
                        const newVal = !searchHistoryEnabled
                        setSearchHistoryEnabled(newVal)
                        localStorage.setItem('nav-search-history-enabled', String(newVal))
                        window.dispatchEvent(new CustomEvent('searchHistoryToggleChanged'))
                      }}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* 子分类形状 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>子分类形状</span>
                    <div style={{position:'relative',flexShrink:0}}>
                      {/* ── 触发按钮 ── */}
                      <button ref={tagBtnRef}
                        onClick={()=>setShowTagShapeDropdown(v=>!v)}
                        style={{
                          height:28,padding:'0 28px 0 12px',borderRadius:16,
                          border: showTagShapeDropdown ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--glass-border)',
                          background: showTagShapeDropdown ? 'rgba(0,122,255,0.06)' : (document.documentElement.getAttribute('data-theme')==='dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)'),
                          boxShadow: showTagShapeDropdown ? '0 0 0 2.5px rgba(0,122,255,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                          color:'var(--text-primary)',fontSize:12,fontWeight:600,
                          fontFamily:'inherit',cursor:'pointer',outline:'none',
                          transition:'all .2s ease',whiteSpace:'nowrap',
                          display:'flex',alignItems:'center',gap:5,
                        }}
                        onMouseEnter={e=>{if(!showTagShapeDropdown){e.currentTarget.style.borderColor='var(--accent-primary)';e.currentTarget.style.boxShadow='0 2px 6px rgba(0,122,255,0.1)'}}}
                        onMouseLeave={e=>{if(!showTagShapeDropdown){e.currentTarget.style.borderColor='';e.currentTarget.style.boxShadow=''}}}
                      >
                        {tagShape==='capsule'?'胶囊':'矩形'}
                        <div style={{transform:`rotate(${showTagShapeDropdown?180:0}deg)`,transition:'transform .2s cubic-bezier(.34,1.2,.64,1)',display:'flex',color:'var(--text-tertiary)',opacity:.7}}>
                          <ChevronDown size={11}/>
                        </div>
                      </button>

                      {/* ── 下拉菜单 ── */}
                      {showTagShapeDropdown && createPortal(
                        <div ref={tagDdRef} style={{
                          position:'fixed',
                          top: (tagBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
                          left: (tagBtnRef.current?.getBoundingClientRect().left ?? 0) - 4,
                          width: 134,
                          background: (document.documentElement.getAttribute('data-theme')==='dark')
                            ? 'rgba(44,44,46,0.98)' : '#fff',
                          borderRadius:12,border:'1px solid var(--glass-border)',
                          boxShadow:'0 8px 28px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.03)',
                          overflow:'hidden',zIndex:99999,padding:'5px 5px',
                          display:'flex',flexDirection:'column',gap:2,
                          animation:'tagDdIn .16s cubic-bezier(.22,1,.36,1)',
                        }}>
                          <style>{`@keyframes tagDdIn{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
                          {[
                            {value:'capsule',label:'胶囊形',hint:'圆润全圆角'},
                            {value:'rect',label:'矩形',hint:'标准小圆角'},
                          ].map(o=>{
                            const active = tagShape===o.value
                            return (
                              <div key={o.value}
                                onClick={()=>{
                                  setTagShape(o.value);setShowTagShapeDropdown(false)
                                  localStorage.setItem('nav-tag-shape',o.value)
                                  window.dispatchEvent(new CustomEvent('tagShapeChanged'))
                                }}
                                style={{
                                  display:'flex',alignItems:'center',gap:10,padding:'7px 10px',
                                  borderRadius:8,cursor:'pointer',
                                  background:active?'rgba(0,122,255,0.07)':'transparent',
                                  transition:'background .12s ease',
                                }}
                                onMouseEnter={e=>{if(!active)e.currentTarget.style.background='rgba(127,127,127,0.06)'}}
                                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}
                              >
                                {/* 形状圆 */}
                                <div style={{
                                  width:18,height:18,flexShrink:0,
                                  borderRadius:o.value==='capsule'?'50%':'5px',
                                  border:active?'2px solid var(--accent-primary)':'1.5px solid var(--glass-border)',
                                  background:active?'var(--accent-primary)':'transparent',
                                  transition:'all .15s ease',
                                }}/>
                                {/* 文字 */}
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:active?600:500,color:active?'var(--accent-primary)':'var(--text-primary)',lineHeight:1.3}}>{o.label}</div>
                                  <div style={{fontSize:10,color:'var(--text-tertiary)',lineHeight:1.3}}>{o.hint}</div>
                                </div>
                                {/* 选中勾 */}
                                {active && <div style={{width:13,height:13,color:'var(--accent-primary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={13}/></div>}
                              </div>
                            )
                          })}
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>

                {/* 天气 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>天气显示{currentCity ? ` (${currentCity})` : ''}</span>
                    <button
                      className={`${styles.toggle} ${weatherEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => {
                        const newVal = !weatherEnabled
                        setWeatherEnabled(newVal)
                        saveWeatherEnabled(newVal)
                        window.dispatchEvent(new CustomEvent('weatherToggleChanged'))
                      }}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* 天气城市搜索 */}
                {weatherEnabled && (
                  <>
                  <div className={styles.settingItem}>
                    <div style={{ position: 'relative' }}>
                      <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input
                        type="text"
                        value={citySearch}
                        onChange={(e) => {
                          setCitySearch(e.target.value)
                          if (!e.target.value.trim()) { setCityResults([]); return }
                          clearTimeout(handleCitySearch._timer)
                          handleCitySearch._timer = setTimeout(async () => {
                            const results = await searchCity(e.target.value)
                            setCityResults(results)
                          }, 500)
                        }}
                        placeholder="搜索城市..."
                        className={styles.addEngineInput}
                        style={{ paddingLeft: 30 }}
                      />
                    </div>
                    {cityResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {cityResults.map(city => (
                          <button
                            key={city.id}
                            className={styles.addEngineCancel}
                            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12 }}
                            onClick={() => handleSelectCity(city)}
                          >
                            <span style={{ color: 'var(--text-primary)' }}>{city.name}</span>
                            <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 11 }}>{city.admin1} {city.country}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 天气背景动效 */}
                  <div className={styles.settingItem}>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>天气背景动效</span>
                      <button
                        className={`${styles.toggle} ${weatherAnimationEnabled ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => {
                          const newVal = !weatherAnimationEnabled
                          setWeatherAnimationEnabled(newVal)
                          localStorage.setItem('nav-weather-animation-enabled', String(newVal))
                          window.dispatchEvent(new CustomEvent('weatherAnimationToggleChanged'))
                        }}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>
                  </div>
                  </>
                  )}

                {/* 日出日落时间 */}
                <h3 className={styles.groupTitle}>日出日落时间</h3>
                <p className={styles.groupDesc}>天气 API 时间优先，未获取到则使用自定义时间</p>

                {/* API 获取的日出日落信息 */}
                <div style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:'var(--bg-secondary)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
                  borderRadius:10,border:'1.5px solid var(--glass-border)',
                  padding:'8px 14px',marginBottom:12,
                }}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>
                    ☀️ {apiSunData && apiSunData.sunrise ? apiSunData.sunrise : '--:--'}  ·  🌙 {apiSunData && apiSunData.sunset ? apiSunData.sunset : '--:--'}
                  </span>
                  <span style={{fontSize:11,color:apiSunData && apiSunData.sunrise ? 'var(--accent-primary)' : 'var(--text-tertiary)',fontWeight:500}}>
                    {apiSunData && apiSunData.sunrise ? 'API 已获取' : 'API 未获取'}
                  </span>
                </div>

                {/* 自定义时间（简洁版） */}
                <div style={{
                  display:'inline-flex',alignItems:'center',gap:10,alignSelf:'flex-start',
                  background:'var(--bg-secondary)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
                  borderRadius:10,border:'1.5px solid var(--glass-border)',
                  padding:'7px 14px',
                }}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',flexShrink:0}}>自定义</span>
                  {['日升','日落'].map((label, idx) => {
                    const val = idx===0 ? sunriseTime : sunsetTime
                    const isSunrise = idx===0
                    const lk = isSunrise ? 'nav-sunrise-time' : 'nav-sunset-time'
                    const def = isSunrise ? '06:00' : '18:00'
                    const validateAndSave = (v) => {
                      if (!/^\d{2}:\d{2}$/.test(v)) return false
                      const [h,m] = v.split(':').map(Number)
                      return h>=0 && h<=23 && m>=0 && m<=59
                    }
                    return (
                      <>
                        {!isSunrise && <span style={{color:'var(--text-tertiary)',fontSize:13}}>|</span>}
                        <span style={{fontSize:11,color:'var(--text-tertiary)',flexShrink:0}}>{label}</span>
                        <input
                          type="text"
                          value={val}
                          placeholder="HH:MM"
                          maxLength={5}
                          onChange={e => {
                            let v = e.target.value.replace(/[^0-9:]/g,'')
                            if (v.length <= 5) {
                              if (v.length === 2 && !v.includes(':') && e.target.value.length > val.length) v += ':'
                              if (isSunrise) { setSunriseTime(v) } else { setSunsetTime(v) }
                              if (validateAndSave(v)) localStorage.setItem(lk, v)
                            }
                          }}
                          onBlur={e => {
                            const v = e.target.value
                            if (!validateAndSave(v)) {
                              if (isSunrise) { setSunriseTime(def); localStorage.setItem(lk, def) }
                              else { setSunsetTime(def); localStorage.setItem(lk, def) }
                            }
                          }}
                          style={{
                            height:30,width:50,borderRadius:8,
                            border:'1.5px solid var(--glass-border)',
                            background:'var(--card-bg)',color:'var(--text-primary)',
                            fontSize:14,fontWeight:700,fontFamily:'monospace',
                            textAlign:'center',outline:'none',padding:'0 4px',
                          }}
                        />
                      </>
                    )
                  })}
                </div>

                <h3 className={styles.groupTitle}>聚光灯&按钮高亮</h3>

                {/* 鼠标聚光灯 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>鼠标聚光灯</span>
                    <button
                      className={`${styles.toggle} ${mouseSpotlight ? styles.toggleOn : styles.toggleOff}`}
                      onClick={onToggleMouseSpotlight}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {mouseSpotlight && (
                  <>
                    {/* 聚光灯大小 */}
                    <div className={styles.settingItem} style={{ paddingLeft: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>聚光灯大小</span>
                          <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600, background: 'rgba(0,122,255,0.08)', padding: '2px 10px', borderRadius: 10 }}>{spotlightSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={50} max={500} step={10}
                          value={spotlightSize}
                          onChange={e => onUpdateSpotlightSize(parseInt(e.target.value, 10))}
                          style={sliderStyle(((spotlightSize - 50) / 450 * 100) + '%')}
                        />
                      </div>
                    </div>

                    {/* 颜色透明度 */}
                    <div className={styles.settingItem} style={{ paddingLeft: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>颜色透明度</span>
                          <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600, background: 'rgba(0,122,255,0.08)', padding: '2px 10px', borderRadius: 10 }}>{spotlightOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min={0} max={100} step={5}
                          value={spotlightOpacity}
                          onChange={e => onUpdateSpotlightOpacity(parseInt(e.target.value, 10))}
                          style={sliderStyle(spotlightOpacity + '%')}
                        />
                      </div>
                    </div>

                    {/* 聚光灯颜色 —— 两端颜色按钮 + 混合滑块 */}
                    <div className={styles.settingItem} style={{ paddingLeft: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>聚光灯颜色</span>

                        {/* 颜色按钮 + 滑块 + 颜色按钮 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* 左侧颜色按钮 */}
                          <button
                            onMouseDown={() => setColorBtnAnim('color1')}
                            onClick={() => setColorPickerTarget('color1')}
                            title={spotlightColor1}
                            style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              background: spotlightColor1,
                              border: '2px solid var(--glass-border)',
                              cursor: 'pointer', padding: 0,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
                              transform: colorBtnAnim === 'color1' ? 'scale(0.85)' : 'scale(1)',
                              filter: colorBtnAnim === 'color1' ? 'brightness(0.85)' : 'none',
                              transition: 'transform .12s cubic-bezier(.34,1.56,.64,1), filter .15s ease',
                            }}
                          />
                          {/* 滑块 */}
                          <input
                            type="range"
                            min={0} max={100} step={1}
                            value={spotlightColorMix}
                            onChange={e => onUpdateSpotlightColorMix(parseInt(e.target.value, 10))}
                            style={sliderStyle(spotlightColorMix + '%')}
                          />
                          {/* 右侧颜色按钮 */}
                          <button
                            onMouseDown={() => setColorBtnAnim('color2')}
                            onClick={() => setColorPickerTarget('color2')}
                            title={spotlightColor2}
                            style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              background: spotlightColor2,
                              border: '2px solid var(--glass-border)',
                              cursor: 'pointer', padding: 0,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
                              transform: colorBtnAnim === 'color2' ? 'scale(0.85)' : 'scale(1)',
                              filter: colorBtnAnim === 'color2' ? 'brightness(0.85)' : 'none',
                              transition: 'transform .12s cubic-bezier(.34,1.56,.64,1), filter .15s ease',
                            }}
                          />
                        </div>

                        {/* 颜色十六进制值 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                          <span>{spotlightColor1}</span>
                          <span>{spotlightColorMix}%</span>
                          <span>{spotlightColor2}</span>
                        </div>
                      </div>
                    </div>

                    {/* 遮罩模式 */}
                    <div className={styles.settingItem} style={{ paddingLeft: 16 }}>
                      <div className={styles.toggleRow}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>遮罩模式（仅卡片/搜索框/按钮栏）</span>
                        <button
                          className={`${styles.toggle} ${spotlightMaskMode ? styles.toggleOn : styles.toggleOff}`}
                          onClick={onToggleSpotlightMaskMode}
                        >
                          <span className={styles.toggleThumb} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 按钮颜色高亮 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>按钮颜色高亮</span>
                    <button
                      className={`${styles.toggle} ${cardHighlightEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => {
                        const newVal = !cardHighlightEnabled
                        setCardHighlightEnabled(newVal)
                        localStorage.setItem('nav-card-highlight-enabled', String(newVal))
                        window.dispatchEvent(new CustomEvent('cardHighlightChanged'))
                      }}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {cardHighlightEnabled && (
                    <div style={{ marginTop: 10, paddingLeft: 4 }}>
                      <HlRow label="边框" color={hlBorderColor} opacity={hlBorderOpacity}
                        onColorChange={(c) => { setHlBorderColor(c); localStorage.setItem(hlKey('border-color'), c); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpacityChange={(v) => { setHlBorderOpacity(v); localStorage.setItem(hlKey('border-opacity'), String(v)); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpenPicker={() => setHlPickerTarget('border')}
                      />
                      <HlRow label="背景" color={hlBgColor} opacity={hlBgOpacity}
                        onColorChange={(c) => { setHlBgColor(c); localStorage.setItem(hlKey('bg-color'), c); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpacityChange={(v) => { setHlBgOpacity(v); localStorage.setItem(hlKey('bg-opacity'), String(v)); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpenPicker={() => setHlPickerTarget('bg')}
                      />
                      <HlRow label="标题" color={hlTitleColor} opacity={hlTitleOpacity}
                        onColorChange={(c) => { setHlTitleColor(c); localStorage.setItem(hlKey('title-color'), c); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpacityChange={(v) => { setHlTitleOpacity(v); localStorage.setItem(hlKey('title-opacity'), String(v)); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpenPicker={() => setHlPickerTarget('title')}
                      />
                      <HlRow label="副标题" color={hlDescColor} opacity={hlDescOpacity}
                        onColorChange={(c) => { setHlDescColor(c); localStorage.setItem(hlKey('desc-color'), c); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpacityChange={(v) => { setHlDescOpacity(v); localStorage.setItem(hlKey('desc-opacity'), String(v)); window.dispatchEvent(new CustomEvent('cardHighlightChanged')) }}
                        onOpenPicker={() => setHlPickerTarget('desc')}
                      />
                      {/* 预览 */}
                      <div style={{
                        marginTop: 4, height: 60, width: '66.6%', margin: '4px auto 0', borderRadius: 8, padding: '0 12px',
                        border: `1px solid color-mix(in srgb, ${hlBorderColor} ${hlBorderOpacity}%, var(--glass-border))`,
                        background: `color-mix(in srgb, ${hlBgColor} ${hlBgOpacity}%, var(--glass-bg))`,
                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: hlTitleOpacity > 0 ? `color-mix(in srgb, ${hlTitleColor} ${hlTitleOpacity}%, var(--text-primary))` : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>标题预览</div>
                        <div style={{ flex: 1, fontSize: 11, lineHeight: 1.3, color: hlDescOpacity > 0 ? `color-mix(in srgb, ${hlDescColor} ${hlDescOpacity}%, var(--text-tertiary))` : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>副标题预览</div>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className={styles.groupTitle}>玻璃效果</h3>

                {/* 模糊度控制 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>玻璃模糊度{blurEnabled ? ` (${blurLevel}%)` : ''}</span>
                    <button
                      className={`${styles.toggle} ${blurEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={onToggleBlurEnabled}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {blurEnabled && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={blurLevel}
                        onChange={e => onUpdateBlurLevel(parseInt(e.target.value, 10))}
                        style={sliderStyle(blurLevel + '%')}
                      />
                      <button onClick={() => onUpdateBlurLevel(50)} title="恢复默认" style={{
                        width: 24, height: 24, borderRadius: 6, border: '1px solid var(--glass-border)',
                        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-tertiary)', flexShrink: 0,
                      }}><RotateCcw size={12} /></button>
                    </div>
                  )}
                </div>

                {/* 不透明度控制 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>玻璃不透明度{opacityEnabled ? ` (${opacityLevel}%)` : ''}</span>
                    <button
                      className={`${styles.toggle} ${opacityEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={onToggleOpacityEnabled}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {opacityEnabled && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={opacityLevel}
                        onChange={e => onUpdateOpacityLevel(parseInt(e.target.value, 10))}
                        style={sliderStyle(opacityLevel + '%')}
                      />
                      <button onClick={() => onUpdateOpacityLevel(100)} title="恢复默认" style={{
                        width: 24, height: 24, borderRadius: 6, border: '1px solid var(--glass-border)',
                        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-tertiary)', flexShrink: 0,
                      }}><RotateCcw size={12} /></button>
                    </div>
                  )}
                </div>

                {/* 文字颜色控制 */}
                <div className={styles.settingItem}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>自定义文字颜色</span>
                    <button
                      className={`${styles.toggle} ${textColorEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={onToggleTextColorEnabled}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {textColorEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {[
                        { mode: 'text-primary', label: '文字主题', title: '页面主标题和大标题文字颜色', color: textColor1, defLight: '#1c1c1e', defDark: '#f5f5f7', onUpdate: onUpdateTextColor1 },
                        { mode: 'text-secondary', label: '文字正文', title: '正文内容文字颜色', color: textColor2, defLight: '#3a3a3c', defDark: '#a1a1a6', onUpdate: onUpdateTextColor2 },
                        { mode: 'text-tertiary', label: '文字辅助', title: '辅助文字/图标/占位符颜色', color: textColor3, defLight: '#8e8e93', defDark: '#636366', onUpdate: onUpdateTextColor3 },
                      ].map(({ mode, label, title, color, defLight, defDark, onUpdate }) => {
                        const theme = document.documentElement.getAttribute('data-theme') || 'light'
                        const defaultColor = theme === 'dark' ? defDark : defLight
                        return (
                          <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onMouseDown={() => setColorBtnAnim('text')}
                              onClick={() => { setColorPickerMode(mode); setTempColor(color) }}
                              style={{
                                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                                background: color, border: '1px solid var(--glass-border)',
                                cursor: 'pointer', padding: 0,
                                transform: colorBtnAnim === 'text' ? 'scale(0.85)' : 'scale(1)',
                                filter: colorBtnAnim === 'text' ? 'brightness(0.85)' : 'none',
                                transition: 'transform .12s cubic-bezier(.34,1.56,.64,1), filter .15s ease',
                              }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }} title={title}>{label}</span>
                            <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600, marginLeft: 'auto', fontFamily: 'monospace' }}>{color}</span>
                            <button onClick={() => onUpdate(defaultColor)} title="恢复默认" style={{
                              width: 22, height: 22, borderRadius: 5, border: '1px solid var(--glass-border)',
                              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-tertiary)', flexShrink: 0, padding: 0,
                            }}><RotateCcw size={11} /></button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 单独控制开关（仅当至少一个全局控制开启时显示） */}
                {(blurEnabled || opacityEnabled || textColorEnabled) && (
                  <div className={styles.settingItem}>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>启用窗口独立控制</span>
                      <button
                        className={`${styles.toggle} ${independentGlassControl ? styles.toggleOn : styles.toggleOff}`}
                        onClick={onToggleIndependentGlassControl}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--glass-border)', margin: '8px 0 12px' }} />

                <h3 className={styles.groupTitle} style={{display:'flex',alignItems:'center',gap:6, borderBottom:'none', paddingBottom:0, marginBottom:0}}>
                  自定义网站信息
                  <span style={{flexShrink:0}}>
                    <button
                      className={`${styles.toggle} ${siteInfoEnabled ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => {
                        const v = !siteInfoEnabled
                        setSiteInfoEnabled(v)
                        localStorage.setItem('nav-site-info-enabled', String(v))
                      }}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </span>
                </h3>

                {siteInfoEnabled && (
                  <>
                <h4 style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', margin:'12px 0 4px' }}>网站标题</h4>

                <div className={styles.settingItem}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={siteTitle}
                      onChange={(e) => onUpdateSiteTitle && onUpdateSiteTitle(e.target.value)}
                      placeholder="网站标题..."
                      className={styles.addEngineInput}
                    />
                    <input
                      type="text"
                      value={siteSubtitle}
                      onChange={(e) => onUpdateSiteSubtitle && onUpdateSiteSubtitle(e.target.value)}
                      placeholder="副标题..."
                      className={styles.addEngineInput}
                    />
                    <input
                      type="text"
                      value={pageTitle}
                      onChange={(e) => { setPageTitle(e.target.value); document.title = e.target.value }}
                      placeholder="浏览器标签页标题..."
                      className={styles.addEngineInput}
                    />
                  </div>
                </div>

                <h4 style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', margin:'12px 0 4px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  版权脚标
                  <button
                    className={`${styles.toggle} ${copyrightEnabled ? styles.toggleOn : styles.toggleOff}`}
                    onClick={onToggleCopyrightEnabled}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </h4>
                <div className={styles.settingItem}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={copyrightText}
                      onChange={(e) => {
                        setCopyrightText(e.target.value)
                        localStorage.setItem('nav-copyright-text', e.target.value)
                      }}
                      placeholder={`默认: ${siteTitle} · ${siteSubtitle}`}
                      className={styles.addEngineInput}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      留空则使用网站标题。显示的格式为：© 2024 + 此处文本
                    </span>
                  </div>
                </div>
                  </>
                )}
              </div>
            )}

            {activeCategory === 'category-sort' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle}>分类排序</h3>
                <p className={styles.groupDesc}>拖拽排序 · 点击铅笔编辑名称 · 点击箭头展开子分类</p>

                <div className={styles.engineList}>
                  {localCategories.map((cat, index) => (
                    <div key={cat.id}>
                      <div
                        className={`${styles.engineItem} ${dragCatIdx === index ? styles.engineItemDragging : ''} ${hiddenCategories.includes(cat.id) ? styles.engineItemHidden : ''}`}
                        draggable={editingCatNameId !== cat.id}
                        onDragStart={() => setDragCatIdx(index)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (dragCatIdx === null || dragCatIdx === index) return
                          const updated = [...localCategories]
                          const [moved] = updated.splice(dragCatIdx, 1)
                          updated.splice(index, 0, moved)
                          setLocalCategories(updated)
                          setDragCatIdx(index)
                        }}
                        onDragEnd={() => {
                          setDragCatIdx(null)
                          reorderCategories(localCategories)
                        }}
                      >
                        {editingCatNameId === cat.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                            <GripVertical size={14} className={styles.gripIcon} />
                            <input
                              type="text"
                              value={editCatNameValue}
                              onChange={(e) => setEditCatNameValue(e.target.value)}
                              className={styles.addEngineInput}
                              style={{ flex: 1 }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editCatNameValue.trim()) {
                                  updateCategory(cat.id, { name: editCatNameValue.trim() })
                                  setEditingCatNameId(null)
                                }
                                if (e.key === 'Escape') setEditingCatNameId(null)
                              }}
                            />
                            <button className={styles.addEngineCancel} onClick={() => setEditingCatNameId(null)}>取消</button>
                            <button className={styles.addEngineConfirm} onClick={() => {
                              if (editCatNameValue.trim()) {
                                updateCategory(cat.id, { name: editCatNameValue.trim() })
                                setEditingCatNameId(null)
                              }
                            }}>保存</button>
                          </div>
                        ) : (
                          <>
                            <div className={styles.engineItemLeft}>
                              <GripVertical size={14} className={styles.gripIcon} />
                              <span className={styles.engineItemName}>{cat.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>({(cat.sites || []).length})</span>
                            </div>
                            <div className={styles.engineItemRight}>
                              <button
                                className={styles.engineEditBtn}
                                onClick={() => { setEditingCatNameId(cat.id); setEditCatNameValue(cat.name) }}
                                title="编辑名称"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className={styles.engineEditBtn}
                                onClick={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)}
                                title="展开子分类"
                              >
                                {expandedCatId === cat.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                              <button
                                className={hiddenCategories.includes(cat.id) ? styles.engineRemoveBtn : styles.engineEditBtn}
                                onClick={() => handleToggleHidden(cat.id)}
                                title={hiddenCategories.includes(cat.id) ? '显示分类' : '隐藏分类'}
                              >
                                {hiddenCategories.includes(cat.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button
                                className={styles.engineRemoveBtn}
                                onClick={() => handleDeleteCategory(cat)}
                                title="删除分类"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 子分类编辑区域 */}
                      {expandedCatId === cat.id && (
                        <div style={{ marginLeft: 24, marginTop: 6, marginBottom: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>子分类管理</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(cat.tags || []).map((tag, tidx) => (
                              <div
                                key={`${cat.id}-tag-${tidx}`}
                                className={styles.engineItem}
                                style={{ padding: '4px 8px', borderRadius: '9999px' }}
                                draggable
                                onDragStart={() => handleTagDragStart(cat.id, tidx)}
                                onDragOver={(e) => handleTagDragOver(e, cat.id, tidx)}
                                onDragEnd={handleTagDragEnd}
                              >
                                {editTagCatId === cat.id && editTagIdx === tidx ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                                    <input
                                      type="text"
                                      value={editTagName}
                                      onChange={(e) => setEditTagName(e.target.value)}
                                      className={styles.addEngineInput}
                                      style={{ flex: 1 }}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditTag(cat.id, tidx)
                                        if (e.key === 'Escape') cancelEditTag()
                                      }}
                                    />
                                    <button className={styles.addEngineCancel} onClick={cancelEditTag}>取消</button>
                                    <button className={styles.addEngineConfirm} onClick={() => saveEditTag(cat.id, tidx)}>保存</button>
                                  </div>
                                ) : (
                                  <>
                                    <div className={styles.engineItemLeft}>
                                      <GripVertical size={12} className={styles.gripIcon} style={{ cursor: 'grab' }} />
                                      <span className={styles.engineItemName} style={{ fontSize: 12 }}>{tag}</span>
                                    </div>
                                    <div className={styles.engineItemRight}>
                                      <button
                                        className={styles.engineEditBtn}
                                        style={{ width: 22, height: 22 }}
                                        onClick={() => startEditTag(cat.id, tidx, tag)}
                                        title="编辑名称"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      <button
                                        className={styles.engineRemoveBtn}
                                        style={{ width: 22, height: 22 }}
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteTag(cat.id, tidx) }}
                                        title="删除子分类"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            className={styles.addEngineBtn}
                            style={{ marginTop: 8, padding: '8px' }}
                            onClick={() => handleAddTag(cat.id)}
                          >
                            <Plus size={12} />
                            <span style={{ fontSize: 12 }}>新增子分类</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className={styles.addEngineBtn} onClick={handleAddCategory}>
                  <Plus size={14} />
                  <span>新增分类</span>
                </button>
              </div>
            )}

            {activeCategory === 'engines' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle}>搜索引擎管理</h3>
                <p className={styles.groupDesc}>拖拽排序 · 与起始页同步</p>

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
                          <input type="text" value={editEngineName} onChange={(e) => setEditEngineName(e.target.value)} placeholder="引擎名称" className={styles.addEngineInput} />
                          <input type="text" value={editEngineUrl} onChange={(e) => setEditEngineUrl(e.target.value)} placeholder="搜索URL" className={styles.addEngineInput} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
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
                            <button className={styles.engineEditBtn} onClick={(e) => { e.stopPropagation(); startEdit(engine) }} title="编辑"><Pencil size={13} /></button>
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
                            <button className={styles.engineRemoveBtn} onClick={(e) => { e.stopPropagation(); removeEngine(engine.id) }} title="删除"><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {showAddEngine ? (
                  <div className={styles.addEngineForm}>
                    <input type="text" placeholder="引擎名称" value={newEngineName} onChange={(e) => setNewEngineName(e.target.value)} className={styles.addEngineInput} />
                    <input type="text" placeholder="搜索URL" value={newEngineUrl} onChange={(e) => setNewEngineUrl(e.target.value)} className={styles.addEngineInput} onKeyDown={(e) => e.key === 'Enter' && addEngine()} />
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

            {activeCategory === 'api' && (
              <div className={styles.settingsGroup}>
                <h3 className={styles.groupTitle} style={{display:'flex',alignItems:'center',gap:6}}>
                  天气 API
                  <span ref={apiInfoRef} style={{position:'relative',display:'inline-flex'}}
                    onMouseEnter={()=>setApiInfoShow(true)}
                    onMouseLeave={()=>setApiInfoShow(false)}
                  >
                    <Info size={14} style={{color:'var(--text-tertiary)',cursor:'help'}} />
                  </span>
                </h3>
                {/* 提示浮窗通过 Portal 渲染到 body，避免被 overflow:hidden 裁切 */}
                {apiInfoShow && createPortal(
                  (() => {
                    const r = apiInfoRef.current?.getBoundingClientRect()
                    return (
                      <div style={{
                        position:'fixed',zIndex:99999,
                        top: r ? r.bottom + 6 : 0,
                        left: r ? r.left - 120 : 0,
                        background:'var(--bg-secondary)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
                        borderRadius:10,border:'1.5px solid var(--glass-border)',
                        padding:'10px 14px',whiteSpace:'nowrap',
                        boxShadow:'0 8px 28px rgba(0,0,0,0.2)',
                        fontSize:11,color:'var(--text-secondary)',lineHeight:1.5,
                      }}>
                        示例 URL：<br/>
                        https://api.open-meteo.com/v1/forecast<br/>
                        ?latitude={'{lat}'}&longitude={'{lon}'}<br/>
                        &current=temperature_2m,weather_code<br/>
                        &daily=sunrise,sunset&timezone=auto&forecast_days=1
                      </div>
                    )
                  })(),
                  document.body
                )}
                <p className={styles.groupDesc}>输入自定义天气 API 端点 URL，模板中需含 {'{lat}'} 和 {'{lon}'} 占位符。留空则使用内置 Open-Meteo 免费 API</p>
                <div className={styles.settingItem}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={weatherApiUrl}
                      onChange={(e) => setWeatherApiUrl(e.target.value)}
                      onBlur={() => {
                        if (weatherApiUrl.trim()) {
                          localStorage.setItem('nav-weather-api-url', weatherApiUrl.trim())
                        } else {
                          localStorage.removeItem('nav-weather-api-url')
                        }
                      }}
                      placeholder="留空使用内置 Open-Meteo API"
                      className={styles.addEngineInput}
                    />
                    <button
                      onClick={() => {
                        setWeatherApiUrl('')
                        localStorage.removeItem('nav-weather-api-url')
                      }}
                      style={{
                        height: 24, padding: '0 8px', borderRadius: 6,
                        border: '1.5px solid var(--glass-border)',
                        background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                        fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                        display:'flex',alignItems:'center',gap:3,
                      }}
                    >
                      <RotateCcw size={10} />
                      重置
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'trash' && (
              <div className={styles.settingsGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 className={styles.groupTitle} style={{ margin: 0 }}>回收站</h3>
                  {((trash.deletedCategories || []).length > 0 || (trash.deletedTags || []).length > 0 || (trash.deletedEngines || []).length > 0) && (
                    <button
                      className={styles.clearTrashBtn}
                      onClick={() => openConfirm(
                        '清空回收站',
                        '确定要清空回收站吗？所有已删除的分类、子分类和搜索引擎将被彻底删除，此操作不可恢复。',
                        () => {
                          const trashData = getTrash()
                          trashData.deletedCategories = []
                          trashData.deletedTags = []
                          trashData.deletedEngines = []
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
                <p className={styles.groupDesc}>最近删除的分类和子分类</p>

                {(trash.deletedCategories || []).length === 0 && (trash.deletedTags || []).length === 0 && (trash.deletedEngines || []).length === 0 && (
                  <div className={styles.emptyState}>回收站为空</div>
                )}

                <div className={styles.engineList}>
                  {(trash.deletedCategories || []).filter(item => item && item.name).map((item) => (
                    <div key={item.id} className={styles.engineItem} style={{ cursor: 'default' }}>
                      <div className={styles.engineItemLeft}>
                        <span className={styles.engineItemName}>{item.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>分类</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{formatTime(item.deletedAt)}</span>
                      </div>
                      <div className={styles.engineItemRight}>
                        <button
                          className={styles.engineEditBtn}
                          onClick={() => handleRestoreCategory(item)}
                          title="还原"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className={styles.engineRemoveBtn}
                          onClick={() => handlePermanentDeleteCategory(item)}
                          title="彻底删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(trash.deletedTags || []).filter(item => item && item.name).map((item) => (
                    <div key={item.id} className={styles.engineItem} style={{ cursor: 'default' }}>
                      <div className={styles.engineItemLeft}>
                        <span className={styles.engineItemName}>{item.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>子分类</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>({item.categoryName})</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{formatTime(item.deletedAt)}</span>
                      </div>
                      <div className={styles.engineItemRight}>
                        <button
                          className={styles.engineEditBtn}
                          onClick={() => handleRestoreTag(item)}
                          title="还原"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className={styles.engineRemoveBtn}
                          onClick={() => handlePermanentDeleteTag(item)}
                          title="彻底删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <ConfirmDialog
          isOpen={confirmOpen}
          title={confirmTitle}
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          countdown={confirmCountdown}
        />,
        document.body
      )}

      {/* 颜色选择器弹窗 */}
      {colorPickerTarget && (
        <ColorPicker
          value={colorPickerTarget === 'color1' ? spotlightColor1 : spotlightColor2}
          onChange={colorPickerTarget === 'color1' ? onUpdateSpotlightColor1 : onUpdateSpotlightColor2}
          onClose={() => setColorPickerTarget(null)}
        />
      )}

      {/* 文字颜色选择器弹窗 */}
      {colorPickerMode && (
        <ColorPicker
          value={tempColor}
          onChange={(c) => {
            setTempColor(c)
            if (colorPickerMode === 'text-primary') onUpdateTextColor1(c)
            else if (colorPickerMode === 'text-secondary') onUpdateTextColor2(c)
            else if (colorPickerMode === 'text-tertiary') onUpdateTextColor3(c)
          }}
          onClose={() => { setColorPickerMode(null); setTempColor('') }}
        />
      )}

      {/* 卡片高亮颜色选择器弹窗 */}
      {hlPickerTarget && (
        <ColorPicker
          value={hlPickerTarget === 'border' ? hlBorderColor : hlPickerTarget === 'bg' ? hlBgColor : hlPickerTarget === 'title' ? hlTitleColor : hlDescColor}
          onChange={(c) => {
            const keyMap = { border: 'border-color', bg: 'bg-color', title: 'title-color', desc: 'desc-color' }
            const setterMap = { border: setHlBorderColor, bg: setHlBgColor, title: setHlTitleColor, desc: setHlDescColor }
            localStorage.setItem(hlKey(keyMap[hlPickerTarget]), c)
            setterMap[hlPickerTarget](c)
            window.dispatchEvent(new CustomEvent('cardHighlightChanged'))
          }}
          onClose={() => setHlPickerTarget(null)}
        />
      )}
    </div>
  )
}
