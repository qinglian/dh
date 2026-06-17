/**
 * webdav.js - 通用 WebDAV 客户端工具模块
 *
 * 功能概述：
 *   本模块封装了 WebDAV 协议的核心操作，支持自定义 WebDAV 服务器连接，
 *   提供测试连接、文件上传/下载、备份/恢复导航数据等功能。
 *   内置坚果云等预设服务器配置，方便用户快速接入。
 *
 * 依赖：
 *   - 浏览器原生 fetch API（Basic Auth 鉴权）
 *   - localStorage（配置持久化）
 *
 * 使用示例：
 *   import { createClient, WEBDAV_PRESETS } from './utils/webdav'
 *   const client = createClient({ host: 'https://dav.example.com', username: 'user', password: 'pass' })
 */

/** 备份目录在 WebDAV 服务器上的路径 */
const BACKUP_DIR = '/nav-portal-backup'

/** 备份文件名 */
const BACKUP_FILE = 'nav-data.json'

/**
 * WEBDAV_PRESETS - WebDAV 预设服务器列表
 *
 * 提供常用 WebDAV 服务商的连接信息，帮助用户快速配置。
 * 每个预设包含：
 *   - id:       唯一标识
 *   - name:     显示名称
 *   - host:     服务器地址
 *   - helpUrl:  帮助/说明页面地址
 *   - helpText: 配置提示文字
 *
 * @constant {Array<Object>}
 */
export const WEBDAV_PRESETS = [
  {
    id: 'jianguoyun',
    name: '坚果云',
    host: 'https://dav.jianguoyun.com/dav',
    helpUrl: 'https://www.jianguoyun.com',
    helpText: '坚果云官网 → 账户信息 → 安全选项 → 添加应用密码'
  },
  {
    id: 'custom',
    name: '自定义 WebDAV',
    host: '',
    helpUrl: '',
    helpText: '填写您的 WebDAV 服务器地址、账号和密码'
  }
]

/**
 * WebDAVClient 类 - WebDAV 协议客户端封装
 *
 * 提供对 WebDAV 服务器的标准操作：PROPFIND、MKCOL、PUT、GET 等。
 * 使用 HTTP Basic Auth 进行身份验证。
 */
class WebDAVClient {
  /**
   * 构造函数 - 初始化 WebDAV 客户端
   *
   * @param {string} host     - WebDAV 服务器地址（末尾斜杠会被自动去除）
   * @param {string} username - 登录用户名
   * @param {string} password - 登录密码（应用密码或账户密码）
   */
  constructor(host, username, password) {
    this.host = host.replace(/\/+$/, '') // 去掉末尾斜杠
    this.username = username
    this.password = password
    this.baseUrl = this.host
  }

