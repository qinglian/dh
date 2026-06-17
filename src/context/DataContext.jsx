/**
 * DataContext.jsx - 数据上下文模块（导航站点数据中心）
 *
 * 职责：
 * 1. 管理导航门户的所有数据：分类 (categories)、标签 (tags)、站点 (sites)
 * 2. 提供 CRUD 操作：增/删/改/查分类与站点，以及排序功能
 * 3. 数据持久化到 localStorage，初始化时优先从 localStorage 恢复
 * 4. 对外暴露 DataProvider 组件与 useData Hook
 *
 * 数据结构（顶层）：
 * {
 *   categories: [
 *     {
 *       id: string,          // 分类唯一标识
 *       name: string,        // 分类显示名称
 *       tags: string[],      // 该分类下的标签列表
 *       sites: [             // 该分类下的站点列表
 *         { id, name, url, description, tag }
 *       ]
 *     }
 *   ]
 * }
 *
 * 数据流：
 * 用户操作 → useData Hook 调用 action 方法 → setData → 组件重渲染 → localStorage 同步（可在外部实现）
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

/* 创建数据上下文，供 Provider 和 Hook 之间传递导航数据与操作方法 */
const DataContext = createContext()

/*
 * DEFAULT_DATA - 内置的默认导航数据
 *
 * 包含 5 个分类：
 * - AI 工具 (8 个站点)
 * - 开发工具 (7 个站点)
 * - 设计资源 (6 个站点)
 * - 效率工具 (5 个站点)
 * - 影音娱乐 (6 个站点)
 *
 * 当 localStorage 中无数据或数据损坏时用作回退数据
 */
export const DEFAULT_DATA = {
  categories: [
    {
      id: 'ai-tools',
      name: 'AI 工具',
      tags: ['聊天对话', '图像生成', '视频生成', '代码助手', '搜索引擎'],
      sites: [
        { id: '1', name: 'ChatGPT', url: 'https://chat.openai.com', description: 'OpenAI 对话 AI', tag: '聊天对话' },
        { id: '2', name: 'Claude', url: 'https://claude.ai', description: 'Anthropic AI 助手', tag: '聊天对话' },
        { id: '3', name: 'Midjourney', url: 'https://midjourney.com', description: 'AI 图像生成', tag: '图像生成' },
        { id: '4', name: 'Stable Diffusion', url: 'https://stability.ai', description: '开源图像生成', tag: '图像生成' },
        { id: '5', name: 'Perplexity', url: 'https://perplexity.ai', description: 'AI 搜索引擎', tag: '搜索引擎' },
        { id: '6', name: 'Gemini', url: 'https://gemini.google.com', description: 'Google AI', tag: '聊天对话' },
        { id: '7', name: 'Runway', url: 'https://runwayml.com', description: 'AI 视频生成', tag: '视频生成' },
        { id: '8', name: 'GitHub Copilot', url: 'https://github.com/copilot', description: 'AI 代码助手', tag: '代码助手' },
      ]
    },
    {
      id: 'dev-tools',
      name: '开发工具',
      tags: ['代码托管', '学习社区', '部署平台', '包管理', '开发文档'],
      sites: [
        { id: '9', name: 'GitHub', url: 'https://github.com', description: '代码托管平台', tag: '代码托管' },
        { id: '10', name: 'Stack Overflow', url: 'https://stackoverflow.com', description: '开发者问答社区', tag: '学习社区' },
        { id: '11', name: 'CodePen', url: 'https://codepen.io', description: '前端代码演示', tag: '学习社区' },
        { id: '12', name: 'Vercel', url: 'https://vercel.com', description: '前端部署平台', tag: '部署平台' },
        { id: '13', name: 'npm', url: 'https://npmjs.com', description: 'Node.js 包管理', tag: '包管理' },
        { id: '14', name: 'MDN', url: 'https://developer.mozilla.org', description: 'Web 开发文档', tag: '开发文档' },
        { id: '15', name: 'Can I Use', url: 'https://caniuse.com', description: '浏览器兼容性查询', tag: '开发文档' },
      ]
    },
    {
      id: 'design',
      name: '设计资源',
      tags: ['UI 设计', '图标', '配色', '字体', '素材'],
      sites: [
        { id: '16', name: 'Figma', url: 'https://figma.com', description: '协作设计工具', tag: 'UI 设计' },
        { id: '17', name: 'Dribbble', url: 'https://dribbble.com', description: '设计灵感社区', tag: 'UI 设计' },
        { id: '18', name: 'Iconify', url: 'https://iconify.design', description: '图标库', tag: '图标' },
        { id: '19', name: 'Coolors', url: 'https://coolors.co', description: '配色生成器', tag: '配色' },
        { id: '20', name: 'Google Fonts', url: 'https://fonts.google.com', description: '免费字体', tag: '字体' },
        { id: '21', name: 'Unsplash', url: 'https://unsplash.com', description: '免费图片', tag: '素材' },
      ]
    },
    {
      id: 'productivity',
      name: '效率工具',
      tags: ['笔记', '任务管理', '文档', '思维导图', '翻译'],
      sites: [
        { id: '22', name: 'Notion', url: 'https://notion.so', description: '全能工作空间', tag: '笔记' },
        { id: '23', name: 'Obsidian', url: 'https://obsidian.md', description: '知识管理', tag: '笔记' },
        { id: '24', name: 'Todoist', url: 'https://todoist.com', description: '任务管理', tag: '任务管理' },
        { id: '25', name: 'DeepL', url: 'https://deepl.com', description: 'AI 翻译', tag: '翻译' },
        { id: '26', name: 'Excalidraw', url: 'https://excalidraw.com', description: '手绘风格画图', tag: '思维导图' },
      ]
    },
    {
      id: 'media',
      name: '影音娱乐',
      tags: ['视频', '音乐', '直播', '游戏', '社区论坛'],
      sites: [
        { id: '27', name: 'YouTube', url: 'https://youtube.com', description: '视频平台', tag: '视频' },
        { id: '28', name: 'Bilibili', url: 'https://bilibili.com', description: '弹幕视频', tag: '视频' },
        { id: '29', name: 'Spotify', url: 'https://spotify.com', description: '音乐流媒体', tag: '音乐' },
        { id: '30', name: 'Steam', url: 'https://store.steampowered.com', description: '游戏平台', tag: '游戏' },
        { id: '31', name: 'Reddit', url: 'https://reddit.com', description: '社区论坛', tag: '社区论坛' },
        { id: '32', name: 'Discord', url: 'https://discord.com', description: '社区聊天平台', tag: '社区论坛' },
      ]
    }
  ]
}

