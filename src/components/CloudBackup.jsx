import { useState, useEffect, useCallback } from 'react'
import { Cloud, UploadCloud, DownloadCloud, Settings, Check, AlertCircle, Trash2, X, RefreshCw } from 'lucide-react'
import WebDAVClient, { getWebDAVConfig, saveWebDAVConfig, clearWebDAVConfig } from '../utils/webdav'
import ConfirmDialog from './ConfirmDialog'
import styles from './CloudBackup.module.css'

export default function CloudBackup() {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [backupInfo, setBackupInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [autoBackup, setAutoBackup] = useState(() => {
    return localStorage.getItem('nav-auto-backup') === 'true'
  })
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null })

  // 检查是否已配置
  useEffect(() => {
    const config = getWebDAVConfig()
    if (config) {
      setUsername(config.username)
      setIsConnected(true)
      checkBackupStatus(config)
    }
  }, [])

  // 自动备份监听
  useEffect(() => {
    if (!autoBackup || !isConnected) return

    const handleStorageChange = () => {
      const config = getWebDAVConfig()
      if (config) {
        debouncedAutoBackup(config)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [autoBackup, isConnected])

  let backupTimeout = null
  const debouncedAutoBackup = (config) => {
    clearTimeout(backupTimeout)
    backupTimeout = setTimeout(() => {
      performBackup(config, true)
    }, 3000)
  }

  const showMsg = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const checkBackupStatus = async (config) => {
    try {
      const client = new WebDAVClient(config.username, config.password)
      const info = await client.getBackupInfo()
      setBackupInfo(info)
    } catch {
      setBackupInfo(null)
    }
  }

  const handleConnect = async () => {
    if (!username || !password) {
      showMsg('请填写账号和密码', 'error')
      return
    }

    setLoading(true)
    try {
      const client = new WebDAVClient(username, password)
      const connected = await client.testConnection()
      
      if (connected) {
        saveWebDAVConfig({ username, password })
        setIsConnected(true)
        setShowConfig(false)
        showMsg('连接成功！')
        checkBackupStatus({ username, password })
      } else {
        showMsg('连接失败，请检查账号密码', 'error')
      }
    } catch (error) {
      showMsg('连接失败: ' + error.message, 'error')
    }
    setLoading(false)
  }

  const handleDisconnect = () => {
    clearWebDAVConfig()
    setIsConnected(false)
    setUsername('')
    setPassword('')
    setBackupInfo(null)
    showMsg('已断开连接')
  }

  const performBackup = async (config, silent = false) => {
    const cfg = config || getWebDAVConfig()
    if (!cfg) return

    if (!silent) setLoading(true)
    try {
      const client = new WebDAVClient(cfg.username, cfg.password)
      const data = localStorage.getItem('nav-portal-data')
      
      if (!data) {
        if (!silent) showMsg('没有数据需要备份', 'error')
        return
      }

      const result = await client.backup(JSON.parse(data))
      if (result.success) {
        if (!silent) showMsg('备份成功！')
        checkBackupStatus(cfg)
      } else {
        if (!silent) showMsg('备份失败: ' + result.error, 'error')
      }
    } catch (error) {
      if (!silent) showMsg('备份失败: ' + error.message, 'error')
    }
    if (!silent) setLoading(false)
  }

  const performRestore = async () => {
    const config = getWebDAVConfig()
    if (!config) return

    setConfirmDialog({
      open: true,
      title: '恢复数据',
      message: '恢复将覆盖当前所有数据，确定继续吗？',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        doRestore(config)
      }
    })
  }

  const doRestore = async (config) => {
    setLoading(true)
    try {
      const client = new WebDAVClient(config.username, config.password)
      const result = await client.restore()
      
      if (result.success) {
        localStorage.setItem('nav-portal-data', JSON.stringify(result.data))
        showMsg('恢复成功！页面将刷新...')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        showMsg('恢复失败: ' + result.error, 'error')
      }
    } catch (error) {
      showMsg('恢复失败: ' + error.message, 'error')
    }
    setLoading(false)
  }

  const toggleAutoBackup = () => {
    const newValue = !autoBackup
    setAutoBackup(newValue)
    localStorage.setItem('nav-auto-backup', newValue.toString())
    showMsg(newValue ? '已开启自动备份' : '已关闭自动备份')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '未知'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <>
      {/* 浮动按钮 */}
      <button
        className={styles.backupBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="云备份"
      >
        <Cloud size={20} />
      </button>

      {/* 备份面板 */}
      {isOpen && (
        <div className={styles.backupPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <Cloud size={18} />
              坚果云备份
            </h3>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {messageType === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {message}
            </div>
          )}

          {!isConnected ? (
            <div className={styles.configSection}>
              <p className={styles.configHint}>
                使用坚果云 WebDAV 同步您的导航数据
              </p>
              <div className={styles.inputGroup}>
                <label>坚果云账号</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="邮箱或手机号"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>应用密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="在坚果云安全选项中生成"
                />
              </div>
              <p className={styles.helpText}>
                💡 在坚果云官网 → 账户信息 → 安全选项 → 添加应用密码
              </p>
              <button
                className={styles.connectBtn}
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? <RefreshCw size={16} className={styles.spin} /> : <Cloud size={16} />}
                {loading ? '连接中...' : '连接坚果云'}
              </button>
            </div>
          ) : (
            <div className={styles.connectedSection}>
              <div className={styles.statusBar}>
                <span className={styles.statusDot} />
                <span>已连接: {username}</span>
              </div>

              {backupInfo?.exists && (
                <div className={styles.backupInfo}>
                  <p>上次备份: {formatDate(backupInfo.modified)}</p>
                  <p>文件大小: {formatSize(backupInfo.size)}</p>
                </div>
              )}

              <div className={styles.actionButtons}>
                <button
                  className={styles.actionBtn}
                  onClick={() => performBackup()}
                  disabled={loading}
                >
                  <UploadCloud size={16} />
                  立即备份
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={performRestore}
                  disabled={loading}
                >
                  <DownloadCloud size={16} />
                  恢复数据
                </button>
              </div>

              <div className={styles.settingsSection}>
                <label className={styles.toggleRow}>
                  <span>自动备份</span>
                  <button
                    className={`${styles.toggle} ${autoBackup ? styles.toggleOn : ''}`}
                    onClick={toggleAutoBackup}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </label>
              </div>

              <button className={styles.disconnectBtn} onClick={handleDisconnect}>
                <Trash2 size={14} />
                断开连接
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); setConfirmDialog(prev => ({ ...prev, open: false })) }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}
