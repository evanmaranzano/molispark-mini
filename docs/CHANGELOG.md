# 摩力创境小程序 · 版本日志（CHANGELOG）

> 项目：摩力创境小程序（molispark/mini）
> appid：`wxba805d188c9a4151` · 云环境：`cloud1-d4gtpsssef2dcbcf8` · 仓库：`evanmaranzano/molispark-mini`
> 技术栈：微信小程序 + TDesign miniprogram v1.11.2 + LESS + 微信云开发
> 本日志覆盖自首个提交（2023-07-05）至最新提交（2026-08-11）的全部可记录变更，按演进阶段、最新在前组织。

## 阶段总览

| 阶段 | 时间 | 说明 |
|------|------|------|
| 模板基线期 | 2023-07 ~ 2025-03 | fork 自 TDesign 官方 starter（`WBBB0730/tdesign-miniprogram-starter`），搭起社区类基础页面骨架 |
| 业务化启动 | 2026-01 ~ 2026-05 | 组件库升级、打通全部页面流程，开始接入自有业务 |
| v0.1 云端 MVP | 2026-06 | 接入微信云开发，全功能走云（登录/发帖/互动/评论/种子数据/登录守卫） |
| v0.2 功能扩展 | 2026-07 ~ 2026-08 | 活动报名、管理员权限、视频上传、品牌升级、质量门禁 |

---

## v0.2 收尾 · 活动截止 + 品牌升级 + 质量门禁（2026-08-11）

`7b70add` · 2026-08-11（提交于 2026-08-10）

- **活动截止**：抽取 `activityStatus` 共享时区逻辑（客户端 `utils/` 与云函数 `cloudfunctions/activity/` 各一份），按 `endTime`（缺失时回退 `startTime`）以 UTC+8 判断是否截止；活动列表标记"已结束"并后置，活动详情隐藏报名表单，`activity` 云函数 `signup` 服务端返回 `ACTIVITY_CLOSED`。
- **品牌升级**：用户可见名称与全部项目文档由"知行社"统一为"摩力创境"；首页接入透明底横向 `Molispark` Logo；过期沙龙轮播改为"往期活动回顾"并跳转活动列表。
- **质量门禁**：修复既有 16 个 ESLint 错误；新增 11 项活动截止测试。
- **验证**：`npm test` 25/25 通过、`npm run lint` 通过、`npm run validate:pages` 18/18 路由通过、`node --check` 44 个 JS 文件通过。
- **仍需外部操作**：部署最新版 `activity` 云函数、补建数据库索引、真机验收后上传体验版。

## v0.2.6 · 视频上传 + 首页轮播（2026-07-30）

`9366375`

- **帖子视频**：`storage.js` 新增 `chooseAndUploadVideo`（≤50MB）；发布页支持视频选择/预览/移除，`posts.videos` 入库；详情页视频播放（`getTempFileURL` 转换）。
- **活动视频**：`activity` 云函数 `create` 接受 videos（≤3）；活动发布页上传入口；活动详情播放。
- **首页 hero**：改为 `swiper` 三页轮播——品牌卡（了解精选）/ 沙龙海报（点进活动详情）/ 近期活动入口。
- 注意：视频走云存储 CDN 流量（套餐 5GB/月），放量后评估点播服务。

## v0.2.5 · 主包瘦身 + 海报迁云存储（2026-07-29）

`e544211` `0757024`

- **修主包超限**：`project.config.json` 的 `packOptions.ignore` 增列文档、设计稿（diagrams）、node_modules、源素材等，修复主包超 2MB 无法上传的问题。
- **海报迁云存储**：`seed` 云函数新增 `ensureActivityPoster`，把摩力亲子沙龙海报上传到 `images/activities/` 并把 `seed-activity-4` 的 cover 换为云 fileID（幂等）；删除包内 `assets/activities/moli-salon-3.jpg`；主包瘦身约 229KB。

## v0.2.4 · v0.2 全版本收尾（2026-07-29）

