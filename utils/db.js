/**
 * 云数据库 CRUD 封装
 * 云环境未配置时自动使用本地存储，保证页面主流程可预览、可验证。
 */

const mock = require('~/mock/community');
const { isCloudReady } = require('~/utils/cloud');

const LOCAL_DB_KEY = 'miniLocalDb';
const LOCAL_OPENID = 'local-openid';
const OP_KEY = '__miniDbOp';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function markLocal(value) {
  if (value && typeof value === 'object') {
    Object.defineProperty(value, '__fromLocalDb', {
      configurable: true,
      enumerable: false,
      value: true,
    });
  }
  return value;
}

function getAppSafe() {
  try {
    return getApp();
  } catch (err) {
    return null;
  }
}

let cloudDb;

function getCloudDb() {
  if (!isCloudReady()) return null;
  if (!cloudDb) {
    cloudDb = wx.cloud.database();
  }
  return cloudDb;
}

function op(type, value) {
  return { [OP_KEY]: type, value };
}

const _ = {
  in(values) {
    return op('in', values);
  },
  inc(value) {
    return op('inc', value);
  },
};

const $ = {};

function serverDate() {
  return op('serverDate');
}

function nowText() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getCurrentOpenid() {
  const app = getAppSafe();
  return (app && app.globalData && app.globalData.openid) || LOCAL_OPENID;
}

function getCurrentProfile() {
  const app = getAppSafe();
  return (app && app.globalData && app.globalData.userInfo) || {};
}

function getDocId(item) {
  return item && (item._id || item.id);
}

function sameId(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);
  return leftValue === rightValue || leftValue === `mock-post-${rightValue}` || rightValue === `mock-post-${leftValue}`;
}

function normalizeContent(content) {
  if (Array.isArray(content)) return content;
  if (!content) return [];
  return String(content)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function seedPost(item, index, extra = {}) {
  return {
    _id: item._id || `mock-post-${item.id || index + 1}`,
    id: item.id || index + 1,
    title: item.title || '未命名内容',
    desc: item.desc || '',
    author: item.author || '星球用户',
    time: item.time || nowText(),
    category: item.category || '学习方法',
    type: item.type || '文章',
    views: item.views || 0,
    likes: item.likes || 0,
    commentCount: item.commentCount || item.comments || 0,
    status: item.status || 'published',
    coverStyle: item.coverStyle || 'book',
    content: normalizeContent(item.content || item.desc),
    heroTitle: item.heroTitle || String(item.title || '').slice(0, 20).toUpperCase(),
    images: item.images || [],
    createdAt: item.createdAt || item.time || nowText(),
    updatedAt: item.updatedAt || item.time || nowText(),
    _openid: mock.myPostIds && mock.myPostIds.includes(item.id) ? LOCAL_OPENID : item._openid || '',
    ...extra,
  };
}

function seedLocalDb() {
  const posts = (mock.posts || []).map(seedPost);
  (mock.drafts || []).forEach((draft, index) => {
    posts.push(seedPost(draft, index, {
      _id: `mock-draft-${draft.id || index + 1}`,
      status: 'draft',
      author: '星球用户',
      category: '学习方法',
      content: normalizeContent(draft.desc),
      coverStyle: 'note',
      _openid: LOCAL_OPENID,
    }));
  });

  return {
    version: 1,
    posts,
    comments: (mock.comments || []).map((item, index) => ({
      ...item,
      _id: `mock-comment-${index + 1}`,
      postId: 'mock-post-1',
      createdAt: item.time || nowText(),
    })),
    likes: [],
    collects: (mock.favoritePostIds || []).map((postId, index) => ({
      _id: `mock-collect-${index + 1}`,
      postId: `mock-post-${postId}`,
      openid: LOCAL_OPENID,
      createdAt: nowText(),
    })),
    messages: (mock.messages || []).map((item) => ({
      ...item,
      _id: item.id,
      fromName: item.name,
      toOpenid: LOCAL_OPENID,
      read: !item.unreadCount,
      createdAt: item.time,
    })),
    history: (mock.historyPostIds || []).map((postId, index) => ({
      _id: `mock-history-${index + 1}`,
      postId: `mock-post-${postId}`,
      openid: LOCAL_OPENID,
      viewedAt: nowText(),
    })),
    feedback: [],
  };
}

function loadLocalDb() {
  const saved = wx.getStorageSync(LOCAL_DB_KEY);
  if (saved && saved.version === 1) return saved;
  const seeded = seedLocalDb();
  wx.setStorageSync(LOCAL_DB_KEY, seeded);
  return seeded;
}

function saveLocalDb(data) {
  wx.setStorageSync(LOCAL_DB_KEY, data);
}

function ensureCollection(data, collection) {
  if (!Array.isArray(data[collection])) {
    data[collection] = [];
  }
  return data[collection];
}

function resolveLocalValue(value) {
  if (value && value[OP_KEY] === 'serverDate') return nowText();
  return value;
}

function valueMatches(item, key, expected) {
  const actual = item[key];
  if (expected && expected[OP_KEY] === 'in') {
    return expected.value.some((id) => sameId(actual, id) || sameId(item._id, id) || sameId(item.id, id));
  }
  if (key === '_id' || key === 'id' || key === 'postId') {
    return sameId(actual, expected) || sameId(item._id, expected) || sameId(item.id, expected);
  }
  if (key === 'category' && typeof actual === 'string' && typeof expected === 'string') {
    return actual === expected || actual.includes(expected) || expected.includes(actual);
  }
  return actual === expected;
}

function whereMatches(item, where = {}) {
  return Object.keys(where).every((key) => valueMatches(item, key, where[key]));
}

function applyLocalData(target, data) {
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value && value[OP_KEY] === 'inc') {
      target[key] = (target[key] || 0) + value.value;
      return;
    }
    target[key] = resolveLocalValue(value);
  });
}

