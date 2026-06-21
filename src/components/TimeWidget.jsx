/*
 * TimeWidget - 时间与天气小组件
 * 功能：显示实时数字时钟、问候语、日期和天气信息。内置基于 Canvas 的写实天气动画效果（雨/雪/雾/多云/晴天/阴天）。
 *       支持天气数据缓存（30分钟有效），通过 open-meteo 和 wttr.in 双 API 获取天气，失败时使用模拟数据。
 *       编辑模式 + 独立窗口控制下支持独立的毛玻璃效果调节。
 *       包含子组件：WeatherEffect（Canvas 天气动画）、DigitalClock（翻页数字时钟）。
 * Props：
 *   isEditMode               {boolean}         是否处于编辑模式
 *   independentGlassControl  {boolean}         是否启用独立窗口毛玻璃控制
 *   blurLevel                {number}          全局毛玻璃模糊级别
 *   opacityLevel             {number}          全局毛玻璃不透明度级别
 *   windowOverride           {object}          本窗口独立覆盖样式 { blurEnabled, blur, opacityEnabled, opacity, textEnabled, textColor1/2/3 }
 *   updateWindowOverride     {function}        更新本窗口覆盖样式的回调
 *   textColor1/2/3           {string}          全局默认文字颜色1/2/3
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Calendar, MapPin, Sliders } from 'lucide-react'
import styles from './TimeWidget.module.css'
import GlassControls from './GlassControls'
import { fetchWeather as fetchWeatherFromUtil } from '../utils/weather'

// ==================== 写实天气动画 Canvas 组件 ====================
/*
 * WeatherEffect - Canvas 天气动画效果
 * 根据天气类型（rain/snow/fog/cloudy/overcast/sunny）和白天/夜间参数，
 * 在 Canvas 上绘制写实的天气粒子动画。
 * Props：
 *   type   {string}  天气类型：'rain' | 'snow' | 'fog' | 'cloudy' | 'overcast' | 'sunny'
 *   isDay  {boolean} 是否为白天
 */
