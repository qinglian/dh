import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sliders, X, RotateCcw } from 'lucide-react'
import ColorPicker from './ColorPicker'

const LIGHT = {
  shell:   'rgba(255,255,255,0.78)', inner:   'rgba(255,255,255,0.50)',
  card:    'rgba(255,255,255,0.72)', border:  'rgba(0,0,0,0.06)',
  text:    '#1c1c1e', text2:   '#3a3a3c', text3:   '#8e8e93',
  accent:  '#007aff', aBg:     'rgba(0,122,255,0.10)', track:   'rgba(0,0,0,0.08)',
  tgOff:   'rgba(0,0,0,0.14)', tgDot:   '#fff', swBdr:   'rgba(0,0,0,0.14)',
}
const DARK = {
  shell:   'rgba(28,28,30,0.84)', inner:   'rgba(44,44,46,0.56)',
  card:    'rgba(44,44,46,0.76)', border:  'rgba(255,255,255,0.07)',
  text:    '#f5f5f7', text2:   '#aeaeb2', text3:   '#636366',
  accent:  '#3b9bff', aBg:     'rgba(59,155,255,0.14)', track:   'rgba(255,255,255,0.07)',
  tgOff:   'rgba(255,255,255,0.14)', tgDot:   '#eee', swBdr:   'rgba(255,255,255,0.14)',
}
const textDef = [
  { light:'#1c1c1e', dark:'#f5f5f7' },
  { light:'#3a3a3c', dark:'#aeaeb2' },
  { light:'#8e8e93', dark:'#636366' },
]
const frosted = (px) => ({
  backdropFilter: `blur(${px}px) saturate(190%)`,
  WebkitBackdropFilter: `blur(${px}px) saturate(190%)`,
})

