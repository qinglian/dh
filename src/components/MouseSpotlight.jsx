import { useEffect, useRef } from 'react'

/* ============================================================
   聚光灯 — 单色纯色实心圆，跟随鼠标
   Canvas z-index:1（背景之上，分类容器/卡片 z-index:2 之下）

   非遮罩：全屏绘制实心圆（size=半径，中心纯色→边缘透明）
   遮罩：  实心圆裁剪到圆覆盖的每个容器/搜索框/按钮栏内
           圆弧精确匹配元素 border-radius，不出界
           圆同时覆盖多个元素时全部绘制，无缝过渡
   ============================================================ */

const SEL = '[data-spotlight-group],[data-spotlight-btn]'

function mix(c1, c2, t) {
  const p = (s, e) => Math.round(
    parseInt(c1.slice(s, e), 16) +
    (parseInt(c2.slice(s, e), 16) - parseInt(c1.slice(s, e), 16)) * t
  )
  return '#' + p(1,3).toString(16).padStart(2,'0')
             + p(3,5).toString(16).padStart(2,'0')
             + p(5,7).toString(16).padStart(2,'0')
}

/* 读取元素 border-radius */
function readRadius(el) {
  const cs = getComputedStyle(el)
  const br = cs.borderRadius || '0'
  const parts = br.split(/\s*\/\s*/)
  let rx = 0, ry = 0
  if (parts.length >= 2) {
    const xs = parts[0].split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
    const ys = parts[1].split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
    rx = Math.max(0, ...xs, 0)
    ry = Math.max(0, ...ys, 0)
  } else {
    const vals = parts[0].split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
    rx = Math.max(0, ...vals, 0)
    ry = rx
  }
  const half = Math.min(el.offsetWidth, el.offsetHeight) / 2
  return { rx: Math.min(rx, half), ry: Math.min(ry, half) }
}

/* 圆角矩形路径 — arcTo 精确拐角 */
function roundRect(ctx, x, y, w, h, rx, ry) {
  if (rx <= 0 && ry <= 0) { ctx.rect(x, y, w, h); return }
  ctx.moveTo(x + rx, y)
  ctx.arcTo(x + w, y,      x + w, y + h, Math.min(rx, w / 2, h / 2))
  ctx.arcTo(x + w, y + h,  x,     y + h, Math.min(ry, w / 2, h / 2))
  ctx.arcTo(x,     y + h,  x,     y,     Math.min(rx, w / 2, h / 2))
  ctx.arcTo(x,     y,      x + w, y,     Math.min(ry, w / 2, h / 2))
  ctx.closePath()
}

/* 圆形与矩形是否相交 */
function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw))
  const nearestY = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nearestX, dy = cy - nearestY
  return dx * dx + dy * dy < r * r
}

export default function MouseSpotlight({
  enabled = true,
  size = 280,
  opacity = 100,
  maskMode = false,
  color1 = '#ffffff',
  color2 = '#000000',
  colorMix = 50,
}) {
  const canvasRef = useRef(null)
  const sR = useRef(size)
  const oR = useRef(opacity)
  const mR = useRef(maskMode)
  const c1R = useRef(color1)
  const c2R = useRef(color2)
  const xR = useRef(colorMix)
  sR.current = size
  oR.current = opacity
  mR.current = maskMode
  c1R.current = color1
  c2R.current = color2
  xR.current = colorMix

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!enabled) { canvas.style.opacity = '0'; return }

    const ctx = canvas.getContext('2d')
    let dpr = window.devicePixelRatio || 1

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const mouse = { x: -9999, y: -9999 }, cur = { x: -9999, y: -9999 }
    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY }
    let raf = 0

    /* 绘制实心圆：中心纯色，边缘微弱过渡到透明（防锯齿） */
    function drawCircle(cx, cy, r) {
      const color = mix(c1R.current, c2R.current, xR.current / 100)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0,    color)
      grad.addColorStop(0.92, color)
      grad.addColorStop(1,    'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    const tick = () => {
      cur.x += (mouse.x - cur.x) * 0.12
      cur.y += (mouse.y - cur.y) * 0.12

      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      ctx.globalAlpha = oR.current / 100

      if (mR.current) {
        /* 遮罩模式：先剪切到视口，再在相交元素内绘制 */
        ctx.save()
        // 先限制完整绘制区域不超过视口
        ctx.beginPath()
        ctx.rect(0, 0, canvas.width / dpr, canvas.height / dpr)
        ctx.clip()

        const cx = cur.x, cy = cur.y, cr = sR.current
        const all = document.querySelectorAll(SEL)
        for (let i = 0; i < all.length; i++) {
          const r = all[i].getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) continue

          // 跳过完全在视口外的元素
          const vw = canvas.width / dpr, vh = canvas.height / dpr
          if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) continue

          if (!circleRectOverlap(cx, cy, cr, r.left, r.top, r.width, r.height)) continue

          ctx.save()
          const { rx, ry } = readRadius(all[i])
          ctx.beginPath()
          roundRect(ctx, r.left, r.top, r.width, r.height, rx, ry)
          ctx.clip()
          drawCircle(cx, cy, cr)
          ctx.restore()
        }
        ctx.restore()
      } else {
        /* 非遮罩模式：全屏 */
        drawCircle(cur.x, cur.y, sR.current)
      }

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('scroll', resize, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', resize)
      cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: enabled ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    />
  )
}
