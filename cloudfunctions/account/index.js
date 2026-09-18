const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const ANON_NAME = '已注销用户';
const PAGE_SIZE = 100;

function ownerWhere(openid) {
  return _.or([{ openid }, { _openid: openid }]);
}

function isMissingDocumentError(error) {
  const code = error && (error.errCode !== undefined ? error.errCode : error.code);
  const message = String((error && (error.errMsg || error.message)) || '');
  return code === -1 || String(code) === '-1' || /not[ _-]?found|not exist|不存在|没有找到/i.test(message);
}

function addFailure(failures, collection, operation, error) {
  const rawCode = error && (error.errCode !== undefined ? error.errCode : error.code);
  const code = rawCode === undefined || rawCode === null ? 'UNKNOWN_ERROR' : String(rawCode);
  const existing = failures.find((item) => item.collection === collection
    && item.operation === operation && item.code === code);
  if (existing) {
    existing.count += 1;
    return;
  }
  failures.push({ collection, operation, code, count: 1 });
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
  const result = { deleted: 0, failures: [] };
  let ids;
  try {
    ids = await listOwnedIds(collection, where);
  } catch (e) {
    addFailure(result.failures, collection, 'list', e);
    return result;
  }
  for (let i = 0; i < ids.length; i += 1) {
    try {
      await db.collection(collection).doc(ids[i]).remove();
      result.deleted += 1;
    } catch (e) {
      if (!isMissingDocumentError(e)) addFailure(result.failures, collection, 'remove', e);
    }
  }
  return result;
}

async function anonymizeOwned(collection, openid, data) {
  const result = { deleted: 0, failures: [] };
  let ids;
  try {
    ids = await listOwnedIds(collection, ownerWhere(openid));
  } catch (e) {
    addFailure(result.failures, collection, 'list', e);
    return result;
  }
  for (let i = 0; i < ids.length; i += 1) {
    try {
      await db.collection(collection).doc(ids[i]).update({ data });
      result.deleted += 1;
    } catch (e) {
      if (!isMissingDocumentError(e)) addFailure(result.failures, collection, 'anonymize', e);
    }
  }
  return result;
}

async function removeUsers(openid) {
  const result = { deleted: 0, failures: [] };
  let directError = null;
  try {
    await db.collection('users').doc(openid).remove();
    result.deleted += 1;
  } catch (e) {
    if (!isMissingDocumentError(e)) directError = e;
  }

  let leftover;
  try {
    leftover = await listOwnedIds('users', ownerWhere(openid));
  } catch (e) {
    addFailure(result.failures, 'users', 'list', e);
    if (directError) addFailure(result.failures, 'users', 'remove', directError);
    return result;
  }

  const hasDirectDocument = leftover.indexOf(openid) !== -1;
  if (directError && !hasDirectDocument) addFailure(result.failures, 'users', 'remove', directError);
  for (let i = 0; i < leftover.length; i += 1) {
    if (leftover[i] === openid && !directError) continue;
    try {
      await db.collection('users').doc(leftover[i]).remove();
      result.deleted += 1;
    } catch (e) {
      if (!isMissingDocumentError(e)) addFailure(result.failures, 'users', 'remove', e);
    }
  }
  return result;
}

async function deleteUserAvatarFiles(openid) {
  const result = { deleted: 0, failures: [] };
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
    if (!isMissingDocumentError(e)) addFailure(result.failures, 'users', 'read-avatar', e);
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
    addFailure(result.failures, 'users', 'list-avatar', e);
  }
  if (!fileList.length) return result;
  try {
    await cloud.deleteFile({ fileList });
    result.deleted = fileList.length;
  } catch (e) {
    addFailure(result.failures, 'cloud-storage', 'delete-avatar', e);
  }
  return result;
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
    reports: 0,
    posts: 0,
    comments: 0,
    avatarFiles: 0,
  };
  const failures = [];
  const applyResult = (key, result) => {
    deleted[key] = result.deleted;
    failures.push(...result.failures);
  };

  applyResult('avatarFiles', await deleteUserAvatarFiles(openid));
  applyResult('users', await removeUsers(openid));

  const messageWhere = _.or([
    { openid },
    { _openid: openid },
    { toOpenid: openid },
    { fromOpenid: openid },
  ]);

  applyResult('signups', await removeOwned('signups', ownerWhere(openid)));
  applyResult('likes', await removeOwned('likes', ownerWhere(openid)));
  applyResult('collects', await removeOwned('collects', ownerWhere(openid)));
  applyResult('history', await removeOwned('history', ownerWhere(openid)));
  applyResult('messages', await removeOwned('messages', messageWhere));
  applyResult('feedback', await removeOwned('feedback', ownerWhere(openid)));
  applyResult('views', await removeOwned('views', ownerWhere(openid)));

  const reportWhere = _.or([
    { reporterOpenid: openid },
    { openid },
    { _openid: openid },
  ]);
  applyResult('reports', await removeOwned('reports', reportWhere));

  applyResult('posts', await anonymizeOwned('posts', openid, {
    author: ANON_NAME,
    authorNickName: ANON_NAME,
    authorAvatarUrl: '',
    avatarUrl: '',
  }));
  applyResult('comments', await anonymizeOwned('comments', openid, {
    name: ANON_NAME,
    authorNickName: ANON_NAME,
    authorAvatarUrl: '',
    avatarUrl: '',
  }));

  const result = { success: failures.length === 0, deleted };
  if (failures.length) {
    result.code = 'DELETE_PARTIAL';
    result.failures = failures;
  }
  return result;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  if (event.action !== 'deleteAccount') {
    return { success: false, code: 'INVALID_ACTION' };
  }
  try {
    return await handleDeleteAccount(openid);
  } catch (e) {
    console.error('delete account failed:', openid, e.message);
    return { success: false, code: 'DELETE_FAILED' };
  }
};
