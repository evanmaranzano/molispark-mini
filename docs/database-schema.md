# 知行社小程序 · 数据库 Schema

> 云环境：`cloud1-d4gtpsssef2dcbcf8`
> 最后更新：2026-07-28

## 集合清单

| 集合 | _id 策略 | 权限规则 | 用途 |
|------|----------|----------|------|
| `users` | `OPENID` | 仅创建者可读写 | 用户资料 |
| `posts` | 自动生成 | 所有用户可读，仅创建者可写 | 帖子 |
| `comments` | 自动生成 | 所有用户可读，仅创建者可写 | 评论 |
| `likes` | `${postId}_${OPENID}` | 仅创建者可读写 | 点赞记录 |
| `collects` | `${postId}_${OPENID}` | 仅创建者可读写 | 收藏记录 |
| `views` | `${postId}_${OPENID}_${YYYYMMDD}` | 仅创建者可读写 | 浏览防刷计数 |
| `history` | `${postId}_${OPENID}` | 仅创建者可读写 | 浏览历史快照 |
| `activities` | `seed-activity-N` / 自动生成 | 所有用户可读，仅创建者可写 | 活动 |
| `signups` | `${activityId}_${OPENID}` | 仅创建者可读写 | 活动报名记录 |

> 计数字段（views / likes / collectCount / commentCount）由 `interact` 云函数以 admin 权限更新，客户端不直接写。
> 活动报名计数（signupCount）由 `activity` 云函数以 admin 权限更新，客户端不直接写。

---

## users

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `= OPENID`，确定性主键，便于 upsert |
| `_openid` | string | 系统自动注入 |
| `nickName` | string | 昵称 |
| `avatarUrl` | string | 头像 URL（云存储 fileID 或外部链接） |
| `phoneNumber` | string | 手机号（手机号快速验证登录后写入，可选） |
| `brief` | string | 个人简介 |
| `role` | string | 角色：`admin` / `member`（缺省视为 member），云控制台手动设置，云函数端校验 |
| `level` | number | 用户等级（v0.1 默认 0，v0.3 引入 role 后扩展） |
| `createdAt` | date | 创建时间 |
| `updatedAt` | date | 更新时间 |

写入入口：`updateProfile` 云函数（OPENID 从 `getWXContext()` 取，客户端不可传 openid）。

---

## posts

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动生成 |
| `_openid` | string | 作者 openid |
| `title` | string | 标题 |
| `desc` | string | 摘要 |
| `author` | string | 作者昵称（冗余，来自创建时 profile） |
| `category` | string | 分类 |
| `type` | string | 帖子类型 |
| `content` | array | 正文内容块 |
| `images` | array | 图片 fileID 列表 |
| `coverStyle` | string | 封面样式 |
| `views` | number | 浏览量（interact view 更新） |
| `likes` | number | 点赞数（interact like/unlike 更新） |
| `collectCount` | number | 收藏数（interact collect/uncollect 更新） |
| `commentCount` | number | 评论数（interact comment 更新） |
| `featured` | boolean | 是否加精（interact feature/unfeature 更新，精选页按此筛选） |
| `status` | string | 状态：`published`（v0.3 扩展 `hidden` / `deleted`） |
| `createdAt` | date | 创建时间 |
| `updatedAt` | date | 更新时间 |

写入入口：客户端 `createPost`（仅作者可写自己的帖子）。计数更新走 `interact` 云函数。

---

## comments

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动生成 |
| `_openid` | string | 评论者 openid |
| `postId` | string | 关联帖子 _id |
| `content` | string | 评论内容（≤500 字） |
| `createdAt` | date | 创建时间 |

写入入口：`interact` 云函数 comment action（OPENID 从 context 取）。

---

## likes

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `${postId}_${OPENID}`，确定性主键 |
| `postId` | string | 关联帖子 _id |
| `openid` | string | 点赞者 openid |
| `createdAt` | date | 创建时间 |

写入入口：`interact` 云函数 like action。主键冲突 = 已点赞，不重复 inc。

---

## collects

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `${postId}_${OPENID}`，确定性主键 |
| `postId` | string | 关联帖子 _id |
| `openid` | string | 收藏者 openid |
| `createdAt` | date | 创建时间 |

写入入口：`interact` 云函数 collect action。主键冲突 = 已收藏，不重复 inc。

---

## views

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `${postId}_${OPENID}_${YYYYMMDD}`，确定性主键 |
| `postId` | string | 关联帖子 _id |
| `openid` | string | 浏览者 openid |
| `viewedAt` | date | 浏览时间 |

