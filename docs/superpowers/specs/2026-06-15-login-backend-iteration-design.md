# 知行社小程序 · 登录完善与后端对接迭代设计

- 日期：2026-06-15
- 状态：已评审（brainstorming），待转实施计划
- 范围：未来三个小版本（v0.1 / v0.2 / v0.3）迭代规划
- 仓库：evanmaranzano/molispark-mini（分支 feature/update）

## 1. 背景与目标

知行社小程序（molispark/mini）数据层代码（`utils/db.js` 双路径 CRUD）与登录骨架已就绪，但云端基础设施未上线，团队无法真实体验。本设计规划三个小版本，递进主线为「能用 → 好用 → 想用」：

- **v0.1 能用**：核心内容闭环（登录+发帖+评论+点赞/收藏）走真实云，体验成员可体验
- **v0.2 好用**：周边功能真实化 + 稳定化
- **v0.3 想用**：社交与运营增强

目标用户：团队内部人员（微信「体验成员」机制准入）。

## 2. 现状（2026-06-15 探索）

- 数据层 `utils/db.js`：完整双路径（云优先，失败降级本地存储 + mock 种子），7 集合业务方法齐全（发帖/评论/点赞/收藏/消息/草稿/反馈/统计）
- 登录：`loginWithCloud` + 资料完善弹窗 + `isProfileComplete` 门控（`utils/auth.js`）
- 云函数：`login`（返回 openid + profile）、`updateProfile`（upsert 资料已写，未部署）
- 云环境：`cloud1-d4gtpsssef2dcbcf8`（app.js 已配）
- 缺：集合未创建、云函数未部署、集合权限未配
- 已知遗留：
  - `db.js` `createPost` 仍写 `comments: 0` 字段（与 addComment 去 comments 不一致）
  - 页面层 `withMockFallback` 与 db.js 内层 try/catch 降级可能冗余（内层吃错后外层 mockFn 可能永不触发）

## 3. 关键决策

### 3.1 准入：微信后台「体验成员」白名单（方案 A）
- 0 代码，小程序后台加成员微信号（≤90 人），成员扫体验版码进入
- v0.1/v0.2 不需要应用内白名单 / role
- v0.3 要管理员时才引入 `users.role`，准入仍靠 A

### 3.2 计数更新必须走云函数（interact）
**问题**：当前 `db.js` 客户端直接 update `posts` 计数（views / likes / commentCount）。云数据库权限下 `posts` 只能设「仅创建者可写」（否则任何人可改他人帖子正文，不安全）；非作者客户端 `updateById('posts', …)` 会被权限拒绝 → db.js catch 后降级本地 → 多人计数不一致（致命）。

**解法**：新增 `interact` 云函数，统一处理 like/unlike/comment/view 的「子集合写入 + posts 计数更新」。云函数有 admin 权限，绕过集合权限规则。客户端计数路径改为 `wx.cloud.callFunction('interact')`。

## 4. v0.1「能用」详细设计

### 4.1 范围
体验成员完成：登录 → 完善资料 → 浏览（首页/广场/详情）→ 发帖 → 评论 → 点赞/收藏，全走真实云。

### 4.2 interact 云函数设计
接口：`wx.cloud.callFunction({ name: 'interact', data: { action, postId, ... } })`

| action | 输入 | 行为 | 返回 |
|--------|------|------|------|
| `view` | `{ postId }` | `posts.views` `_.inc(1)` | `{ success }` |
| `like` | `{ postId }` | 幂等：查 likes，无则 add + `posts.likes` inc(1) | `{ liked: true }` |
| `unlike` | `{ postId }` | 查 likes，有则 remove + `posts.likes` inc(-1) | `{ liked: false }` |
| `comment` | `{ postId, content }` | add comments（_openid 来自 context）+ `posts.commentCount` inc(1) | `{ commentId, commentCount }` |

