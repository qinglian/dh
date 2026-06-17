/*
 * Header - 导航页顶部栏
 * 功能：展示网站 Logo/标题、站内搜索框、操作按钮组（数据管理、编辑模式、设置、动效背景、壁纸切换、主题切换）。
 *       编辑模式下操作按钮从布局流中脱离，使用 fixed 定位悬浮显示，支持撤销/重做操作。
 *       支持独立窗口控制模式下从 TimeWidget 同步毛玻璃效果参数。
 * Props：
 *   isEditMode                {boolean}        是否处于编辑模式
 *   onToggleEdit              {function}        切换编辑模式的回调
 *   onUndo                    {function}        撤销操作回调
 *   onRedo                    {function}        重做操作回调
 *   onCancelEdit              {function}        取消编辑（放弃所有修改）回调
 *   canUndo                   {boolean}         是否可撤销
 *   canRedo                   {boolean}         是否可重做
 *   searchQuery               {string}          站内搜索关键词
 *   onSearch                  {function(value)} 搜索关键词变更回调
 *   onToggleBgMode            {function}        切换背景模式回调
 *   animatedBg                {boolean}         是否使用动效背景
 *   onOpenEffectPicker        {function}        打开动效选择器回调
 *   onOpenWallpaperPicker     {function}        打开壁纸选择器回调
 *   onLogoClick               {function}        点击 Logo 的回调（跳转起始页）
 *   siteStatusEnabled         {boolean}         网站状态检测是否启用
 *   onToggleSiteStatus        {function}        切换网站状态检测回调
 *   siteTitle                 {string}          网站标题
 *   siteSubtitle              {string}          网站副标题
 *   onUpdateSiteTitle         {function(value)} 更新网站标题回调
 *   onUpdateSiteSubtitle      {function(value)} 更新网站副标题回调
 *   categories                {Array}           分类列表
 *   reorderCategories         {function}        分类排序回调
 *   updateCategory            {function}        更新分类回调
 *   deleteCategory            {function}        删除分类回调
 *   addCategory               {function}        添加分类回调
 *   hiddenCategories          {Array}           隐藏的分类ID列表
 *   setHiddenCategories       {function}        设置隐藏分类回调
 *   mouseSpotlight            {boolean}         鼠标聚光灯是否启用
 *   onToggleMouseSpotlight    {function}        切换聚光灯回调
 *   spotlightSize             {number}          聚光灯大小
 *   onUpdateSpotlightSize     {function}        更新聚光灯大小回调
 *   spotlightOpacity          {number}          聚光灯不透明度
 *   onUpdateSpotlightOpacity  {function}        更新聚光灯不透明度回调
 *   spotlightMaskMode         {string}          聚光灯遮罩模式
 *   onToggleSpotlightMaskMode {function}        切换聚光灯遮罩模式回调
 *   spotlightColor1/2         {string}          聚光灯颜色1/2
 *   onUpdateSpotlightColor1/2 {function}        更新聚光灯颜色回调
 *   spotlightColorMix         {number}          聚光灯颜色混合比例
 *   onUpdateSpotlightColorMix {function}        更新聚光灯颜色混合比例回调
 *   blurLevel                 {number}          毛玻璃模糊级别
 *   onUpdateBlurLevel         {function}        更新模糊级别回调
 *   opacityLevel              {number}          毛玻璃不透明度级别
 *   onUpdateOpacityLevel      {function}        更新不透明度回调
 *   windowOverrides           {object}          各窗口独立覆盖样式对象
 *   setWindowOverrides        {function}        设置窗口覆盖样式回调
 *   independentGlassControl   {boolean}         是否启用独立窗口毛玻璃控制
 *   onToggleIndependentGlassControl {function}  切换独立窗口控制回调
 *   blurEnabled               {boolean}         全局模糊是否启用
 *   onToggleBlurEnabled       {function}        切换全局模糊回调
 *   opacityEnabled            {boolean}         全局不透明度是否启用
 *   onToggleOpacityEnabled    {function}        切换全局不透明度回调
 *   textColor1/2/3            {string}          全局文字颜色1/2/3
 *   onUpdateTextColor1/2/3    {function}        更新全局文字颜色回调
 *   textColorEnabled          {boolean}         全局文字颜色是否启用
 *   onToggleTextColorEnabled  {function}        切换全局文字颜色回调
 *   getGlassKey               {function}        获取当前毛玻璃控制的 key（用于确定全局/独立模式）
 */