`09b38ba`

- **v0.2.1 草稿真实云**：走 `posts.status='draft'`（未单建集合），草稿保存/编辑/删除/发布全通云。
- **v0.2.2 收藏/历史真实云**：收藏页新增"取消收藏"；历史页新增"删除记录"（`db.js deleteHistory`）。
- **v0.2.3 消息/反馈真实云**：消息页时间格式化收尾；反馈提交走云并带状态提示。
- **v0.2.4 全页面状态优化**：11 个页面错误态补"点击重试"（`retryLoad` + `empty-hint__retry`）。
- **v0.2.5 权限收紧与数据清理**：移除 v0.1 调试日志；`createPost` 去静态 `time:'刚刚'` 遗留字段；删除无引用的 zones mock、zone-card/segment/tag 死样式；schema 补齐 11 集合权限表与索引清单。

## v0.2.3 · 活动报名 + 手机号登录 + 管理员权限 + 删论坛改精选（2026-07-29）

`a86e491` `d793140`

- **活动报名（新功能）**：新增 `activities`/`signups` 集合；`activity` 云函数（signup/cancel 幂等 + 名额校验，create/remove 管理员校验）；页面 `activities` 列表 / `activityDetail` 详情报名 / `myActivities` 我的报名 / `activityPublish` 发布（admin）；`seed` 预置 4 个活动（含摩力亲子沙龙海报活动）；db.js 活动封装 + 本地降级。
- **手机号快捷登录**：`login` 云函数 `action='phone'`（`getPhoneNumber` code 换手机号写 `users.phoneNumber`）；login-modal 加手机号按钮，失败降级微信登录；auth.js `updateSessionProfile`。
- **删除论坛 + 专区改精选**：删 `pages/forum` 及全部入口；zones 页改为加精帖列表（`posts.featured`）；首页/搜索文案同步。
- **管理员权限体系**：`users.role`（admin/member，控制台手动授权）；`interact` feature/unfeature、`activity` create/remove 云函数端校验 admin；`isAdmin` 双查兼容旧档；detail 页加精按钮、activityDetail 删除活动按钮、activityPublish 双门禁。
- **活动截止初版**（后于 08-10 重构）：`activity.remove`（先清 signups 再删活动）。
- **发帖时间修复**：新增 `utils/time.js`（Date/ISO/时间戳 → 相对时间），8 个页面接入；修复 `createPost` 静态"刚刚"与 Date 对象直接渲染。
- **视觉主题统一**：`variable.less` 新增品牌色板（page-bg/surface/ink/brand 等），多页面样式对齐新主题。
- **云函数与上传健壮性**：interact 评论作者名改从 users 集合读取；post not found 显式报错；updateProfile/seed 日期按 UTC+8 计算；storage 上传路径加随机批次号防重名、扩展名解析容错；收藏列表只取 published 帖；登录态 session 兜底。
- **验证**：`npm run validate:pages` 通过（18 路由）、`node --check` 全部改动文件通过。

## v0.1 · 云端 MVP（2026-06）

本阶段把模板骨架改造为接入微信云开发的真实业务小程序，全功能走云。子版本号对应 `docs/v0.1-progress.md`。

### 2026-06-30 — 页面与云函数更新 `062bf90`
- detail/home/my/release 页面与云函数更新；新增 runtime 工具与测试。

