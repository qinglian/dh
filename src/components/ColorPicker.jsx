import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Undo2 } from 'lucide-react'

/* ======== 数据/工具 ======== */
const PRESET_COLORS = [
  '#ffffff','#f8f9fa','#e9ecef','#dee2e6','#ced4da','#adb5bd',
  '#ff6b6b','#ff922b','#ffd43b','#69db7c','#38d9a9','#4dabf7',
  '#339af0','#5c7cfa','#7950f2','#da77f2','#f783ac','#e64980',
  '#212529','#495057','#868e96','#000000',
]
function gh(){try{return JSON.parse(localStorage.getItem('spotlight-color-history')||'[]')}catch{return[]}}
function sh(c){localStorage.setItem('spotlight-color-history',JSON.stringify(c.slice(0,14)))}
function hexToHsl(hex){
  if(!hex||hex.length<7)return{h:0,s:0,l:50}
  let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b)
  let h=0,s=0,l=(mx+mn)/2
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0))/6:mx===g?((b-r)/d+2)/6:((r-g)/d+4)/6}
  return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)}
}
function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(Math.min(k-3,9-k,1),-1)};return'#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')}
function isLight(hx){if(!hx||hx.length<7)return!0;const r=parseInt(hx.slice(1,3),16),g=parseInt(hx.slice(3,5),16),b=parseInt(hx.slice(5,7),16);return(r*299+g*587+b*114)/1e3>150}

/** 绘制圆角矩形 (兼容无 roundRect 的浏览器) */
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath()
  ctx.moveTo(x+r,y)
  ctx.lineTo(x+w-r,y)
  ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r)
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h)
  ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r)
  ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

/* ======== S/B 取色方块 ======== */
function SBPad({hue,sat,bri,onChange}){
  const ref=useRef(null),S=240
  const draw=useCallback(()=>{
    const c=ref.current;if(!c)return
    const t=c.getContext('2d'),w=S
    // 白→纯色水平渐变
    const pure=hslToHex(hue,100,50)
    const hg=t.createLinearGradient(0,0,w,0)
    hg.addColorStop(0,'#ffffff');hg.addColorStop(1,pure)
    t.fillStyle=hg;t.fillRect(0,0,w,w)
    // 黑遮罩垂直渐变
    const vg=t.createLinearGradient(0,0,0,w)
    vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.88)')
    t.fillStyle=vg;t.fillRect(0,0,w,w)
    // 选中点
    const sx=(sat/100)*w,sy=((100-bri)/100)*w
    t.beginPath();t.arc(sx,sy,10,0,Math.PI*2)
    t.strokeStyle='#fff';t.lineWidth=3;t.stroke()
    t.beginPath();t.arc(sx,sy,8.5,0,Math.PI*2)
    t.strokeStyle='rgba(0,0,0,0.25)';t.lineWidth=1.5;t.stroke()
  },[hue,sat,bri])
  useEffect(()=>{draw()},[draw])

  const toPos=e=>{
    const r=ref.current.getBoundingClientRect()
    return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}
  }

  return <canvas ref={ref} width={S} height={S}
    onMouseDown={e=>{e.preventDefault();const p=toPos(e);onChange(Math.round(p.x*100),Math.round((1-p.y)*100))}}
    onMouseMove={e=>{if(e.buttons!==1)return;e.preventDefault();const p=toPos(e);onChange(Math.round(p.x*100),Math.round((1-p.y)*100))}}
    style={{width:S,height:S,borderRadius:18,cursor:'crosshair',display:'block',touchAction:'none'}}/>
}

