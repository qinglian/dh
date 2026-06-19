/**
 * CardRainEffect.jsx - 卡片雨滴滑落效果
 *
 * 当天气为雨天且开启时，在所有卡片上叠加雨滴滑落的视觉效果。
 * 使用 CSS 动画实现，性能开销低。
 */
import { useEffect, useRef, useState } from 'react'

export default function CardRainEffect({ enabled }) {
  const [active, setActive] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setActive(false)
      return
    }

    // 检查天气是否为雨天
    const checkWeather = () => {
      try {
        const cache = localStorage.getItem('nav-weather-cache')
        if (cache) {
          const data = JSON.parse(cache)
          const weatherData = data.data || data
          const type = weatherData.type || weatherData.code
          // 雨天类型：rain, drizzle, thunderstorm
          const isRain = ['rain', 'drizzle', 'thunderstorm'].includes(type) ||
            (weatherData.code >= 50 && weatherData.code < 70)
          setActive(isRain)
        }
      } catch (e) { /* ignore */ }
    }

    checkWeather()
    // 定期检查天气变化
    const interval = setInterval(checkWeather, 30000)
    // 监听天气更新事件
    const handler = () => checkWeather()
    window.addEventListener('weatherDataUpdated', handler)
    window.addEventListener('cardRainToggleChanged', handler)

    return () => {
      clearInterval(interval)
      window.removeEventListener('weatherDataUpdated', handler)
      window.removeEventListener('cardRainToggleChanged', handler)
    }
  }, [enabled])

  if (!active) return null

  return (
    <div ref={containerRef} className="card-rain-overlay" aria-hidden="true">
      <style>{`
        .card-rain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .card-rain-drop {
          position: absolute;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(180, 210, 255, 0.25), rgba(180, 210, 255, 0.15));
          border-radius: 0 0 1px 1px;
          animation: cardRainFall linear infinite;
          opacity: 0;
        }

        @keyframes cardRainFall {
          0% {
            transform: translateY(-20px) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(100vh) translateX(-15px);
            opacity: 0;
          }
        }
      `}</style>
      {Array.from({ length: 60 }, (_, i) => (
        <div
          key={i}
          className="card-rain-drop"
          style={{
            left: `${Math.random() * 100}%`,
            height: `${12 + Math.random() * 22}px`,
            animationDuration: `${0.6 + Math.random() * 0.8}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}
