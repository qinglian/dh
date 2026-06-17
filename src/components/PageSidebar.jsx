/*
 * PageSidebar - 多页侧边导航栏
 * 功能：提供多个导航页面的切换、排序、编辑与删除功能，支持紧凑模式（hover 提示）和完整模式（始终展开）。
 *       紧凑模式下鼠标悬停显示提示，进入编辑模式时展开为完整侧边栏，支持拖拽排序和行内编辑。
 * Props：
 *   pages          {Array}   页面列表，每项包含 { id, name, icon }
 *   currentPageId  {string}  当前激活的页面ID
 *   onPageChange   {function(id)}  切换页面回调
 *   onAddPage      {function(name)}  添加新页面回调
 *   onEditPage     {function(id, {name})}  编辑页面名称回调
 *   onDeletePage   {function(id)}  删除页面回调
 *   onReorderPages {function(pages)}  拖拽排序完成回调，传入新顺序的页面数组
 *   compact        {boolean}  是否为紧凑模式，默认 true。紧凑模式仅 hover 时显示提示，不展开面板
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Home, FileText, Plus, X, Pencil, GripVertical } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import ConfirmDialog from './ConfirmDialog'
import styles from './PageSidebar.module.css'

/* 页面图标映射表：根据 icon 名称返回对应图标组件 */
const ICON_MAP = {
  Home,
  FileText,
}