function toCloudValue(value, db) {
  if (!value || !value[OP_KEY]) return value;
  if (value[OP_KEY] === 'in') return db.command.in(value.value);
  if (value[OP_KEY] === 'inc') return db.command.inc(value.value);
  if (value[OP_KEY] === 'serverDate') return db.serverDate();
  return value;
}

function toCloudObject(value, db) {
  return Object.keys(value || {}).reduce((next, key) => {
    next[key] = toCloudValue(value[key], db);
    return next;
  }, {});
}

function col(name) {
  const db = getCloudDb();
  return db ? db.collection(name) : null;
}

async function add(collection, data) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).add({ data: toCloudObject(data, db) });
    } catch (err) {
      // 云端失败时落到本地，保证预览流程不断。
    }
  }

  const localDb = loadLocalDb();
  const list = ensureCollection(localDb, collection);
  const doc = clone(data);
  applyLocalData(doc, data);
  doc._id = doc._id || `local-${collection}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  list.unshift(doc);
  saveLocalDb(localDb);
  return markLocal({ _id: doc._id });
}

async function getById(collection, id) {
  const db = getCloudDb();
  if (db) {
    try {
      const res = await db.collection(collection).doc(id).get();
      return res.data || null;
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  const found = ensureCollection(localDb, collection).find((item) => sameId(item._id, id) || sameId(item.id, id));
  return found ? markLocal(clone(found)) : null;
}

async function query(collection, where = {}, options = {}) {
  const db = getCloudDb();
  if (db) {
    try {
      let request = db.collection(collection).where(toCloudObject(where, db));
      if (options.orderBy) request = request.orderBy(options.orderBy, options.order || 'desc');
      if (options.skip) request = request.skip(options.skip);
      if (options.limit) request = request.limit(options.limit);
      const res = await request.get();
      return res.data;
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  let result = ensureCollection(localDb, collection).filter((item) => whereMatches(item, where));
  if (options.orderBy) {
    const dir = options.order === 'asc' ? 1 : -1;
    result = result.slice().sort((a, b) => String(a[options.orderBy] || '').localeCompare(String(b[options.orderBy] || '')) * dir);
  }
  if (options.skip) result = result.slice(options.skip);
  if (options.limit) result = result.slice(0, options.limit);
  return markLocal(clone(result));
}

async function updateById(collection, id, data) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).doc(id).update({ data: toCloudObject(data, db) });
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  const list = ensureCollection(localDb, collection);
  const target = list.find((item) => sameId(item._id, id) || sameId(item.id, id));
  if (!target) return markLocal({ updated: 0 });
  applyLocalData(target, data);
  saveLocalDb(localDb);
  return markLocal({ updated: 1 });
}

async function updateWhere(collection, where, data) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).where(toCloudObject(where, db)).update({ data: toCloudObject(data, db) });
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  let updated = 0;
  ensureCollection(localDb, collection).forEach((item) => {
    if (whereMatches(item, where)) {
      applyLocalData(item, data);
      updated += 1;
    }
  });
  saveLocalDb(localDb);
  return markLocal({ updated });
}

async function removeById(collection, id) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).doc(id).remove();
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  const list = ensureCollection(localDb, collection);
  localDb[collection] = list.filter((item) => !sameId(item._id, id) && !sameId(item.id, id));
  saveLocalDb(localDb);
  return markLocal({ removed: list.length - localDb[collection].length });
}

async function removeWhere(collection, where) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).where(toCloudObject(where, db)).remove();
    } catch (err) {
      // 降级到本地
    }
  }

  const localDb = loadLocalDb();
  const list = ensureCollection(localDb, collection);
  localDb[collection] = list.filter((item) => !whereMatches(item, where));
  saveLocalDb(localDb);
  return markLocal({ removed: list.length - localDb[collection].length });
}

async function count(collection, where = {}) {
  const db = getCloudDb();
  if (db) {
    try {
      const res = await db.collection(collection).where(toCloudObject(where, db)).count();
      return res.total;
    } catch (err) {
      // 降级到本地
    }
  }
  const localDb = loadLocalDb();
  return ensureCollection(localDb, collection).filter((item) => whereMatches(item, where)).length;
}

function aggregate(collection) {
  const db = getCloudDb();
  return db ? db.collection(collection).aggregate() : null;
}

async function getPosts(options = {}) {
  const where = {
    ...(options.where || {}),
    status: options.where && options.where.status ? options.where.status : 'published',
  };
  return query('posts', where, {
    orderBy: options.orderBy || 'createdAt',
    order: options.order || 'desc',
    limit: options.limit || 20,
    skip: options.skip || 0,
  });
}

async function getPostById(id) {
  return getById('posts', id);
}

async function createPost(data) {
  const profile = getCurrentProfile();
  return add('posts', {
    ...data,
    status: 'published',
    author: data.author || profile.nickName || '微信用户',
    time: '刚刚',
    views: 0,
    likes: 0,
    collectCount: 0,
    commentCount: 0,
    _openid: getCurrentOpenid(),
    createdAt: serverDate(),
    updatedAt: serverDate(),
  });
}

async function updatePost(id, data) {
  return updateById('posts', id, { ...data, updatedAt: serverDate() });
}

async function deletePost(id) {
  return removeById('posts', id);
}

async function getComments(postId, options = {}) {
  return query('comments', { postId }, {
    orderBy: options.orderBy || 'createdAt',
    order: options.order || 'asc',
    limit: options.limit || 50,
  });
}

async function addComment(data) {
  const result = await add('comments', {
    ...data,
    _openid: getCurrentOpenid(),
    createdAt: serverDate(),
  });
  await updateById('posts', data.postId, { commentCount: _.inc(1) });
  return result;
}

async function toggleLike(postId, openid) {
  const existing = await query('likes', { postId, openid }, { limit: 1 });
  if (existing.length > 0) {
    await removeById('likes', existing[0]._id);
    await updateById('posts', postId, { likes: _.inc(-1) });
    return { liked: false };
  }
  await add('likes', { postId, openid, createdAt: serverDate() });
  await updateById('posts', postId, { likes: _.inc(1) });
  return { liked: true };
}

async function isLiked(postId, openid) {
  const res = await query('likes', { postId, openid }, { limit: 1 });
  return res.length > 0;
}

async function toggleCollect(postId, openid) {
  const existing = await query('collects', { postId, openid }, { limit: 1 });
  if (existing.length > 0) {
    await removeById('collects', existing[0]._id);
    return { collected: false };
  }
  await add('collects', { postId, openid, createdAt: serverDate() });
  return { collected: true };
}

async function isCollected(postId, openid) {
  const res = await query('collects', { postId, openid }, { limit: 1 });
  return res.length > 0;
}

async function getCollectedPosts(openid, limit = 20) {
  const collects = await query('collects', { openid }, { limit, orderBy: 'createdAt' });
  if (!collects.length) return markLocal([]);
  const ids = collects.map((item) => item.postId);
  return query('posts', { _id: _.in(ids) });
}

async function getMessages(openid, options = {}) {
  return query('messages', { toOpenid: openid }, {
    orderBy: options.orderBy || 'createdAt',
    order: options.order || 'desc',
    limit: options.limit || 50,
  });
}

async function markMessageRead(id) {
  return updateById('messages', id, { read: true, unreadCount: 0 });
}

async function getDrafts(openid) {
  return query('posts', { _openid: openid || getCurrentOpenid(), status: 'draft' }, {
    orderBy: 'updatedAt',
    order: 'desc',
  });
}

async function saveDraft(data, openid) {
  const payload = {
    ...data,
    content: normalizeContent(data.content),
    status: 'draft',
    author: data.author || '微信用户',
    desc: data.desc || normalizeContent(data.content)[0] || '',
    time: '草稿',
    _openid: openid || getCurrentOpenid(),
    updatedAt: serverDate(),
  };
  if (data._id) {
    return updateById('posts', data._id, payload);
  }
  return add('posts', {
    ...payload,
    createdAt: serverDate(),
  });
}

async function submitFeedback(content, openid) {
  return add('feedback', {
    content,
    _openid: openid || getCurrentOpenid(),
    status: 'pending',
    createdAt: serverDate(),
  });
}

async function recordHistory(postId, openid) {
  const userOpenid = openid || getCurrentOpenid();
  await removeWhere('history', { postId, openid: userOpenid });
  return add('history', {
    postId,
    openid: userOpenid,
    viewedAt: serverDate(),
  });
}

async function getUserStats(openid) {
  const [postCount, likeCount, collectCount] = await Promise.all([
    count('posts', { _openid: openid, status: 'published' }),
    count('likes', { openid }),
    count('collects', { openid }),
  ]);
  return {
    posts: postCount,
    likes: likeCount,
    collects: collectCount,
  };
}

module.exports = {
  _,
  $,
  add,
  aggregate,
  col,
  count,
  createPost,
  db: null,
  deletePost,
  getById,
  getCloudDb,
  getCollectedPosts,
  getComments,
  getDrafts,
  getMessages,
  getPostById,
  getPosts,
  getUserStats,
  isCollected,
  isLiked,
  markMessageRead,
  query,
  recordHistory,
  removeById,
  removeWhere,
  saveDraft,
  submitFeedback,
  toggleCollect,
  toggleLike,
  updateById,
  updatePost,
  updateWhere,
  addComment,
};
