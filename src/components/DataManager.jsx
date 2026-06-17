import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, Upload, Settings, X, AlertCircle, RefreshCw, Server, RotateCcw, Database, HardDrive, Cloud, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { WEBDAV_PRESETS, createClient, getWebDAVConfig, saveWebDAVConfig, clearWebDAVConfig } from '../utils/webdav'
import ConfirmDialog from './ConfirmDialog'
import styles from './DataManager.module.css'

const DATA_KEYS = [
  'nav-data-v2', 'nav-startpage-pages', 'nav-pages',
  'nav-search-engines', 'nav-current-engine', 'nav-page-data', 'nav-startpage-pageData',
]
function getConfigKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nav-') && !DATA_KEYS.includes(k)) keys.push(k)
  }
  return keys
}

export default function DataManager({ isEditMode }) {
  const { data, resetData } = useData()
  const fileInputRef = useRef(null)
  const modalRef = useRef(null)
  const [showModal, setShowModal] = useState(false)

  // Tab
  const [tab, setTab] = useState('export')

  // 导出/导入范围
  const [exportData, setExportData] = useState(true)
  const [exportConfig, setExportConfig] = useState(true)
  const [importData, setImportData] = useState(true)
  const [importConfig, setImportConfig] = useState(true)
  const [cloudBackupData, setCloudBackupData] = useState(true)
  const [cloudBackupConfig, setCloudBackupConfig] = useState(true)

  // 云备份
  const [selectedPreset, setSelectedPreset] = useState('jianguoyun')
  const [customHost, setCustomHost] = useState('')
  const [cloudUsername, setCloudUsername] = useState('')
  const [cloudPassword, setCloudPassword] = useState('')
  const [cloudConnected, setCloudConnected] = useState(false)
  const [cloudConnectedHost, setCloudConnectedHost] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudMsg, setCloudMsg] = useState('')
  const [cloudMsgType, setCloudMsgType] = useState('')
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('nav-auto-backup') === 'true')

  // 恢复默认
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(3)
  const [resetInput, setResetInput] = useState('')
  const [resetScopeData, setResetScopeData] = useState(true)
  const [resetScopeConfig, setResetScopeConfig] = useState(true)
  const resetTimerRef = useRef(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null })

  /* ---------- 倒计时 ---------- */
  useEffect(() => {
    if (showResetDialog && resetCountdown > 0) {
      resetTimerRef.current = setTimeout(() => setResetCountdown(p => p - 1), 1000)
      return () => clearTimeout(resetTimerRef.current)
    }
  }, [showResetDialog, resetCountdown])

  /* ---------- 初始化云配置 ---------- */
  useEffect(() => {
    const config = getWebDAVConfig()
    if (config) {
      setCloudUsername(config.username)
      setCloudConnected(true)
      setCloudConnectedHost(config.host)
      const m = WEBDAV_PRESETS.find(p => p.host === config.host)
      if (m) setSelectedPreset(m.id)
      else { setSelectedPreset('custom'); setCustomHost(config.host) }
    }
  }, [])

  /* ---------- 弹窗外点击关闭 & 滚动锁定 ---------- */
  useEffect(() => {
    if (!showModal) return
    const h = e => { if (modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false) }
    document.addEventListener('mousedown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', h)
      document.body.style.overflow = prev
    }
  }, [showModal])

  const getCurrentHost = () => selectedPreset === 'custom' ? customHost : (WEBDAV_PRESETS.find(p => p.id === selectedPreset)?.host || '')
  const getCurrentHelp = () => selectedPreset === 'custom' ? '填写您的 WebDAV 服务器地址、账号和密码' : (WEBDAV_PRESETS.find(p => p.id === selectedPreset)?.helpText || '')

  /* ============ 导出 ============ */
  const handleExport = () => {
    const obj = { version: '2.0', exportTime: new Date().toISOString(), type: { data: exportData, config: exportConfig } }
    if (exportData) { const d = {}; for (const k of DATA_KEYS) { const v = localStorage.getItem(k); if (v != null) d[k] = v }; obj.data = d }
    if (exportConfig) { const c = {}; for (const k of getConfigKeys()) c[k] = localStorage.getItem(k); obj.config = c }
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const parts = []; if (exportData) parts.push('数据'); if (exportConfig) parts.push('配置')
    a.download = `清炼导航_${parts.join('+')}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
    a.href = url; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    setShowModal(false)
  }

  /* ============ 导入 ============ */
  const handleImportClick = () => fileInputRef.current?.click()
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imp = JSON.parse(event.target?.result); const isV2 = imp.version === '2.0' && imp.type
        if (isV2) {
          if (importData && imp.data) for (const [k, v] of Object.entries(imp.data)) localStorage.setItem(k, v)
          if (importConfig && imp.config) for (const [k, v] of Object.entries(imp.config)) localStorage.setItem(k, v)
        } else {
          if (!imp.data?.categories) { alert('配置文件格式不正确'); return }
          if (importData) localStorage.setItem('nav-data-v2', JSON.stringify(imp.data))
          if (importConfig) { if (imp.searchEngines) localStorage.setItem('nav-search-engines', JSON.stringify(imp.searchEngines)); if (imp.currentEngine) localStorage.setItem('nav-current-engine', imp.currentEngine) }
        }
        setShowModal(false)
        const s = []; if (isV2 ? (importData && s.push('数据'), importConfig && s.push('配置')) : s.push('数据'))
        setConfirmDialog({ open: true, title: '导入成功', message: `${s.join(' + ')} 导入成功！页面将刷新。`, onConfirm: () => { setConfirmDialog(p => ({ ...p, open: false })); window.location.reload() } })
      } catch { alert('导入失败：文件格式错误') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  /* ============ 云备份 ============ */
  const showCloudMsg = (msg, type = 'success') => { setCloudMsg(msg); setCloudMsgType(type); setTimeout(() => setCloudMsg(''), 3000) }
  const handleCloudConnect = async () => {
    const host = getCurrentHost(); if (!host || !cloudUsername || !cloudPassword) { showCloudMsg('请填写完整信息', 'error'); return }
    setCloudLoading(true)
    try {
      const client = createClient({ host, username: cloudUsername, password: cloudPassword })
      if (await client.testConnection()) {
        saveWebDAVConfig({ host, username: cloudUsername, password: cloudPassword, presetId: selectedPreset })
        setCloudConnected(true); setCloudConnectedHost(host); showCloudMsg('连接成功！')
      } else showCloudMsg('连接失败，请检查服务器地址、账号密码', 'error')
    } catch (err) { showCloudMsg('连接失败: ' + err.message, 'error') }
    setCloudLoading(false)
  }
  const handleCloudBackup = async () => {
    const config = getWebDAVConfig(); if (!config) return; setCloudLoading(true)
    try {
      const client = createClient(config); const obj = { version: '2.0', exportTime: new Date().toISOString() }
      if (cloudBackupData) { const d = {}; for (const k of DATA_KEYS) { const v = localStorage.getItem(k); if (v != null) d[k] = v }; obj.data = d }
      if (cloudBackupConfig) { const c = {}; for (const k of getConfigKeys()) c[k] = localStorage.getItem(k); obj.config = c }
      const r = await client.backup(obj); showCloudMsg(r.success ? '云端备份成功！' : '备份失败: ' + r.error, r.success ? 'success' : 'error')
    } catch (err) { showCloudMsg('备份失败: ' + err.message, 'error') }
    setCloudLoading(false)
  }
  const doCloudRestore = async (config) => {
    setCloudLoading(true)
    try {
      const client = createClient(config); const r = await client.restore()
      if (r.success && r.data) {
        const rd = r.data
        if (typeof rd === 'object' && !Array.isArray(rd)) {
          if (rd.data) for (const [k, v] of Object.entries(rd.data)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
          if (rd.config) for (const [k, v] of Object.entries(rd.config)) localStorage.setItem(k, v)
        } else localStorage.setItem('nav-data-v2', JSON.stringify(rd))
        showCloudMsg('恢复成功！页面将刷新...'); setTimeout(() => window.location.reload(), 1500)
      } else showCloudMsg('恢复失败: ' + (r.error || '无数据'), 'error')
    } catch (err) { showCloudMsg('恢复失败: ' + err.message, 'error') }
    setCloudLoading(false)
  }
  const handleCloudRestore = () => {
    const config = getWebDAVConfig(); if (!config) return
    setConfirmDialog({ open: true, title: '恢复数据', message: '从云端恢复将覆盖当前所有数据，确定继续吗？', onConfirm: () => { setConfirmDialog(p => ({ ...p, open: false })); doCloudRestore(config) } })
  }
  const handleCloudDisconnect = () => { clearWebDAVConfig(); setCloudConnected(false); setCloudUsername(''); setCloudPassword(''); showCloudMsg('已断开云端连接') }
  const toggleAutoBackup = () => { const v = !autoBackup; setAutoBackup(v); localStorage.setItem('nav-auto-backup', v.toString()); showCloudMsg(v ? '已开启自动备份' : '已关闭自动备份') }

  /* ============ 恢复默认 ============ */
  const openResetDialog = () => { setShowResetDialog(true); setResetCountdown(3); setResetInput('') }
  const closeResetDialog = () => { setShowResetDialog(false); if (resetTimerRef.current) clearTimeout(resetTimerRef.current) }
  const handleResetAll = () => {
    if (resetInput !== '我已确认删除') return
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('nav-')) continue
      const isData = DATA_KEYS.includes(k)
      const isConfig = !isData
      if ((isData && resetScopeData) || (isConfig && resetScopeConfig)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    closeResetDialog()
    window.location.reload()
  }

  /* ============ 自定义下拉（替换原生 select 以解决深色模式不可见问题） ============ */
  const CustomSelect = ({ value, onChange, options }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useEffect(() => {
      if (!open) return
      const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
    }, [open])
    const selected = options.find(o => o.value === value)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const ddBg = isDark ? 'rgba(40,40,44,1)' : '#fff'
    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={styles.formSelect}
          style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        >
          <span>{selected?.label || value}</span>
          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>▼</span>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            marginTop: 4, borderRadius: 10, overflow: 'hidden',
            border: '1.5px solid var(--glass-border)',
            background: ddBg,
            boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(0,0,0,0.04)',
          }}>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  background: value === o.value ? 'var(--accent-primary)' : 'transparent',
                  color: value === o.value ? '#fff' : 'var(--text-primary)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'rgba(127,127,127,0.12)' }}
                onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'transparent' }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ============ 勾选按钮 ============ */
  const CheckBtn = ({ label, value, onChange }) => (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8,
      background: value ? 'rgba(0,122,255,0.08)' : 'rgba(127,127,127,0.04)',
      border: value ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--glass-border)',
      color: value ? 'var(--accent-primary)' : 'var(--text-secondary)',
      transition: 'all .15s ease', userSelect: 'none',
    }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent-primary)', width: 14, height: 14, cursor: 'pointer' }} />
      {label}
    </label>
  )

  /* ============ 主题色 ============ */
  const th = document.documentElement.getAttribute('data-theme') || 'light'
  const isDark = th === 'dark'

  const TABS = [
    { key: 'export', icon: Download, label: '导出' },
    { key: 'import', icon: Upload, label: '导入' },
    { key: 'cloud', icon: Cloud, label: '云备份' },
    { key: 'reset', icon: Trash2, label: '重置', danger: true },
  ]

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
      
      {isEditMode && (
        <div className={styles.container}>
          <button className={styles.menuBtn} onClick={() => { setShowModal(true); setTab('export'); window.dispatchEvent(new CustomEvent('closeOtherMenus', { detail: 'dataManager' })) }}>
            <Settings size={14} />
            <span>数据</span>
          </button>
        </div>
      )}

      {/* ============ 弹窗 ============ */}
      {showModal && createPortal(
        <div className={styles.modalOverlay}>
          <div ref={modalRef} className={styles.modal}>
            {/* 头部 */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span className={styles.modalTitleIcon}><Database size={18} /></span>
                <span>数据管理</span>
              </div>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Tab 切换 */}
            <div className={styles.modalTabs}>
              {TABS.map(t => (
                <button key={t.key}
                  className={`${styles.modalTab} ${tab === t.key ? styles.modalTabActive : ''} ${t.danger ? styles.modalTabDanger : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  <t.icon size={14} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 内容 */}
            <div className={styles.modalBody}>
              {/* ======== 导出 ======== */}
              {tab === 'export' && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Download size={16} />
                    <span>导出数据</span>
                    <span className={styles.sectionDesc}>保存到本地 JSON 文件</span>
                  </div>
                  <div className={styles.sectionContent}>
                    <div className={styles.scopeLabel}>选择导出范围</div>
                    <div className={styles.checkGroup}>
                      <CheckBtn label="数据" value={exportData} onChange={setExportData} />
                      <CheckBtn label="配置" value={exportConfig} onChange={setExportConfig} />
                    </div>
                    <div className={styles.scopeHint}>
                      <span>数据：分类、站点、子分类、搜索引擎、多页面</span>
                      <span>配置：主题、样式、控件状态、壁纸等</span>
                    </div>
                    <button className={styles.primaryBtn} onClick={handleExport} disabled={!exportData && !exportConfig}>
                      <Download size={14} />导出选中项
                    </button>
                  </div>
                </div>
              )}

              {/* ======== 导入 ======== */}
              {tab === 'import' && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Upload size={16} />
                    <span>导入数据</span>
                    <span className={styles.sectionDesc}>从文件恢复</span>
                  </div>
                  <div className={styles.sectionContent}>
                    <div className={styles.scopeLabel}>选择导入范围</div>
                    <div className={styles.checkGroup}>
                      <CheckBtn label="数据" value={importData} onChange={setImportData} />
                      <CheckBtn label="配置" value={importConfig} onChange={setImportConfig} />
                    </div>
                    <div className={styles.note}>⚠ 导入将覆盖现有同名数据</div>
                    <button className={styles.primaryBtn} onClick={handleImportClick} disabled={!importData && !importConfig}>
                      <Upload size={14} />选择文件导入
                    </button>
                  </div>
                </div>
              )}

              {/* ======== 云备份 ======== */}
              {tab === 'cloud' && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Server size={16} />
                    <span>WebDAV 云备份</span>
                    {cloudConnected && <span className={styles.cloudBadgeInline}>已连接</span>}
                  </div>
                  <div className={styles.sectionContent}>
                    {cloudMsg && (
                      <div className={`${styles.cloudMsg} ${styles[cloudMsgType] || ''}`}>{cloudMsg}</div>
                    )}

                    {!cloudConnected ? (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>备份服务</label>
                          <CustomSelect value={selectedPreset} onChange={setSelectedPreset}
                            options={WEBDAV_PRESETS.map(p => ({ value: p.id, label: p.name }))} />
                        </div>
                        {selectedPreset === 'custom' && (
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>服务器地址</label>
                            <input type="text" value={customHost} onChange={e => setCustomHost(e.target.value)} placeholder="https://your-server.com/dav" className={styles.formInput} />
                          </div>
                        )}
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>账号</label>
                          <input type="text" value={cloudUsername} onChange={e => setCloudUsername(e.target.value)} placeholder="用户名/邮箱" className={styles.formInput} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>密码</label>
                          <input type="password" value={cloudPassword} onChange={e => setCloudPassword(e.target.value)} placeholder="登录密码或应用密码" className={styles.formInput} />
                        </div>
                        <div className={styles.formHint}>💡 {getCurrentHelp()}</div>
                        <button className={styles.primaryBtn} onClick={handleCloudConnect} disabled={cloudLoading}>
                          {cloudLoading ? <RefreshCw size={14} className={styles.spin} /> : <Server size={14} />}
                          {cloudLoading ? '连接中...' : '连接服务器'}
                        </button>
                      </>
                    ) : (
                      <div className={styles.connectedCard}>
                        <span className={styles.connectedDot} />
                        <div>
                          <div className={styles.connectedName}>{cloudUsername}</div>
                          <div className={styles.connectedHost}>{cloudConnectedHost}</div>
                        </div>
                        <button className={styles.dangerBtn} onClick={handleCloudDisconnect} style={{marginLeft:'auto',padding:'4px 10px',fontSize:11}}>
                          断开
                        </button>
                      </div>
                    )}

                    {/* 备份范围 —— 连接前后始终可见 */}
                    <div className={styles.scopeLabel}>备份范围</div>
                    <div className={styles.checkGroup}>
                      <CheckBtn label="数据" value={cloudBackupData} onChange={setCloudBackupData} />
                      <CheckBtn label="配置" value={cloudBackupConfig} onChange={setCloudBackupConfig} />
                    </div>

                    {cloudConnected && (
                      <>
                        <div className={styles.btnRow}>
                          <button className={styles.primaryBtn} onClick={handleCloudBackup} disabled={cloudLoading || (!cloudBackupData && !cloudBackupConfig)}>
                            <Upload size={14} />立即备份
                          </button>
                          <button className={styles.secondaryBtn} onClick={handleCloudRestore} disabled={cloudLoading}>
                            <Download size={14} />恢复数据
                          </button>
                        </div>
                        <label className={styles.toggleRow} onClick={toggleAutoBackup}>
                          <span>自动备份</span>
                          <button className={`${styles.toggleSwitch} ${autoBackup ? styles.toggleOn : ''}`}>
                            <span className={styles.toggleThumb} />
                          </button>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ======== 重置 ======== */}
              {tab === 'reset' && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Trash2 size={16} />
                    <span>恢复默认</span>
                    <span className={styles.sectionDesc}>按需选择</span>
                  </div>
                  <div className={styles.sectionContent}>
                    <div className={styles.resetWarningBox}>
                      <AlertCircle size={16} />
                      <span>此操作将清除已选类型的本地数据，恢复到初始状态，不可撤销。</span>
                    </div>
                    <div className={styles.scopeLabel}>选择重置范围</div>
                    <div className={styles.checkGroup}>
                      <CheckBtn label="数据" value={resetScopeData} onChange={setResetScopeData} />
                      <CheckBtn label="配置" value={resetScopeConfig} onChange={setResetScopeConfig} />
                    </div>
                    <div className={styles.scopeHint}>
                      <span>数据：分类、站点、子分类、搜索引擎、多页面</span>
                      <span>配置：主题、样式、控件状态、壁纸等</span>
                    </div>
                    <button className={styles.dangerBtn} onClick={openResetDialog} disabled={!resetScopeData && !resetScopeConfig}>
                      <RotateCcw size={14} />恢复选中项到默认
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className={styles.modalFooter}>
              <AlertCircle size={12} />
              <span>导入将覆盖现有选中类型数据</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============ 恢复默认确认弹窗 ============ */}
      {showResetDialog && createPortal(
        (() => {
          const scopedParts = []
          if (resetScopeData) scopedParts.push('数据')
          if (resetScopeConfig) scopedParts.push('配置')
          const scopedLabel = scopedParts.join('和')
          return (
        <div className={styles.resetOverlay} onClick={closeResetDialog}>
          <div className={styles.resetDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.resetDialogHeader}>
              <span className={styles.resetDialogTitle}>恢复默认{scopedLabel}</span>
              <div className={styles.resetCountdownBadge}>{resetCountdown > 0 ? `${resetCountdown}s` : '✓'}</div>
              <button className={styles.resetCloseBtn} onClick={closeResetDialog}><X size={16} /></button>
            </div>
            <div className={styles.resetDialogBody}>
              <div className={styles.resetWarning}>
                <AlertCircle size={18} />
                <span>此操作将清除已选的本地{scopedLabel}，恢复为初始状态。此操作不可撤销。</span>
              </div>
              {resetCountdown > 0 ? (
                <div className={styles.resetWaiting}><span>请在倒计时结束后操作</span></div>
              ) : (
                <>
                  <div className={styles.resetInputLabel}>请输入 <strong>我已确认删除</strong> 以确认操作</div>
                  <input type="text" value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="我已确认删除" className={styles.resetInput} autoFocus />
                </>
              )}
            </div>
            <div className={styles.resetDialogFooter}>
              <button className={styles.resetCancelBtn} onClick={closeResetDialog}>取消</button>
              <button className={styles.resetConfirmBtn} disabled={resetCountdown > 0 || resetInput !== '我已确认删除'} onClick={handleResetAll}>确认清除</button>
            </div>
          </div>
        </div>
        )
      })()
        ,
        document.body
      )}

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); setConfirmDialog(p => ({ ...p, open: false })) }}
        onCancel={() => setConfirmDialog(p => ({ ...p, open: false }))}
      />
    </>
  )
}
