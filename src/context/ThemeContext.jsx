/**
 * ThemeContext.jsx - 主题上下文模块
 *
 * 职责：
 * 1. 提供四种主题模式：light/dark/system/sunrise-sunset
 * 2. sunrise-sunset 模式支持天气 API 日出日落时间 / 用户自定义时间 / 默认 6:00-18:00
 * 3. 解析实际主题写入 <html> data-theme 属性
 * 4. 暴露 ThemeProvider + useTheme
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()
const THEME_MODES = ['light', 'dark', 'system', 'sunrise-sunset']

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 读取天气缓存中的 sunrise/sunset (HH:MM)，若缓存无效返回 null
 */
function getWeatherSunTimes() {
  try {
    const raw = localStorage.getItem('nav-weather-cache')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const d = parsed?.data
    if (d && d.sunrise && d.sunset) return { sunrise: d.sunrise, sunset: d.sunset }
    return null
  } catch { return null }
}

/**
 * 读取用户自定义的日出日落时间 (HH:MM)
 */
function getUserSunTimes() {
  const sr = localStorage.getItem('nav-sunrise-time')
  const ss = localStorage.getItem('nav-sunset-time')
  if (sr && ss) return { sunrise: sr, sunset: ss }
  return null
}

/**
 * 根据实际日出日落时间判断当前是否为白天
 * 优先级：天气缓存 > 用户自定义 > 默认 6:00/18:00
 */
function isDaytimeBySun() {
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes() // 当前分钟数

  // 1. 天气 API 日出日落
  const wt = getWeatherSunTimes()
  if (wt) {
    const [sh, sm] = wt.sunrise.split(':').map(Number)
    const [eh, em] = wt.sunset.split(':').map(Number)
    const srMin = sh * 60 + sm
    const ssMin = eh * 60 + em
    if (!isNaN(srMin) && !isNaN(ssMin) && srMin < ssMin) {
      return current >= srMin && current < ssMin
    }
  }

  // 2. 用户自定义
  const ut = getUserSunTimes()
  if (ut) {
    const [sh, sm] = ut.sunrise.split(':').map(Number)
    const [eh, em] = ut.sunset.split(':').map(Number)
    const srMin = sh * 60 + sm
    const ssMin = eh * 60 + em
    if (!isNaN(srMin) && !isNaN(ssMin) && srMin < ssMin) {
      return current >= srMin && current < ssMin
    }
  }

  // 3. 兜底
  const hour = now.getHours()
  return hour >= 6 && hour < 18
}

function resolveTheme(mode) {
  if (mode === 'system') return getSystemTheme()
  if (mode === 'sunrise-sunset') return isDaytimeBySun() ? 'light' : 'dark'
  return mode
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('nav-theme-mode')
    if (saved && THEME_MODES.includes(saved)) return saved
    return 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(themeMode))

  useEffect(() => {
    const resolved = resolveTheme(themeMode)
    setResolvedTheme(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
    localStorage.setItem('nav-theme-mode', themeMode)
    // 主题切换后重新应用卡片高亮颜色（深色/浅色数据隔离）
    window.dispatchEvent(new CustomEvent('cardHighlightChanged'))
  }, [themeMode])

  // system 模式监听 OS 主题变化
  useEffect(() => {
    if (themeMode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = getSystemTheme()
      setResolvedTheme(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [themeMode])

  // sunrise-sunset 模式：每分钟检查一次日出日落
  useEffect(() => {
    if (themeMode !== 'sunrise-sunset') return
    const apply = () => {
      const r = isDaytimeBySun() ? 'light' : 'dark'
      setResolvedTheme(r)
      document.documentElement.setAttribute('data-theme', r)
    }
    apply()
    const timer = setInterval(apply, 60000)
    return () => clearInterval(timer)
  }, [themeMode])

  const setTheme = useCallback((mode) => setThemeMode(mode), [])

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      const resolved = resolveTheme(prev)
      return resolved === 'light' ? 'dark' : 'light'
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, themeMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export { THEME_MODES }