function WeatherEffect({ type, isDay = true }) {
  /* Canvas DOM 引用 */
  const canvasRef = useRef(null)
  /* requestAnimationFrame ID，用于取消动画 */
  const animRef = useRef(null)
  /* 动画状态引用（粒子、云朵、闪电等），使用 ref 避免高频渲染时 state 更新带来的性能问题 */
  const stateRef = useRef({ particles: [], clouds: [], lightning: 0, lightningTimer: 0, nextLightningAt: 480 + Math.random() * 1020, lightningStyle: 'main', time: 0, splashParticles: [] })

  /* 初始化 Canvas 和动画循环，天气类型变更时重新初始化 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.parentElement.getBoundingClientRect()
    /* 按设备像素比设置 canvas 尺寸，确保高清显示 */
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height
    const state = stateRef.current
    state.time = 0

    /* ===== 粒子创建工厂函数 ===== */

    /* 创建雨滴粒子：带风偏、渐变尾部 */
    const createRaindrop = (randomY = false) => ({
      x: Math.random() * w * 1.3 - w * 0.15,
      y: randomY ? Math.random() * h : -30,
      speed: 8 + Math.random() * 12,
      length: 12 + Math.random() * 22,
      opacity: 0.15 + Math.random() * 0.25,
      wind: -1 + Math.random() * 0.5,
      width: 0.6 + Math.random() * 1.4,
    })

    /* 创建雨滴溅落粒子 */
    const createSplashParticle = (x, y) => ({
      x, y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -(1.5 + Math.random() * 3),
      life: 1,
      decay: 0.03 + Math.random() * 0.07,
      size: 0.8 + Math.random() * 1.5,
    })

    /* 创建雪花粒子：带摇摆幅度、旋转和形状类型（六边形/圆形） */
    const createSnowflake = (randomY = false) => ({
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -10,
      speed: 0.3 + Math.random() * 1.2,
      radius: 1 + Math.random() * 3.5,
      opacity: 0.3 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.015 + Math.random() * 0.025,
      wobbleAmp: 0.5 + Math.random() * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      type: Math.random() > 0.6 ? 'hex' : 'circle',
    })

    /* 创建雾气团：水平飘动，带相位偏移产生波动效果 */
    const createFogBlob = (randomX = false) => ({
      x: randomX ? Math.random() * w : -200,
      y: Math.random() * h * 0.6 + h * 0.2,
      speed: 0.15 + Math.random() * 0.4,
      width: 120 + Math.random() * 200,
      height: 30 + Math.random() * 60,
      opacity: 0.03 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
    })

    /* 创建云朵：多层 puff（云团）组成，带缩放和透明度 */
    const createCloud = (randomX = false) => ({
      x: randomX ? Math.random() * w : -250,
      y: 10 + Math.random() * h * 0.35,
      speed: 0.08 + Math.random() * 0.25,
      scale: 0.5 + Math.random() * 1.2,
      opacity: 0.15 + Math.random() * 0.25,
      puffs: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
        dx: (Math.random() - 0.5) * 80,
        dy: (Math.random() - 0.5) * 30,
        r: 25 + Math.random() * 35,
      })),
    })

    /* 创建太阳射线：从太阳位置向外辐射的光线 */
    const createSunRay = () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.002,
      length: 0.3 + Math.random() * 0.5,
      opacity: 0.03 + Math.random() * 0.06,
      width: 1 + Math.random() * 3,
    })

    /* 根据天气类型初始化粒子/云朵数组 */
    const init = () => {
      state.particles = []
      state.clouds = []
      state.splashParticles = []
      switch (type) {
        case 'rain':
          for (let i = 0; i < 160; i++) state.particles.push(createRaindrop(true))
          break
        case 'snow':
          for (let i = 0; i < 60; i++) state.particles.push(createSnowflake(true))
          break
        case 'fog':
          for (let i = 0; i < 20; i++) state.particles.push(createFogBlob(true))
          break
        case 'cloudy':
        case 'overcast':
          for (let i = 0; i < 8; i++) state.clouds.push(createCloud(true))
          break
        case 'sunny':
          for (let i = 0; i < 5; i++) state.clouds.push(createCloud(true))
          for (let i = 0; i < 12; i++) state.particles.push(createSunRay())
          break
      }
    }

    /* 绘制六边形雪花（带旋转角度） */
    const drawHexagon = (x, y, r, rotation) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = rotation + (i * Math.PI) / 3
        const px = x + Math.cos(a) * r
        const py = y + Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    }

    /*
     * 绘制云朵 - 多层立体效果
     * 每层 puff 包含：阴影层、主体层、高光层（仅晴天/多云）
     */
    const drawCloud = (cloud) => {
      ctx.save()
      const isOvercast = type === 'overcast'
      const cx = cloud.x
      const cy = cloud.y
      const s = cloud.scale

      cloud.puffs.forEach((puff) => {
        const px = cx + puff.dx * s
        const py = cy + puff.dy * s
        const pr = puff.r * s

        // 阴影层（底部）
        ctx.globalAlpha = cloud.opacity * 0.5
        const shadowGrad = ctx.createRadialGradient(px, py + 6, 0, px, py + 6, pr * 1.2)
        if (isOvercast) {
          shadowGrad.addColorStop(0, 'rgba(90,95,105,0.3)')
          shadowGrad.addColorStop(1, 'rgba(90,95,105,0)')
        } else {
          shadowGrad.addColorStop(0, 'rgba(180,180,180,0.18)')
          shadowGrad.addColorStop(1, 'rgba(180,180,180,0)')
        }
        ctx.fillStyle = shadowGrad
        ctx.beginPath()
        ctx.arc(px, py + 6, pr * 1.2, 0, Math.PI * 2)
        ctx.fill()

        // 主体层
        ctx.globalAlpha = cloud.opacity
        const mainGrad = ctx.createRadialGradient(px, py - 2, 0, px, py - 2, pr)
        if (isOvercast) {
          mainGrad.addColorStop(0, 'rgba(160,165,175,0.5)')
          mainGrad.addColorStop(0.5, 'rgba(140,145,155,0.28)')
          mainGrad.addColorStop(1, 'rgba(120,125,135,0)')
        } else {
          mainGrad.addColorStop(0, 'rgba(255,255,255,0.6)')
          mainGrad.addColorStop(0.5, 'rgba(255,255,255,0.32)')
          mainGrad.addColorStop(1, 'rgba(255,255,255,0)')
        }
        ctx.fillStyle = mainGrad
        ctx.beginPath()
        ctx.arc(px, py - 2, pr, 0, Math.PI * 2)
        ctx.fill()

        // 高光层（仅晴天/多云有，阴天跳过）
        if (!isOvercast) {
          ctx.globalAlpha = cloud.opacity * 0.45
          const highlightGrad = ctx.createRadialGradient(px - 10, py - 10, 0, px - 10, py - 10, pr * 0.5)
          highlightGrad.addColorStop(0, 'rgba(255,255,255,0.3)')
          highlightGrad.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = highlightGrad
          ctx.beginPath()
          ctx.arc(px - 8, py - 8, pr * 0.55, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      ctx.restore()
    }

    /* 绘制雨滴溅起效果：3条短线呈扇形散开 */
    const drawSplash = (x, y) => {
      ctx.save()
      ctx.globalAlpha = 0.15
      ctx.strokeStyle = 'rgba(180,200,230,0.4)'
      ctx.lineWidth = 0.8
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2
        const len = 3 + Math.random() * 5
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
        ctx.stroke()
      }
      ctx.restore()
    }

    /* 生成锯齿闪电路径（递归中点位移） */
    const generateBoltPath = (x1, y1, x2, y2, depth, maxDepth) => {
      if (depth >= maxDepth) return [{ x: x1, y: y1 }, { x: x2, y: y2 }]
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * (y2 - y1) * 0.35
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * Math.abs(x2 - x1) * 0.1
      const left = generateBoltPath(x1, y1, mx, my, depth + 1, maxDepth)
      const right = generateBoltPath(mx, my, x2, y2, depth + 1, maxDepth)
      return [...left, ...right.slice(1)]
    }

    /* 绘制闪电路径（多层辉光） */
    const drawBoltPath = (pts, alpha, baseWidth) => {
      if (pts.length < 2) return
      ctx.globalAlpha = alpha * 0.3
      ctx.strokeStyle = 'rgba(100,140,255,0.8)'
      ctx.lineWidth = baseWidth * 3.5
      ctx.shadowColor = 'rgba(80,120,255,0.5)'
      ctx.shadowBlur = 20
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.6
      ctx.strokeStyle = 'rgba(200,220,255,0.9)'
      ctx.lineWidth = baseWidth * 1.8
      ctx.shadowBlur = 10
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.95
      ctx.strokeStyle = 'rgba(255,255,255,1)'
      ctx.lineWidth = baseWidth
      ctx.shadowBlur = 5
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
    }

    /* 绘制闪电效果：多样化 - 单根锯齿/双叉/片状/远闪 */
    const drawLightning = () => {
      if (state.lightning <= 0) return
      ctx.save()

      const style = state.lightningStyle || 'bolt'

      // 柔和环境闪光（不晃眼）
      ctx.globalAlpha = state.lightning * 0.04
      ctx.fillStyle = 'rgba(220,230,255,0.25)'
      ctx.fillRect(0, 0, w, h)

      if (style === 'bolt') {
        // 单根锯齿闪电
        const sx = w * 0.1 + Math.random() * w * 0.8
        const ex = sx + (Math.random() - 0.5) * w * 0.3
        const ey = h * (0.5 + Math.random() * 0.3)
        const mainPts = generateBoltPath(sx, 0, ex, ey, 0, 5)
        drawBoltPath(mainPts, state.lightning, 1.8)
        // 1~2条分支
        for (let b = 0; b < 1 + Math.floor(Math.random() * 2); b++) {
          const si = 1 + Math.floor(Math.random() * (mainPts.length - 2))
          const sp = mainPts[si]
          const angle = (Math.random() - 0.5) * 1.0 + 0.3
          const len = h * 0.12 * (0.5 + Math.random() * 0.5)
          const bex = sp.x + Math.sin(angle) * len
          const bey = sp.y + Math.cos(angle) * len * 0.6 + len * 0.4
          const bPts = generateBoltPath(sp.x, sp.y, bex, bey, 0, 3)
          drawBoltPath(bPts, state.lightning * 0.4, 0.8)
        }
      } else if (style === 'sheet') {
        // 片状闪
        ctx.globalAlpha = state.lightning * 0.3
        for (let i = 0; i < 4; i++) {
          const sx = Math.random() * w
          const sy = Math.random() * h * 0.25
          const sr = 30 + Math.random() * 80
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
          grad.addColorStop(0, 'rgba(220,235,255,0.15)')
          grad.addColorStop(1, 'rgba(220,235,255,0)')
          ctx.fillStyle = grad
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
        }
      } else if (style === 'distant') {
        // 远闪
        const sx = w * 0.15 + Math.random() * w * 0.7
        const ex = sx + (Math.random() - 0.5) * 40
        const ey = h * (0.2 + Math.random() * 0.15)
        const pts = generateBoltPath(sx, h * 0.05, ex, ey, 0, 3)
        drawBoltPath(pts, state.lightning * 0.35, 0.6)
      }
      ctx.restore()
    }

    /* 每帧绘制函数：清理画布 -> 根据天气类型绘制对应动画 */
    const draw = () => {
      state.time++
      ctx.clearRect(0, 0, w, h)

      // 晴天：太阳光晕 + 阳光射线 + 飘动白云
      if (type === 'sunny') {
        const sunX = w * 0.85
        const sunY = h * 0.25
        const pulse = 1 + Math.sin(state.time * 0.015) * 0.08

        // 多层太阳光晕
        for (let i = 3; i >= 0; i--) {
          const r = 15 + i * 35 * pulse
          const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r)
          const alpha = (0.13 - i * 0.03) * pulse
          sunGrad.addColorStop(0, `rgba(255,220,120,${alpha})`)
          sunGrad.addColorStop(0.5, `rgba(255,200,80,${alpha * 0.5})`)
          sunGrad.addColorStop(1, 'rgba(255,200,80,0)')
          ctx.fillStyle = sunGrad
          ctx.fillRect(0, 0, w, h)
        }

        state.particles.forEach(p => {
          p.angle += p.speed
          const sx = sunX + Math.cos(p.angle) * 30
          const sy = sunY + Math.sin(p.angle) * 30
          const ex = sunX + Math.cos(p.angle) * (80 + p.length * 150)
          const ey = sunY + Math.sin(p.angle) * (80 + p.length * 150)
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.strokeStyle = `rgba(255,220,140,${p.opacity * (0.6 + 0.4 * Math.sin(state.time * 0.01 + p.angle))})`
          ctx.lineWidth = p.width
          ctx.lineCap = 'round'
          ctx.stroke()
        })

        state.clouds.forEach(cloud => {
          cloud.x += cloud.speed * 2
          if (cloud.x > w + 200) cloud.x = -250
          drawCloud(cloud)
        })
      }

      // 多云：多层云朵飘动
      if (type === 'cloudy') {
        state.clouds.forEach(cloud => {
          cloud.x += cloud.speed * 2
          if (cloud.x > w + 200) cloud.x = -250
          drawCloud(cloud)
        })
      }

      // 阴天：厚重灰云缓慢移动
      if (type === 'overcast') {
        state.clouds.forEach(cloud => {
          cloud.x += cloud.speed * 1.2
          if (cloud.x > w + 300) cloud.x = -300
          drawCloud(cloud)
        })
      }

      // 雨天：锥形雨滴 + 溅起效果
      if (type === 'rain') {
        state.particles.forEach(p => {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.wind * 2, p.y + p.length)
          const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.wind * 2, p.y + p.length)
          grad.addColorStop(0, `rgba(174,194,224,0)`)
          grad.addColorStop(0.3, `rgba(174,194,224,${p.opacity * 0.3})`)
          grad.addColorStop(1, `rgba(174,194,224,${p.opacity})`)
          ctx.strokeStyle = grad
          ctx.lineWidth = p.width
          ctx.lineCap = 'round'
          ctx.stroke()

          p.x += p.wind
          p.y += p.speed

          // 落地溅起
          if (p.y > h - 5 && Math.random() > 0.65) {
            drawSplash(p.x, h - 2)
          }
          if (p.y > h - 3 && Math.random() > 0.75) {
            for (let sp = 0; sp < 2; sp++) state.splashParticles.push(createSplashParticle(p.x, h - 2))
          }

          if (p.y > h + 20) {
            Object.assign(p, createRaindrop())
          }
        })

        // 溅落粒子动效
        state.splashParticles = state.splashParticles.filter(sp => {
          sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.08; sp.life -= sp.decay
          if (sp.life <= 0) return false
          ctx.save()
          ctx.globalAlpha = sp.life * 0.5
          ctx.fillStyle = 'rgba(174,194,224,0.7)'
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
          return true
        })

        // 雷暴额外添加闪电（仅夜间显示）
        if (isDay === false) {
          state.lightningTimer++
          if (state.lightningTimer >= state.nextLightningAt) {
            state.lightning = 1
            state.lightningTimer = 0
            // 随机选择闪电样式
            const r = Math.random()
            state.lightningStyle = r < 0.5 ? 'bolt' : r < 0.8 ? 'distant' : 'sheet'
            // 下次闪电间隔：8~25秒（与页面背景一致）
            state.nextLightningAt = 480 + Math.random() * 1020
          }
          if (state.lightning > 0) {
            state.lightning -= 0.012
            if (state.lightning < 0) state.lightning = 0
          }
          drawLightning()
        }
      }

      // 雪天：六边形/圆形雪花飘落
      if (type === 'snow') {
        state.particles.forEach(p => {
          p.wobble += p.wobbleSpeed
          p.rotation += p.rotSpeed
          const wx = p.x + Math.sin(p.wobble) * p.wobbleAmp

          ctx.save()
          ctx.globalAlpha = p.opacity * (0.7 + 0.3 * Math.sin(state.time * 0.02 + p.wobble))

          if (p.type === 'hex') {
            drawHexagon(wx, p.y, p.radius, p.rotation)
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'
            ctx.lineWidth = 0.8
            ctx.stroke()
            // 内部十字纹路
            ctx.beginPath()
            ctx.moveTo(wx - p.radius * 0.5, p.y)
            ctx.lineTo(wx + p.radius * 0.5, p.y)
            ctx.moveTo(wx, p.y - p.radius * 0.5)
            ctx.lineTo(wx, p.y + p.radius * 0.5)
            ctx.stroke()
          } else {
            ctx.beginPath()
            ctx.arc(wx, p.y, p.radius, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.9)'
            ctx.fill()
          }
          ctx.restore()

          p.y += p.speed
          p.x += Math.sin(p.wobble * 0.5) * 0.15

          if (p.y > h + 10) {
            Object.assign(p, createSnowflake())
          }
        })
      }

      // 雾天：流动雾气团（椭圆形渐变）
      if (type === 'fog') {
        state.particles.forEach(p => {
          p.phase += 0.003
          const driftY = Math.sin(p.phase) * 8
          const driftX = Math.cos(p.phase * 0.7) * 5

          ctx.save()
          ctx.globalAlpha = p.opacity * (0.6 + 0.4 * Math.sin(p.phase))
          const grad = ctx.createRadialGradient(
            p.x + driftX + p.width / 2, p.y + driftY, 0,
            p.x + driftX + p.width / 2, p.y + driftY, p.width
          )
          grad.addColorStop(0, 'rgba(200,210,220,0.5)')
          grad.addColorStop(0.5, 'rgba(200,210,220,0.2)')
          grad.addColorStop(1, 'rgba(200,210,220,0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.ellipse(p.x + driftX + p.width / 2, p.y + driftY, p.width, p.height, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          p.x += p.speed
          if (p.x > w + 300) {
            Object.assign(p, createFogBlob())
          }
        })
      }

      animRef.current = requestAnimationFrame(draw)
    }

    init()
    draw()

    /* 窗口 resize 时重新设置 Canvas 尺寸 */
    const handleResize = () => {
      const r = canvas.parentElement.getBoundingClientRect()
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [type, isDay])

  /* 天气类型未知或未设置时不渲染 Canvas */
  if (!type || type === 'unknown') return null

  return <canvas ref={canvasRef} className={styles.weatherCanvas} />
}

