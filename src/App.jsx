/**
 * App.jsx — 清炼导航主应用组件
 *
 * 职责：
 * 1. 管理双视图切换：起始页 (start) 与 导航页 (nav)
 * 2. 管理多页面系统（每个页面有独立数据隔离）
 * 3. 管理编辑模式 + 撤销/重做历史栈（最多 50 个快照）
 * 4. 集中管理所有背景/视觉效果状态：
 *    - 动效背景（启用/效果列表/多效果叠加）
 *    - 壁纸（10 个渐变预设 + 自定义媒体上传 + URL 链接）
 *    - 鼠标聚光灯（大小/透明度/遮罩模式/双色混合）
 *    - 磨砂玻璃效果（模糊/不透明度/文字颜色/独立窗口控制）
 * 5. 管理搜索引擎列表、搜索历史、网站标题/副标题
 * 6. 通过 ThemeProvider + DataProvider 包裹子组件，传递全局上下文
 *
 * 数据流：
 * localStorage ↔ useState ↔ 子组件 props ↔ 用户交互
 * 所有背景/壁纸/特效状态均可通过 EffectPicker / WallpaperPicker 实时修改，
 * 并支持"确认/取消"快照回滚机制。
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { DataProvider, useData, DEFAULT_DATA } from './context/DataContext'
import Header from './components/Header'
import TimeWidget from './components/TimeWidget'
import SearchEnginePicker from './components/SearchEnginePicker'
import QuickAccess from './components/QuickAccess'
import CategorySection from './components/CategorySection'
import SiteCard from './components/SiteCard'
import EditModal from './components/EditModal'
import ConfirmDialog from './components/ConfirmDialog'
import WallpaperPicker from './components/WallpaperPicker'
import EffectPicker from './components/EffectPicker'
import AnimatedBackground from './components/AnimatedBackground'
import PageSidebar from './components/PageSidebar'
import MouseSpotlight from './components/MouseSpotlight'
import ContextMenu from './components/ContextMenu'
import SafeBox from './components/SafeBox'
import StartPage from './components/StartPage'
import StartPageSettings from './components/StartPageSettings'
import { getSettings } from './utils/startPageSettings'
import NavPageSettings from './components/NavPageSettings'
import { applyDefaultConfig } from './utils/defaultConfig'
import styles from './App.module.css'

// 应用首次加载时，若 localStorage 无配置，写入内置默认值
applyDefaultConfig()

// 应用卡片高亮颜色（深色/浅色模式隔离）
function applyCardHighlightColor() {
  const enabled = localStorage.getItem('nav-card-highlight-enabled') !== 'false'
  const theme = document.documentElement.getAttribute('data-theme') || 'light'
  const root = document.documentElement
  if (enabled) {
    root.classList.remove('no-card-hl')
    const k = (base) => `nav-hl-${theme}-${base}`
    const bc = localStorage.getItem(k('border-color')) || '#007aff'
    const bo = localStorage.getItem(k('border-opacity')) || '50'
    const bgc = localStorage.getItem(k('bg-color')) || '#007aff'
    const bgo = localStorage.getItem(k('bg-opacity')) || '8'
    const tc = localStorage.getItem(k('title-color')) || '#007aff'
    const to = localStorage.getItem(k('title-opacity')) || '0'
    const dc = localStorage.getItem(k('desc-color')) || '#007aff'
    const do_ = localStorage.getItem(k('desc-opacity')) || '0'
    root.style.setProperty('--card-hl-border-color', bc)
    root.style.setProperty('--card-hl-border-opacity', bo + '%')
    root.style.setProperty('--card-hl-bg-color', bgc)
    root.style.setProperty('--card-hl-bg-opacity', bgo + '%')
    root.style.setProperty('--card-hl-title-color', tc)
    root.style.setProperty('--card-hl-title-opacity', to + '%')
    root.style.setProperty('--card-hl-desc-color', dc)
    root.style.setProperty('--card-hl-desc-opacity', do_ + '%')
  } else {
    root.classList.add('no-card-hl')
    root.style.setProperty('--card-hl-border-opacity', '0%')
    root.style.setProperty('--card-hl-bg-opacity', '0%')
    root.style.setProperty('--card-hl-title-opacity', '0%')
    root.style.setProperty('--card-hl-desc-opacity', '0%')
  }
}
applyCardHighlightColor()
window.addEventListener('cardHighlightChanged', applyCardHighlightColor)

function AppContent() {
  const { data, setData, addCategory, updateCategory, deleteCategory, addSite, updateSite, deleteSite, reorderSites, reorderCategories, reorderTags } = useData()
  const { theme } = useTheme()
  const [isEditMode, setIsEditMode] = useState(false)

  // 撤销/重做历史栈（包含 data + 搜索引擎）
  const [historyStack, setHistoryStack] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [preEditSnapshot, setPreEditSnapshot] = useState(null)
  // Refs 防止 saveHistory 闭包过期（用 null 初始化，useEffect 同步实际值）
  const hsRef = useRef([])
  const hiRef = useRef(-1)
  const dataRef = useRef(null)
  const enginesRef = useRef(null)
  const pdRef = useRef(null)
  const [engineChangeTick, setEngineChangeTick] = useState(0)

  // 监听搜索引擎变化
  useEffect(() => {
    const handler = () => setEngineChangeTick(t => t + 1)
    window.addEventListener('engineChange', handler)
    return () => window.removeEventListener('engineChange', handler)
  }, [])

  // 当前视图
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('nav-current-view') || 'nav'
  })

  // 多页系统
  const [pages, setPages] = useState(() => {
    const saved = localStorage.getItem('nav-startpage-pages') || localStorage.getItem('nav-pages')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    return [
      { id: 'default', name: '首页', icon: 'Home' },
      { id: 'page-2', name: '常用', icon: 'FileText' },
    ]
  })
  const [currentPageId, setCurrentPageId] = useState(() => {
    return localStorage.getItem('nav-startpage-current-page') || localStorage.getItem('nav-current-page') || 'default'
  })

  // 页面数据
  const [pageData, setPageData] = useState(() => {
    const saved = localStorage.getItem('nav-page-data')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    // 首次部署时无 localStorage 数据，使用内置 DEFAULT_DATA 填充默认分类
    return {
      default: { categories: JSON.parse(JSON.stringify(DEFAULT_DATA.categories)) },
      'page-2': { categories: [] },
    }
  })

  // 保险箱
  const [showSafeBox, setShowSafeBox] = useState(false)

  // 侧边栏
  const [showSidebar, setShowSidebar] = useState(false)

  // 起始页设置
  const [showStartSettings, setShowStartSettings] = useState(false)

  // 起始页设置 -> sidebar compact（需在 App 层响应式追踪）
  const [sidebarCompact, setSidebarCompact] = useState(() =>
    getSettings(currentPageId).pageSidebar?.compact !== false
  )
  const handleStartSettingsChange = () => {
    setSidebarCompact(getSettings(currentPageId).pageSidebar?.compact !== false)
  }

  // 右键菜单
  const [contextMenu, setContextMenu] = useState(null)

  // 背景设置
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false)
  // 弹窗快照（打开时保存，取消时还原，确认时保持）
  const bgSnapshotRef = useRef(null)
  const wpSnapshotRef = useRef(null)

  const [animatedBg, setAnimatedBg] = useState(() => localStorage.getItem('nav-animated-bg') === 'true')
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('nav-wallpaper') || 'default')
  const [bgBlur, setBgBlur] = useState(() => {
    const v = localStorage.getItem('nav-bg-blur')
    return v ? parseInt(v, 10) : 0
  })
  const [bgOpacity, setBgOpacity] = useState(() => {
    const v = localStorage.getItem('nav-bg-opacity')
    return v ? parseInt(v, 10) : 100
  })
  const [siteStatusEnabled, setSiteStatusEnabled] = useState(() => localStorage.getItem('nav-site-status') !== 'false')

  // 聚光灯设置 - 使用 theme-prefixed keys 实现深浅模式数据分离
  const getSpotlightKey = (key) => `nav-${theme}-${key}`

  // 玻璃效果设置 - 使用 theme-prefixed keys 实现深浅模式数据隔离
  const getGlassKey = (key) => `nav-glass-${theme}-${key}`

  const [mouseSpotlight, setMouseSpotlight] = useState(() => {
    return localStorage.getItem(getSpotlightKey('mouse-spotlight')) === 'true'
  })
  const [spotlightSize, setSpotlightSize] = useState(() => {
    const saved = localStorage.getItem(getSpotlightKey('spotlight-size'))
    return saved ? parseInt(saved, 10) : 280
  })
  const [spotlightOpacity, setSpotlightOpacity] = useState(() => {
    const saved = localStorage.getItem(getSpotlightKey('spotlight-opacity'))
    return saved ? parseInt(saved, 10) : 100
  })
  const [spotlightMaskMode, setSpotlightMaskMode] = useState(() => {
    return localStorage.getItem(getSpotlightKey('spotlight-mask')) === 'true'
  })
  const [spotlightColor1, setSpotlightColor1] = useState(() => {
    return localStorage.getItem(getSpotlightKey('spotlight-color1')) || (theme === 'dark' ? '#1a1f2e' : '#ffffff')
  })
  const [spotlightColor2, setSpotlightColor2] = useState(() => {
    return localStorage.getItem(getSpotlightKey('spotlight-color2')) || (theme === 'dark' ? '#0d1117' : '#000000')
  })
  const [spotlightColorMix, setSpotlightColorMix] = useState(() => {
    const saved = localStorage.getItem(getSpotlightKey('spotlight-colorMix'))
    return saved ? parseInt(saved, 10) : 50
  })
  const [blurLevel, setBlurLevel] = useState(() => {
    const saved = localStorage.getItem(getGlassKey('blur-level'))
    return saved ? parseInt(saved, 10) : 50
  })
  const [opacityLevel, setOpacityLevel] = useState(() => {
    const saved = localStorage.getItem(getGlassKey('opacity-level'))
    return saved ? parseInt(saved, 10) : 100
  })
  const [windowOverrides, setWindowOverrides] = useState(() => {
    try { const s = localStorage.getItem(getGlassKey('window-overrides')); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [independentGlassControl, setIndependentGlassControl] = useState(() => {
    return localStorage.getItem(getGlassKey('independent-glass')) === 'true'
  })
  const [blurEnabled, setBlurEnabled] = useState(() => {
    return localStorage.getItem(getGlassKey('blur-enabled')) !== 'false'
  })
  const [opacityEnabled, setOpacityEnabled] = useState(() => {
    return localStorage.getItem(getGlassKey('opacity-enabled')) !== 'false'
  })
  const [textColor1, setTextColor1] = useState(() => {
    return localStorage.getItem(getGlassKey('text-color1')) || (theme === 'dark' ? '#f5f5f7' : '#1c1c1e')
  })
  const [textColor2, setTextColor2] = useState(() => {
    return localStorage.getItem(getGlassKey('text-color2')) || (theme === 'dark' ? '#a1a1a6' : '#3a3a3c')
  })
  const [textColor3, setTextColor3] = useState(() => {
    return localStorage.getItem(getGlassKey('text-color3')) || (theme === 'dark' ? '#636366' : '#8e8e93')
  })
  const [textColorEnabled, setTextColorEnabled] = useState(() => {
    return localStorage.getItem(getGlassKey('text-color-enabled')) === 'true'
  })

  // 版权脚标显示开关
  const [copyrightEnabled, setCopyrightEnabled] = useState(() => {
    return localStorage.getItem('nav-copyright-enabled') !== 'false'
  })

  const updateWindowOverride = useCallback((key, partial) => {
    setWindowOverrides(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...partial } }
      localStorage.setItem(getGlassKey('window-overrides'), JSON.stringify(next))
      return next
    })
  }, [theme])

  // 主题切换时重新加载聚光灯设置和玻璃效果设置
  useEffect(() => {
    setMouseSpotlight(localStorage.getItem(getSpotlightKey('mouse-spotlight')) === 'true')
    const savedSize = localStorage.getItem(getSpotlightKey('spotlight-size'))
    setSpotlightSize(savedSize ? parseInt(savedSize, 10) : 280)
    const savedOpacity = localStorage.getItem(getSpotlightKey('spotlight-opacity'))
    setSpotlightOpacity(savedOpacity ? parseInt(savedOpacity, 10) : 100)
    setSpotlightMaskMode(localStorage.getItem(getSpotlightKey('spotlight-mask')) === 'true')
    setSpotlightColor1(localStorage.getItem(getSpotlightKey('spotlight-color1')) || (theme === 'dark' ? '#1a1f2e' : '#ffffff'))
    setSpotlightColor2(localStorage.getItem(getSpotlightKey('spotlight-color2')) || (theme === 'dark' ? '#0d1117' : '#000000'))
    const savedMix = localStorage.getItem(getSpotlightKey('spotlight-colorMix'))
    setSpotlightColorMix(savedMix ? parseInt(savedMix, 10) : 50)

    // 重新加载玻璃效果设置
    const savedBlur = localStorage.getItem(getGlassKey('blur-level'))
    setBlurLevel(savedBlur ? parseInt(savedBlur, 10) : 50)
    const savedOpacityLvl = localStorage.getItem(getGlassKey('opacity-level'))
    setOpacityLevel(savedOpacityLvl ? parseInt(savedOpacityLvl, 10) : 100)
    setBlurEnabled(localStorage.getItem(getGlassKey('blur-enabled')) !== 'false')
    setOpacityEnabled(localStorage.getItem(getGlassKey('opacity-enabled')) !== 'false')
    setTextColor1(localStorage.getItem(getGlassKey('text-color1')) || (theme === 'dark' ? '#f5f5f7' : '#1c1c1e'))
    setTextColor2(localStorage.getItem(getGlassKey('text-color2')) || (theme === 'dark' ? '#a1a1a6' : '#3a3a3c'))
    setTextColor3(localStorage.getItem(getGlassKey('text-color3')) || (theme === 'dark' ? '#636366' : '#8e8e93'))
    setTextColorEnabled(localStorage.getItem(getGlassKey('text-color-enabled')) === 'true')
    try {
      const s = localStorage.getItem(getGlassKey('window-overrides'))
      setWindowOverrides(s ? JSON.parse(s) : {})
    } catch { setWindowOverrides({}) }
    setIndependentGlassControl(localStorage.getItem(getGlassKey('independent-glass')) === 'true')
  }, [theme])

  const [bgEffects, setBgEffects] = useState(() => {
    const saved = localStorage.getItem('nav-bg-effects')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    const legacy = localStorage.getItem('nav-bg-effect')
    return legacy ? [legacy] : ['particles']
  })
  const [bgMultiMode, setBgMultiMode] = useState(() => localStorage.getItem('nav-bg-multi') === 'true')

  // 编辑弹窗
  const [editModal, setEditModal] = useState(null)

  // 删除确认
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null)

  // 分类拖拽排序
  const [catDragId, setCatDragId] = useState(null)
  const [catDropTargetId, setCatDropTargetId] = useState(null)

  // 搜索引擎
  const [searchEngines, setSearchEngines] = useState(() => {
    const saved = localStorage.getItem('nav-search-engines')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    return [
      { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', color: '#008373' },
      { id: 'google', name: '谷歌', url: 'https://www.google.com/search?q=', color: '#4285f4' },
      { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', color: '#2932e1' },
      { id: 'metaso', name: '秘塔AI', url: 'https://metaso.cn/?q=', color: '#00b4d8' },
      { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', color: '#de5833' },
      { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=', color: '#fb5100' },
    ]
  })
  const [currentEngine, setCurrentEngine] = useState(() => {
    return localStorage.getItem('nav-current-engine') || 'google'
  })

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('nav-search-history')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    return []
  })
  const [searchHistoryEnabled, setSearchHistoryEnabled] = useState(() => {
    return localStorage.getItem('nav-search-history-enabled') !== 'false'
  })

  // 网站标题
  const [siteTitle, setSiteTitle] = useState(() => {
    return localStorage.getItem('nav-site-title') || '清炼导航'
  })
  const [siteSubtitle, setSiteSubtitle] = useState(() => {
    return localStorage.getItem('nav-site-subtitle') || 'qinglian'
  })

  // Ref 同步（必须放在所有 useState 之后，避免 TDZ）
  useEffect(() => { hsRef.current = historyStack }, [historyStack])
  useEffect(() => { hiRef.current = historyIndex }, [historyIndex])
  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { enginesRef.current = searchEngines }, [searchEngines])
  useEffect(() => { pdRef.current = pageData }, [pageData])

  // 保存页面数据
  useEffect(() => {
    localStorage.setItem('nav-pages', JSON.stringify(pages))
    localStorage.setItem('nav-startpage-pages', JSON.stringify(pages))
  }, [pages])

  useEffect(() => {
    localStorage.setItem('nav-current-page', currentPageId)
    localStorage.setItem('nav-startpage-current-page', currentPageId)
  }, [currentPageId])

  useEffect(() => {
    localStorage.setItem('nav-page-data', JSON.stringify(pageData))
  }, [pageData])

  useEffect(() => {
    localStorage.setItem('nav-current-view', currentView)
  }, [currentView])

  // 保存搜索引擎
  useEffect(() => {
    localStorage.setItem('nav-search-engines', JSON.stringify(searchEngines))
  }, [searchEngines])

  useEffect(() => {
    localStorage.setItem('nav-current-engine', currentEngine)
  }, [currentEngine])

  // 保存搜索历史
  useEffect(() => {
    localStorage.setItem('nav-search-history', JSON.stringify(searchHistory))
  }, [searchHistory])

  useEffect(() => {
    localStorage.setItem('nav-search-history-enabled', String(searchHistoryEnabled))
  }, [searchHistoryEnabled])

  // 保存网站标题
  useEffect(() => {
    localStorage.setItem('nav-site-title', siteTitle)
  }, [siteTitle])

  useEffect(() => {
    localStorage.setItem('nav-site-subtitle', siteSubtitle)
  }, [siteSubtitle])

  // 保存背景设置
  useEffect(() => {
    localStorage.setItem('nav-animated-bg', String(animatedBg))
  }, [animatedBg])

  useEffect(() => {
    localStorage.setItem('nav-bg-effects', JSON.stringify(bgEffects))
  }, [bgEffects])

  useEffect(() => {
    localStorage.setItem('nav-bg-multi', String(bgMultiMode))
  }, [bgMultiMode])

  useEffect(() => {
    localStorage.setItem('nav-wallpaper', wallpaper)
  }, [wallpaper])

  useEffect(() => {
    localStorage.setItem('nav-bg-blur', String(bgBlur))
  }, [bgBlur])

  useEffect(() => {
    localStorage.setItem('nav-bg-opacity', String(bgOpacity))
  }, [bgOpacity])

  // 保存站点状态检测设置
  useEffect(() => {
    localStorage.setItem('nav-site-status', String(siteStatusEnabled))
  }, [siteStatusEnabled])

  // 保存聚光灯设置（theme-prefixed）
  useEffect(() => {
    localStorage.setItem(getSpotlightKey('mouse-spotlight'), String(mouseSpotlight))
  }, [mouseSpotlight, theme])

  useEffect(() => {
    localStorage.setItem(getSpotlightKey('spotlight-size'), String(spotlightSize))
  }, [spotlightSize, theme])

  useEffect(() => {
    localStorage.setItem(getSpotlightKey('spotlight-opacity'), String(spotlightOpacity))
  }, [spotlightOpacity, theme])

  useEffect(() => {
    localStorage.setItem(getSpotlightKey('spotlight-mask'), String(spotlightMaskMode))
  }, [spotlightMaskMode, theme])

  useEffect(() => {
    localStorage.setItem(getSpotlightKey('spotlight-color1'), spotlightColor1)
  }, [spotlightColor1, theme])

  useEffect(() => {
    localStorage.setItem(getSpotlightKey('spotlight-color2'), spotlightColor2)
  }, [spotlightColor2, theme])

  // 模糊度 + 不透明度 → 仅控制容器背景，不影响内部卡片
  useEffect(() => {
    localStorage.setItem(getGlassKey('blur-level'), String(blurLevel))
    const r = document.documentElement
    if (!blurEnabled) {
      r.style.removeProperty('--glass-blur-container')
      r.style.removeProperty('--glass-blur-heavy-container')
    } else {
      r.style.setProperty('--glass-blur-container', `blur(${Math.round((blurLevel / 100) * 40)}px)`)
      r.style.setProperty('--glass-blur-heavy-container', `blur(${Math.round((blurLevel / 100) * 80)}px)`)
    }
  }, [blurLevel, blurEnabled, theme])

  useEffect(() => {
    localStorage.setItem(getGlassKey('opacity-level'), String(opacityLevel))
    const r = document.documentElement
    if (!opacityEnabled) {
      r.style.setProperty('--glass-bg-section', '')
    } else {
      // 使用 React context 中的 theme 而非 DOM 属性，避免首次渲染时 data-theme 尚未设置导致 baseAlpha 计算错误
      let baseAlpha = 0.35
      if (theme === 'dark') baseAlpha = 0.04
      else if (r.getAttribute('data-bg') === 'custom') baseAlpha = 0.30
      r.style.setProperty('--glass-bg-section', `rgba(255,255,255,${Math.min(1, (baseAlpha * opacityLevel / 100)).toFixed(3)})`)
    }
  }, [opacityLevel, opacityEnabled, theme])

  // 文字颜色启用时设置 CSS 变量
  useEffect(() => {
    const r = document.documentElement
    if (textColorEnabled) {
      r.style.setProperty('--text-primary', textColor1)
      r.style.setProperty('--text-secondary', textColor2)
      r.style.setProperty('--text-tertiary', textColor3)
    } else {
      r.style.removeProperty('--text-primary')
      r.style.removeProperty('--text-secondary')
      r.style.removeProperty('--text-tertiary')
    }
  }, [textColorEnabled, textColor1, textColor2, textColor3])

  // 保存玻璃效果开关设置
  useEffect(() => {
    localStorage.setItem(getGlassKey('blur-enabled'), String(blurEnabled))
  }, [blurEnabled, theme])

  useEffect(() => {
    localStorage.setItem(getGlassKey('opacity-enabled'), String(opacityEnabled))
  }, [opacityEnabled, theme])

  // 保存文字颜色设置
  useEffect(() => {
    localStorage.setItem(getGlassKey('text-color1'), textColor1)
  }, [textColor1, theme])

  useEffect(() => {
    localStorage.setItem(getGlassKey('text-color2'), textColor2)
  }, [textColor2, theme])

  useEffect(() => {
    localStorage.setItem(getGlassKey('text-color3'), textColor3)
  }, [textColor3, theme])

  useEffect(() => {
    localStorage.setItem(getGlassKey('text-color-enabled'), String(textColorEnabled))
  }, [textColorEnabled, theme])

  // 当前页面的分类数据
  const currentCategories = pageData[currentPageId]?.categories || []

  // 过滤分类
  const filteredCategories = currentCategories.filter(cat => {
    if (!cat) return false
    if (!cat.sites) return true
    return true
  })

  // 搜索
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query.trim() && searchHistoryEnabled) {
      setSearchHistory(prev => {
        const newHistory = [query.trim(), ...prev.filter(h => h !== query.trim())].slice(0, 20)
        return newHistory
      })
    }
  }

  // 切换单个动效
  const handleToggleEffect = (effectId) => {
    if (!bgMultiMode) {
      // 单选模式：点击直接设为唯一选中（再次点击同一项则不变，至少保留一个）
      setBgEffects(prev => {
        if (prev.length === 1 && prev[0] === effectId) return prev
        return [effectId]
      })
      return
    }
    // 多选模式：勾选/取消
    setBgEffects(prev => {
      if (prev.includes(effectId)) {
        const filtered = prev.filter(e => e !== effectId)
        return filtered.length > 0 ? filtered : prev
      }
      return [...prev, effectId]
    })
  }

  // ========== 动效/壁纸弹窗快照与还原 ==========
  const openBgPicker = () => {
    bgSnapshotRef.current = {
      animatedBg, bgEffects: [...bgEffects], bgMultiMode,
    }
    setShowBgPicker(true)
  }
  const cancelBgPicker = () => {
    if (bgSnapshotRef.current) {
      const s = bgSnapshotRef.current
      setAnimatedBg(s.animatedBg)
      setBgEffects([...s.bgEffects])
      setBgMultiMode(s.bgMultiMode)
    }
    setShowBgPicker(false)
  }
  const confirmBgPicker = () => {
    setShowBgPicker(false)
  }

  const openWallpaperPicker = () => {
    wpSnapshotRef.current = { wallpaper, bgBlur, bgOpacity }
    setShowWallpaperPicker(true)
  }
  const cancelWallpaperPicker = () => {
    if (wpSnapshotRef.current) {
      const s = wpSnapshotRef.current
      setWallpaper(s.wallpaper)
      setBgBlur(s.bgBlur)
      setBgOpacity(s.bgOpacity)
    }
    setShowWallpaperPicker(false)
  }
  const confirmWallpaperPicker = () => {
    setShowWallpaperPicker(false)
  }

  // 壁纸样式
  const WALLPAPER_PRESETS = {
    'default':   { background: 'var(--bg-primary)' },
    'gradient1': { background: 'linear-gradient(135deg, #f5a9b8 0%, #c9b1d6 50%, #a8d8ea 100%)' },
    'gradient2': { background: 'linear-gradient(135deg, #0c0032 0%, #190061 25%, #240090 50%, #3500d3 75%, #00b4d8 100%)' },
    'gradient3': { background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa502 25%, #ffd93d 50%, #6c5ce7 100%)' },
    'gradient4': { background: 'linear-gradient(135deg, #0f5e52 0%, #1d9b72 30%, #2ecc71 60%, #a8e6cf 100%)' },
    'gradient5': { background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    'gradient6': { background: 'linear-gradient(120deg, #e8d5b7 0%, #f5cc95 25%, #f7a8b8 60%, #d291bc 100%)' },
    'gradient7': { background: 'linear-gradient(160deg, #b6c6cc 0%, #8aa6b0 30%, #6b8e9b 60%, #4a7485 100%)' },
    'gradient8': { background: 'linear-gradient(120deg, #fc5c7d 0%, #6a82fb 50%, #1dd1a1 100%)' },
    'gradient9': { background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)' },
  }

  const getWallpaperStyle = () => {
    if (wallpaper === 'default') return {}
    if (WALLPAPER_PRESETS[wallpaper]) return WALLPAPER_PRESETS[wallpaper]
    // 自定义 media/url 背景 — 由 MediaBg 渲染，此处设为透明
    if (wallpaper?.startsWith('media:') || wallpaper?.startsWith('url:')) return {}
    return {}
  }

  // 统一解析 media:/url: 背景
  const getMediaInfo = () => {
    if (!wallpaper) return null
    if (wallpaper.startsWith('media:')) {
      const parts = wallpaper.split(':')   // ['media', type, ...dataUrl]
      return { type: parts[1], src: parts.slice(2).join(':') }
    }
    if (wallpaper.startsWith('url:')) {
      const i1 = wallpaper.indexOf(':', 4) // 跳过 'url:'
      if (i1 < 0) return null
      return { type: wallpaper.slice(4, i1), src: wallpaper.slice(i1 + 1) }
    }
    return null
  }

  const mediaInfo = getMediaInfo()
  const MediaBg = mediaInfo ? (
    mediaInfo.type === 'video' ? (
      <video key="bg-video" src={mediaInfo.src}
        autoPlay muted loop playsInline
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: -1, pointerEvents: 'none',
          filter: bgBlur > 0 ? `blur(${bgBlur}px)` : 'none',
          opacity: bgOpacity / 100,
        }}
      />
    ) : (
      <div key="bg-image" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
        pointerEvents: 'none',
      }}>
        <img src={mediaInfo.src} alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : 'none',
            opacity: bgOpacity / 100,
          }}
        />
      </div>
    )
  ) : null

  // 编辑模式
  const handleToggleEdit = () => {
    if (!isEditMode) {
      // 进入编辑模式，保存当前状态
      setPreEditSnapshot({
        data: JSON.parse(JSON.stringify(data)),
        searchEngines: [...searchEngines],
        pageData: JSON.parse(JSON.stringify(pageData)),
      })
      setHistoryStack([{ data: JSON.parse(JSON.stringify(data)), searchEngines: [...searchEngines], pageData: JSON.parse(JSON.stringify(pageData)) }])
      setHistoryIndex(0)
    } else {
      // 退出编辑模式
      setPreEditSnapshot(null)
      setHistoryStack([])
      setHistoryIndex(-1)
    }
    setIsEditMode(!isEditMode)
  }

  const handleCancelEdit = () => {
    if (preEditSnapshot) {
      setData(preEditSnapshot.data)
      setSearchEngines(preEditSnapshot.searchEngines)
      if (preEditSnapshot.pageData) setPageData(preEditSnapshot.pageData)
    }
    setIsEditMode(false)
    setPreEditSnapshot(null)
    setHistoryStack([])
    setHistoryIndex(-1)
  }

  // 保存历史记录（通过 ref 读取最新 state，避免闭包过期）
  const saveHistory = useCallback(() => {
    const stack = hsRef.current
    const idx = hiRef.current
    const newStack = stack.slice(0, idx + 1)
    newStack.push({
      data: JSON.parse(JSON.stringify(dataRef.current)),
      searchEngines: [...enginesRef.current],
      pageData: JSON.parse(JSON.stringify(pdRef.current)),
    })
    if (newStack.length > 50) newStack.shift()
    setHistoryStack(newStack)
    setHistoryIndex(newStack.length - 1)
  }, [])

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const snapshot = historyStack[newIndex]
      setData(snapshot.data)
      setSearchEngines(snapshot.searchEngines)
      if (snapshot.pageData) setPageData(snapshot.pageData)
      setHistoryIndex(newIndex)
    }
  }

  // 重做
  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1
      const snapshot = historyStack[newIndex]
      setData(snapshot.data)
      setSearchEngines(snapshot.searchEngines)
      if (snapshot.pageData) setPageData(snapshot.pageData)
      setHistoryIndex(newIndex)
    }
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyStack.length - 1

  // 添加站点
  const handleAddSite = (siteData) => {
    addSite(siteData)
    setTimeout(() => saveHistory(), 0)
  }

  // 更新站点
  const handleUpdateSite = (id, siteData) => {
    updateSite(id, siteData)
    setTimeout(() => saveHistory(), 0)
  }

  // 删除站点
  const handleDeleteSite = (id) => {
    deleteSite(id)
    setTimeout(() => saveHistory(), 0)
  }

  // 打开编辑弹窗 (catId: 所属分类ID, site: 站点对象, categoryTags: 分类的子标签列表)
  const handleEditSite = (catId, site, categoryTags) => {
    setEditModal({
      type: 'site',
      data: site,
      catId,
      categoryTags: categoryTags || site.tags || [],
      onSave: (formData) => {
        if (site.id) {
          handleUpdateSiteInCategory(catId, site.id, formData)
        } else {
          handleAddSiteToCategory(catId, formData)
        }
      },
    })
  }

  // 处理右键菜单
  const handleContextMenu = (e, site) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      site,
    })
  }

  // 多页操作
  const handleAddPage = (name) => {
    const id = `page-${Date.now()}`
    const newPage = { id, name, icon: 'FileText' }
    setPages(prev => [...prev, newPage])
    setPageData(prev => ({
      ...prev,
      [id]: { categories: [] },
    }))
    setCurrentPageId(id)
  }

  const handleEditPage = (pageId, updates) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, ...updates } : p))
  }

  const handleDeletePage = (pageId) => {
    setPages(prev => prev.filter(p => p.id !== pageId))
    setPageData(prev => {
      const newData = { ...prev }
      delete newData[pageId]
      return newData
    })
    if (currentPageId === pageId) {
      setCurrentPageId('default')
    }
  }

  const handleReorderPages = (newPages) => {
    setPages(newPages)
  }

  const handlePageChange = (pageId) => {
    setCurrentPageId(pageId)
    // 切页时同步读取该页的 compact 设置
    setSidebarCompact(getSettings(pageId).pageSidebar?.compact !== false)
  }

  // 保险箱
  const handleSafeBoxToggle = () => {
    setShowSafeBox(prev => !prev)
  }

  // 打开分类编辑弹窗
  const handleEditCategory = (category) => {
    setEditModal({
      type: 'category',
      data: { name: category.name, tags: category.tags || [] },
      categoryTags: category.tags || [],
      onSave: (formData) => {
        handleUpdateCategoryInPage(category.id, {
          name: formData.name,
          tags: formData.tags || [],
        })
      },
    })
  }

  // 处理添加分类到页面（含回收站恢复）
  const handleAddCategoryToPage = (categoryData) => {
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: categoryData.name || '未命名',
      tags: categoryData.tags || [],
      sites: (categoryData.sites || []).map(site => ({
        id: site.id || ('site-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
        name: site.name || '',
        url: site.url || '',
        description: site.description || '',
        tag: site.tag || '',
        iconUrl: site.iconUrl || '',
      })),
    }
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: [...(prev[currentPageId]?.categories || []), newCategory],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  const handleUpdateCategoryInPage = (catId, updates) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId ? { ...c, ...updates } : c
        ) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  const handleDeleteCategoryFromPage = (catId) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.filter(c => c.id !== catId) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  const handleReorderCategoriesInPage = (newCategories) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: newCategories,
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  // 处理站点操作（多页）
  const handleAddSiteToCategory = (catId, siteData) => {
    const newSite = {
      id: `site-${Date.now()}`,
      ...siteData,
    }
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId ? { ...c, sites: [...(c.sites || []), newSite] } : c
        ) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  const handleUpdateSiteInCategory = (catId, siteId, updates) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId
            ? { ...c, sites: c.sites?.map(s => s.id === siteId ? { ...s, ...updates } : s) || [] }
            : c
        ) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  const handleDeleteSiteFromCategory = (catId, siteId) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId
            ? { ...c, sites: c.sites?.filter(s => s.id !== siteId) || [] }
            : c
        ) || [],
      },
    }))
  }

  const handleReorderSitesInCategory = (catId, newSites) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId ? { ...c, sites: newSites } : c
        ) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  // 子标签拖拽排序
  const handleReorderTagsInCategory = (catId, newTags) => {
    setPageData(prev => ({
      ...prev,
      [currentPageId]: {
        ...prev[currentPageId],
        categories: prev[currentPageId]?.categories.map(c =>
          c.id === catId ? { ...c, tags: newTags } : c
        ) || [],
      },
    }))
    setTimeout(() => saveHistory(), 0)
  }

  // 分类拖拽排序
  const handleCatDragStart = (catId) => setCatDragId(catId)
  const handleCatDragEnter = (targetId) => setCatDropTargetId(targetId)
  const handleCatDragEnd = (lastTargetId) => {
    if (lastTargetId && lastTargetId !== catDragId) {
      const cats = [...filteredCategories]
      const fromIdx = cats.findIndex(c => c.id === catDragId)
      const toIdx = cats.findIndex(c => c.id === lastTargetId)
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = cats.splice(fromIdx, 1)
        cats.splice(toIdx, 0, moved)
        handleReorderCategoriesInPage(cats)
      }
    }
    setCatDragId(null)
    setCatDropTargetId(null)
  }

  // 回收站辅助函数
  const pushSiteToTrash = (catId, site) => {
    try {
      const cat = filteredCategories.find(c => c.id === catId)
      const trashRaw = localStorage.getItem('nav-trash')
      const trash = trashRaw ? JSON.parse(trashRaw) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [], deletedSites: [] }
      trash.deletedSites = trash.deletedSites || []
      trash.deletedSites.push({
        id: 'trash_site_' + Date.now(),
        site: { ...site },
        categoryId: catId,
        categoryName: cat?.name || '',
        deletedAt: Date.now(),
      })
      localStorage.setItem('nav-trash', JSON.stringify(trash))
    } catch(e) {}
  }

  const pushCategoryToTrash = (cat) => {
    try {
      const trashRaw = localStorage.getItem('nav-trash')
      const trash = trashRaw ? JSON.parse(trashRaw) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [], deletedSites: [] }
      trash.deletedCategories = trash.deletedCategories || []
      trash.deletedCategories.push({
        id: 'trash_cat_' + Date.now(),
        name: cat.name,
        tags: cat.tags || [],
        sites: cat.sites || [],
        deletedAt: Date.now(),
      })
      localStorage.setItem('nav-trash', JSON.stringify(trash))
    } catch(e) {}
  }

  // 隐藏分类
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    const saved = localStorage.getItem('nav-hidden-categories')
    if (saved) {
      try { return JSON.parse(saved) } catch { }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('nav-hidden-categories', JSON.stringify(hiddenCategories))
  }, [hiddenCategories])

  // 刷新页面设置状态（用于设置弹窗关闭后刷新）
  const [pageSettingsTick, setPageSettingsTick] = useState(0)

  // 视图切换
  const handleViewChange = (view) => {
    if (view === 'nav') {
      // 导航页始终使用 'default' 页面，不受起始页多页切换影响
      // 保存起始页当前页面以便切换回来时恢复
      if (currentPageId !== 'default') {
        localStorage.setItem('nav-startpage-prev-page', currentPageId)
      }
      setCurrentPageId('default')
    }
    if (view === 'start') {
      // 恢复起始页之前选择的页面
      const prev = localStorage.getItem('nav-startpage-prev-page')
      if (prev && pages.some(p => p.id === prev)) {
        setCurrentPageId(prev)
        localStorage.removeItem('nav-startpage-prev-page')
      }
      if (pages.length > 1) {
        setShowSidebar(true)
      }
    }
    setCurrentView(view)
  }

  // 起始页视图
  if (currentView === 'start') {
    return (
      <div className={styles.app} style={getWallpaperStyle()}>
        <AnimatedBackground enabled={animatedBg} theme={theme} effects={bgEffects} multiMode={bgMultiMode} />
        {MediaBg}
        <MouseSpotlight enabled={mouseSpotlight} size={spotlightSize} opacity={spotlightOpacity} maskMode={spotlightMaskMode} color1={spotlightColor1} color2={spotlightColor2} colorMix={spotlightColorMix} />
        {showSidebar && (
          <PageSidebar
            pages={pages}
            currentPageId={currentPageId}
            onPageChange={handlePageChange}
            onAddPage={handleAddPage}
            onEditPage={handleEditPage}
            onDeletePage={handleDeletePage}
            onReorderPages={handleReorderPages}
            compact={sidebarCompact}
          />
        )}
        <StartPage
          pageId={currentPageId}
          onGoToNav={() => handleViewChange('nav')}
          onSettingsChange={handleStartSettingsChange}
          onToggleSidebar={() => setShowSidebar(v => !v)}
        />
        {showStartSettings && (
          <StartPageSettings
            onClose={() => setShowStartSettings(false)}
            onSettingsChange={handleStartSettingsChange}
            pageId={currentPageId}
            pageName={pages.find(p => p.id === currentPageId)?.name}
          />
        )}
        {showBgPicker && (
          <EffectPicker
            onCancel={cancelBgPicker}
            onConfirm={confirmBgPicker}
            currentEffects={bgEffects}
            enabled={animatedBg}
            multiMode={bgMultiMode}
            onToggle={() => setAnimatedBg(!animatedBg)}
            onToggleMulti={() => setBgMultiMode(!bgMultiMode)}
            onToggleEffect={handleToggleEffect}
          />
        )}
        {showWallpaperPicker && (
          <WallpaperPicker
            onCancel={cancelWallpaperPicker}
            onConfirm={confirmWallpaperPicker}
            currentWallpaper={wallpaper}
            onSelect={(id) => setWallpaper(id)}
            onUpload={(dataUrl) => setWallpaper(dataUrl)}
            bgBlur={bgBlur}
            bgOpacity={bgOpacity}
            onSetBlur={setBgBlur}
            onSetOpacity={setBgOpacity}
          />
        )}
      </div>
    )
  }

  // 导航页视图
  return (
    <div className={styles.app} style={getWallpaperStyle()}>
      <AnimatedBackground enabled={animatedBg} theme={theme} effects={bgEffects} multiMode={bgMultiMode} />
      {MediaBg}
      <MouseSpotlight enabled={mouseSpotlight} size={spotlightSize} opacity={spotlightOpacity} maskMode={spotlightMaskMode} color1={spotlightColor1} color2={spotlightColor2} colorMix={spotlightColorMix} />

      <Header
        isEditMode={isEditMode}
        onToggleEdit={handleToggleEdit}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCancelEdit={handleCancelEdit}
        canUndo={canUndo}
        canRedo={canRedo}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onToggleBgMode={() => setAnimatedBg(!animatedBg)}
        animatedBg={animatedBg}
        onOpenEffectPicker={openBgPicker}
        onOpenWallpaperPicker={openWallpaperPicker}
        onLogoClick={() => handleViewChange('start')}
        siteStatusEnabled={siteStatusEnabled}
        onToggleSiteStatus={() => setSiteStatusEnabled(!siteStatusEnabled)}
        siteTitle={siteTitle}
        siteSubtitle={siteSubtitle}
        onUpdateSiteTitle={setSiteTitle}
        onUpdateSiteSubtitle={setSiteSubtitle}
        categories={filteredCategories}
        reorderCategories={handleReorderCategoriesInPage}
        updateCategory={handleUpdateCategoryInPage}
        deleteCategory={handleDeleteCategoryFromPage}
        addCategory={handleAddCategoryToPage}
        hiddenCategories={hiddenCategories}
        setHiddenCategories={setHiddenCategories}
        mouseSpotlight={mouseSpotlight}
        onToggleMouseSpotlight={() => {
          const newVal = !mouseSpotlight
          setMouseSpotlight(newVal)
          localStorage.setItem(getSpotlightKey('mouse-spotlight'), String(newVal))
        }}
        spotlightSize={spotlightSize}
        onUpdateSpotlightSize={(size) => {
          setSpotlightSize(size)
          localStorage.setItem(getSpotlightKey('spotlight-size'), String(size))
        }}
        spotlightOpacity={spotlightOpacity}
        onUpdateSpotlightOpacity={(opacity) => {
          setSpotlightOpacity(opacity)
          localStorage.setItem(getSpotlightKey('spotlight-opacity'), String(opacity))
        }}
        spotlightMaskMode={spotlightMaskMode}
        onToggleSpotlightMaskMode={() => {
          const newVal = !spotlightMaskMode
          setSpotlightMaskMode(newVal)
          localStorage.setItem(getSpotlightKey('spotlight-mask'), String(newVal))
        }}
        spotlightColor1={spotlightColor1}
        onUpdateSpotlightColor1={(color) => {
          setSpotlightColor1(color)
          localStorage.setItem(getSpotlightKey('spotlight-color1'), color)
        }}
        spotlightColor2={spotlightColor2}
        onUpdateSpotlightColor2={(color) => {
          setSpotlightColor2(color)
          localStorage.setItem(getSpotlightKey('spotlight-color2'), color)
        }}
        spotlightColorMix={spotlightColorMix}
        onUpdateSpotlightColorMix={(mix) => {
          setSpotlightColorMix(mix)
          localStorage.setItem(getSpotlightKey('spotlight-colorMix'), String(mix))
        }}
        blurLevel={blurLevel}
        onUpdateBlurLevel={(level) => setBlurLevel(level)}
        opacityLevel={opacityLevel}
        onUpdateOpacityLevel={(level) => setOpacityLevel(level)}
        windowOverrides={windowOverrides}
        setWindowOverrides={updateWindowOverride}
        independentGlassControl={independentGlassControl}
        onToggleIndependentGlassControl={() => {
          const v = !independentGlassControl
          setIndependentGlassControl(v)
          localStorage.setItem(getGlassKey('independent-glass'), String(v))
        }}
        blurEnabled={blurEnabled}
        onToggleBlurEnabled={() => {
          const v = !blurEnabled
          setBlurEnabled(v)
          localStorage.setItem(getGlassKey('blur-enabled'), String(v))
        }}
        opacityEnabled={opacityEnabled}
        onToggleOpacityEnabled={() => {
          const v = !opacityEnabled
          setOpacityEnabled(v)
          localStorage.setItem(getGlassKey('opacity-enabled'), String(v))
        }}
        textColor1={textColor1}
        onUpdateTextColor1={(color) => {
          setTextColor1(color)
          localStorage.setItem(getGlassKey('text-color1'), color)
        }}
        textColor2={textColor2}
        onUpdateTextColor2={(color) => {
          setTextColor2(color)
          localStorage.setItem(getGlassKey('text-color2'), color)
        }}
        textColor3={textColor3}
        onUpdateTextColor3={(color) => {
          setTextColor3(color)
          localStorage.setItem(getGlassKey('text-color3'), color)
        }}
        textColorEnabled={textColorEnabled}
        onToggleTextColorEnabled={() => {
          const v = !textColorEnabled
          setTextColorEnabled(v)
          localStorage.setItem(getGlassKey('text-color-enabled'), String(v))
        }}
        getGlassKey={getGlassKey}
        copyrightEnabled={copyrightEnabled}
        onToggleCopyrightEnabled={() => {
          const v = !copyrightEnabled
          setCopyrightEnabled(v)
          localStorage.setItem('nav-copyright-enabled', String(v))
        }}
      />

      {showBgPicker && (
        <EffectPicker
          onCancel={cancelBgPicker}
          onConfirm={confirmBgPicker}
          currentEffects={bgEffects}
          enabled={animatedBg}
          multiMode={bgMultiMode}
          onToggle={() => setAnimatedBg(!animatedBg)}
          onToggleMulti={() => setBgMultiMode(!bgMultiMode)}
          onToggleEffect={handleToggleEffect}
        />
      )}

      {showWallpaperPicker && (
        <WallpaperPicker
          onCancel={cancelWallpaperPicker}
          onConfirm={confirmWallpaperPicker}
          currentWallpaper={wallpaper}
          onSelect={(id) => setWallpaper(id)}
          onUpload={(dataUrl) => setWallpaper(dataUrl)}
          bgBlur={bgBlur}
          bgOpacity={bgOpacity}
          onSetBlur={setBgBlur}
          onSetOpacity={setBgOpacity}
        />
      )}

      <main className={styles.main}>
        <div className={styles.content}>
          <TimeWidget
            isEditMode={isEditMode}
            independentGlassControl={independentGlassControl}
            blurLevel={blurLevel}
            opacityLevel={opacityLevel}
            windowOverride={windowOverrides['timeWidget']}
            updateWindowOverride={(p) => updateWindowOverride('timeWidget', p)}
            blurEnabled={blurEnabled}
            onToggleBlurEnabled={() => setBlurEnabled(v => !v)}
            opacityEnabled={opacityEnabled}
            onToggleOpacityEnabled={() => setOpacityEnabled(v => !v)}
            textColor1={textColor1}
            textColor2={textColor2}
            textColor3={textColor3}
            onUpdateTextColor1={setTextColor1}
            onUpdateTextColor2={setTextColor2}
            onUpdateTextColor3={setTextColor3}
            textColorEnabled={textColorEnabled}
            onToggleTextColorEnabled={() => setTextColorEnabled(v => !v)}
            getGlassKey={getGlassKey}
          />

          <SearchEnginePicker
            isEditMode={isEditMode}
            independentGlassControl={independentGlassControl}
            engines={searchEngines}
            currentEngine={currentEngine}
            onChangeEngine={setCurrentEngine}
            onSearch={handleSearch}
            searchHistory={searchHistory}
            onClearHistory={() => setSearchHistory([])}
            searchHistoryEnabled={searchHistoryEnabled}
            blurLevel={blurLevel}
            opacityLevel={opacityLevel}
            windowOverride={windowOverrides['searchEngine']}
            updateWindowOverride={(p) => updateWindowOverride('searchEngine', p)}
            blurEnabled={blurEnabled}
            onToggleBlurEnabled={() => setBlurEnabled(v => !v)}
            opacityEnabled={opacityEnabled}
            onToggleOpacityEnabled={() => setOpacityEnabled(v => !v)}
            textColor1={textColor1}
            textColor2={textColor2}
            textColor3={textColor3}
            onUpdateTextColor1={setTextColor1}
            onUpdateTextColor2={setTextColor2}
            onUpdateTextColor3={setTextColor3}
            textColorEnabled={textColorEnabled}
            onToggleTextColorEnabled={() => setTextColorEnabled(v => !v)}
            getGlassKey={getGlassKey}
          />

          <QuickAccess
            isEditMode={isEditMode}
            independentGlassControl={independentGlassControl}
            allCategories={filteredCategories}
            onSiteContextMenu={handleContextMenu}
            hiddenCategories={hiddenCategories}
            reorderCategories={handleReorderCategoriesInPage}
            onToggleCategory={(catId) => {
              setHiddenCategories(prev =>
                prev.includes(catId)
                  ? prev.filter(id => id !== catId)
                  : [...prev, catId]
              )
            }}
            blurLevel={blurLevel}
            opacityLevel={opacityLevel}
            windowOverride={windowOverrides['quickAccess']}
            updateWindowOverride={(p) => updateWindowOverride('quickAccess', p)}
            blurEnabled={blurEnabled}
            onToggleBlurEnabled={() => setBlurEnabled(v => !v)}
            opacityEnabled={opacityEnabled}
            onToggleOpacityEnabled={() => setOpacityEnabled(v => !v)}
            textColor1={textColor1}
            textColor2={textColor2}
            textColor3={textColor3}
            onUpdateTextColor1={setTextColor1}
            onUpdateTextColor2={setTextColor2}
            onUpdateTextColor3={setTextColor3}
            textColorEnabled={textColorEnabled}
            onToggleTextColorEnabled={() => setTextColorEnabled(v => !v)}
            getGlassKey={getGlassKey}
          />

          {filteredCategories.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              categoryIndex={index}
              isEditMode={isEditMode}
              onEditSite={(catId, site) => handleEditSite(catId, site, category.tags || [])}
              onDeleteSite={(catId, siteId) => setConfirmDelete({ catId: category.id, siteId })}
              onAddSite={(catId) => handleEditSite(catId, { categoryId: catId }, category.tags || [])}
              onEditCategory={(categoryData) => handleEditCategory(categoryData)}
              onDeleteCategory={(catId) => setConfirmDeleteCategory(catId)}
              onReorderTags={(catId, newTags) => handleReorderTagsInCategory(catId, newTags)}
              onReorderSites={(catId, sites) => handleReorderSitesInCategory(catId, sites)}
              onToggleCategoryVisibility={(catId) => {
                setHiddenCategories(prev =>
                  prev.includes(catId)
                    ? prev.filter(id => id !== catId)
                    : [...prev, catId]
                )
              }}
              isHidden={hiddenCategories.includes(category.id)}
              allCategories={filteredCategories}
              catDragId={catDragId}
              catDropTargetId={catDropTargetId}
              onCatDragStart={handleCatDragStart}
              onCatDragEnter={handleCatDragEnter}
              onCatDragEnd={handleCatDragEnd}
              onReorderCategories={handleReorderCategoriesInPage}
              onContextMenu={handleContextMenu}
              onSiteContextMenu={handleContextMenu}
              searchQuery={searchQuery}
              independentGlassControl={independentGlassControl}
              blurLevel={blurLevel}
              opacityLevel={opacityLevel}
              windowOverride={windowOverrides[`category-${category.id}`]}
              updateWindowOverride={(p) => updateWindowOverride(`category-${category.id}`, p)}
              blurEnabled={blurEnabled}
              onToggleBlurEnabled={() => setBlurEnabled(v => !v)}
              opacityEnabled={opacityEnabled}
              onToggleOpacityEnabled={() => setOpacityEnabled(v => !v)}
              textColor1={textColor1}
              textColor2={textColor2}
              textColor3={textColor3}
              onUpdateTextColor1={setTextColor1}
            onUpdateTextColor2={setTextColor2}
            onUpdateTextColor3={setTextColor3}
            textColorEnabled={textColorEnabled}
            onToggleTextColorEnabled={() => setTextColorEnabled(v => !v)}
            getGlassKey={getGlassKey}
            siteStatusEnabled={siteStatusEnabled}
              hiddenCategories={hiddenCategories}
              onToggleCategory={(catId) => {
                setHiddenCategories(prev =>
                  prev.includes(catId)
                    ? prev.filter(id => id !== catId)
                    : [...prev, catId]
                )
              }}
            />
          ))}

          {isEditMode && (
            <AddCategoryBlock onAdd={(data) => handleAddCategoryToPage(data)} />
          )}

        </div>
      </main>

      {/* 版权脚标 */}
      {copyrightEnabled && (
        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} {localStorage.getItem('nav-copyright-text') || `${siteTitle}-qinglian`}</p>
        </footer>
      )}

      {/* 回到顶部按钮 */}
      <BackToTop />

      {editModal && (
        <EditModal
          isOpen={true}
          mode={editModal.type}
          data={editModal.data}
          categoryTags={editModal.categoryTags || []}
          onSave={(formData) => {
            editModal.onSave(formData)
          }}
          onClose={() => setEditModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="删除确认"
          message="确定要删除这个网站吗？此操作将放入回收站，可在设置中恢复。"
          onConfirm={() => {
            const cat = filteredCategories.find(c => c.id === confirmDelete.catId)
            const site = cat?.sites?.find(s => s.id === confirmDelete.siteId)
            if (site) pushSiteToTrash(confirmDelete.catId, site)
            handleDeleteSiteFromCategory(confirmDelete.catId, confirmDelete.siteId)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDeleteCategory && (
        <ConfirmDialog
          isOpen={true}
          title="删除分类"
          message="确定要删除这个分类及其所有网站吗？此操作将放入回收站，可在设置中恢复。"
          onConfirm={() => {
            const cat = filteredCategories.find(c => c.id === confirmDeleteCategory)
            if (cat) pushCategoryToTrash(cat)
            handleDeleteCategoryFromPage(confirmDeleteCategory)
            setConfirmDeleteCategory(null)
          }}
          onCancel={() => setConfirmDeleteCategory(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          site={contextMenu.site}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            const cat = filteredCategories.find(c => c.sites?.some(s => s.id === contextMenu.site.id))
            handleEditSite(cat?.id || '', contextMenu.site, cat?.tags || [])
            setContextMenu(null)
          }}
          onDelete={() => {
            const cat = filteredCategories.find(c => c.sites?.some(s => s.id === contextMenu.site.id))
            if (cat) {
              setConfirmDelete({ catId: cat.id, siteId: contextMenu.site.id })
            }
            setContextMenu(null)
          }}
        />
      )}

      {showSafeBox && (
        <SafeBox onClose={() => setShowSafeBox(false)} />
      )}
    </div>
  )
}

/* ============================================================
   新建分类 — 内联对话框组件
   ============================================================ */
function AddCategoryBlock({ onAdd }) {
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus()
    }
  }, [show])

  const handleAdd = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onAdd({ name: trimmed, tags: [], sites: [] })
      setName('')
      setShow(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setName(''); setShow(false) }
  }

  if (!show) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
        <button onClick={() => setShow(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 14,
          border: '2px dashed var(--glass-border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)'
          e.currentTarget.style.color = 'var(--accent-primary)'
          e.currentTarget.style.background = 'var(--accent-primary-bg, rgba(0,122,255,0.06))'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--glass-border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.background = 'var(--glass-bg)'
        }}
        >+ 新建分类</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 14,
        background: 'var(--card-bg, rgba(255,255,255,0.95))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '2px solid var(--accent-primary)',
        boxShadow: '0 2px 16px rgba(0,122,255,0.12)',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 16, lineHeight: 1 }}>+</span>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入分类名称..."
          style={{
            width: 180, height: 36, border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 14, color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        />
        <button onClick={handleAdd} style={{
          height: 34, padding: '0 16px', borderRadius: 10, border: 'none',
          background: 'var(--accent-primary)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}>创建</button>
        <button onClick={() => { setName(''); setShow(false) }} style={{
          width: 30, height: 30, borderRadius: 8, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-tertiary)',
        }}>✕</button>
      </div>
    </div>
  )
}

/* ============================================================
   回到顶部 — 圆形悬浮按钮
   ============================================================ */
function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      className={styles.backToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="回到顶部"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  )
}
