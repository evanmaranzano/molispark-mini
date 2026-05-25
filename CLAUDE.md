# 知行社小程序 (molispark/mini)

## 技术栈
- 微信小程序 + TDesign miniprogram v1.11.2
- LESS 样式（project.config.json 已启用 `useCompilerPlugins: ["less"]`）
- 云开发（cloudfunctions/ 目录已配置）
- appid: wxcca21c172886217e

## 模块系统
- pages/*.js 用 ES module（import/export）
- utils/*.js 用 CommonJS（require/module.exports）
- mock/community.js 用 ES module（export）
- resolveAlias: `~/*` → `/*`（app.json）

## 样式继承链
- pages/forum/index.less → pages/zones/index.less（共享 post-card、segment、tag 样式）
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
- app.js 中 `'your-cloud-env-id'` 需替换为实际环境 ID
- 7 个集合: posts, comments, likes, collects, messages, feedback, users
- 权限设置见 docs/database-schema.md
- cloudfunctions/login/index.js 用 wx-server-sdk，返回 openid/appid/unionid

## 自定义 Tab Bar
- custom-tab-bar/ 组件，3 个 tab: home, release, my
- 通过 getCurrentPages() 自动高亮当前 tab
- isAction 标记中间的"发布"按钮（浮动样式）

## 常用命令
- 微信开发者工具中编译运行（无 CLI 构建）
- npm install 安装依赖后需在开发者工具中"构建 npm"
