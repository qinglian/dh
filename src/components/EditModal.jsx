import { X, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './EditModal.module.css'
import ConfirmDialog from './ConfirmDialog'

export default function EditModal({ isOpen, onClose, mode, data, categoryTags = [], onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    tag: '',
    iconUrl: '',
    tags: []
  })
  const [newTag, setNewTag] = useState('')
  const inputRef = useRef(null)

  // 确认弹窗 state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const confirmActionRef = useRef(null)

  useEffect(() => {
    if (isOpen && data) {
      setFormData({
        name: data.name || '',
        url: data.url || '',
        description: data.description || '',
        tag: data.tag || (categoryTags[0] || ''),
        iconUrl: data.iconUrl || '',
        tags: data.tags || categoryTags || []
      })
    } else if (isOpen && !data) {
      setFormData({
        name: '',
        url: '',
        description: '',
        tag: categoryTags[0] || '',
        iconUrl: '',
        tags: categoryTags || []
      })
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, data, categoryTags])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (mode === 'site' && !formData.url.trim()) return
    onSave(formData)
    onClose()
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setConfirmTitle('删除子分类')
    setConfirmMessage(`确定要删除子分类「${tagToRemove}」吗？`)
    confirmActionRef.current = () => {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToRemove)
      }))
      // 放入回收站
      try {
        const trashRaw = localStorage.getItem('nav-trash')
        const trash = trashRaw ? JSON.parse(trashRaw) : { deletedCategories: [], deletedTags: [], deletedEngines: [], deletedPages: [] }
        trash.deletedTags.push({
          id: 'tag_' + Date.now(),
          name: tagToRemove,
          categoryId: data?.id || '',
          categoryName: data?.name || '',
          deletedAt: Date.now(),
        })
        localStorage.setItem('nav-trash', JSON.stringify(trash))
      } catch (e) { /* ignore */ }
    }
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (confirmActionRef.current) confirmActionRef.current()
    setConfirmOpen(false)
    confirmActionRef.current = null
  }

  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    confirmActionRef.current = null
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && document.activeElement === document.getElementById('newTagInput')) {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>
              {mode === 'site' 
                ? (data ? '编辑网站' : '添加网站')
                : (data ? '编辑分类' : '添加分类')
              }
            </h2>
            <button onClick={onClose} className={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* 名称 */}
            <div className={styles.field}>
              <label className={styles.label}>
                {mode === 'site' ? '网站名称' : '分类名称'} *
              </label>
              <input
                ref={inputRef}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={mode === 'site' ? '例如：GitHub' : '例如：开发工具'}
                className={styles.input}
                required
              />
            </div>

            {mode === 'site' ? (
              <>
                {/* 网址 */}
                <div className={styles.field}>
                  <label className={styles.label}>网址 *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className={styles.input}
                    required
                  />
                </div>

                {/* 描述 */}
                <div className={styles.field}>
                  <label className={styles.label}>描述</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简短描述..."
                    className={styles.input}
                  />
                </div>

                {/* 图标URL */}
                <div className={styles.field}>
                  <label className={styles.label}>图标URL</label>
                  <input
                    type="url"
                    value={formData.iconUrl}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                    placeholder="https://example.com/icon.png（留空自动获取）"
                    className={styles.input}
                  />
                  <span className={styles.fieldHint}>留空将自动获取网站图标，获取失败则显示首字母</span>
                </div>

                {/* 子标签选择 */}
                <div className={styles.field}>
                  <label className={styles.label}>所属子标签</label>
                  <div className={styles.tagSelect}>
                    {formData.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`${styles.tagOption} ${formData.tag === tag ? styles.active : ''}`}
                        onClick={() => setFormData({ ...formData, tag })}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 子标签管理 */}
                <div className={styles.field}>
                  <label className={styles.label}>子标签管理</label>
                  <div className={styles.tagManager}>
                    <div className={styles.tagList}>
                      {formData.tags.map((tag, index) => (
                        <div key={index} className={styles.tagItem}>
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className={styles.tagRemoveBtn}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.tagAddRow}>
                      <input
                        id="newTagInput"
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="输入新标签名称"
                        className={styles.tagInput}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className={styles.tagAddBtn}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>
                取消
              </button>
              <button type="submit" className={styles.saveBtn}>
                {data ? '保存' : '添加'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {createPortal(
        <ConfirmDialog
          isOpen={confirmOpen}
          title={confirmTitle}
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />,
        document.body
      )}
    </>
  )
}
