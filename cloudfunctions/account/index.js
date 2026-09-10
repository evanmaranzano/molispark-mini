const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const ANON_NAME = '已注销用户';
const PAGE_SIZE = 100;

function ownerWhere(openid) {
  return _.or([{ openid }, { _openid: openid }]);
}

async function listOwnedIds(collection, where) {
  const ids = [];
  let skip = 0;
  while (true) {
    const res = await db.collection(collection).where(where).skip(skip).limit(PAGE_SIZE).get();
    const list = (res && res.data) || [];
    if (!list.length) break;
    for (let i = 0; i < list.length; i += 1) ids.push(list[i]._id);
    if (list.length < PAGE_SIZE) break;
    skip += list.length;
  }
  return ids;
}

async function removeOwned(collection, where) {
  const ids = await listOwnedIds(collection, where);
  for (let i = 0; i < ids.length; i += 1) {
    try {
      await db.collection(collection).doc(ids[i]).remove();
    } catch (e) {
      // 单条删除失败不中断其余清理
    }
  }
  return ids.length;
}

async function anonymizeOwned(collection, openid, data) {
  const ids = await listOwnedIds(collection, ownerWhere(openid));
  for (let i = 0; i < ids.length; i += 1) {
    try {
      await db.collection(collection).doc(ids[i]).update({ data });
    } catch (e) {
      // 单条匿名化失败不中断其余清理
    }
  }
  return ids.length;
}

async function removeUsers(openid) {
  let deleted = 0;
  try {
    await db.collection('users').doc(openid).remove();
    deleted += 1;
  } catch (e) {
    // 可能不存在 doc(openid) 主键档
  }
  const leftover = await listOwnedIds('users', ownerWhere(openid));
  for (let i = 0; i < leftover.length; i += 1) {
    if (leftover[i] === openid) continue;
    try {
      await db.collection('users').doc(leftover[i]).remove();
      deleted += 1;
    } catch (e) {
      // 忽略
    }
  }
  return deleted;
}

async function deleteUserAvatarFiles(openid) {
  const fileList = [];
  const seen = {};
  const pushCloudFile = (url) => {
    if (typeof url === 'string' && url.indexOf('cloud://') === 0 && !seen[url]) {
      seen[url] = true;
      fileList.push(url);
    }
  };
  try {
    const res = await db.collection('users').doc(openid).get();
    if (res && res.data) pushCloudFile(res.data.avatarUrl);
  } catch (e) {
    // 文档可能不存在
  }
  try {
    let skip = 0;
    while (true) {
      const res = await db.collection('users').where(ownerWhere(openid)).skip(skip).limit(PAGE_SIZE).get();
      const list = (res && res.data) || [];
      if (!list.length) break;
      for (let i = 0; i < list.length; i += 1) pushCloudFile(list[i].avatarUrl);
      if (list.length < PAGE_SIZE) break;
      skip += list.length;
    }
  } catch (e) {
    // 忽略查询失败
  }
  if (!fileList.length) return;
  await cloud.deleteFile({ fileList });
}

async function handleDeleteAccount(openid) {
  if (!openid) return { success: false, code: 'UNAUTHORIZED' };

  const deleted = {
    users: 0,
    signups: 0,
    likes: 0,
    collects: 0,
    history: 0,
    messages: 0,
    feedback: 0,
    views: 0,
    posts: 0,
    comments: 0,
  };

  try {
    await deleteUserAvatarFiles(openid);
  } catch (e) {
    // 头像文件清理失败不中断注销
  }

  deleted.users = await removeUsers(openid);

  const messageWhere = _.or([
    { openid },
    { _openid: openid },
    { toOpenid: openid },
    { fromOpenid: openid },
  ]);

  deleted.signups = await removeOwned('signups', ownerWhere(openid));
  deleted.likes = await removeOwned('likes', ownerWhere(openid));
  deleted.collects = await removeOwned('collects', ownerWhere(openid));
  deleted.history = await removeOwned('history', ownerWhere(openid));
  deleted.messages = await removeOwned('messages', messageWhere);
  deleted.feedback = await removeOwned('feedback', ownerWhere(openid));
  deleted.views = await removeOwned('views', ownerWhere(openid));

  deleted.posts = await anonymizeOwned('posts', openid, {
    author: ANON_NAME,
    authorNickName: ANON_NAME,
    authorAvatarUrl: '',
    avatarUrl: '',
  });
  deleted.comments = await anonymizeOwned('comments', openid, {
    name: ANON_NAME,
    authorNickName: ANON_NAME,
    authorAvatarUrl: '',
    avatarUrl: '',
  });

  return { success: true, deleted };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  if (event.action !== 'deleteAccount') {
    return { success: false, code: 'INVALID_ACTION' };
  }
  return handleDeleteAccount(openid);
};
