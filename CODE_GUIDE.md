# 导航门户 (Nav-Portal) — 代码详解指南

> **版本**: v2.3.1 | **最后更新**: 2026-06-17（子分类形状下拉栏重建、取色器自定义HSL面板、Portal下拉修复黑屏、按钮按压弹性动画）  
> **技术栈**: React 18 + Vite 5 + Three.js + dnd-kit + Lucide Icons  
> **目标读者**: 后续维护开发者 / AI 辅助编程

---

## 目录

1. [项目架构总览](#1-项目架构总览)
2. [视图系统（StartPage ↔ NavPage）](#2-视图系统)
3. [数据流详解](#3-数据流详解)
4. [主题系统](#4-主题系统)
5. [核心组件说明](#5-核心组件说明)
6. [工具模块 (Utils)](#6-工具模块)
7. [localStorage 键名对照表](#7-localstorage-键名对照表)
8. [CSS 变量速查](#8-css-变量速查)
9. [常见修改场景指南](#9-常见修改场景指南)

---

## 1. 项目架构总览

```
src/
├── main.jsx                    # 入口：挂载 <App />
├── App.jsx                     # 主控：路由/状态/组件编排 ~900行
├── context/
│   ├── DataContext.jsx          # 导航数据 CRUD（分类+站点）
│   └── ThemeContext.jsx         # 主题管理（light/dark/system/sunrise-sunset）
├── utils/
│   ├── weather.js              # Open-Meteo 天气 API（免费，无需 Key）
│   ├── siteStatus.js           # 网站在线状态检测（Google Favicon 探测）
│   ├── quickAccess.js           # 快捷入口（最近/最多/上新/置顶）
│   ├── safeBox.js              # 保险箱（密码保护私密站点）
│   ├── startPagePages.js       # 起始页多页管理
│   ├── startPageSettings.js    # 起始页按页面隔离的设置
│   └── webdav.js               # WebDAV 云备份（坚果云预设）
└── components/                  # 28 个组件（见下文详表）
```

### 关键设计原则

1. **双视图架构**: 应用有「起始页」和「导航页」两种模式，由 `App.jsx` 中的 `currentView` 状态控制切换。
2. **状态集中在 App.jsx**: 几乎所有状态（编辑模式、背景、特效、聚光灯、多页等）都在 App.jsx 的 `AppContent()` 中管理，通过 props 向下传递。
3. **数据持久化**: 所有用户数据通过 `localStorage` 持久化，键名格式为 `nav-*`。
4. **玻璃拟态 UI**: 统一使用 CSS 变量（`--glass-bg`、`--glass-blur` 等）实现磨砂玻璃效果。

---

## 2. 视图系统

### 2.1 视图切换流程

```
App.jsx: currentView 状态
├── 'start' → 渲染 <StartPage />         (浏览器起始页，搜索+时钟+快捷方式)
└── 'nav'   → 渲染 <Header /> + 导航内容  (网址导航收藏夹主界面)
```

**触发切换的方式**:
- StartPage 的「导航」按钮 → `onGoToNav={() => handleViewChange('nav')}`
- Header 的 Logo 点击 → `onLogoClick={() => handleViewChange('start')}`

### 2.2 起始页 (StartPage)

```
<StartPage pageId={currentPageId} onGoToNav={...} onSettingsChange={...} />
```

**组成结构（从上到下）**:
```
┌─────────────────────────────┐
│  顶部工具栏 (主题/编辑/设置)  │
│  问候语 "下午好"              │
│  时间 HH:MM:SS               │
│  搜索引擎选择器 + 搜索框       │
│  快捷方式网格 (可编辑)         │
│  搜索提示                     │
└─────────────────────────────┘
```

**受起始页设置控制的可见性**: `timeWidget.visible`、`searchBox.visible`、`searchHistory.visible`

**pageId 机制**: 每个起始页独立存储快捷方式和设置。切换多页时，`pageId` 变化 → `useEffect` 重新加载该页的 `shortcuts` 和 `getSettings(pageId)`。

### 2.3 导航页 (NavPage)

```
App.jsx (currentView === 'nav') →
  <Header />                  → 顶部栏 (搜索/编辑/设置按钮)
  <TimeWidget />              → 时间+天气小组件 (可拖动)
  <SearchEnginePicker />      → 搜索引擎选择器
  <QuickAccess />             → 快捷入口
  <SiteStatusBar />           → 站点状态栏
  <CategorySection /> × N     → 每个分类一个区块
```

---

## 3. 数据流详解

### 3.1 导航数据 (DataContext)

```jsx
// 数据结构
{
  categories: [
    {
      id: 'ai-tools',
      name: 'AI 工具',
      tags: ['聊天对话', '图像生成', ...],
      sites: [
        { id, name, url, description, tag, icon, favicon }
      ]
    }
  ]
}
```

**CRUD 操作** — 所有操作通过 `useData()` hook 获取：
- `addCategory(name, tags)` — 新增分类
- `updateCategory(id, updates)` — 修改分类名称/标签
- `deleteCategory(id)` — 删除分类
- `addSite(categoryId, site)` — 新增站点
- `updateSite(siteId, updates)` — 修改站点
- `deleteSite(siteId)` — 删除站点
- `reorderSites` / `reorderCategories` / `reorderTags` — 排序

**持久化**: 自动写入 `localStorage`，key = `nav-data`。

### 3.2 撤销/重做系统

App.jsx 内置历史栈（`historyStack` + `historyIndex`）:
- 每次数据变更前 push 当前快照入栈
- 支持 `undo()` / `redo()` 
- Header 的上一步/下一步按钮控制

### 3.3 编辑模式

`isEditMode` 控制全局编辑状态：
- `true`: 显示编辑按钮、拖拽手柄、删除按钮、+新增按钮
- `false`: 正常浏览模式

编辑模式打开时 Header 的按钮区 `position:fixed` 悬浮固定。

---

## 4. 主题系统

### 4.1 四种模式

| 模式 | 标识 | 行为 |
|------|------|------|
| `light` | 亮色 | 固定亮色 |
| `dark` | 深色 | 固定深色 |
| `system` | 跟随系统 | `window.matchMedia('(prefers-color-scheme: dark)')` |
| `sunrise-sunset` | 日出日落 | `6:00-18:00` 亮色，其余深色 |

### 4.2 主题应用方式

```js
// ThemeContext 设置 html 属性
document.documentElement.setAttribute('data-theme', resolvedTheme)
```

CSS 用 `[data-theme="dark"]` 选择器覆盖变量。

### 4.3 全局 CSS 变量

```css
:root {
  --accent-primary: #007aff;         /* 主题蓝 */
  --accent-gradient: linear-gradient(...);
  --glass-bg: rgba(255,255,255,0.6); /* 玻璃底 */
  --glass-bg-heavy: rgba(255,255,255,0.85);
  --glass-blur: blur(16px) saturate(180%);
  --glass-border: rgba(0,0,0,0.08);
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --text-tertiary: #aeaeb2;
}

[data-theme="dark"] {
  --accent-primary: #0a84ff;
  --glass-bg: rgba(30,30,32,0.7);
  --text-primary: #f5f5f7;
  ...
}
```

---

## 5. 核心组件说明

### 5.1 App.jsx — 主控组件 (~950 行)

**管理状态清单** (`AppContent`):

| State | 说明 |
|-------|------|
| `currentView` | `'start'` / `'nav'` |
| `isEditMode` | 编辑模式开关 |
| `historyStack/historyIndex` | 撤销重做栈 |
| `pages` | 多页列表 `[{id, name, icon}]` |
| `currentPageId` | 当前选中的页 |
| `pageData` | `{ [pageId]: { categories: [...] } }` 按页隔离的导航数据 |
| `showSidebar` | 起始页是否显示侧栏 |
| `sidebarCompact` | 侧栏是否为小图标模式 |
| `animatedBg` | 背景动画开关 |
| `bgEffects/bgMultiMode` | 背景特效配置 |
| `mouseSpotlight` | 鼠标聚光灯开关 |
| `theme` | 通过 `useTheme()` |
| `showStartSettings` | 起始页设置弹窗 |
| `showBgPicker` / `showWallpaperPicker` | 各种弹窗状态 |

### 5.2 StartPage.jsx — 起始页 (~590 行)

**Props**:
- `pageId` — 当前页面 ID，用于加载对应快捷方式和设置
- `onGoToNav` — 切换到导航页
- `onSettingsChange` — 设置变化回调（通知 App 更新 sidebarCompact 等）
- `onToggleSidebar` — 切换侧栏显隐

**关键内部状态**:
- `shortcuts` — 快捷方式列表 `[{id, name, url, iconUrl}]`
- `startSettings` — 起始页设置（搜索框可见性、时间小组件可见性等）
- `showEnginePicker` — 引擎下拉菜单显隐
- `isEditShortcuts` — 快捷方式编辑模式

**数据持久化**:
- 快捷方式: `localStorage key = nav-startpage-nav-shortcuts-{pageId}`
- 设置: `localStorage key = nav-startpage-settings-{pageId}`

### 5.3 PageSidebar.jsx — 多页侧栏 (~325 行)

**两种模式**:

| 模式 | CSS 类 | 宽度 | 行为 |
|------|--------|------|------|
| `compact` (小图标) | `.compactMode` | 52px | 始终显示图标列，hover 不展开，点击编辑才展开 |
| `full` (完整) | `.fullMode` | 0→220px | 默认隐藏，hover 展开为完整侧栏 |

**关键状态**:
- `isHovered` — compact 模式下控制编辑按钮显隐
- `isExpanded` — 控制侧栏展开/收起
- `isEditMode` — 进入编辑态可拖拽排序/重命名/删除

**编辑按钮位置** (compact 模式):
```css
.compactMode .topActions {
  position: absolute;
  top: 16px;    /* ← 可调，控制按钮距离顶部位置 */
  right: 6px;
}
```

**图标整体下移量** (compact 模式):
```css
.compactMode .content {
  padding: 170px 0 24px;  /* ← padding-top 控制整列图标下移 */
}
```

### 5.4 Header.jsx — 顶部栏 (~290 行)

**Props**: ~40 个（所有全局控制 prop 几乎都传给了 Header）

**关键逻辑**:
- 编辑模式下 `actions` 区域 `position:fixed` 悬浮
- 编辑模式 + 窗口独立控制开启时，顶栏自动跟随 TimeWidget 的 `windowOverrides`（模糊度/不透明度/文字颜色同步）

### 5.5 SearchEnginePicker.jsx — 搜索引擎选择器 (~500 行)

独立的搜索引擎管理面板，支持：
- 预设 6 个引擎（必应/谷歌/百度/秘塔AI/DuckDuckGo/搜狗）
- 自定义添加/删除引擎
- 拖拽排序
- 搜索历史记录
- 窗口效果独立控制（GlassControls）

### 5.6 TimeWidget.jsx — 时间天气组件 (~780 行)

**天气数据来源**: 委托 `utils/weather.js` 的 `fetchWeather(lat, lon)` 统一获取，不再自行实现 API 调用。
- 缓存读写通过外层的缓存检查逻辑，`forceRefresh=true` 时**先清除 `weather.js` 的内部缓存**再请求，确保真正更新
- 失败时使用随机模拟数据兜底（显示「多云 (离线)」）

**子组件**:
- `WeatherEffect` — 小组件内嵌 Canvas 天气动画（雨滴溅落粒子、雪花六边形/圆形、太阳呼吸脉冲光晕、雾气飘动、闪电等）
- `DigitalClock` — 翻页数字时钟

**位置**: `position:fixed`，可拖动。坐标存入 localStorage `nav-widget-pos`。

### 5.7 WeatherBackground.jsx — 全屏天气背景动画 (~840 行)

**功能**: 根据当前天气类型（晴/多云/阴/雨/雪/雾）在 Canvas 2D 上绘制全屏天气背景。

**效果层级（从后到前）**:
1. 天空渐变（6 种天气类型各 4-5 色阶）
2. 星星闪烁 + 极光（仅夜间晴天）
3. 太阳光晕（呼吸脉冲）+ 阳光射线 + 浮尘粒子
4. 动态云层（阴影层 + 主体层 + 高光层，3 层立体渲染）
5. 雨滴/雪花/雾团（近景/远景分层，不同透明度/速度）
6. 雨滴溅落粒子 + 涟漪 + 闪电（雨天）
7. 雪地堆积（雪天，雪花落地后生成白点，缓慢消融）
8. 飞鸟（晴天）

**设计要点**:
- 所有粒子创建时初始化后循环复用，避免 GC 抖动
- `stateRef` 在组件 render 时初始化一次，resize 不重建
- 支持天气类型平滑过渡（`transitionAlpha` 0.3 秒淡入）
- 每 50 帧检测 `localStorage` 缓存变化，自动同步天气
- DPR 限制为 `Math.min(dpr, 2)` 防止 3x 屏性能过载
- 由 `AnimatedBackground` 在 `effects` 包含 `'weather'` 时渲染

**粒子数量**:

| 天气 | particles | clouds | birds | stars | 特殊 |
|------|-----------|--------|-------|-------|------|
| sunny | 30 (射线) | 10 | 8 | 100(夜) | 40 浮尘 + 4 极光(夜) |
| cloudy | - | 20 | - | - | - |
| overcast | - | 28 | - | - | - |
| rain | 300 | 12 | - | - | splashParticles + ripple |
| snow | 180 | 7 | - | - | snowGround 堆积 |
| fog | 55 | - | - | - | - |

### 5.8 NavPageSettings.jsx — 导航页全局设置弹窗 (~1550 行)

**功能开关区**（所有开关均持久化 localStorage，`window.dispatchEvent` 通知实时生效）：

| 开关 | localStorage Key | 事件 | 说明 |
|------|-----------------|------|------|
| 网站状态检测 | `(通过 App props)` | — | 上游组件控制 |
| 胶囊子分类 | `nav-tag-shape` (`capsule`/`rect`) | `tagShapeChanged` | 自定义下拉菜单选择，Portal 到 body 避开 `overflow:hidden` |
| 快捷入口 | `nav-quick-access-enabled` | `quickAccessToggleChanged` | 控制 QuickAccess 组件显隐 |
| 天气显示 | `nav-weather-enabled` | `weatherToggleChanged` | 含城市搜索功能 |
| 天气背景动效 | `nav-weather-animation-enabled` | — | 控制 WeatherBackground 显隐 |
| 保险箱 | `nav-safebox-enabled` | — | 密码保护设置 |
| 搜索历史 | `nav-search-history-enabled` | — | — |
| 鼠标聚光灯 | (App props) | — | 含颜色1/颜色2/混合比滑块 |

**子分类形状下拉栏** — 关键技术决策：

- 背景色不使用 CSS 变量（`var(--card-bg)` 在深色模式下半透明），直接用 `document.documentElement.getAttribute('data-theme')` 硬编码高不透明色
- 下拉菜单通过 `createPortal` 挂载到 `document.body`，`position:fixed` + `zIndex:99999`，避开设置面板 `.panel` 的 `overflow:hidden` 裁切
- 定位通过 `tagBtnRef.current.getBoundingClientRect()` 实时计算
- 外部点击关闭同时检查触发按钮和下拉本体（双 ref 判断）
- 入场动画：`@keyframes tagDdIn` — `opacity 0→1` + `translateY(-6→0)` + `scale(.96→1)`，`cubic-bezier(.22,1,.36,1)` 曲线

**颜色选择入口**：

- 聚光灯颜色1/颜色2 按钮：聚光灯设置区左右两侧 28×28 色块
- 文字颜色按钮（3个）：文字主题/正文/辅助，各 28×28 色块
- 所有颜色按钮均带 `onMouseDown` 按压动画（`scale(0.85)` + `brightness(0.85)`），`window.mouseup` 全局释放
- 颜色选择触发后打开 `ColorPicker` 弹窗

### 5.9 ColorPicker.jsx — 自定义 HSL 取色器 (~190 行)

**架构**：无任何第三方依赖，纯 React + Canvas 2D 实现。

**核心组件**：

```
SBPad (240×240)         HueBar (266×16)
┌────────────────┐      ┌──────────────────────────┐
│ 白 → 纯色      │      │ hsl(0)→hsl(360) 彩虹渐变  │
│  (水平渐变)    │      │ 白色圆点指示器            │
│                │      └──────────────────────────┘
│ 黑遮罩         │
│  (垂直渐变)    │
└────────────────┘
```

**数据流**：`hex ↔ hsl` 双向转换，三个 state (`hue`,`sat`,`bri`) 驱动 Canvas 重绘和 hex 输入框同步。

**拖拽实现**：
- Canvas `onMouseDown` 更新位置 + `onMouseMove` 检测 `e.buttons === 1` 实现帧级跟手
- Canvas 尺寸 `width={S}`（非 `S*2`），避免 CSS 缩小导致的 1/4 区域填充 bug
- `touchAction:'none'` 防止触屏滚动干扰

**按钮动画**：
- 关闭：`onMouseDown` → `scale(.93)` + `brightness(.9)`，hover → 红色 `#ef4444` + 红色背景 + `rotate(90deg)`
- 取消/确认：`onMouseDown` → `scale(.93)` + `brightness(.9)`，`window.mouseup` 弹性回弹 `cubic-bezier(.34,1.56,.64,1)`
- 确认按钮跟随选中颜色发同色光晕 `box-shadow: 0 4px 20px ${draft}40`

**颜色工具函数**：
- `hexToHsl(hex)` → `{h,s,l}`（模块内私有）
- `hslToHex(h,s,l)` → `#rrggbb`
- `isLight(hex)` → 亮度>150 判定浅色（用于决定按钮文字色）
- `roundRect()` — `arcTo` 手写，兼容非 Chromium 浏览器

**预设色板**：22 色，11 列 grid，选中 `scale(1.15)` + 蓝色双层光环。历史颜色最多 14 个，localStorage 持久化。

---

## 6. 工具模块 (Utils)

### 6.1 weather.js — 天气模块

```js
// Open-Meteo 免费 API（单 API，不再有双 API 策略）
fetchWeather(lat, lon) → { temp, feelsLike, humidity, windSpeed, windDir, text, icon, type, code }

// 内部 WMO_MAP 含完整 29 项天气代码映射（0/1/2/3/45/48/51/53/55/56/57/61/63/65/66/67/71/73/75/77/80/81/82/85/86/95/96/99）
// 30分钟 localStorage 缓存（key = nav-weather-cache + nav-weather-cache-time）
// 缓存按经纬度 4 位小数精确匹配，切换城市自动清除

// 其他导出: searchCity, reverseGeocode, getLocation, getWeatherCache, getWeatherEnabled, saveCity, CHINA_CITIES(60+城市)
```

> 调用方：`TimeWidget.jsx` 通过 `import { fetchWeather }` 委托使用，`WeatherBackground.jsx` 通过 `getWeatherCache()` 读取缓存。

### 6.2 startPagePages.js — 多页管理

```js
getPages()           → [{ id, name, icon, order }]
getCurrentPageId()   → 'default' | string
addPage(name, icon)  → newPage
updatePage(id, upds) → void
deletePage(id)       → void
reorderPages(pages)  → void
getPageDataKey(pageId, dataType) → 'nav-startpage-{dataType}-{pageId}'
```

### 6.3 startPageSettings.js — 起始页设置

```js
DEFAULT_SETTINGS = {
  searchBox:    { visible: true },
  timeWidget:   { visible: true },
  pageSidebar:  { visible: true, compact: true },
  freeLayout:   { enabled: false },
  searchHistory:{ visible: true },
}

getSettings(pageId)         → settings对象 (深度合并DEFAULT)
updateSetting(pageId, cat, key, val) → 写入localStorage并返回新settings
```

### 6.4 quickAccess.js — 快捷入口

管理「最近使用」「最多使用」「最近上新」「置顶」四个区块。
- 每次站点点击时 `recordSiteClick(siteId, siteName, siteUrl)` 记录
- 站点删除时自动清理记录

### 6.5 safeBox.js — 保险箱

密码保护的私密站点管理器。
- 密码用 `btoa()` 简单编码存储
- `getSafeBoxEnabled()` / `setSafeBoxPassword()` / `verifySafeBoxPassword()`

### 6.6 siteStatus.js — 站点状态检测

通过 Google Favicon API (`https://www.google.com/s2/favicons?domain=...`) 探测站点可达性。30 分钟缓存。

### 6.7 webdav.js — 云备份

WebDAV 客户端，支持坚果云预设和自定义服务器。
- 备份路径: `/nav-portal-backup/nav-data.json`
- 自动备份：可选定时任务

---

## 7. localStorage 键名对照表

| localStorage Key | 说明 | 数据结构 |
|---|---|---|
| `nav-data` | 默认页导航数据 | `{ categories: [...] }` |
| `nav-page-data` | 按页隔离的导航数据 | `{ [pageId]: { categories: [...] } }` |
| `nav-pages` | 多页列表 (旧) | `[{ id, name, icon }]` |
| `nav-startpage-pages` | 多页列表 (新) | 同上 |
| `nav-current-page` | 当前选中页 (旧) | `'default'` |
| `nav-startpage-current-page` | 当前选中页 (新) | `'default'` |
| `nav-startpage-settings-{pageId}` | 起始页设置 | `{ searchBox, timeWidget, pageSidebar, ... }` |
| `nav-startpage-nav-shortcuts-{pageId}` | 起始页快捷方式 | `[{ id, name, url, iconUrl }]` |
| `nav-theme-mode` | 主题模式 | `'system'` |
| `nav-wallpaper` | 壁纸数据 | `{ type, value, opacity }` |
| `nav-bg-effects` | 背景特效 | `[]` |
| `nav-search-engines` | 搜索引擎列表 | `[{ id, name, url, color }]` |
| `nav-current-engine` | 当前搜索引擎 | `'bing'` |
| `nav-search-history` | 搜索历史 | `['term1', 'term2']` |
| `nav-search-history-enabled` | 搜索历史开关 | `'true'/'false'` |
| `nav-tag-shape` | 子分类标签形状 | `'capsule'` / `'rect'` |
| `nav-weather-cache` | 天气缓存 | `{ weather, timestamp }` |
| `nav-widget-pos` | TimeWidget 位置 | `{ x, y }` |
| `nav-quickaccess-clicks` | 站点点击统计 | `{ [siteId]: { count, lastTime } }` |
| `nav-quickaccess-enabled` | 快捷入口开关 | `'true'/'false'` |
| `nav-safebox-enabled` | 保险箱开关 | `'true'/'false'` |
| `nav-safebox-password` | 保险箱密码 | `btoa(str)` |
| `nav-safebox-sites` | 保险箱站点 | `[{ id, name, url }]` |
| `webdav-config` | WebDAV 配置 | `{ url, username, password, auto }` |

> ⚠️ **注意**: `nav-pages` / `nav-startpage-pages` 和 `nav-current-page` / `nav-startpage-current-page` 是双写同步的（App.jsx 的 useEffect 中自动同步两份）。

---

## 8. CSS 变量速查

### 全局样式变量 (index.css)

```css
--accent-primary          /* 主题色 #007aff / #0a84ff */
--accent-gradient         /* 主题渐变 */
--text-primary            /* 主文字 */
--text-secondary          /* 次要文字 */
--text-tertiary           /* 辅助文字 */
--glass-bg                /* 玻璃效果背景 */
--glass-bg-heavy          /* 深色玻璃背景 */
--glass-bg-section        /* 区块玻璃背景 */
--glass-blur              /* 默认模糊度 */
--glass-blur-heavy        /* 强模糊度 */
--glass-border            /* 玻璃边框颜色 */
--shadow-glass            /* 玻璃阴影 */
--transition-fast         /* 快速过渡 0.15s */
--radius-sm/md/lg/xl/full /* 圆角系列 */
```

### 组件内覆盖方式示例

```css
.compactMode .pageIcon {
  /* 覆盖默认图标尺寸，仅 compact 模式生效 */
  width: 40px;
  height: 40px;
}
```

或通过内联 style 覆盖 CSS 变量：
```jsx
<div style={{ '--text-primary': '#ff0000' }}> ... </div>
```

---

## 9. 常见修改场景指南

### 9.1 修改起始页搜索框大小

**文件**: `src/components/StartPage.module.css`

```css
.searchWrapper {
  width: 44vw;        /* ← 修改此值控制宽度 */
}
.searchInput {
  font-size: 17px;    /* ← 修改输入文字大小 */
}
.inputWrapper {
  padding: 4px 18px 14px;  /* ← 修改内边距 */
}
```

### 9.2 修改小图标模式的位置/样式

**文件**: `src/components/PageSidebar.module.css`

```css
.compactMode .content {
  padding: 170px 0 24px;  /* ← padding-top 控制从头下移 */
}
.compactMode .pageIcon {
  width: 40px;            /* ← 图标尺寸 */
  border-radius: 14px;    /* ← 图标圆角 */
}
.compactMode .topActions {
  top: 16px;              /* ← 编辑按钮距顶距离 */
}
```

### 9.3 修改颜色主题

**文件**: `src/index.css` — 修改 `:root` 和 `[data-theme="dark"]` 中的 CSS 变量。

### 9.4 添加新搜索引擎

**文件**: `src/components/SearchEnginePicker.jsx` — 在 `DEFAULT_ENGINES` 数组中添加：
```js
{ id: 'new_engine', name: '名称', url: 'https://...?q=', color: '#xxxxxx' }
```

### 9.5 修改默认起始页设置

**文件**: `src/utils/startPageSettings.js` — 修改 `DEFAULT_SETTINGS` 对象。

### 9.6 修改起始页多页的触发区域

**文件**: `src/components/PageSidebar.jsx`
- compact 模式: `handleMouseEnter` 中 `if (!compact) setIsExpanded(true)` — 此处控制 compact 是否展开
- full 模式: `fullMode .trigger { width: 14px; }` — CSS 控制触发区宽度

### 9.7 修改窗口效果（模糊/不透明/文字色）默认值

**文件**: `src/App.jsx` — 搜索 `blurLevel`、`opacityLevel`、`textColor1/2/3` 等 state 的初始值。

### 9.8 修改默认数据（首次使用时的预置网站）

**文件**: `src/context/DataContext.jsx` — 修改 `DEFAULT_DATA.categories` 数组。

### 9.9 修改天气动画粒子数量/速度

**文件**: `src/components/WeatherBackground.jsx`
```js
// 粒子数量：init() 中 switch(type) 的 for 循环次数
case 'rain': for (let i = 0; i < 300; i++)  // ← 修改雨滴数量
// 粒子速度：createRaindrop() 等工厂函数中的 speed 参数
speed: 14 + Math.random() * 20,  // ← 雨滴下落速度
```
**TimeWidget 小组件天气动画**: `TimeWidget.jsx` → `WeatherEffect` 组件内同样有 `init()` 和工厂函数。

### 9.10 修改子分类按钮形状（胶囊 ↔ 矩形）

**localStorage**: `nav-tag-shape` = `'capsule'` | `'rect'`

**影响组件**: `CategorySection.jsx`、`QuickAccess.jsx` — 监听 `tagShapeChanged` 事件

**设置入口**: `NavPageSettings.jsx` → 功能开关 → 子分类形状下拉菜单

**修改默认值**:
```js
// CategorySection.jsx 和 QuickAccess.jsx
const [tagCapsuleEnabled, setTagCapsuleEnabled] = useState(
  () => localStorage.getItem('nav-tag-shape') !== 'rect'
)
```

### 9.11 修改取色器样式/行为

**文件**: `src/components/ColorPicker.jsx`

```js
// 预设颜色数组
const PRESET_COLORS = ['#ffffff','#f8f9fa', ...]
// S/B 方块尺寸
const S = 240  // ← 修改取色区域大小
// 色相条尺寸
const W = 266, H = 16  // ← 修改色相条宽度/高度
// 按钮动画参数
const bp = { transform:'scale(.93)', filter:'brightness(.9)' }
```

### 9.12 修改子分类形状下拉菜单样式

**文件**: `src/components/NavPageSettings.jsx` → 搜索 `子分类形状`

- 下拉菜单通过 `createPortal` 渲染到 `document.body`，位置由 `tagBtnRef.current.getBoundingClientRect()` 计算
- 背景色硬编码（浅 `rgba(255,255,255,0.98)` / 深 `rgba(44,44,46,0.98)`），不跟随 CSS 变量
- 菜单项包含形状预览圆 + 名称 + 描述 + 选中 ✓
- 入场动画 `@keyframes tagDdIn`

---

## 结尾

本文档随项目代码同步维护。每次代码改动后请更新对应章节。

**快速链接**:
- [App.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\App.jsx)
- [StartPage.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\components\StartPage.jsx)
- [PageSidebar.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\components\PageSidebar.jsx)
- [Header.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\components\Header.jsx)
- [ThemeContext.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\context\ThemeContext.jsx)
- [DataContext.jsx](computer://C:\Users\qingl\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a30f0e9de151d497453510f\nav-portal\src\context\DataContext.jsx)