import { Search, Moon, Sun, Image, Edit3, Check, Sparkles, Settings, Monitor, Sunrise, RotateCcw, Undo2, Redo2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import DataManager from './DataManager'
import NavPageSettings from './NavPageSettings'
import styles from './Header.module.css'

export default function Header({ isEditMode, onToggleEdit, onUndo, onRedo, onCancelEdit, canUndo, canRedo, searchQuery, onSearch, onToggleBgMode, animatedBg, onOpenEffectPicker, onOpenWallpaperPicker, onLogoClick, siteStatusEnabled, onToggleSiteStatus, siteTitle, siteSubtitle, onUpdateSiteTitle, onUpdateSiteSubtitle, categories, reorderCategories, updateCategory, deleteCategory, addCategory, hiddenCategories, setHiddenCategories, mouseSpotlight, onToggleMouseSpotlight, spotlightSize, onUpdateSpotlightSize, spotlightOpacity, onUpdateSpotlightOpacity, spotlightMaskMode, onToggleSpotlightMaskMode, spotlightColor1, onUpdateSpotlightColor1, spotlightColor2, onUpdateSpotlightColor2, spotlightColorMix, onUpdateSpotlightColorMix, blurLevel, onUpdateBlurLevel, opacityLevel, onUpdateOpacityLevel, windowOverrides, setWindowOverrides, independentGlassControl, onToggleIndependentGlassControl, blurEnabled, onToggleBlurEnabled, opacityEnabled, onToggleOpacityEnabled, textColor1, onUpdateTextColor1, textColor2, onUpdateTextColor2, textColor3, onUpdateTextColor3, textColorEnabled, onToggleTextColorEnabled, getGlassKey, copyrightEnabled, onToggleCopyrightEnabled }) {
  const { theme, themeMode, setTheme } = useTheme()

  /* 导航页设置弹窗的显示状态 */
  const [showNavSettings, setShowNavSettings] = useState(false)
  /* 编辑模式下操作按钮组在页面中的固定位置，用于 fixed 悬浮定位；null 表示非编辑模式 */
  const [actionsFixedPos, setActionsFixedPos] = useState(null)
  /* 操作按钮组的宽度，编辑模式下用于给搜索框留出右侧空间 */
  const [actionsWidth, setActionsWidth] = useState(0)
  /* 主题下拉选择器的显示/隐藏 */
  const [showThemePicker, setShowThemePicker] = useState(false)
  /* 操作按钮组的 DOM 引用，用于获取其原始布局位置 */
  const actionsRef = useRef(null)
  /* 主题下拉容器的 DOM 引用，用于检测外部点击 */
  const themePickerRef = useRef(null)

  /*
   * 编辑模式下获取操作按钮组的原始位置和宽度，赋值给 fixed 定位参数；
   * 非编辑模式下重置为 null，按钮回到正常布局流
   */
  useEffect(() => {
    if (isEditMode && actionsRef.current) {
      const rect = actionsRef.current.getBoundingClientRect()
      setActionsFixedPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      })
      setActionsWidth(rect.width - 12)
    } else {
      setActionsFixedPos(null)
      setActionsWidth(0)
    }
  }, [isEditMode])

  /* 点击外部区域关闭主题下拉栏 */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false)
      }
    }
    if (showThemePicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemePicker])

  /* 打开导航页设置弹窗时禁止页面滚动，关闭时恢复原始滚动状态 */
  useEffect(() => {
    if (showNavSettings) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showNavSettings])

  /*
   * 编辑模式 + 独立窗口控制模式下，Header 跟随 TimeWidget 的窗口效果参数：
   * 包括模糊度、背景不透明度、文字颜色，实现视觉风格联动
   */
  const twOverride = windowOverrides?.['timeWidget']
  const headerOverride = {}
  if (isEditMode && independentGlassControl && twOverride) {
    if (twOverride.blurEnabled) {
      const b = `blur(${(twOverride.blur / 100) * 40}px)`
      headerOverride.backdropFilter = b + ' saturate(150%)'
      headerOverride.WebkitBackdropFilter = b + ' saturate(150%)'
    }
    if (twOverride.opacityEnabled) {
      const th = document.documentElement.getAttribute('data-theme')
      const base = th === 'dark' ? 0.04 : 0.35
      headerOverride.background = `rgba(255,255,255,${((base * twOverride.opacity) / 100).toFixed(3)})`
    }
    if (twOverride.textEnabled) {
      headerOverride['--text-primary'] = twOverride.textColor1
      headerOverride['--text-secondary'] = twOverride.textColor2
      headerOverride['--text-tertiary'] = twOverride.textColor3
    }
  }

  return (
    <header className={styles.header} data-spotlight-target style={headerOverride}>
      <div className={styles.container} style={{ gap: '12px' }}>
        {/* Left - Logo / 网站标题，点击跳转起始页 */}
        <a href="javascript:void(0)" className={styles.logo} onClick={(e) => { e.preventDefault(); onLogoClick && onLogoClick() }}>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>{siteTitle}</span>
            {siteSubtitle && <span className={styles.logoUrl}>{siteSubtitle}</span>}
          </div>
        </a>

        {/* Center - 站内搜索框 */}
        <div
          /*
           * 搜索框 CSS 类名切换：
           * - searchBox: 基础样式
           * - searchBoxEditMode: 编辑模式下添加特殊样式（如调整内边距）
           * 编辑模式下根据 actionsWidth 设置右侧外边距，避免被 fixed 悬浮的按钮组遮挡
           */
          className={`${styles.searchBox} ${isEditMode ? styles.searchBoxEditMode : ''}`}
          style={isEditMode && actionsWidth ? { marginRight: actionsWidth + 'px' } : {}}
          data-spotlight-btn
        >
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索已添加的网站..."
            className={styles.searchInput}
          />
        </div>

        {/* Right - Actions 操作按钮组 */}
        {/* 编辑模式下插入占位符，保持布局空间不被破坏 */}
        {isEditMode && <div className={styles.actionsSpacer} />}
        <div
          ref={actionsRef}
          /*
           * 操作按钮组 CSS 类名切换：
           * - actions: 基础样式
           * - actionsSticky: 编辑模式下添加，配合 fixed 定位实现悬浮效果
           */
          className={`${styles.actions} ${isEditMode ? styles.actionsSticky : ''}`}
          data-spotlight-btn
          style={isEditMode && actionsFixedPos ? {
            /* 编辑模式：使用 fixed 定位悬浮在页面上方 */
            position: 'fixed',
            top: actionsFixedPos.top + 'px',
            left: actionsFixedPos.left + 'px',
            marginLeft: 0,
          } : {}}
        >
          {/* 数据管理按钮（导入/导出/备份） */}
          <DataManager isEditMode={isEditMode} />

          {/* 编辑模式专属操作按钮组 */}
          {isEditMode && (
            <>
              {/* 取消修改按钮 */}
              <button
                className={styles.iconBtn}
                onClick={onCancelEdit}
                title="取消修改"
                style={{ color: 'var(--text-secondary)' }}
              >
                <RotateCcw size={14} />
              </button>
              {/* 撤销按钮：不可撤销时降低透明度 */}
              <button
                className={styles.iconBtn}
                onClick={onUndo}
                title="上一步"
                disabled={!canUndo}
                style={{ color: 'var(--text-secondary)', opacity: canUndo ? 1 : 0.3 }}
              >
                <Undo2 size={14} />
              </button>
              {/* 重做按钮：不可重做时降低透明度 */}
              <button
                className={styles.iconBtn}
                onClick={onRedo}
                title="下一步"
                disabled={!canRedo}
                style={{ color: 'var(--text-secondary)', opacity: canRedo ? 1 : 0.3 }}
              >
                <Redo2 size={14} />
              </button>
            </>
          )}

          {/* 编辑/完成切换按钮：编辑模式下添加 active 高亮样式 */}
          <button
            /*
             * 编辑按钮 CSS 类名切换：
             * - editBtn: 基础样式
             * - active: 编辑模式激活时高亮（如改变背景色）
             */
            className={`${styles.editBtn} ${isEditMode ? styles.active : ''}`}
            onClick={onToggleEdit}
          >
            {isEditMode ? <Check size={14} /> : <Edit3 size={14} />}
            <span>{isEditMode ? '完成' : '编辑'}</span>
          </button>

          {/* 导航页设置按钮 - 始终显示 */}
          <button
            className={styles.iconBtn}
            onClick={() => setShowNavSettings(true)}
            title="导航页设置"
          >
            <Settings size={16} />
          </button>

          {/* 动效背景选择器按钮 */}
          <button
            className={styles.iconBtn}
            onClick={onOpenEffectPicker}
            title="动效背景"
          >
            <Sparkles size={16} />
          </button>
          {/* 壁纸选择器按钮 */}
          <button className={styles.iconBtn} onClick={onOpenWallpaperPicker} title="切换背景">
            <Image size={16} />
          </button>
          {/* 主题切换下拉 */}
          <div className={styles.themePickerWrapper} ref={themePickerRef}>
            <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setShowThemePicker(!showThemePicker) }} title="主题模式">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {showThemePicker && (
              <div
                className={styles.themeDropdown}
                style={{
                  /* 下拉面板根据当前主题使用不同的背景色和边框 */
                  background: theme === 'dark' ? 'rgba(28, 28, 32, 1)' : 'rgba(255, 255, 255, 1)',
                  backdropFilter: 'blur(80px) saturate(300%)',
                  WebkitBackdropFilter: 'blur(80px) saturate(300%)',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
                  boxShadow: theme === 'dark'
                    ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 8px 32px rgba(0,0,0,0.12)',
                }}
              >
                {[
                  { mode: 'light', icon: <Sun size={14} />, label: '亮色模式' },
                  { mode: 'dark', icon: <Moon size={14} />, label: '深色模式' },
                  { mode: 'system', icon: <Monitor size={14} />, label: '跟随系统' },
                  { mode: 'sunrise-sunset', icon: <Sunrise size={14} />, label: '日出日落' },
                ].map(item => {
                  const isActive = themeMode === item.mode
                  return (
                  <button
                    key={item.mode}
                    /*
                     * 主题选项高亮：themeOptionActive 类在当前激活的主题模式上添加
                     */
                    className={`${styles.themeOption} ${isActive ? styles.themeOptionActive : ''}`}
                    onClick={() => { setTheme(item.mode); setShowThemePicker(false) }}
                    style={{
                      /* 根据主题和激活状态动态调整文字颜色和背景 */
                      color: isActive
                        ? (theme === 'dark' ? '#60a5fa' : '#007aff')
                        : (theme === 'dark' ? '#ccc' : undefined),
                      background: isActive
                        ? (theme === 'dark' ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)')
                        : undefined,
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    <span className={styles.themeOptionIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && <span className={styles.themeOptionCheck}>✓</span>}
                  </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导航页设置弹窗：传递所有设置项 props 给子组件 */}
      {showNavSettings && (
        <NavPageSettings
          onClose={() => setShowNavSettings(false)}
          siteStatusEnabled={siteStatusEnabled}
          onToggleSiteStatus={onToggleSiteStatus}
          siteTitle={siteTitle}
          siteSubtitle={siteSubtitle}
          onUpdateSiteTitle={onUpdateSiteTitle}
          onUpdateSiteSubtitle={onUpdateSiteSubtitle}
          categories={categories}
          reorderCategories={reorderCategories}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          addCategory={addCategory}
          hiddenCategories={hiddenCategories}
          setHiddenCategories={setHiddenCategories}
          mouseSpotlight={mouseSpotlight}
          onToggleMouseSpotlight={onToggleMouseSpotlight}
          spotlightSize={spotlightSize}
          onUpdateSpotlightSize={onUpdateSpotlightSize}
          spotlightOpacity={spotlightOpacity}
          onUpdateSpotlightOpacity={onUpdateSpotlightOpacity}
          spotlightMaskMode={spotlightMaskMode}
          onToggleSpotlightMaskMode={onToggleSpotlightMaskMode}
          spotlightColor1={spotlightColor1}
          onUpdateSpotlightColor1={onUpdateSpotlightColor1}
          spotlightColor2={spotlightColor2}
          onUpdateSpotlightColor2={onUpdateSpotlightColor2}
          spotlightColorMix={spotlightColorMix}
          onUpdateSpotlightColorMix={onUpdateSpotlightColorMix}
          blurLevel={blurLevel}
          onUpdateBlurLevel={onUpdateBlurLevel}
          opacityLevel={opacityLevel}
          onUpdateOpacityLevel={onUpdateOpacityLevel}
          independentGlassControl={independentGlassControl}
          onToggleIndependentGlassControl={onToggleIndependentGlassControl}
          blurEnabled={blurEnabled}
          onToggleBlurEnabled={onToggleBlurEnabled}
          opacityEnabled={opacityEnabled}
          onToggleOpacityEnabled={onToggleOpacityEnabled}
          textColor1={textColor1}
          onUpdateTextColor1={onUpdateTextColor1}
          textColor2={textColor2}
          onUpdateTextColor2={onUpdateTextColor2}
          textColor3={textColor3}
          onUpdateTextColor3={onUpdateTextColor3}
          textColorEnabled={textColorEnabled}
          onToggleTextColorEnabled={onToggleTextColorEnabled}
          getGlassKey={getGlassKey}
          copyrightEnabled={copyrightEnabled}
          onToggleCopyrightEnabled={onToggleCopyrightEnabled}
        />
      )}
    </header>
  )
}