export default function PageSidebar({
  pages,
  currentPageId,
  onPageChange,
  onAddPage,
  onEditPage,
  onDeletePage,
  onReorderPages,
  compact = true,
}) {
  const { theme } = useTheme()

  /* 侧边栏展开/收起状态，紧凑模式下默认收起 */
  const [isExpanded, setIsExpanded] = useState(false)
  /* 鼠标悬停标记，用于触发 tooltip 提示样式 */
  const [isHovered, setIsHovered] = useState(false)
  /* 编辑模式开关，开启后显示拖拽手柄、编辑和删除按钮 */
  const [isEditMode, setIsEditMode] = useState(false)
  /* 当前正在行内编辑的页面ID，null 表示未在编辑 */
  const [editingPage, setEditingPage] = useState(null)
  /* 行内编辑输入框的值 */
  const [editName, setEditName] = useState('')
  /* 当前展示的页面列表（拖拽过程中实时更新 UI，与源数据可能不一致） */
  const [displayPages, setDisplayPages] = useState(pages)
  /* 拖拽项的原始索引，用于计算移动目标位置 */
  const dragItemIndex = useRef(null)
  /* 侧边栏容器 DOM 引用，用于检测外部点击 */
  const sidebarRef = useRef(null)
  /* 删除确认弹窗的打开状态 */
  const [dialogOpen, setDialogOpen] = useState(false)
  /* 与 state 同步的 ref，用于在事件回调中获取最新的弹窗状态，避免闭包陷阱 */
  const dialogOpenRef = useRef(false)
  /* 待删除页面的ID，用于确认弹窗回调 */
  const deletePageIdRef = useRef(null)

  /* 添加页面对话框的打开状态 */
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  /* 添加页面输入框的值 */
  const [addPageName, setAddPageName] = useState('')
  /* 添加页面输入框的 DOM 引用，用于自动聚焦 */
  const addInputRef = useRef(null)

  /* 保持 dialogOpenRef 与 dialogOpen state 同步 */
  useEffect(() => {
    dialogOpenRef.current = dialogOpen
  }, [dialogOpen])

  /* 外部 pages 变化时同步更新内部 displayPages */
  useEffect(() => {
    setDisplayPages(pages)
  }, [pages])

  /*
   * 鼠标进入侧边栏时的处理：
   * - 设置 hover 标记为 true
   * - 紧凑模式下不展开面板，仅显示 tooltip；完整模式下展开面板
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (!compact) setIsExpanded(true)
  }, [compact])

  /*
   * 鼠标离开侧边栏时的处理：
   * - 如果删除确认弹窗打开中，不收起面板（避免用户误操作）
   * - 非编辑模式下自动收起面板并取消编辑状态
   */
  const handleMouseLeave = useCallback(() => {
    if (dialogOpenRef.current) return
    setIsHovered(false)
    if (!isEditMode) {
      setIsExpanded(false)
      setEditingPage(null)
    }
  }, [isEditMode])

  /*
   * 点击外部区域时收起侧边栏
   * - 编辑模式下不收起，防止用户编辑时意外关闭
   * - 弹窗打开时不收起
   */
  useEffect(() => {
    const handleClick = (e) => {
      if (dialogOpenRef.current) return
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        if (!isEditMode) {
          setIsExpanded(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isEditMode])

  /* 根据 iconName 获取对应的图标组件，未匹配则默认使用 Home 图标 */
  const getIcon = (iconName) => {
    const Icon = ICON_MAP[iconName] || Home
    return <Icon size={18} />
  }

  /*
   * 拖拽开始：记录拖拽项的原始索引，设置拖拽效果为 "move"
   */
  const handleDragStart = (e, index) => {
    dragItemIndex.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  /*
   * 拖拽悬停经过目标项：实时交换位置更新 UI
   * - 仅在索引不同时执行交换
   * - 通过 splice 在原数组中移动元素，保持引用相对稳定
   */
  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragItemIndex.current === null) return
    if (dragItemIndex.current === index) return

    const newPages = [...displayPages]
    const [moved] = newPages.splice(dragItemIndex.current, 1)
    newPages.splice(index, 0, moved)
    dragItemIndex.current = index
    setDisplayPages(newPages)
  }

  /* 拖拽放下：通知父组件保存最终顺序，重置拖拽引用 */
  const handleDrop = () => {
    onReorderPages(displayPages)
    dragItemIndex.current = null
  }

  /* 拖拽结束：重置拖拽引用，恢复 displayPages 为原始数据 */
  const handleDragEnd = () => {
    dragItemIndex.current = null
    setDisplayPages(pages)
  }

  /* 提交行内编辑：名称非空时调用父组件更新，然后退出编辑状态 */
  const handleEditSubmit = (pageId) => {
    if (editName.trim()) {
      onEditPage(pageId, { name: editName.trim() })
    }
    setEditingPage(null)
    setEditName('')
  }

  /* 点击删除按钮：记录要删除的页面ID并打开确认弹窗 */
  const handleDelete = (e, pageId) => {
    e.stopPropagation()
    deletePageIdRef.current = pageId
    setDialogOpen(true)
  }

  /* 确认删除：执行删除操作并关闭弹窗 */
  const handleDialogConfirm = () => {
    if (deletePageIdRef.current) {
      onDeletePage(deletePageIdRef.current)
    }
    deletePageIdRef.current = null
    setDialogOpen(false)
  }

  /* 取消删除：重置引用并关闭弹窗 */
  const handleDialogCancel = () => {
    deletePageIdRef.current = null
    setDialogOpen(false)
  }

  /*
   * 切换编辑模式：
   * - 进入编辑时若为紧凑模式则展开面板
   * - 退出编辑时收起面板并取消所有编辑状态
   */
  const toggleEditMode = (e) => {
    e.stopPropagation()
    const next = !isEditMode
    setIsEditMode(next)
    if (compact && next) setIsExpanded(true)  // compact 进入编辑时展开
    if (!next) setIsExpanded(false)            // 退出编辑时收起
    setEditingPage(null)
  }

  return (
    <div
      ref={sidebarRef}
      /*
       * CSS 类名切换逻辑：
       * - sidebar: 基础样式
       * - expanded: 侧边栏展开时添加
       * - compactMode / fullMode: 根据 compact prop 决定布局模式
       * - hovered: 紧凑模式下鼠标悬停但未展开时添加，用于显示 tooltip
       */
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''} ${compact ? styles.compactMode : styles.fullMode} ${isHovered && !isExpanded ? styles.hovered : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 触发区域 - 紧凑模式下作为侧边栏入口的不可见触发区 */}
      <div className={styles.trigger} />

      {/* 菜单内容区 */}
      <div className={styles.content}>
        {/* 左上角编辑按钮：默认隐藏，hover 时显示 */}
        <div className={styles.topActions}>
          <button
            type="button"
            /*
             * 编辑按钮高亮：editToggleActive 类在编辑模式激活时添加
             */
            className={`${styles.editToggleBtn} ${isEditMode ? styles.editToggleActive : ''}`}
            onClick={toggleEditMode}
            title={isEditMode ? '完成' : '编辑页面'}
          >
            <Pencil size={14} />
          </button>
        </div>

        <div className={styles.pageList}>
          {displayPages.map((page, index) => {
            const isDragging = dragItemIndex.current === index
            const isActive = page.id === currentPageId

            return (
              <div
                key={page.id}
                /*
                 * 页面项 CSS 类名切换：
                 * - active: 当前激活页面高亮
                 * - dragging: 正被拖拽的项使用半透明样式
                 */
                className={`${styles.pageItem} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
                onClick={() => {
                  /* 非编辑模式下点击切换到对应页面，拖拽进行中不触发切换 */
                  if (!isEditMode && dragItemIndex.current === null) onPageChange(page.id)
                }}
                draggable={isEditMode && editingPage !== page.id}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                {/* 编辑模式：显示拖拽手柄 */}
                {isEditMode && (
                  <div className={styles.dragHandle}>
                    <GripVertical size={14} />
                  </div>
                )}
                <div className={styles.pageIcon}>{getIcon(page.icon)}</div>
                {/* 编辑状态：显示行内输入框；否则显示页面名称 */}
                {editingPage === page.id ? (
                  <input
                    className={styles.editInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleEditSubmit(page.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSubmit(page.id)
                      if (e.key === 'Escape') {
                        setEditingPage(null)
                        setEditName('')
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.pageName}>{page.name}</span>
                )}
                {/* 编辑模式且非当前编辑项：显示编辑和删除操作按钮 */}
                {isEditMode && editingPage !== page.id && (
                  <div className={styles.pageActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      draggable={false}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPage(page.id)
                        setEditName(page.name)
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    {/* 默认页面（id='default'）不允许删除 */}
                    {page.id !== 'default' && (
                      <button
                        type="button"
                        /*
                         * 删除按钮额外添加 deleteBtn 样式（如红色文字等警告色）
                         */
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        draggable={false}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleDelete(e, page.id)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 编辑模式：显示"添加页面"按钮 */}
        {isEditMode && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={(e) => {
              e.stopPropagation()
              setAddPageName('')
              setAddDialogOpen(true)
              setTimeout(() => addInputRef.current?.focus(), 50)
            }}
          >
            <Plus size={16} />
            <span>添加页面</span>
          </button>
        )}

        {/* 添加页面对话框：使用内联弹窗形式 */}
        {addDialogOpen && (
          <div className={styles.dialogOverlay} onClick={() => setAddDialogOpen(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>添加新页面</h3>
              <input
                ref={addInputRef}
                className={styles.dialogInput}
                value={addPageName}
                onChange={(e) => setAddPageName(e.target.value)}
                placeholder="请输入页面名称"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const name = addPageName.trim()
                    if (name) {
                      onAddPage(name)
                    }
                    setAddDialogOpen(false)
                    setAddPageName('')
                  }
                  if (e.key === 'Escape') {
                    setAddDialogOpen(false)
                    setAddPageName('')
                  }
                }}
              />
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.dialogCancelBtn}
                  onClick={() => {
                    setAddDialogOpen(false)
                    setAddPageName('')
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className={styles.dialogConfirmBtn}
                  onClick={() => {
                    const name = addPageName.trim()
                    if (name) {
                      onAddPage(name)
                    }
                    setAddDialogOpen(false)
                    setAddPageName('')
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认弹窗：通过 Portal 渲染到 body，避免 CSS overflow/z-index 限制 */}
      {createPortal(
        <ConfirmDialog
          isOpen={dialogOpen}
          title="删除页面"
          message="确定要删除这个页面吗？删除后可在回收站恢复。"
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />,
        document.body
      )}
    </div>
  )
}