// ==================== 数字时钟 ====================
/*
 * DigitalClock - 翻页风格数字时钟
 * 将 Date 对象格式化为 HH:MM:SS，每位数字独立渲染。
 * Props：
 *   date {Date} 当前时间 Date 对象
 */
function DigitalClock({ date }) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return (
    <div className={styles.digitalClock}>
      <span className={styles.digit}>{hours[0]}</span>
      <span className={styles.digit}>{hours[1]}</span>
      <span className={styles.colon}>:</span>
      <span className={styles.digit}>{minutes[0]}</span>
      <span className={styles.digit}>{minutes[1]}</span>
      <span className={styles.colon}>:</span>
      <span className={styles.digit}>{seconds[0]}</span>
      <span className={styles.digit}>{seconds[1]}</span>
    </div>
  )
}

// ==================== 主组件 ====================
export default function TimeWidget({ isEditMode, independentGlassControl, blurLevel, opacityLevel, windowOverride, updateWindowOverride, textColor1, textColor2, textColor3 }) {
  /* 当前时间 Date 对象，每秒更新 */
  const [time, setTime] = useState(new Date())
  /* 毛玻璃控制面板的显示状态 */
  const [showGlassControls, setShowGlassControls] = useState(false)
  /* 毛玻璃控制按钮的位置锚点 */
  const [glassAnchor, setGlassAnchor] = useState(null)
  /* 毛玻璃控制按钮的 DOM 引用 */
  const glassBtnRef = useRef(null)
  /* 天气数据对象 { temp, text, icon, type }，null 表示未获取 */
  const [weather, setWeather] = useState(null)
  /* 天气动画是否启用，从 localStorage 读取，默认 true */
  const [weatherAnimationEnabled, setWeatherAnimationEnabled] = useState(() => {
    return localStorage.getItem('nav-weather-animation-enabled') !== 'false'
  })
  /* 天气数据加载中标记 */
  const [weatherLoading, setWeatherLoading] = useState(false)
  /* 天气获取错误信息 */
  const [weatherError, setWeatherError] = useState('')
  /* 当前城市名称，从 localStorage 读取 */
  const [cityName, setCityName] = useState('')
  /* 天气功能是否启用，从 localStorage 读取，默认 true */
  const [weatherEnabled, setWeatherEnabled] = useState(() => {
    return localStorage.getItem('nav-weather-enabled') !== 'false'
  })
  /* 上次天气数据获取时间戳，用于判断缓存是否过期 */
  const [weatherFetchTime, setWeatherFetchTime] = useState(() => {
    const t = localStorage.getItem('nav-weather-cache-time')
    return t ? parseInt(t) : null
  })
  /* 手动刷新中标记，控制图标旋转动画 */
  const [refreshing, setRefreshing] = useState(false)
  /* 组件挂载状态标记，防止卸载后异步操作继续 setState */
  const mountedRef = useRef(true)

  /* 每秒更新当前时间 */
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  /* 组件挂载/卸载标记 */
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  /* 监听天气开关变化事件（来自其他组件的设置变更） */
  useEffect(() => {
    const handler = () => {
      setWeatherEnabled(localStorage.getItem('nav-weather-enabled') !== 'false')
    }
    window.addEventListener('weatherToggleChanged', handler)
    return () => window.removeEventListener('weatherToggleChanged', handler)
  }, [])

  /* 监听天气动效开关变化事件 */
  useEffect(() => {
    const handler = () => {
      setWeatherAnimationEnabled(localStorage.getItem('nav-weather-animation-enabled') !== 'false')
    }
    window.addEventListener('weatherAnimationToggleChanged', handler)
    return () => window.removeEventListener('weatherAnimationToggleChanged', handler)
  }, [])

  /* 初始化时优先从缓存读取天气数据，实现无感化加载 */
  useEffect(() => {
    if (!weatherEnabled) return
    // 先从缓存读取显示
    const cached = localStorage.getItem('nav-weather-cache')
    const cachedTime = localStorage.getItem('nav-weather-cache-time')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.data) {
          setWeather(parsed.data)
          if (cachedTime) setWeatherFetchTime(parseInt(cachedTime))
        }
      } catch {}
    }
    const savedCity = localStorage.getItem('nav-weather-city')
    if (savedCity) {
      try {
        const parsed = JSON.parse(savedCity)
        if (parsed.name) setCityName(parsed.name)
      } catch {}
    }
  }, [weatherEnabled])

  /*
   * 加载天气数据
   * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存过期检查）
   * 双 API 策略：优先 open-meteo（免费、无需密钥），失败后使用 wttr.in 备用，全部失败则使用模拟数据
   */
  const loadWeather = useCallback(async (forceRefresh = false) => {
    if (!weatherEnabled) return

    if (!forceRefresh) {
      const cachedTime = localStorage.getItem('nav-weather-cache-time')
      if (cachedTime && Date.now() - parseInt(cachedTime) < 30 * 60 * 1000) {
        const cached = localStorage.getItem('nav-weather-cache')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.data) {
              setWeather(parsed.data)
              setWeatherFetchTime(parseInt(cachedTime))
              return
            }
          } catch {}
        }
      }
    }

    setWeatherLoading(true)
    setWeatherError('')

    try {
      const saved = localStorage.getItem('nav-weather-city')
      let lat = 39.9042
      let lon = 116.4074
      let name = '\u5317\u4EAC'  // 北京

      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.lat && parsed.lon) {
            lat = parsed.lat
            lon = parsed.lon
            name = parsed.name || '\u5317\u4EAC'
          }
        } catch {}
      }

      setCityName(name)

      // 强制刷新时先清除 weather.js 内部的缓存，确保真正重新请求 API
      if (forceRefresh) {
        localStorage.removeItem('nav-weather-cache')
        localStorage.removeItem('nav-weather-cache-time')
      }

      // 使用 weather.js 统一的 fetchWeather（WMO 代码映射完整，缓存一致）
      let weatherData = await fetchWeatherFromUtil(lat, lon)

      // 失败时使用模拟数据兜底
      if (!weatherData) {
        console.warn('Weather API failed, using mock data')
        const mockTemp = 20 + Math.floor(Math.random() * 15)
        const mockCodes = [0, 1, 2, 3, 61, 95]
        const mockCode = mockCodes[Math.floor(Math.random() * mockCodes.length)]
        // 复用 weather.js 的 WMO_MAP（已在 fetchWeatherFromUtil 内部映射过）
        weatherData = {
          temp: mockTemp,
          text: '\u591A\u4E91 (\u79BB\u7EBF)',  // 多云 (离线)
          icon: '\u26C5',
          type: 'cloudy',
        }
      }

      if (weatherData) {
        setWeather(weatherData)
        setWeatherError('')
        setWeatherFetchTime(Date.now())
      }
    } catch (err) {
      console.error('Weather error:', err)
      setWeatherError('\u5929\u6C14\u83B7\u53D6\u5931\u8D25')
    }

    setWeatherLoading(false)
    setRefreshing(false)
  }, [weatherEnabled])

  /* 点击天气图标手动刷新：设置刷新动画，调用强制刷新 */
  const handleRefreshWeather = useCallback(() => {
    setRefreshing(true)
    loadWeather(true)
  }, [loadWeather])

  /* 天气功能启用时：自动首次加载，并每30分钟定时刷新；关闭时清空数据 */
  useEffect(() => {
    if (weatherEnabled) {
      loadWeather()
      const interval = setInterval(() => loadWeather(), 30 * 60 * 1000)
      return () => clearInterval(interval)
    } else {
      setWeather(null)
      setCityName('')
      setWeatherError('')
      setWeatherFetchTime(null)
    }
  }, [weatherEnabled, loadWeather])

  /* 监听城市变更事件：城市变化后重新加载天气 */
  useEffect(() => {
    const handler = () => {
      if (weatherEnabled) loadWeather()
    }
    window.addEventListener('weatherCityChanged', handler)
    return () => window.removeEventListener('weatherCityChanged', handler)
  }, [loadWeather, weatherEnabled])

  /* 格式化日期为中文格式："2026年6月17日 星期三" */
  const formatDate = (date) => {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
  }

  /* 根据当前小时获取问候语 */
  const getGreeting = () => {
    const h = time.getHours()
    if (h < 6) return '夜深了，注意休息'
    if (h < 9) return '早上好'
    if (h < 12) return '上午好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    if (h < 22) return '晚上好'
    return '夜深了，注意休息'
  }

  /* 当前天气类型，用于 Canvas 动画和 CSS 背景类名 */
  const weatherType = weather?.type || 'sunny'
  /* 是否白天（6:00-18:59），影响天气动画和背景样式 */
  const isDay = time.getHours() >= 6 && time.getHours() < 19

  /*
   * 根据天气类型和白天/夜间计算 CSS 背景类名
   * 使用 useMemo 避免每次渲染都重新计算
   */
  const weatherBgClass = useMemo(() => {
    if (!weatherEnabled || !weather) return ''
    switch (weatherType) {
      case 'rain': return isDay ? styles.weatherRainDay : styles.weatherRainNight
      case 'snow': return styles.weatherSnow
      case 'overcast': return styles.weatherOvercast
      case 'fog': return styles.weatherFog
      case 'cloudy': return isDay ? styles.weatherCloudyDay : styles.weatherCloudyNight
      case 'sunny': return styles.weatherSunny
      default: return ''
    }
  }, [weatherType, weatherEnabled, weather, isDay])

  /* 根据 windowOverride 构建独立窗口覆盖内联样式 */
  const overrideStyle = {}
  if (windowOverride?.blurEnabled) {
    const b = `blur(${(windowOverride.blur / 100) * 40}px)`
    overrideStyle.backdropFilter = b + ' saturate(150%)'
    overrideStyle.WebkitBackdropFilter = b + ' saturate(150%)'
  }
  if (windowOverride?.opacityEnabled) {
    const theme = document.documentElement.getAttribute('data-theme')
    const base = theme === 'dark' ? 0.04 : 0.35
    overrideStyle.background = `rgba(255,255,255,${((base * windowOverride.opacity) / 100).toFixed(3)})`
  }
  if (windowOverride?.textEnabled) {
    overrideStyle['--text-primary'] = windowOverride.textColor1
    overrideStyle['--text-secondary'] = windowOverride.textColor2
    overrideStyle['--text-tertiary'] = windowOverride.textColor3
  }

  return (
    <div className={`${styles.widget} ${weatherBgClass}`} data-spotlight-target data-spotlight-group style={{
      ...overrideStyle,
      // 编辑模式 + 独立窗口控制：布局改为纵向，使 GlassControls 按钮在顶部独立一行
      ...(isEditMode && independentGlassControl ? { flexDirection: 'column', alignItems: 'stretch' } : {}),
    }}>
      {/* ====== 编辑模式：顶部独立一行放毛玻璃控制按钮，不干扰下方三栏布局 ====== */}
      {isEditMode && independentGlassControl && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', minHeight: 30 }}>
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
            <button
              ref={glassBtnRef}
              onClick={() => { setShowGlassControls(true); setGlassAnchor(glassBtnRef.current?.getBoundingClientRect()) }}
              style={{
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
      {/* 天气动画 Canvas：仅在天气启用、有数据且动画开关打开时渲染 */}
      {weatherEnabled && weather && weatherAnimationEnabled && <WeatherEffect type={weather.type} isDay={isDay} />}

      <div className={`${styles.content} ${!weatherEnabled ? styles.contentNoWeather : ''}`}>
        {/* 左侧：问候语 + 日期 */}
        <div className={styles.left}>
          <span className={styles.greeting}>{getGreeting()}</span>
          <div className={styles.date}>
            <Calendar size={13} />
            <span>{formatDate(time)}</span>
          </div>
        </div>

        {/* 中间/右侧：翻页时钟（天气关闭时靠右对齐） */}
        <div className={weatherEnabled ? styles.center : styles.rightTime}>
          <DigitalClock date={time} />
        </div>

        {/* 右侧：天气信息（仅天气功能启用时显示） */}
        {weatherEnabled && (
          <div className={styles.right}>
            {weather && (
              <div className={styles.weatherInfo}>
                <span
                  /*
                   * 天气图标动画：refreshing 为 true 时添加旋转动画样式
                   */
                  className={`${styles.weatherEmoji} ${refreshing ? styles.refreshing : ''}`}
                  onClick={handleRefreshWeather}
                  title="点击刷新天气"
                >{weather.icon}</span>
                <div className={styles.weatherDetail}>
                  <span className={styles.weatherTemp}>{weather.temp}°C</span>
                  <span className={styles.weatherText}>{weather.text}</span>
                  <div className={styles.weatherMeta}>
                    {cityName && (
                      <div className={styles.weatherCity}>
                        <MapPin size={11} />
                        <span>{cityName}</span>
                      </div>
                    )}
                    {weatherFetchTime && (
                      <span className={styles.weatherFetchTime}>
                        {new Date(weatherFetchTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 天气加载中（无缓存数据时显示） */}
            {weatherLoading && !weather && (
              <div className={styles.weatherLoading}>天气加载中...</div>
            )}

            {/* 天气获取失败（无缓存数据时显示） */}
            {weatherError && !weather && (
              <div className={styles.weatherError}>{weatherError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