  /**
   * 基础 HTTP 请求方法
   *
   * 封装 fetch API，自动附加 Basic Auth 认证头和请求体。
   *
   * @param {string}  method  - HTTP 方法（如 PROPFIND、GET、PUT、MKCOL）
   * @param {string}  path    - 请求路径（相对于 baseUrl）
   * @param {*}       body    - 请求体内容（可选，默认 null）
   * @param {Object}  headers - 额外的请求头（可选，默认 {}）
   * @returns {Promise<Response>} fetch Response 对象
   * @throws  {Error} 请求发生网络错误时抛出
   */
  async request(method, path, body = null, headers = {}) {
    const url = `${this.baseUrl}${path}`
    // 使用 Base64 编码用户名和密码，构建 Basic Auth 头
    const auth = btoa(`${this.username}:${this.password}`)

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        ...headers
      }
    }

    if (body) {
      options.body = body
    }

    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      throw new Error(`WebDAV请求失败: ${error.message}`)
    }
  }

  /**
   * 测试 WebDAV 服务器连接
   *
   * 向根路径发送 PROPFIND 请求，根据 HTTP 状态码判断连接是否正常。
   *
   * @returns {Promise<boolean>} true 表示连接成功，false 表示连接失败
   */
  async testConnection() {
    try {
      const response = await this.request('PROPFIND', '/')
      return response.status >= 200 && response.status < 300
    } catch {
      return false
    }
  }

  /**
   * 在 WebDAV 服务器上创建目录
   *
   * 状态码 201（已创建）和 405（目录已存在）都视为成功。
   *
   * @param {string} path - 要创建的目录路径
   * @returns {Promise<boolean>} true 表示目录创建成功或已存在
   */
  async createDirectory(path) {
    const response = await this.request('MKCOL', path)
    return response.status === 201 || response.status === 405
  }

  /**
   * 上传文件到 WebDAV 服务器
   *
   * @param {string} path    - 目标文件路径
   * @param {string} content - 文件内容（JSON 字符串）
   * @returns {Promise<boolean>} true 表示上传成功
   */
  async uploadFile(path, content) {
    const response = await this.request('PUT', path, content, {
      'Content-Type': 'application/json'
    })
    return response.status >= 200 && response.status < 300
  }

  /**
   * 从 WebDAV 服务器下载文件
   *
   * @param {string} path - 要下载的文件路径
   * @returns {Promise<string|null>} 文件内容文本；若文件不存在（404）返回 null
   * @throws {Error} 下载失败（非 200 且非 404）时抛出
   */
  async downloadFile(path) {
    const response = await this.request('GET', path)
    if (response.status === 200) {
      return await response.text()
    }
    if (response.status === 404) {
      return null
    }
    throw new Error(`下载失败: ${response.status}`)
  }

  /**
   * 获取 WebDAV 文件/目录的元信息
   *
   * 发送 PROPFIND 请求（Depth: 0），解析 XML 响应中的最后修改时间和文件大小。
   *
   * @param {string} path - 文件或目录路径
   * @returns {Promise<Object|null>} 包含 modified（最后修改时间）和 size（字节大小）的对象；
   *                                 若响应状态非 207（Multi-Status）返回 null
   */
  async getFileInfo(path) {
    const response = await this.request('PROPFIND', path, null, {
      'Depth': '0',
      'Content-Type': 'text/xml'
    })

    if (response.status === 207) {
      const text = await response.text()
      // 解析 XML 中的 getlastmodified 字段（兼容带/不带命名空间前缀的格式）
      const modifiedMatch = text.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/) || text.match(/<getlastmodified[^>]*>([^<]+)<\/getlastmodified>/)
      // 解析 XML 中的 getcontentlength 字段
      const sizeMatch = text.match(/<d:getcontentlength>([^<]+)<\/d:getcontentlength>/) || text.match(/<getcontentlength[^>]*>([^<]+)<\/getcontentlength>/)
      return {
        modified: modifiedMatch ? modifiedMatch[1] : null,
        size: sizeMatch ? parseInt(sizeMatch[1]) : 0
      }
    }
    return null
  }

  /**
   * 备份导航数据到 WebDAV 服务器
   *
   * 自动创建备份目录，将数据序列化为 JSON 后上传。
   *
   * @param {Object} data - 要备份的导航数据对象
   * @returns {Promise<Object>} 结果对象：
   *   - success:   {boolean} 是否成功
   *   - timestamp: {string}   备份时间戳（成功时）
   *   - error:     {string}   错误信息（失败时）
   */
  async backup(data) {
    await this.createDirectory(BACKUP_DIR)
    const content = JSON.stringify(data, null, 2)
    const path = `${BACKUP_DIR}/${BACKUP_FILE}`
    const success = await this.uploadFile(path, content)

    if (success) {
      const info = await this.getFileInfo(path)
      return { success: true, timestamp: info?.modified }
    }
    return { success: false, error: '上传失败' }
  }

  /**
   * 从 WebDAV 服务器恢复导航数据
   *
   * 下载备份文件并反序列化为 JSON 对象。
   *
   * @returns {Promise<Object>} 结果对象：
   *   - success: {boolean} 是否成功
   *   - data:    {Object}  恢复的数据对象（成功时）
   *   - error:   {string}  错误信息（失败时）
   */
  async restore() {
    const path = `${BACKUP_DIR}/${BACKUP_FILE}`
    const content = await this.downloadFile(path)

    if (content) {
      try {
        const data = JSON.parse(content)
        return { success: true, data }
      } catch {
        return { success: false, error: '数据格式错误' }
      }
    }
    return { success: false, error: '备份文件不存在' }
  }

  /**
   * 获取备份文件的基本信息
   *
   * 不下载文件内容，仅查询文件是否存在及其元数据。
   *
   * @returns {Promise<Object>} 包含 exists（是否存在）、modified（修改时间）和 size（文件大小）的对象
   */
  async getBackupInfo() {
    const path = `${BACKUP_DIR}/${BACKUP_FILE}`
    try {
      const info = await this.getFileInfo(path)
      if (info) {
        return { exists: true, modified: info.modified, size: info.size }
      }
    } catch {
      // 文件不存在
    }
    return { exists: false }
  }
}

/**
 * createClient - 创建 WebDAV 客户端实例的工厂函数
 *
 * @param {Object} config          - 客户端配置
 * @param {string} config.host     - WebDAV 服务器地址
 * @param {string} config.username - 用户名
 * @param {string} config.password - 密码
 * @returns {WebDAVClient} WebDAVClient 实例
 */
export const createClient = (config) => {
  return new WebDAVClient(config.host, config.username, config.password)
}

/**
 * saveWebDAVConfig - 保存 WebDAV 连接配置到本地存储
 *
 * @param {Object} config - 配置对象
 */
export const saveWebDAVConfig = (config) => {
  localStorage.setItem('nav-webdav-config', JSON.stringify(config))
}

/**
 * getWebDAVConfig - 从本地存储读取 WebDAV 连接配置
 *
 * @returns {Object|null} 配置对象，无保存记录时返回 null
 */
export const getWebDAVConfig = () => {
  const saved = localStorage.getItem('nav-webdav-config')
  return saved ? JSON.parse(saved) : null
}

/**
 * clearWebDAVConfig - 清除本地存储中的 WebDAV 连接配置
 */
export const clearWebDAVConfig = () => {
  localStorage.removeItem('nav-webdav-config')
}

export default WebDAVClient
