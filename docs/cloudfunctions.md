# 云函数文档

> 摩力创境小程序 v0.1，5 个云函数（login / updateProfile / interact / seed / activity）。云环境 `cloud1-d4gtpsssef2dcbcf8`，appid `wxba805d188c9a4151`。

## 部署

每个云函数目录不含 node_modules，用「云端安装依赖」部署。两种方式：

- 开发者工具 UI：右键 `cloudfunctions/<name>` → 上传并部署：云端安装依赖
- CLI（需先在开发者工具开启服务端口 `设置 → 安全设置 → 服务端口`）：
  ```
  & "F:\微信web开发者工具\cli.bat" cloud functions deploy --appid wxba805d188c9a4151 --env cloud1-d4gtpsssef2dcbcf8 --paths "F:\molispark\mini\cloudfunctions\<name>" --remote-npm-install
  ```

依赖统一为 `wx-server-sdk`（各 package.json 已声明）。

## login

身份认证 + 取已存资料。默认无入参，靠 `cloud.getWXContext()` 拿 OPENID。

返回：
```json
{ "openid": "...", "appid": "...", "unionid": "...", "profile": { "nickName": "...", "avatarUrl": "...", "phoneNumber": "..." } | null }
```

按 openid 查 `users` 集合；查不到则 `profile=null`（前端据此判断「资料未完善/未登录」）。

### login · action='phone'（手机号快速验证）

入参：`{ action: 'phone', code }`（code 来自 button `open-type="getPhoneNumber"` 回调 `e.detail.code`）。

逻辑：`cloud.openapi.phonenumber.getPhoneNumber({ code })` 换手机号 → 写入 `users.phoneNumber`（doc(openid) update，不存在则建最小档案）。

返回：
- 成功：`{ success:true, openid, phoneNumber }`
- 失败：`{ success:false, code }`，code ∈ `MISSING_CODE` / `UNAUTHORIZED` / `PHONE_FAILED` / `PHONE_SAVE_FAILED`

> 限制：手机号快速验证仅**非个人主体**小程序可用，且需在 mp 后台开通（按次计费）。`PHONE_FAILED` 时前端降级提示走微信一键登录。

> 注：头像字段统一为 `avatarUrl`（login 读 `user.avatarUrl`，updateProfile 写 `avatarUrl`）。该字段内存的是云存储 fileID，前端 image 组件直接用作 src。

## updateProfile

写入/更新用户资料，upsert 语义，确定性主键 `_id = openid`。

入参：`{ nickName, avatarUrl, brief }`
- 无 OPENID → `{ success:false, error:'未登录' }`
- 无 nickName → `{ success:false, error:'昵称不能为空' }`

成功返回：`{ success:true, openid, nickName, avatarUrl, brief }`

逻辑：先 `doc(openid).get()`，命中则 `update`；get 抛错（不存在）则 `add` 一条带 `_id:openid, level:0, createdAt` 的新记录。

## interact

所有帖子互动的统一入口。云函数有完整权限，绕过 `posts`「仅创建者可写」限制，保证多人点赞/浏览/收藏/评论计数一致（非作者操作不会被拒、不会降级本地导致计数分裂）。

入参：`{ action, postId, content?, name? }`（comment 用 `content` 作正文、`name` 作评论者昵称；写入 `comments` 集合时落地为 `body`/`name` 字段，对齐前端 detail wxml 的 `item.body`/`item.name`）

| action | 关联集合 | 确定性 _id | posts 计数 | 返回 state/data |
|--------|---------|-----------|-----------|----------------|
| view | views + history | `${postId}_${openid}_${YYYYMMDD}`（每人每天首次） | views +1 | — |
| like | likes | `${postId}_${openid}` | likes +1 | `{liked:true}` |
| unlike | likes | `${postId}_${openid}`（remove） | likes -1 | `{liked:false}` |
| collect | collects | `${postId}_${openid}` | collectCount +1 | `{collected:true}` |
| uncollect | collects | `${postId}_${openid}`（remove） | collectCount -1 | `{collected:false}` |
| comment | comments | 自增 _id | commentCount +1 | `{commentId}` |

幂等：like/collect 用确定性 _id，重复请求主键冲突被静默吞掉，不重复 +1；view 按日期去重。