/* ======== 色相条 ======== */
function HueBar({hue,onChange}){
  const ref=useRef(null),W=266,H=16
  const draw=useCallback(()=>{
    const c=ref.current;if(!c)return;const t=c.getContext('2d')
    const g=t.createLinearGradient(0,0,W,0)
    for(let i=0;i<=360;i+=15)g.addColorStop(i/360,`hsl(${i},100%,50%)`)
    t.fillStyle=g
    roundRect(t,0,0,W,H,8);t.fill()
    // 指示点
    const x=(hue/360)*W
    t.beginPath();t.arc(x,H/2,7,0,Math.PI*2)
    t.fillStyle='#fff';t.fill()
    t.strokeStyle='rgba(0,0,0,0.2)';t.lineWidth=1.5;t.stroke()
  },[hue])
  useEffect(()=>{draw()},[draw])

  const toX=e=>{
    const r=ref.current.getBoundingClientRect()
    return Math.round(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*360)
  }

  return <canvas ref={ref} width={W} height={H}
    onMouseDown={e=>{e.preventDefault();onChange(toX(e))}}
    onMouseMove={e=>{if(e.buttons!==1)return;e.preventDefault();onChange(toX(e))}}
    style={{width:W,height:H,borderRadius:8,cursor:'pointer',display:'block',touchAction:'none'}}/>
}

/* ======== 按钮 ======== */
const bs={height:44,padding:'0 24px',borderRadius:14,fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,border:'none',outline:'none',transform:'scale(1)',filter:'brightness(1)',transition:'transform .12s cubic-bezier(.34,1.56,.64,1), filter .15s ease, box-shadow .2s ease'}
const bp={transform:'scale(.93)',filter:'brightness(.9)'}

