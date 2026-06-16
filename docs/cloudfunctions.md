# 云函数文档

> 知行社小程序 v0.1，3 个云函数。云环境 `cloud1-d4gtpsssef2dcbcf8`，appid `wxba805d188c9a4151`。

## 部署

每个云函数目录不含 node_modules，用「云端安装依赖」部署。两种方式：

- 开发者工具 UI：右键 `cloudfunctions/<name>` → 上传并部署：云端安装依赖
- CLI（需先在开发者工具开启服务端口 `设置 → 安全设置 → 服务端口`）：
  ```
  & "F:\微信web开发者工具\cli.bat" cloud functions deploy --appid wxba805d188c9a4151 --env cloud1-d4gtpsssef2dcbcf8 --paths "F:\molispark\mini\cloudfunctions\<name>" --remote-npm-install
  ```

依赖统一为 `wx-server-sdk`（各 package.json 已声明）。

## login

身份认证 + 取已存资料。无入参，靠 `cloud.getWXContext()` 拿 OPENID。

返回：
```json
{ "openid": "...", "appid": "...", "unionid": "...", "profile": { "nickName": "...", "avatarUrl": "..." } | null }
```

按 openid 查 `users` 集合；查不到则 `profile=null`（前端据此判断「资料未完善/未登录」）。

> ⚠️ 已知字段名不一致：login 读 `user.avatarFileID`，而 updateProfile 写的是 `avatarUrl`。头像字段未统一，登录返回的 profile.avatarUrl 当前会取不到值。待修（不在 v0.1.6 范围，单独 issue）。

## updateProfile

写入/更新用户资料，upsert 语义，确定性主键 `_id = openid`。

入参：`{ nickName, avatarUrl, brief }`
- 无 OPENID → `{ success:false, error:'未登录' }`
- 无 nickName → `{ success:false, error:'昵称不能为空' }`

成功返回：`{ success:true, openid, nickName, avatarUrl, brief }`

逻辑：先 `doc(openid).get()`，命中则 `update`；get 抛错（不存在）则 `add` 一条带 `_id:openid, level:0, createdAt` 的新记录。

## interact

所有帖子互动的统一入口。云函数有完整权限，绕过 `posts`「仅创建者可写」限制，保证多人点赞/浏览/收藏/评论计数一致（非作者操作不会被拒、不会降级本地导致计数分裂）。

入参：`{ action, postId, content? }`

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

## 涉及集合

posts, users, comments, likes, collects, views, history。权限规则与索引建议见 `docs/database-schema.md`。
