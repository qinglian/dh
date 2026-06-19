/**
 * CardRainEffect.jsx - 卡片雨滴滑落效果
 *
 * 当天气为雨天且开启时，在页面上叠加雨滴滑落的视觉效果。
 * 独立于动效背景开关，只依赖自身的开关和天气类型。
 */
import { useEffect, useState, useMemo } from 'react'

function getWeatherType() {
  try {
    const cache = localStorage.getItem('nav-weather-cache')
    if (!cache) return null
    const parsed = JSON.parse(cache)
    const weatherData = parsed.data || parsed
    return weatherData.type || null
  } catch (e) {
    return null
  }
}

function isCardRainEnabled() {
  return localStorage.getItem('nav-card-rain-enabled') !== 'false'
}

const RAIN_TYPES = ['rain', 'drizzle', 'thunderstorm']

export default function CardRainEffect() {
  const [enabled, setEnabled] = useState(isCardRainEnabled)
  const [weatherType, setWeatherType] = useState(getWeatherType)

  useEffect(() => {
    const onToggle = () => setEnabled(isCardRainEnabled())
    const onWeather = () => setWeatherType(getWeatherType())
    window.addEventListener('cardRainToggleChanged', onToggle)
    window.addEventListener('weatherDataUpdated', onWeather)
    // 定期刷新天气
    const timer = setInterval(onWeather, 60000)
    return () => {
      window.removeEventListener('cardRainToggleChanged', onToggle)
      window.removeEventListener('weatherDataUpdated', onWeather)
      clearInterval(timer)
    }
  }, [])

  const active = enabled && weatherType && RAIN_TYPES.includes(weatherType)

  // 生成雨滴数据（memo 避免重渲染时重新随机）
  const drops = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      height: 14 + Math.random() * 24,
      duration: 0.5 + Math.random() * 0.7,
      delay: Math.random() * 3,
      opacity: 0.15 + Math.random() * 0.2,
      width: 0.8 + Math.random() * 0.5,
    })),
  [])

  if (!active) return null

  return (
    <div className="card-rain-overlay" aria-hidden="true">
      <style>{`
        .card-rain-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          z-index: 100;
          overflow: hidden;
        }
        .card-rain-drop {
          position: absolute;
          top: -30px;
          background: linear-gradient(to bottom, transparent 0%, rgba(170,200,255,0.4) 40%, rgba(170,200,255,0.15) 100%);
          border-radius: 0 0 1px 1px;
          animation: cardRainFall linear infinite;
        }
        @keyframes cardRainFall {
          0%   { transform: translateY(0); opacity: 0; }
          3%   { opacity: var(--drop-opacity, 0.2); }
          90%  { opacity: calc(var(--drop-opacity, 0.2) * 0.7); }
          100% { transform: translateY(calc(100vh + 30px)); opacity: 0; }
        }
      `}</style>
      {drops.map(d => (
        <div
          key={d.id}
          className="card-rain-drop"
          style={{
            left: `${d.left}%`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            '--drop-opacity': d.opacity,
          }}
        />
      ))}
    </div>
  )
}