export default function GlassControls(p) {
  const popup = useRef(null)
  const [activePicker, setActivePicker] = useState(null) // 0|1|2|null
  const suppressRef = useRef(false) // 取色器刚关闭时抑制下一次 overlay click

  /* ---- 取色器状态同步到 ref，防止闭包过期 ---- */
  useEffect(() => { suppressRef.current = activePicker !== null }, [activePicker])

  /* ---- 点击弹窗外关闭（取色器打开时不触发） ---- */
  useEffect(() => {
    const h = e => {
      if (!popup.current) return
      if (popup.current.contains(e.target)) return
      if (suppressRef.current) return  // 取色器打开中
      p.onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [p.onClose])

  const th = document.documentElement.getAttribute('data-theme') || 'light'
  const c = th === 'dark' ? DARK : LIGHT

  const W = 290
  let l = 0, t = 0
  if (p.anchorRect) {
    l = Math.max(8, p.anchorRect.right + 10)
    if (l + W > window.innerWidth - 8) l = Math.max(8, p.anchorRect.left - W - 10)
    t = p.anchorRect.top
    const est = 420
    if (t + est > window.innerHeight) t = Math.max(8, window.innerHeight - est - 8)
    if (t < 8) t = 8
  }

  const tc = [p.textColor1, p.textColor2, p.textColor3]
  const ts = [p.onSetTextColor1, p.onSetTextColor2, p.onSetTextColor3]

  /* ---- 打开取色器时设 suppressRef ---- */
  const openPicker = (i) => {
    suppressRef.current = true
    setActivePicker(i)
  }
  /* ---- 取色器关闭 ---- */
  const closePicker = () => {
    suppressRef.current = true  // 抑制紧随的 overlay click
    setActivePicker(null)
  }
  const confirmPicker = (color) => {
    ts[activePicker](color)
    suppressRef.current = true
    setActivePicker(null)
  }

  return createPortal(
    /* 遮罩层：仅在 suppressRef=false 时才允许关闭 */
    <div onClick={() => { if (!suppressRef.current) p.onClose() }}
      style={{ inset:0, position:'fixed', zIndex:9999, background:'rgba(0,0,0,0.14)' }}>

      {/* 弹窗主体 */}
      <div ref={popup} onClick={e => e.stopPropagation()} style={{
        position:'fixed', left:l, top:t, width:W,
        background:c.shell, ...frosted(48),
        borderRadius:20, overflow:'visible',
        border:`1px solid ${c.border}`,
        boxShadow:'0 32px 80px rgba(0,0,0,0.38), 0 0 0 0.5px rgba(0,0,0,0.04)',
      }}>
        {/* 头部 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'17px 20px 14px' }}>
          <span style={{ fontSize:15, fontWeight:700, color:c.text, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:30,height:30,borderRadius:10, background:`linear-gradient(135deg,${c.accent},#5856d6)`, display:'flex',alignItems:'center',justifyContent:'center', boxShadow:`0 3px 10px ${th==='dark'?'rgba(59,155,255,0.35)':'rgba(0,122,255,0.25)'}` }}>
              <Sliders size={14} color="#fff" />
            </span>
            窗口效果
          </span>
          <CloseBtn onClick={p.onClose} c={c} />
        </div>

        {/* 内容 */}
        <div style={{ margin:'0 14px 16px', padding:'13px 15px', display:'flex',flexDirection:'column',gap:10, background:c.inner, ...frosted(32), borderRadius:16, border:`1px solid ${c.border}` }}>
          <GlassCard c={c}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.blurEnabled?11:0}}>
              <Toggle on={p.blurEnabled} toggle={p.onToggleBlur} c={c} />
              <Label c={c} on={p.blurEnabled}>模糊度</Label>
              {p.blurEnabled && <><Badge c={c}>{p.blurValue}%</Badge><Reset c={c} onClick={()=>p.onSetBlur(50)} /></>}
            </div>
            {p.blurEnabled && <Slider value={p.blurValue} onChange={v=>p.onSetBlur(+v)} c={c} />}
          </GlassCard>

          <GlassCard c={c}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.opacityEnabled?11:0}}>
              <Toggle on={p.opacityEnabled} toggle={p.onToggleOpacity} c={c} />
              <Label c={c} on={p.opacityEnabled}>不透明度</Label>
              {p.opacityEnabled && <><Badge c={c}>{p.opacityValue}%</Badge><Reset c={c} onClick={()=>p.onSetOpacity(100)} /></>}
            </div>
            {p.opacityEnabled && <Slider value={p.opacityValue} onChange={v=>p.onSetOpacity(+v)} c={c} />}
          </GlassCard>

          <GlassCard c={c}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.textEnabled?10:0}}>
              <Toggle on={p.textEnabled} toggle={p.onToggleText} c={c} />
              <Label c={c} on={p.textEnabled}>文字颜色</Label>
            </div>
            {p.textEnabled && (
              <div style={{display:'flex',flexDirection:'column',gap:8,paddingLeft:4}}>
                {['文字主题','文字正文','文字辅助'].map((lb,i)=>(
                  <ColorRow key={i} clr={tc[i]} lb={lb}
                    onClick={()=>openPicker(i)}
                    onChange={ts[i]} c={c} th={th} def={textDef[i]} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* 取色器（与 GlassControls overlay 并列，不嵌套在弹窗内） */}
      {activePicker !== null && (
        <div onClick={e => e.stopPropagation()}>
          <ColorPicker
            value={tc[activePicker]}
            onChange={confirmPicker}
            onClose={closePicker}
          />
        </div>
      )}
    </div>,
    document.body,
  )
}

/* ============ 子组件 ============ */
function GlassCard({c,children}){return <div style={{background:c.card,...frosted(26),borderRadius:13,padding:'13px 15px',border:`1.5px solid ${c.border}`}}>{children}</div>}
function Toggle({on,toggle,c}){return <button onClick={toggle} style={{width:42,height:26,borderRadius:13,border:'none',background:on?c.accent:c.tgOff,cursor:'pointer',position:'relative',flexShrink:0,transition:'background 0.2s',padding:0}}><span style={{position:'absolute',top:2,left:on?18:2,width:22,height:22,borderRadius:'50%',background:c.tgDot,boxShadow:'0 1px 5px rgba(0,0,0,0.3)',transition:'left 0.2s cubic-bezier(0.2,0.8,0.2,1.2)'}}/></button>}
function Label({c,on,children}){return <span style={{fontSize:13.5,fontWeight:700,color:on?c.text:c.text3}}>{children}</span>}
function Badge({c,children}){return <span style={{fontSize:12,fontWeight:800,color:c.accent,marginLeft:'auto',background:c.aBg,padding:'3px 10px',borderRadius:8}}>{children}</span>}
function Reset({c,onClick}){return <button onClick={onClick} title="恢复默认" style={{width:26,height:26,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:c.text3,flexShrink:0}}><RotateCcw size={13}/></button>}
function Slider({value,onChange,c}){return <input type="range" min={0} max={100} step={5} value={value} onChange={e=>onChange(e.target.value)} style={{WebkitAppearance:'none',appearance:'none',width:'100%',height:6,borderRadius:3,background:`linear-gradient(to right,${c.accent} 0%,${c.accent} ${value}%,${c.track} ${value}%,${c.track} 100%)`,outline:'none',cursor:'pointer'}}/>}
function ColorRow({clr,lb,onClick,onChange,c,th,def}){
  const d=th==='dark'?def.dark:def.light
  return <div style={{display:'flex',alignItems:'center',gap:10}}>
    <button onClick={onClick} style={{width:34,height:34,borderRadius:9,border:`2.5px solid ${c.swBdr}`,background:clr,cursor:'pointer',flexShrink:0,transition:'transform 0.15s,border-color 0.15s',padding:0}} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.13)';e.currentTarget.style.borderColor=c.accent}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.borderColor=c.swBdr}}/>
    <span style={{fontSize:13,color:c.text2,fontWeight:600}}>{lb}</span>
    <button onClick={()=>onChange(d)} title="恢复默认" style={{width:26,height:26,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:c.text3,marginLeft:'auto'}}><RotateCcw size={13}/></button>
  </div>
}
function CloseBtn({onClick,c}){return <button onClick={onClick} style={{width:32,height:32,borderRadius:10,border:'none',background:c.card,...frosted(24),cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:c.text3,transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.background=c.swBdr;e.currentTarget.style.color=c.text}} onMouseLeave={e=>{e.currentTarget.style.background=c.card;e.currentTarget.style.color=c.text3}}><X size={15}/></button>}