/**
 * getInitialData - 从 localStorage 恢复持久化数据，失败时回退到 DEFAULT_DATA
 *
 * 初始化逻辑：
 * 1. 读取 localStorage 键 'nav-data-v2'
 * 2. 校验是否为有效 JSON 且包含合法的 categories 数组
 * 3. 任一校验失败均 catch 并返回 DEFAULT_DATA
 *
 * @returns {object} 包含 categories 数组的数据对象
 */
function getInitialData() {
  try {
    const saved = localStorage.getItem('nav-data-v2')
    if (saved && saved !== 'null' && saved !== 'undefined') {
      const parsed = JSON.parse(saved)
      if (parsed && Array.isArray(parsed.categories)) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to load data from localStorage:', e)
  }
  return DEFAULT_DATA
}

/**
 * DataProvider - 数据提供者组件
 *
 * 在应用根层级包裹，为所有子组件提供导航数据与操作方法。
 * 核心职责：
 * - 管理 data 状态（分类、标签、站点的完整树）
 * - 数据初始化时从 localStorage 恢复，无数据时使用内置 DEFAULT_DATA
 * - 提供分类的增/删/改/排序操作
 * - 提供站点的增/删/改/排序操作
 * - 提供标签排序操作
 * - 提供数据重置功能
 * - 提供调试用 useEffect，当数据异常时自动重置
 */
export function DataProvider({ children }) {
  /* data: 完整的导航数据状态，通过 useState 惰性初始化从 localStorage 或 DEFAULT_DATA 取得 */
  const [data, setData] = useState(getInitialData)

  /*
   * 副作用（调试用）：监控 data 有效性
   * 当 data 或 data.categories 为非法值时，自动重置为 DEFAULT_DATA
   * 生产环境可考虑移除 console.log
   */
  useEffect(() => {
    console.log('DataProvider data:', data, 'categories:', data?.categories)
    if (!data || !Array.isArray(data.categories)) {
      console.warn('Invalid data detected, resetting to default')
      setData(DEFAULT_DATA)
    }
  }, [data])

  /*
   * addCategory - 添加新分类
   * @param {object} category - 分类对象，至少包含 name 和可选的 tags
   * 新分类自动附加空 sites 数组
   * 使用 useCallback 稳定引用，避免子组件不必要的重渲染
   */
  const addCategory = useCallback((category) => {
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, { ...category, sites: [], tags: category.tags || [] }]
    }))
  }, [])

  /*
   * updateCategory - 更新指定分类的属性
   * @param {string} categoryId - 目标分类的 id
   * @param {object} updates    - 需要更新的字段（如 { name: '新名称', tags: [...] }）
   */
  const updateCategory = useCallback((categoryId, updates) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    }))
  }, [])

  /*
   * deleteCategory - 删除指定分类（同时级联删除其下所有站点）
   * @param {string} categoryId - 要删除的分类的 id
   */
  const deleteCategory = useCallback((categoryId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId)
    }))
  }, [])

  /*
   * addSite - 向指定分类下添加新站点
   * @param {string} categoryId - 目标分类的 id
   * @param {object} site       - 站点数据（不含 id，id 由 Date.now() 自动生成）
   * 自动生成唯一 id 格式: 'site-{timestamp}'
   */
  const addSite = useCallback((categoryId, site) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, sites: [...cat.sites, { ...site, id: `site-${Date.now()}` }] }
          : cat
      )
    }))
  }, [])

  /*
   * updateSite - 更新指定站点信息
   * @param {string} categoryId - 站点所属分类的 id
   * @param {string} siteId     - 要更新的站点 id
   * @param {object} updates    - 需要更新的字段
   */
  const updateSite = useCallback((categoryId, siteId, updates) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              sites: cat.sites.map(site =>
                site.id === siteId ? { ...site, ...updates } : site
              )
            }
          : cat
      )
    }))
  }, [])

  /*
   * deleteSite - 删除指定站点
   * @param {string} categoryId - 站点所属分类的 id
   * @param {string} siteId     - 要删除的站点 id
   */
  const deleteSite = useCallback((categoryId, siteId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, sites: cat.sites.filter(site => site.id !== siteId) }
          : cat
      )
    }))
  }, [])

  /*
   * resetData - 重置所有数据为默认值 (DEFAULT_DATA)
   * 常用于"恢复出厂设置"功能
   */
  const resetData = useCallback(() => {
    setData(DEFAULT_DATA)
  }, [])

  /*
   * reorderSites - 对指定分类下的站点列表进行排序
   * @param {string} categoryId - 目标分类的 id
   * @param {array}  sites      - 排序后的完整站点数组（直接替换原数组）
   */
  const reorderSites = useCallback((categoryId, sites) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, sites } : cat
      )
    }))
  }, [])

  /*
   * reorderCategories - 对分类列表进行排序
   * @param {array} categories - 排序后的完整分类数组（直接替换原数组）
   */
  const reorderCategories = useCallback((categories) => {
    setData(prev => ({ ...prev, categories }))
  }, [])

  /*
   * reorderTags - 对指定分类下的标签列表进行排序
   * @param {string} categoryId - 目标分类的 id
   * @param {array}  tags       - 排序后的完整标签数组（直接替换原数组）
   */
  const reorderTags = useCallback((categoryId, tags) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, tags } : cat
      )
    }))
  }, [])

  /*
   * 通过 Context.Provider 向组件树注入 data 状态和所有操作方法
   * 子组件通过 useData() Hook 消费这些值
   */
  return (
    <DataContext.Provider value={{
      data,
      setData,
      addCategory,
      updateCategory,
      deleteCategory,
      addSite,
      updateSite,
      deleteSite,
      resetData,
      reorderSites,
      reorderCategories,
      reorderTags
    }}>
      {children}
    </DataContext.Provider>
  )
}

/*
 * useData - 自定义 Hook，用于在子组件中获取导航数据和操作方法
 *
 * 返回值包含：
 * - data: 完整的导航数据对象
 * - setData: 直接设置 data 的方法（慎用，通常通过专用 action 方法操作）
 * - addCategory / updateCategory / deleteCategory: 分类 CRUD 方法
 * - addSite / updateSite / deleteSite: 站点 CRUD 方法
 * - resetData: 重置为默认数据
 * - reorderSites / reorderCategories / reorderTags: 排序方法
 *
 * 安全防护：
 * - 若不在 DataProvider 内调用，抛出明确错误
 * - 若 data 异常（如 categories 不是数组），自动回退为 DEFAULT_DATA
 *
 * 使用前提：调用组件必须位于 <DataProvider> 内部
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  /* 确保 data 始终有效：当 data.categories 不是数组时回退到默认数据 */
  if (!context.data || !Array.isArray(context.data.categories)) {
    return { ...context, data: DEFAULT_DATA }
  }
  return context
}
