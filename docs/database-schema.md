# 知行社云数据库集合设计

## 集合列表

### 1. posts（帖子）
```json
{
  "_id": "自动生成",
  "_openid": "发布者openid",
  "title": "帖子标题",
  "desc": "摘要",
  "content": ["段落1", "段落2"],
  "category": "分类",
  "type": "文章/图片/文件",
  "coverStyle": "book/ai/note",
  "heroTitle": "封面标题",
  "images": ["cloud://fileID1", "cloud://fileID2"],
  "files": [{"fileID": "cloud://xxx", "name": "文件名"}],
  "status": "published/draft",
  "views": 0,
  "likes": 0,
  "commentCount": 0,
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

### 2. comments（评论）
```json
{
  "_id": "自动生成",
  "_openid": "评论者openid",
  "postId": "帖子_id",
  "name": "评论者昵称",
  "body": "评论内容",
  "reply": "作者回复",
  "createdAt": "serverDate"
}
```

### 3. likes（点赞）
```json
{
  "_id": "自动生成",
  "openid": "用户openid",
  "postId": "帖子_id",
  "createdAt": "serverDate"
}
```

### 4. collects（收藏）
```json
{
  "_id": "自动生成",
  "openid": "用户openid",
  "postId": "帖子_id",
  "createdAt": "serverDate"
}
```

### 5. messages（消息）
```json
{
  "_id": "自动生成",
  "toOpenid": "接收者openid",
  "fromName": "发送者名称",
  "preview": "消息预览",
  "scene": "论坛回复/星球通知/私信会话/头条提醒",
  "postId": "关联帖子_id",
  "read": false,
  "createdAt": "serverDate"
}
```

### 6. feedback（反馈）
```json
{
  "_id": "自动生成",
  "_openid": "提交者openid",
  "content": "反馈内容",
  "status": "pending/resolved",
  "createdAt": "serverDate"
}
```

### 7. users（用户）
```json
{
  "_id": "自动生成",
  "_openid": "用户openid",
  "nickName": "昵称",
  "avatarUrl": "头像URL",
  "level": "等级",
  "brief": "个人简介",
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

## 权限设置建议

| 集合 | 读 | 写 |
|------|------|------|
| posts | 所有用户可读 | 仅创建者可写 |
| comments | 所有用户可读 | 所有用户可创建，仅创建者可改 |
| likes | 仅创建者可读 | 仅创建者可写 |
| collects | 仅创建者可读 | 仅创建者可写 |
| messages | 仅接收者可读 | 管理员/云函数可写 |
| feedback | 仅创建者可读 | 所有用户可创建 |
| users | 所有用户可读 | 仅创建者可写 |