/* ======== 主弹窗 ======== */
export default function ColorPicker({value,onChange,onClose}){
  const ih=hexToHsl(value)
  const [hue,setHue]=useState(ih.h),[sat,setSat]=useState(ih.s),[bri,setBri]=useState(ih.l)
  const [hex,setHex]=useState(value),[history,setHistory]=useState(gh),[pressing,setPressing]=useState(null),popup=useRef(null),hexRef=useRef(null)
  const draft=hslToHex(hue,sat,bri)

  const apply=(hx)=>{const x=hexToHsl(hx);setHue(x.h);setSat(x.s);setBri(x.l);setHex(hx);hexRef.current?.focus()}
  const onHex=e=>{const v=e.target.value;setHex(v);if(/^#[0-9a-fA-F]{6}$/.test(v)){const x=hexToHsl(v.toLowerCase());setHue(x.h);setSat(x.s);setBri(x.l)}}
  const onConfirm=()=>{const h=[draft,...history.filter(c=>c!==draft)];setHistory(h);sh(h);onChange(draft);onClose()}

  useEffect(()=>{const h=e=>{if(popup.current&&!popup.current.contains(e.target))onClose()};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[onClose])
  useEffect(()=>{const u=()=>setPressing(null);window.addEventListener('mouseup',u);return()=>window.removeEventListener('mouseup',u)},[])

  const light=isLight(draft)
  const btn=(t)=>pressing===t?{...bs,...bp,transform: t==='close' ? 'scale(.85) rotate(90deg)' : bp.transform }:bs

  // X 按钮 hover 状态
  const [xHover,setXHover]=useState(false)

  return createPortal(<div style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{position:'absolute',inset:0,opacity:0}} onClick={onClose}/>
    <div ref={popup} style={{
      background:'var(--card-bg,rgba(255,255,255,0.99))',
      backdropFilter:'blur(48px) saturate(180%)',WebkitBackdropFilter:'blur(48px) saturate(180%)',
      borderRadius:24,border:'1px solid var(--glass-border)',
      padding:28,width:360,
      boxShadow:'0 40px 120px rgba(0,0,0,0.4),0 2px 12px rgba(0,0,0,0.1)',
      display:'flex',flexDirection:'column',gap:22,
    }}>
      {/* 标题栏 */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:17,fontWeight:700,color:'var(--text-primary)'}}>选择颜色</div>
        <button
          onMouseDown={()=>setPressing('close')}
          onMouseEnter={()=>setXHover(true)}
          onMouseLeave={()=>setXHover(false)}
          onClick={onClose}
          style={{
            ...btn('close'),width:34,height:34,padding:0,justifyContent:'center',borderRadius:'50%',
            background: xHover ? 'rgba(255,60,60,0.1)' : 'rgba(0,0,0,0.04)',
            color: xHover ? '#ef4444' : 'var(--text-tertiary)',
          }}><X size={18}/></button>
      </div>

      {/* 取色面板 */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
        <div style={{borderRadius:20,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.5)',lineHeight:0}}>
          <SBPad hue={hue} sat={sat} bri={bri} onChange={(s,b)=>{setSat(s);setBri(b);setHex(hslToHex(hue,s,b))}}/>
        </div>
        <div style={{borderRadius:10,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',lineHeight:0}}>
          <HueBar hue={hue} onChange={h=>{setHue(h);setHex(hslToHex(h,sat,bri))}}/>
        </div>
      </div>

      {/* 预览 + Hex + 粘贴 */}
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <div style={{width:48,height:48,borderRadius:14,background:draft,flexShrink:0,border:'1.5px solid var(--glass-border)',boxShadow:'0 2px 8px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.35)'}}/>
        <input ref={hexRef} value={hex} onChange={onHex} onBlur={()=>setHex(draft)} placeholder="#000000" spellCheck={false}
          style={{flex:1,height:48,borderRadius:14,border:'1.5px solid var(--glass-border)',padding:'0 16px',fontSize:16,fontFamily:"'SF Mono','Cascadia Code',monospace",fontWeight:500,letterSpacing:.6,background:'rgba(0,0,0,0.015)',color:'var(--text-primary)',outline:'none',boxSizing:'border-box',transition:'border-color .2s'}}
          onFocus={e=>e.target.style.borderColor='var(--accent-primary)'}
          onBlurCapture={e=>e.target.style.borderColor='var(--glass-border)'}/>
        <button onClick={async()=>{try{const t=await navigator.clipboard.readText();if(/^#[0-9a-fA-F]{6}$/.test(t.trim()))apply(t.trim().toLowerCase())}catch{}}} title="粘贴剪贴板色值"
          style={{width:48,height:48,borderRadius:14,border:'1.5px solid var(--glass-border)',background:'rgba(0,0,0,0.015)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-tertiary)',flexShrink:0}}><Undo2 size={18} style={{transform:'scaleX(-1)'}}/></button>
      </div>

      {/* 预设 */}
      <div>
        <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:10,fontWeight:600,letterSpacing:.5,textTransform:'uppercase'}}>预设颜色</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(11,1fr)',gap:4}}>
          {PRESET_COLORS.map(c=>{const a=draft===c;return <button key={c} onClick={()=>apply(c)} title={c} style={{
            aspectRatio:'1',background:c,borderRadius:8,cursor:'pointer',padding:0,border:'none',outline:'none',
            boxShadow:a?'0 0 0 3px var(--accent-primary),0 4px 12px rgba(0,122,255,0.3)':'0 1px 2px rgba(0,0,0,0.08)',
            transform:a?'scale(1.15)':'scale(1)',zIndex:a?1:0,position:'relative',
            transition:'all .18s cubic-bezier(.34,1.56,.64,1)'
          }}/>})}
        </div>
      </div>

      {/* 最近使用 */}
      {history.length>0&&<div>
        <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:10,fontWeight:600,letterSpacing:.5,textTransform:'uppercase'}}>最近使用</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {history.slice(0,10).map((c,i)=>{const a=draft===c;return <button key={c+i} onClick={()=>apply(c)} title={c} style={{
            width:34,height:34,borderRadius:9,background:c,cursor:'pointer',padding:0,
            border:a?'2px solid var(--accent-primary)':'1.5px solid var(--glass-border)',outline:'none',
            boxShadow:a?'0 0 0 3px rgba(0,122,255,0.25)':'0 1px 2px rgba(0,0,0,0.05)',
            transform:a?'scale(1.12)':'scale(1)',transition:'all .18s cubic-bezier(.34,1.56,.64,1)'
          }}/>})}
        </div>
      </div>}

      {/* 按钮 */}
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button onMouseDown={()=>setPressing('cancel')} onClick={onClose} style={{...btn('cancel'),background:'transparent',border:'1.5px solid var(--glass-border)',color:'var(--text-secondary)'}}><X size={15}/>取消</button>
        <button onMouseDown={()=>setPressing('confirm')} onClick={onConfirm} style={{...btn('confirm'),background:draft,color:light?'#1d1d1f':'#fff',boxShadow:`0 4px 20px ${draft}40,0 1px 4px rgba(0,0,0,0.1)`}}><Check size={15}/>确认</button>
      </div>
    </div>
  </div>,document.body)
}