写入入口：`interact` 云函数 view action。主键冲突 = 当天已浏览，不重复 inc。YYYYMMDD 按北京时间。

---

## history

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `${postId}_${OPENID}`，确定性主键 |
| `postId` | string | 关联帖子 _id |
| `title` | string | 帖子标题快照（冗余） |
| `cover` | string | 封面快照（冗余） |
| `category` | string | 分类快照（冗余） |
| `authorName` | string | 作者昵称快照（冗余） |
| `viewedAt` | date | 最后浏览时间 |
| `updatedAt` | date | 更新时间 |

写入入口：`interact` 云函数 view action（upsert）。每次浏览都更新 `viewedAt`。冗余快照可能因帖子编辑而轻微不一致，v0.2 评估是否实时同步。

---

## activities

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `seed-activity-N`（seed 预置）或自动生成 |
| `_openid` | string | 发布者 openid（seed 预置为 `seed-author`） |
| `title` | string | 活动标题 |
| `desc` | string | 活动简介 |
| `location` | string | 活动地点 |
| `startTime` | string | 开始时间，格式 `YYYY-MM-DD HH:mm` |
| `endTime` | string | 结束时间，格式 `YYYY-MM-DD HH:mm` |
| `quota` | number | 名额上限，`0` 表示不限 |
| `signupCount` | number | 已报名人数（activity 云函数 signup/cancel 更新） |
| `cover` | string | 封面海报图（本地资产路径或云存储 fileID，可选；有值时优先于 coverStyle 展示） |
| `coverStyle` | string | 封面样式（复用 post-card 封面体系） |
| `heroTitle` | string | 封面大字 |
| `status` | string | 状态：`published` / `closed`（停止报名） |
| `createdAt` | date | 创建时间 |
| `updatedAt` | date | 更新时间 |

写入入口：v0.1 由 `seed` 云函数预置（确定性 _id 幂等）；发布入口（publishForm 扩展）规划在 v0.2。报名/取消走 `activity` 云函数。

---

## signups

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | `${activityId}_${OPENID}`，确定性主键 |
| `_openid` | string | 报名者 openid（云函数显式写入，保证客户端可查回） |
| `activityId` | string | 关联活动 _id |
| `openid` | string | 报名者 openid |
| `name` | string | 报名姓名（≤20 字） |
| `phone` | string | 联系电话（11 位数字） |
| `note` | string | 备注（≤100 字，可选） |
| `status` | string | `signed` / `cancelled`（取消报名不删文档，便于恢复） |
| `activityTitle` | string | 活动标题快照（冗余，我的报名列表免回查） |
| `activityTime` | string | 活动时间快照（冗余） |
| `activityLocation` | string | 活动地点快照（冗余） |
| `createdAt` | date | 首次报名时间 |
| `updatedAt` | date | 最近变更时间 |

写入入口：`activity` 云函数 signup/cancel action。主键冲突 = 已报名（`signed` 直接返回，`cancelled` 恢复并重新计数）。

---

## 权限设置建议

| 集合 | 读 | 写 |
|------|------|------|
| `posts` | 所有用户可读 | 仅创建者可写 |
| `comments` | 所有用户可读 | 仅创建者可写 |
| `likes` | 仅创建者可读 | 仅创建者可写 |
| `collects` | 仅创建者可读 | 仅创建者可写 |
| `views` | 仅创建者可读 | 仅创建者可写 |
| `history` | 仅创建者可读 | 仅创建者可写 |
| `users` | 仅创建者可读 | 仅创建者可写 |
| `activities` | 所有用户可读 | 仅创建者可写 |
| `signups` | 仅创建者可读 | 仅创建者可写 |

> 计数字段更新由云函数完成（admin 权限），客户端权限规则不影响云函数写入。

---

## 索引建议（v0.2 实施时补建）

| 集合 | 索引字段 | 查询场景 |
|------|----------|----------|
| `posts` | `createdAt` | 首页按时间排序 |
| `posts` | `category` | 按分类筛选 |
| `posts` | `status` | 过滤已发布帖子 |
| `comments` | `postId` | 按帖子查评论 |
| `likes` | `postId` | 统计帖子点赞数 |
| `likes` | `_openid` | 查用户点赞列表 |
| `collects` | `postId` | 统计帖子收藏数 |
| `collects` | `_openid` | 查用户收藏列表 |
| `history` | `_openid` | 查用户浏览历史 |
| `history` | `viewedAt` | 按时间排序历史 |
| `activities` | `status` + `startTime` | 活动列表按时间排序 |
| `signups` | `openid` | 查用户报名列表 |
| `signups` | `activityId` | 统计活动报名名单 |
