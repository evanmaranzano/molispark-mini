# 知行社小程序

知行社社区微信小程序，基于 TDesign miniprogram 模板改造，支持帖子发布、互动交流、草稿管理等功能，使用微信云开发作为后端。

## 功能

- **首页** — 信息流浏览，支持下拉刷新和无限滚动
- **论坛/专区** — 分区帖子列表，帖子详情含评论、点赞、收藏
- **发布/草稿** — 帖子发布表单，支持保存草稿后续编辑
- **消息中心** — 评论、点赞、系统通知
- **个人中心** — 我的帖子、收藏、历史、反馈
- **搜索** — 分包加载，帖子和用户搜索
- **设置** — 分包加载，账号与偏好设置
- **自定义 Tab Bar** — 三 tab 布局（首页/发布/我的），中间发布按钮浮动样式

## 技术栈

- 微信小程序 + [TDesign miniprogram](https://github.com/Tencent/tdesign-miniprogram) v1.11.2
- 微信云开发（云函数 + 云数据库）
- LESS 样式
- ES Module + CommonJS 混用（pages 用 ESM，utils 用 CJS）

## 项目结构

```
├── pages/                  # 页面
│   ├── home/               # 首页
│   ├── release/            # 发布入口
│   ├── my/                 # 个人中心
│   ├── detail/             # 帖子详情
│   ├── forum/              # 论坛
│   ├── zones/              # 专区（复用 forum 样式）
│   ├── message/            # 消息中心
│   ├── publishForm/        # 发布表单
│   ├── drafts/             # 草稿箱（复用 publishForm 样式）
│   ├── myPosts/            # 我的帖子
│   ├── favorites/          # 收藏
│   ├── history/            # 浏览历史
│   ├── feedback/           # 反馈
│   ├── search/             # 搜索（分包）
│   └── setting/            # 设置（分包）
├── custom-tab-bar/         # 自定义 Tab Bar 组件
├── cloudfunctions/         # 云函数
│   └── login/              # 登录函数（返回 openid/appid/unionid）
├── utils/
│   ├── db.js               # 云数据库 CRUD 封装
│   ├── storage.js          # 云存储上传封装
│   └── mockFallback.js     # 云数据库降级到 mock
├── mock/
│   └── community.js        # 全量 mock 数据（开发 fallback）
├── behaviors/              # 公共 behaviors
└── docs/                   # 文档（数据库 schema 等）
```

## 快速开始

```bash
npm install
```

用微信开发者工具导入项目根目录，工具内点击「构建 npm」即可预览。

## 云开发配置

1. 在微信公众平台获取小程序 AppID（当前 appid: `wxcca21c172886217e`）
2. 开通云开发环境，创建以下 7 个集合：`posts`、`comments`、`likes`、`collects`、`messages`、`feedback`、`users`
3. 修改 `app.js` 中 `'your-cloud-env-id'` 为实际环境 ID
4. 集合权限设置详见 `docs/database-schema.md`

## 数据层设计

云数据库为线上主数据源，`mock/community.js` 作为开发环境的 fallback。页面通过 `utils/db.js` 统一访问数据，当云数据库不可用时自动降级到 mock 数据。云数据库用 `_id` 作主键，mock 数据用 `id`，wxml 中通过 `wx:key="index"` + `item._id || item.id` 兼容两种来源。

## 开源协议

MIT
