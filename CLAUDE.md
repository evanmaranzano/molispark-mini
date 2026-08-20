# 摩力创境小程序 (molispark/mini)

## 技术栈
- 微信小程序 + TDesign miniprogram v1.11.2
- LESS 样式（project.config.json 已启用 `useCompilerPlugins: ["less"]`）
- 云开发（cloudfunctions/ 目录已配置）
- appid: wx94825420d37a7652
- 云环境 ID: cloud1-d6g0v8u009ac081c2
- 云数据库 11 集合: posts, comments, likes, collects, views, history, messages, feedback, users, activities, signups
- 仓库: evanmaranzano/molispark-mini（main 分支）
- 权限模型: users.role（'admin'|'member'，默认 member），云控制台手动改 role='admin' 授权；加精走 interact feature/unfeature、发布活动走 activity create，均云函数端校验 admin
- 迭代进度文档: `docs/v0.1-progress.md`（新会话入口）
- 关键决策: 计数更新走 `interact` 云函数（绕过 posts「仅创建者可写」权限）；准入用微信后台「体验成员」白名单

## 模块系统
- pages/*.js 用 ES module（import/export）
- utils/*.js 用 CommonJS（require/module.exports）
- mock/community.js 用 ES module（export）
- resolveAlias: `~/*` → `/*`（app.json）

## 样式继承链
- pages/favorites/index.less → pages/zones/index.less（共享 sub-page、post-card 样式）
- pages/publishForm/index.less → pages/drafts/index.less（共享 sub-page、form-card 样式）
- pages/home/index.less 独立
- pages/my/index.less 独立
- pages/message/index.less 独立
- 修改 zones 或 drafts 的 LESS 会影响引用它的页面

## 数据层
- utils/db.js: 云数据库 CRUD 封装（帖子/评论/点赞/收藏/消息/草稿/反馈/统计）
- utils/storage.js: 云存储上传封装
- utils/mockFallback.js: 云数据库降级到 mock 的工具
- mock/community.js: 全量 mock 数据，所有页面数据的 fallback 来源
- 云数据库用 `_id`，mock 数据用 `id`；wxml 中用 `wx:key="index"` + `item._id || item.id` 兼容

## 云开发接入
- 环境 ID 已配置: cloud1-d6g0v8u009ac081c2（app.js 第 36 行）
- 集合需在云开发控制台手动创建（11 个: posts, comments, likes, collects, views, history, messages, feedback, users, activities, signups）
- 首次加载可能 timeout（冷启动），重编译即可
- 权限设置见 docs/database-schema.md
- cloudfunctions/login/index.js 用 wx-server-sdk，返回 openid/appid/unionid

## 自定义导航栏
- 所有页面 `navigationStyle: custom`，隐藏系统导航栏
- components/status-bar/: 只做状态栏安全区占位，自动读取 statusBarHeight，不渲染 logo
- 主 Tab 页各自渲染统一的品牌 logo + 摩力创境文字；子页面标题行紧跟 status-bar，避免重复叠加 env(safe-area-inset-top)

## 自定义 Tab Bar
- custom-tab-bar/ 组件，3 个 tab: home, release, my
- 通过 getCurrentPages() 自动高亮当前 tab
- isAction 标记中间的"发布"按钮（浮动样式）

## 常用命令
- 微信开发者工具中编译运行（无 CLI 构建）
- npm install 安装依赖后需在开发者工具中"构建 npm"
- 云函数部署: 右键 cloudfunctions/login → 上传并部署：云端安装依赖
- DevTools CLI 部署云函数: `& "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" cloud functions deploy --project "C:\Users\26566\molispark\mini" --env cloud1-d6g0v8u009ac081c2 --names <函数名> --remote-npm-install`
- 绕过 project.config 解析: `& "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" cloud functions deploy --appid wx94825420d37a7652 --env cloud1-d6g0v8u009ac081c2 --paths "C:\Users\26566\molispark\mini\cloudfunctions\<name>" --remote-npm-install`
- 页面配置校验: `npm --prefix "C:/Users/26566/molispark/mini" run validate:pages`

## 开发者工具坑点
- `project.config.json` 的 `cloudfunctionRoot` 必须带尾部 `/`（`"cloudfunctions/"` 不是 `"cloudfunctions"`），否则 UI 增量上传可能报 `Cannot read property 'region' of undefined`
- 云函数目录不应包含 `node_modules`；上传时用"云端安装依赖"
- CLI 调用需先开启服务端口：`设置 → 安全设置 → 服务端口 → 开启`；否则报 `IDE service port disabled`
- 项目缓存/文件树异常时：`cli.bat close --project <path>` → `reset-fileutils --project <path>` → `open --project <path>`

## WXML 事件冒泡
- `catchtap=""` 空字符串不可靠，弹窗内层拦截点击用 `catchtap="noop"` 并在 JS 定义 `noop() {}`
- 全屏弹窗禁止用外层 `catchtouchstart` 拦截——会破坏子 `<button>` 的 `bindtap` 合成（按钮点击无反应）；防穿透用遮罩/面板分别 `catchtap="noop"`，不拦 touchstart

## 自定义 tabBar 与全屏弹窗
- `wx.hideTabBar` 对自定义 tabBar（custom-tab-bar/ 组件）无效，它不是系统 tabBar
- 全屏弹窗需隐藏 tabBar：`getCurrentPages()` 取当前页 → `page.getTabBar().setData({ hidden: true/false })`，custom-tab-bar wxml 用 `wx:if="{{!hidden}}"` 控制。已有 `components/login-modal` 用此模式。

## 云数据库 _openid 与字段名
- 客户端 `add()` 禁止手动写 `_openid`（云数据库系统字段，自动注入；手动写报 `Invalid Key Name: _openid`）。本地降级在 `db.js` 的 `add` 内自动补 `_openid`。
- 头像字段名统一为 `avatarUrl`（存的是 fileID）：login 读 `user.avatarUrl`、updateProfile 写 `avatarUrl`、auth `updateUserProfile` 传 `avatarUrl`。历史曾用 `avatarFileID`，已全部统一。

## mock fallback 与枚举字段
- `withMockFallback` 把「空数组」当无效会塞 mock 假数据，混淆真实/预览数据。列表查询（detail 评论）已去掉这层；`db.js` 内部 query 云失败时已降级本地 mock，页面层不要再套一层 withMockFallback。
- 枚举字段（如 `posts.category`）的页面标签值必须和实际数据精确一致，云端 `where({category})` 是精确匹配，对不上会查空触发降级。标准分类：学习方法 / AI 工具 / 读书笔记 / 自我提升。

## 登录流程设计原则
- 拿到 openid ≠ 登录完成；"已登录"仅当用户资料完整（真实昵称，非默认"微信用户"）
- `login` 云函数应返回已保存的用户资料，避免客户端直接读 users 集合权限问题
- 头像选择后客户端 `wx.cloud.uploadFile` 拿 `fileID`，不把临时路径交给云函数上传
- 无云环境时头像路径直接作为本地 fallback