### 2026-06-16 — 登录守卫、登录弹窗、种子数据、发布页修复
- **全局登录弹窗组件** `e94479b`：新增 `components/login-modal`（底部弹出，微信一键登录 → 新用户补昵称 `type=nickname` + 头像 `open-type=chooseAvatar`）；新增 `behaviors/loginGuard`；home/zones/message 引入 behavior + onShow 检测；app.js 移除 onAppRoute 跳页守卫。
- **login-modal 修复** `e656270` `29761c2` `18dbf5a`：自定义 tabBar 遮挡弹窗（改用 `getTabBar().hidden` 隐藏）；微信一键登录按钮无响应（`catchtouchstart` 破坏 button tap，改遮罩/面板分别 `catchtap`）。
- **强制登录守卫** `296202e`：修发帖作者仍落成"微信用户"（`getCurrentProfile` 回退 session）；`updateUserProfile` 头像字段 `avatarFileID`→`avatarUrl`。
- **发布页分类改 picker** `6332166`：消除发帖 category 不规范导致标签查空；seed 扩到 10 篇。
- **种子数据** `b5d218f`：新增 `seed` 云函数，幂等插入初始帖子（确定性 `_id seed-post-1..N`）。
- **forum 分类对齐** `ab2c753`：标签 学习/AI/读书 → 学习方法/AI 工具/读书笔记/自我提升，对齐 seed/mock 的 category 字段；去掉 `loadPosts` 双重 mock fallback。
- **评论端到端修复** `cc569ae`：清除所有客户端手动 `_openid`（云数据库自动注入，手写报 `Invalid Key Name`）；`addComment` 传 `body`/`name`；interact comment 写 `body`/`name` 对齐前端；detail 去评论 mock fallback。
- **登录头像字段统一** `994f315`：login 读 `avatarUrl`（原读 `avatarFileID` 导致取不到值）。
- **云函数接口文档** `9f8bf3b`：新增 `docs/cloudfunctions.md`（login/updateProfile/interact 入参/返回/错误码/幂等/部署）；db.js 顶部标注 mock fallback 策略。
- **发布页 placeholder 修复** `8629c0d`：单行 input 显式高度 + line-height 居中、textarea 固定 rpx 行高；`cloudfunctionRoot` 恢复尾部斜杠（`cloudfunctions/`）。
- **CLAUDE.md 坑点沉淀** `5e6b751`：`_openid`/字段名统一、自定义 tabBar 弹窗遮挡、mock fallback 与枚举字段、WXML 事件冒泡。

### 2026-06-15 — 云开发接入、数据层、互动云函数
- **接入微信云开发** `2472659`：app.js 落地云环境 ID 与初始化、更新管理回调；project.config.json 更正 appid 与 cloudfunctionRoot；抽取 `isCloudReady` 到 `utils/cloud.js`。
- **登录与用户资料完善** `bec6a90`：auth.js 重构登录态（资料完整才算登录）+ `updateUserProfile`；login 云函数返回已存资料；新增 `updateProfile` 云函数；my 页接入资料编辑弹窗与 chooseAvatar。
- **status-bar 自定义导航栏** `21f2149`：新增 `components/status-bar` 状态栏安全区占位组件，配合全量 `navigationStyle: custom`。
- **数据层计数与排序修正** `5e59385`：浏览量/点赞改 `_.inc` 修正并发竞态；最新/热门动态排序；message 提取 `renderMock` 去重。
- **统一页面样式与配置** `f825778`：search 页 wxss→less 迁移；各页统一注册 status-bar 与 navigationStyle。
- **updateProfile** `35d6af3`：改用 `_id=OPENID` upsert，补 brief/level，字段名统一 `avatarUrl`。
- **createPost 清理** `e407997` `1b6ad05`：删遗留 `comments` 字段 + 新增 `collectCount`；修手动 `_openid` 注入报错。
- **interact 互动云函数** `54f90de`：6 action（like/collect/comment/view/history 等），确定性 `_id` 幂等 + 统一返回结构 + 失败边界 `COUNT_UPDATE_FAILED`。
- **db.js 改造** `f29f76b`：`callInteract` 封装 + `toggleLike`/`toggleCollect`/`addComment` 云就绪走 interact。
- **detail 改造** `4631424`：浏览/点赞/收藏/评论走 interact，按返回值刷 UI（不本地 ±1）。
- **移除模板 CI + 文档** `429be79`：删除 TDesign 模板 pull-request CI；CLAUDE.md 补充项目技术规则；validate-pages 正则兼容 tab/空格。
- **设计/计划/schema 文档** `2338a30` `7ee0667` `0c9a780` `68f92e1` `894a6de`：登录完善与后端对接三版迭代设计、v0.1 云端 MVP 实施计划、细分版本规划（v0.1.0-v0.1.6 / v0.2.0-v0.2.5 / v0.3.0-v0.3.4）、重写 database-schema.md（补 views/history、确定性 _id、collectCount、权限、索引）、v0.1 进度记录。