鉴权：从 `cloud.getWXContext()` 取 openid；likes/comments 写入带 openid；幂等校验防重复点赞。并发计数必须用 `_.inc`，禁止读-改-写。

### 4.3 云端基础设施任务
1. 创建 5 集合：posts / comments / likes / collects / users
2. 部署 3 云函数：`login`（有）、`updateProfile`（有）、`interact`（新写）
3. 权限规则：
   - posts, comments：所有用户可读，仅创建者可写
   - likes, collects, users：仅创建者可读写
4. 体验版发布 + 后台加体验成员

### 4.4 数据模型（v0.1）
- **posts**: _id, _openid, title, desc, author, category, type, content[], images[], coverStyle, views, likes, commentCount, status, createdAt, updatedAt
- **comments**: _id, _openid, postId, content, createdAt
- **likes**: _id, postId, openid, createdAt
- **collects**: _id, postId, openid, createdAt
- **users**: _id, _openid, nickName, avatarFileID, createdAt, updatedAt

### 4.5 客户端改动
- `utils/db.js`：新增 `callInteract(action, payload)` 封装；`toggleLike` / `addComment` / `incrementViews` 云就绪时走 interact，否则本地降级
- `pages/detail/index.js`：浏览量、点赞改 callInteract
- `pages/forum/index.js` 等点赞入口：改 callInteract
- 清理 `createPost` 的 `comments: 0` 字段（统一 commentCount）

### 4.6 登录流程完善
- 部署 updateProfile
- 验证全链路：扫码 → login 拿 openid → users 查/建资料 → `isProfileComplete` → 可发帖/评论
- 验证 P1–P6 修复在真实云下的行为（session merge、globalData↔isAuthed 一致）

### 4.7 成功标准
- 成员 A 发帖，成员 B 能看到、评论、点赞、收藏；计数多人一致
- 无云仍降级 mock（兜底保留）
- 权限校验：B 不能改 A 的帖子正文

### 4.8 风险与缓解
- 体验版冷启动慢：加 loading 态
- 并发计数：interact 内必须 `_.inc`，禁止读-改-写
- 两层 mockFallback 在真实云下可能掩盖错误：v0.1 加日志观察，v0.2 系统清理

### 4.9 v0.1 任务清单
1. 创建 5 集合（控制台）
2. 配置集合权限规则
3. 写 interact 云函数（`cloudfunctions/interact/index.js` + `package.json`）
4. 部署 login + updateProfile + interact（CLI 或开发者工具）
5. db.js 加 `callInteract` + 改 `toggleLike`/`addComment`/`incrementViews`
6. detail.js / forum.js 等改 callInteract
7. 清 createPost `comments` 字段
8. 体验成员 A/B 互测全链路（登录→发帖→评论→点赞→收藏→计数一致）
9. 体验版发布 + 后台加体验成员

## 5. v0.2「好用」

### 5.1 范围
- **周边真实化**：创建 messages / history / feedback 集合 + drafts 走云；打通消息 / 草稿 / 收藏列表 / 历史 / 反馈页真实数据
- **稳定化**：补加载 / 空 / 错误态 UI；收紧权限；清理 `withMockFallback` 与 db.js 内层降级冗余；清遗留字段

### 5.2 成功标准
- 所有现有页面走真实云且健壮，无静默降级掩盖错误

## 6. v0.3「想用」

### 6.1 范围
- **社交**：互动通知（点赞 / 评论 / 收藏 → 新云函数 + notifications 集合）、个人主页
- **运营**：搜索、内容治理（引入 `users.role` 做管理员，准入仍 A）、数据统计（aggregate）

### 6.2 成功标准
- 团队有「想每天打开」的理由（通知驱动回访）

## 7. 跨版本决策
- **权限演进**：v0.1/v0.2 用微信平台权限模式；v0.3 要管理员才加 `users.role`
- **mockFallback 清理**：v0.1 保留观察，v0.2 系统清理
- **节奏**：每版 ~1-2 周
