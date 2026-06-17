import { useRef, useState, useEffect } from 'react'
import { Upload, X, Film, Video, FileImage, Link } from 'lucide-react'
import styles from './WallpaperPicker.module.css'

const presets = [
  { id: 'default',    name: '默认',   color: '#f2f2f7' },
  { id: 'gradient1',  name: '薄暮',   gradient: 'linear-gradient(135deg, #f5a9b8 0%, #c9b1d6 50%, #a8d8ea 100%)' },
  { id: 'gradient2',  name: '极光',   gradient: 'linear-gradient(135deg, #0c0032 0%, #190061 25%, #240090 50%, #3500d3 75%, #00b4d8 100%)' },
  { id: 'gradient3',  name: '日冕',   gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffa502 25%, #ffd93d 50%, #6c5ce7 100%)' },
  { id: 'gradient4',  name: '森林',   gradient: 'linear-gradient(135deg, #0f5e52 0%, #1d9b72 30%, #2ecc71 60%, #a8e6cf 100%)' },
  { id: 'gradient5',  name: '幻夜',   gradient: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { id: 'gradient6',  name: '晨曦',   gradient: 'linear-gradient(120deg, #e8d5b7 0%, #f5cc95 25%, #f7a8b8 60%, #d291bc 100%)' },
  { id: 'gradient7',  name: '海雾',   gradient: 'linear-gradient(160deg, #b6c6cc 0%, #8aa6b0 30%, #6b8e9b 60%, #4a7485 100%)' },
  { id: 'gradient8',  name: '梦境',   gradient: 'linear-gradient(120deg, #fc5c7d 0%, #6a82fb 50%, #1dd1a1 100%)' },
  { id: 'gradient9',  name: '夜幕',   gradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)' },
]

function isCustom(wp) { return wp?.startsWith('media:') || wp?.startsWith('url:') }
function parseBg(wp) {
  if (!wp) return null
  if (wp.startsWith('media:')) { const parts = wp.split(':'); return { prefix:'media', type:parts[1], src:parts.slice(2).join(':') } }
  if (wp.startsWith('url:')) { const i1 = wp.indexOf(':',4); if (i1<0) return null; return { prefix:'url', type:wp.slice(4,i1), src:wp.slice(i1+1) } }
  return null
}

export default function WallpaperPicker({ currentWallpaper, onSelect, onUpload, onCancel, onConfirm, bgBlur, bgOpacity, onSetBlur, onSetOpacity }) {
  const fileInputRef = useRef(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [mediaType, setMediaType] = useState(null)
  const [sourceMode, setSourceMode] = useState('file')
  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleMediaFile = (type, e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (type==='image'&&!file.type.startsWith('image/')&&file.type!=='image/gif'){alert('请选择图片文件');e.target.value='';return}
    if (type==='gif'&&file.type!=='image/gif'){alert('请选择GIF文件');e.target.value='';return}
    if (type==='video'&&!file.type.startsWith('video/')){alert('请选择视频文件');e.target.value='';return}
    const r=new FileReader(); r.onload=ev=>{ onUpload(`media:${type}:${ev.target?.result}`); onConfirm() }; r.readAsDataURL(file); e.target.value=''
  }

  const handleUrlSubmit = () => {
    const url = urlInput.trim(); if(!url){alert('请输入URL地址');return}
    let type='image'; const l=url.toLowerCase()
    if(/\.gif($|\?)/.test(l))type='gif'; else if(/\.(mp4|webm|ogg|mov)($|\?)/.test(l))type='video'
    else if(/\.(png|jpg|jpeg|webp|svg|bmp)($|\?)/.test(l))type='image'
    onUpload(`url:${type}:${url}`); onConfirm()
  }

  const bg = parseBg(currentWallpaper)
  const hasAnyCustom = !!bg
  const getData = (t) => bg?.prefix==='media'&&bg?.type===t?bg.src:null
  const getUrl  = (t) => bg?.prefix==='url'&&bg?.type===t?bg.src:null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.picker} onClick={e=>e.stopPropagation()}>
        <div className={styles.fixedTop}>
          <div className={styles.header}>
            <h3>选择背景</h3>
            <button className={`${styles.closeBtn} ${styles.pressable}`} onClick={onCancel}><X size={18}/></button>
          </div>
        </div>

        <div className={styles.scrollBody}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>预设背景</div>
            <div className={styles.wallpapers}>
              {presets.map(p=>{
                const ia=currentWallpaper===p.id||(p.id==='default'&&(!currentWallpaper||currentWallpaper==='default'||!presets.find(x=>x.id===currentWallpaper)&&!isCustom(currentWallpaper)))
                return <button key={p.id} className={`${styles.wallpaper} ${ia?styles.active:''}`} onClick={()=>onSelect(p.id)} style={{background:p.color||p.gradient}}>
                  <span className={p.gradient?styles.gradientLabel:''}>{p.name}</span>
                </button>
              })}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>自定义背景</div>

            {hasAnyCustom && (
              <div className={styles.customPreview}>
                {(getData('image')||getUrl('image')) && <img src={getData('image')||getUrl('image')} alt="" className={styles.previewImage}/>}
                {(getData('gif')||getUrl('gif')) && <img src={getData('gif')||getUrl('gif')} alt="" className={styles.previewImage}/>}
                {(getData('video')||getUrl('video')) && <video src={getData('video')||getUrl('video')} className={styles.previewVideo} autoPlay muted loop playsInline/>}
                <div className={styles.previewActions}>
                  <button className={styles.changeBtn} onClick={()=>{setShowMediaSelector(v=>!v);setMediaType(null);setSourceMode('file');setUrlInput('')}}><Upload size={14}/>更换背景</button>
                  <button className={styles.removeBtn} onClick={()=>onSelect('default')}><X size={14}/></button>
                </div>
              </div>
            )}

            {(!hasAnyCustom||showMediaSelector)&&(
              <div className={styles.mediaSelector}>
                <div className={styles.mediaSelectorTitle}>{hasAnyCustom?'选择新的背景类型':'上传文件 / URL 链接'}</div>
                <div className={styles.sourceTabs}>
                  <button className={`${styles.sourceTab} ${sourceMode==='file'?styles.sourceTabActive:''}`} onClick={()=>setSourceMode('file')}><Upload size={14}/>本地文件</button>
                  <button className={`${styles.sourceTab} ${sourceMode==='url'?styles.sourceTabActive:''}`} onClick={()=>setSourceMode('url')}><Link size={14}/>URL 链接</button>
                </div>
                {sourceMode==='file'&&(<>
                  <div className={styles.mediaOptions}>
                    {[{type:'image',icon:FileImage,label:'图片',desc:'静态图'},{type:'gif',icon:Film,label:'GIF',desc:'动图'},{type:'video',icon:Video,label:'视频',desc:'视频'}].map(m=>(
                      <button key={m.type} className={styles.mediaOption} onClick={()=>setMediaType(mediaType===m.type?null:m.type)}>
                        <m.icon size={20}/><span>{m.label}</span><span className={styles.mediaDesc}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                  {mediaType&&(
                    <div className={styles.uploadArea}>
                      <div className={styles.uploadLabel}>选择{mediaType==='image'?'图片':mediaType==='gif'?'GIF':'视频'}文件</div>
                      <button className={styles.uploadBtn} onClick={()=>fileInputRef.current?.click()}><Upload size={14}/>浏览文件</button>
                      <input ref={fileInputRef} type="file" accept={mediaType==='image'?'image/png,image/jpeg,image/webp':mediaType==='gif'?'image/gif':'video/mp4,video/webm,video/ogg'} onChange={e=>handleMediaFile(mediaType,e)} style={{display:'none'}}/>
                    </div>
                  )}
                </>)}
                {sourceMode==='url'&&(
                  <div className={styles.urlArea}>
                    <div className={styles.uploadLabel}>输入图片 / GIF / 视频的直链地址</div>
                    <input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleUrlSubmit()}} placeholder="https://example.com/bg.png" className={styles.urlInput}/>
                    <div className={styles.urlHint}>支持 PNG / JPG / WebP / GIF / MP4 / WebM 等常见格式</div>
                    <button className={styles.primaryBtn} onClick={handleUrlSubmit}><Link size={14}/>应用链接</button>
                    <p className={styles.urlWarn}>⚠ 请确保链接支持跨域访问，否则可能无法显示</p>
                  </div>
                )}
              </div>
            )}

            {hasAnyCustom&&(
              <div className={styles.effectsControl}>
                <div className={styles.effectsTitle}>背景效果</div>
                <SliderRow label="模糊度" value={bgBlur} max={50} step={1} suffix="px" onChange={onSetBlur}/>
                <SliderRow label="不透明度" value={bgOpacity} max={100} step={5} suffix="%" onChange={onSetOpacity}/>
              </div>
            )}
          </div>
        </div>

        {/* 底部确认/取消 */}
        <div className={styles.footer}>
          <button className={`${styles.footerBtn} ${styles.cancelBtn} ${styles.pressable}`} onClick={onCancel}>取消</button>
          <button className={`${styles.footerBtn} ${styles.confirmBtn} ${styles.pressable}`} onClick={onConfirm}>确认</button>
        </div>

      </div>
    </div>
  )
}

function SliderRow({label,value,max,step,suffix,onChange}){
  return <div className={styles.sliderRow}>
    <div className={styles.sliderHeader}><span className={styles.sliderLabel}>{label}</span><span className={styles.sliderValue}>{value}{suffix}</span></div>
    <input type="range" min={0} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} className={styles.sliderInput}/>
  </div>
}