统一返回结构：`{ success, action, postId, state?, counts?, data?, code? }`
- `counts`: `{ likes, collectCount, commentCount, views }`。成功时返回最新计数，**前端按返回值刷 UI，不本地 ±1**。
- 失败 code：`UNAUTHORIZED` / `MISSING_POST_ID` / `INVALID_ACTION` / `POST_NOT_FOUND` / `EMPTY_CONTENT`（评论空） / `CONTENT_TOO_LONG`（>500 字） / `COUNT_UPDATE_FAILED` / `INTERNAL_ERROR`

`COUNT_UPDATE_FAILED`：互动记录已写入但 posts 计数 inc 失败。前端可据此保留本地状态但不刷新展示计数，避免数据漂移。

## seed

一次性预置初始帖子，让小程序列表不为空（验收/体验时进来就有内容）。内容取自项目 mock 精华帖，幂等插入。

入参：无
返回：`{ success, total, results: [{ _id, status: 'created' | 'exists' }] }`

用确定性 `_id`（`seed-post-1..10`），重复调用只创建一次。字段对齐 posts schema（`status: published`、`collectCount/commentCount: 0`、`_openid: 'seed-author'`、`time: '精华'`）。预设帖可被正常浏览/点赞/评论（interact 云函数有完整权限 inc 计数）。

部署后在云开发控制台「云函数 → seed → 云端测试」调用一次即可；或开发者工具 console 跑 `wx.cloud.callFunction({ name: 'seed' }).then(console.log)`。

## 涉及集合

posts, users, comments, likes, collects, views, history。权限规则与索引建议见 `docs/database-schema.md`。

## activity

活动报名/取消，计数与状态写走 admin 权限，客户端不直接写 signups / activities.signupCount。

入参：`{ action: 'signup' | 'cancel', activityId, name?, phone?, note? }`（OPENID 从 context 取，客户端不可传）。

signup 校验：`name` 必填 ≤20 字；`phone` 必须 11 位（`/^1\d{10}$/`）；`note` 选填 ≤100 字；活动 `status != published`，或按 `Asia/Shanghai`（UTC+8）解析后已到 `endTime`（缺失时回退 `startTime`）→ `ACTIVITY_CLOSED`；`quota > 0` 且满员 → `QUOTA_FULL`。

幂等：`_id = ${activityId}_${OPENID}`。
- 已 `signed` 重复报名 → 直接返回当前状态，不重复计数；
- `cancelled` 后再次报名 → 恢复原文档并重新计数；
- 并发主键冲突 → 按已报名返回。

返回：`{ success, action, activityId, state: { signed }, counts: { signupCount } }`；失败 `{ success:false, code }`，code ∈ `UNAUTHORIZED` / `MISSING_ACTIVITY_ID` / `INVALID_ACTION` / `ACTIVITY_NOT_FOUND` / `ACTIVITY_CLOSED` / `MISSING_NAME` / `NAME_TOO_LONG` / `INVALID_PHONE` / `NOTE_TOO_LONG` / `QUOTA_FULL` / `COUNT_UPDATE_FAILED` / `INTERNAL_ERROR`。

signup 写入 `signups` 时冗余活动快照（`activityTitle/activityTime/activityLocation`），「我的报名」列表免回查；显式写 `_openid` 保证「仅创建者可读写」权限下客户端可查回（同 likes/collects 的坑）。

## seed

预置帖子 + 预置活动，幂等（确定性 `_id`：`seed-post-N` / `seed-activity-N`，重复调用只创建一次）。

返回：`{ success:true, total, results, activityResults }`，单项 status 为 `created` / `exists`。

### interact · feature / unfeature（管理员）

入参：`{ action: 'feature' | 'unfeature', postId }`。云函数端查 `users.role === 'admin'`，非管理员返回 `{ success:false, code:'FORBIDDEN' }`。

逻辑：`posts.featured = true/false`；精选页（pages/zones）按 `featured: true` 筛选。

返回：`{ success, action, postId, state: { featured } }`。

### activity · create（管理员）

入参：`{ action: 'create', title, desc?, location?, startTime?, endTime?, quota?, coverStyle?, heroTitle? }`。同样校验 `users.role === 'admin'`，否则 `FORBIDDEN`。

校验：title 必填 ≤50 字，desc ≤500 字，quota 取 `max(0, Number)`，coverStyle 白名单 `book/ai/note`。

返回：`{ success:true, action:'create', data:{ activityId } }`。

### activity · remove（管理员）

入参：`{ action: 'remove', activityId }`。校验 `users.role === 'admin'`，否则 `FORBIDDEN`。

逻辑：先删该活动全部 `signups` 记录，再删 `activities` 文档（不可恢复）。

返回：`{ success:true, action:'remove', activityId }`。