## 业务化启动（2026-01 ~ 2026-05）

- **2026-01-05** `0d2c97f` `80142f3`：TDesign 组件库升级到 v1.11.2。
- **2026-05-13** `3306aca`：checkpoint 当前小程序改动。
- **2026-05-25** `0f47879`：完成 mini app 全部页面流程（开始从模板转向自有业务）。

## 模板基线期（2023-07 ~ 2025-03）

> 本项目 fork 自 TDesign 官方 starter `WBBB0730/tdesign-miniprogram-starter`，以下为模板/上游贡献阶段，搭起社区类基础页面骨架。

### 2025-02 ~ 2025-03 — 模板优化与重构
- **2025-03-04** `736fd4a`（PR#33）：首页、发布页样式调整；统一 page 设置；统一 mock 路径。
- **2025-02-28** `5182cc7`（PR#31）：新增 `resolveAlias`（`~/*`→`/*`）；刷新信息编辑页。
- **2025-02-28** `a7fd75d`（PR#29）：新增点击反馈。
- **2025-02-26** `6fb316c`（PR#28）：重构导航（新 nav、icon 尺寸、my header、navbar drawer 自动 margin、全部页面接入 t-navbar）。
- **2025-02-25** `a6f014c`（PR#26）：更新 td 版本到 1.8.5/1.8.6、分包与图片压缩、优化展示交互、重构 dataCenter/login/my/setting 页。
- **2025-02-25** `c2c7652`（PR#27）：格式修复。

### 2023-07 ~ 2023-09 — 基础页面骨架
- **2023-09-20** `32acca3`（PR#24）：增加跳转功能；抽象三个 tabbar 的 topbar 为公共组件。
- **2023-09-15** `71c20c1`（PR#23）：完成数据图表页与设置页。
- **2023-09-15** `7c38c3b`（PR#19）：完成个人中心。
- **2023-09-13** `771c735`（PR#14）：完成首页与目录导航（swiper、侧边目录、mock 请求）。
- **2023-09-13** `f5922f3`（PR#20）：完成搜索。
- **2023-09-12** `27ed312`（PR#22）：修 app.json 第 9 行缺逗号导致初始化失败。
- **2023-09-07** `9cea3b9`（PR#13）：完成个人信息页。
- **2023-09-07** `e86915d`（PR#10）：完成登录相关页面与 mock 配置。
- **2023-09-06** `418a359`（PR#12）：完成发布页。
- **2023-09-05**：首页添加发布按钮、上传图片样式、合并远程 main 分支冲突、删除无用文件、整理格式。
- **2023-08-29** `8e69441` `aa227d5` `08f5cfd` `192334a`：完善 ESLint 配置、修 ESLint 错误、加 CI 检查、eventBus 提取为工厂方法。
- **2023-08-16 ~ 17** `e33679e` `e59286c`：完成消息页、发布页。
- **2023-07-05** `9ba7639`：Initial commit。

---

## 附：版本与发布状态

- **Git**：`feature/update` 分支已全部推送至远端 `evanmaranzano/molispark-mini`（截至 2026-08-11）。尚未合入 `main`。
- **云开发**：云环境 `cloud1-d4gtpsssef2dcbcf8`；最新版 `activity` 云函数（活动截止拦截）需重新部署才生效。
- **微信公众平台**：尚未上传体验版；计划真机双账号验收后上传体验版并合入 `main`。
- **数据库**：需按 `docs/database-schema.md` 补建缺失索引。
