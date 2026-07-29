/**
 * 云数据库 CRUD 封装。
 *
 * Mock fallback 策略（v0.1）：云就绪（utils/cloud.js isCloudReady）时走云数据库，云调用抛错或
 * 无云环境时降级到本地 localStorage（key: miniLocalDb，由 mock/community.js seed 生成），降级
 * 返回对象经 markLocal() 打上 __fromLocalDb 标记。
 * - 底层 CRUD（add/getById/query/updateById/updateWhere/removeById/removeWhere/count）：
 *   统一「云优先 + try/catch 降级本地」。
 * - 互动类（addComment/toggleLike/toggleCollect）：云优先走 interact 云函数，callInteract 返回
 *   null 或 success=false 时回退本地手动 ±1。v0.2 计划抽 mock fallback 中间层统一处理。
 * - callInteract 云不可用时返回 null（不抛错），降级路径由调用方决定。
 * - v0.2.5：add 降级日志已移除，降级静默进行（allowMockFallback 仍控制是否允许降级）。
 */

const mock = require('~/mock/community');
const { isCloudReady } = require('~/utils/cloud');
const { allowMockFallback } = require('~/utils/runtime');
const { getSession } = require('~/utils/auth');

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
  const fromGlobal = app && app.globalData && app.globalData.userInfo;
  if (fromGlobal && fromGlobal.nickName) return fromGlobal;
  // globalData 可能未同步（登录只写 session），回退到 session 取昵称，避免发帖作者落成"微信用户"
  const session = getSession();
  if (session && session.profile && session.profile.nickName) return session.profile;
  return {};
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
  if (Array.isArray(content)) return content.map((item) => String(item).trim()).filter(Boolean);
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
    activities: (mock.activities || []).map((item) => ({ ...item })),
    signups: [],
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

async function callInteract(payload) {
  if (!isCloudReady()) return null;
  try {
    const res = await wx.cloud.callFunction({ name: 'interact', data: payload });
    return res.result;
  } catch (err) {
    console.error('callInteract failed:', err);
    return null;
  }
}

async function add(collection, data) {
  const db = getCloudDb();
  if (db) {
    try {
      return await db.collection(collection).add({ data: toCloudObject(data, db) });
    } catch (err) {
      if (!allowMockFallback()) throw err;
    }
  }

  const localDb = loadLocalDb();
  const list = ensureCollection(localDb, collection);
  const doc = clone(data);
  applyLocalData(doc, data);
  doc._id = doc._id || `local-${collection}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // 本地数据补 _openid；云 add 时 _openid 由云数据库自动注入，禁止手动写（否则 Invalid Key Name）
  doc._openid = doc._openid || getCurrentOpenid();
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
      if (!allowMockFallback()) throw err;
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
    views: 0,
    likes: 0,
    collectCount: 0,
    commentCount: 0,
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
  if (isCloudReady()) {
    const result = await callInteract({ action: 'comment', postId: data.postId, content: data.body, name: data.name });
    if (result && result.success) {
      return { _id: result.data.commentId, commentCount: result.counts.commentCount };
    }
  }

  const result = await add('comments', {
    ...data,
    createdAt: serverDate(),
  });
  await updateById('posts', data.postId, { commentCount: _.inc(1) });
  return result;
}

async function toggleLike(postId, openid, currentLiked = false) {
  // 云模式下互动状态以云函数为准，不再在调用前本地查一次：
  // likes 集合「仅创建者可读写」+ 云函数写入的记录 _openid 之前为空，
  // 客户端 query 永远返回空 → willLike 永远为 true → 永远只能点赞不能取消。
  // 修复后 _openid 已正确写入，但仍按调用方当前状态决定 action，避免查库往返。
  if (isCloudReady()) {
    const result = await callInteract({ action: currentLiked ? 'unlike' : 'like', postId });
    if (result && result.success) {
      return {
        liked: result.state.liked,
        likes: result.counts.likes,
      };
    }
  }

  // 非云降级路径保留原 query（本地无权限限制）
  const existing = await query('likes', { postId, openid }, { limit: 1 });
  const willLike = existing.length === 0;
  if (willLike) {
    await add('likes', { postId, openid, createdAt: serverDate() });
    await updateById('posts', postId, { likes: _.inc(1) });
    return { liked: true };
  }
  await removeById('likes', existing[0]._id);
  await updateById('posts', postId, { likes: _.inc(-1) });
  return { liked: false };
}

async function isLiked(postId, openid) {
  const res = await query('likes', { postId, openid }, { limit: 1 });
  return res.length > 0;
}

async function toggleCollect(postId, openid, currentCollected = false) {
  if (isCloudReady()) {
    const result = await callInteract({ action: currentCollected ? 'uncollect' : 'collect', postId });
    if (result && result.success) {
      return {
        collected: result.state.collected,
        collectCount: result.counts.collectCount,
      };
    }
  }

  const existing = await query('collects', { postId, openid }, { limit: 1 });
  const willCollect = existing.length === 0;
  if (willCollect) {
    await add('collects', { postId, openid, createdAt: serverDate() });
    return { collected: true };
  }
  await removeById('collects', existing[0]._id);
  return { collected: false };
}

async function isCollected(postId, openid) {
  const res = await query('collects', { postId, openid }, { limit: 1 });
  return res.length > 0;
}

async function getCollectedPosts(openid, limit = 20) {
  const collects = await query('collects', { openid }, { limit, orderBy: 'createdAt' });
  if (!collects.length) return markLocal([]);
  const ids = collects.map((item) => item.postId);
  return query('posts', { _id: _.in(ids), status: 'published' });
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
    status: 'pending',
    createdAt: serverDate(),
  });
}

async function recordHistory(postId, openid) {
  // 云端浏览在 interact 云函数内完成，避免客户端重复写入并覆盖完整快照。
  if (isCloudReady()) return null;
  const userOpenid = openid || getCurrentOpenid();
  await removeWhere('history', { postId, openid: userOpenid });
  return add('history', {
    postId,
    openid: userOpenid,
    viewedAt: serverDate(),
  });
}

async function deleteHistory(postId, openid) {
  return removeWhere('history', { postId, openid: openid || getCurrentOpenid() });
}

async function getUserStats(openid) {
  const [postCount, collectCount] = await Promise.all([
    count('posts', { _openid: openid, status: 'published' }),
    count('collects', { openid }),
  ]);

  // 「收到的赞」= 自己所有帖子 likes 字段之和。likes 集合「仅创建者可读写」客户端跨用户查不到，
  // 但 posts.likes 字段是云函数 admin 写入、posts「所有用户可读」，累加即可拿到准确值。
  // 等价于 v0.3.4 aggregate 云函数实现，当前用客户端 query 凑合。
  const myPosts = await query('posts', { _openid: openid, status: 'published' }, { limit: 100 });
  const receivedLikes = (myPosts || []).reduce((sum, p) => sum + (p.likes || 0), 0);

  return {
    posts: postCount,
    likes: receivedLikes,
    collects: collectCount,
  };
}

async function callActivity(payload) {
  if (!isCloudReady()) return null;
  try {
    const res = await wx.cloud.callFunction({ name: 'activity', data: payload });
    return res.result;
  } catch (err) {
    console.error('callActivity failed:', err);
    return null;
  }
}

async function getActivities(options = {}) {
  return query('activities', { status: 'published' }, {
    orderBy: options.orderBy || 'startTime',
    order: options.order || 'asc',
    limit: options.limit || 20,
    skip: options.skip || 0,
  });
}

async function getActivityById(id) {
  return getById('activities', id);
}

async function getMySignups(openid, options = {}) {
  return query('signups', { openid: openid || getCurrentOpenid(), status: 'signed' }, {
    orderBy: 'createdAt',
    order: 'desc',
    limit: options.limit || 50,
  });
}

async function getSignup(activityId, openid) {
  const list = await query('signups', { activityId, openid: openid || getCurrentOpenid() }, { limit: 1 });
  return list[0] || null;
}

async function signupActivity(activityId, info = {}) {
  if (isCloudReady()) {
    const result = await callActivity({
      action: 'signup',
      activityId,
      name: info.name,
      phone: info.phone,
      note: info.note,
    });
    if (result && result.success) {
      return { signed: true, signupCount: result.counts.signupCount };
    }
    if (result && result.code) {
      return { signed: false, code: result.code };
    }
  }

  // 本地降级：手动维护 signups + signupCount
  const openid = getCurrentOpenid();
  const existing = await getSignup(activityId, openid);
  if (existing && existing.status === 'signed') return { signed: true };
  const activity = await getActivityById(activityId);
  if (activity) {
    const quota = Number(activity.quota) || 0;
    if (quota > 0 && (activity.signupCount || 0) >= quota) return { signed: false, code: 'QUOTA_FULL' };
  }
  if (existing && existing.status === 'cancelled') {
    await updateById('signups', existing._id, { ...info, status: 'signed', updatedAt: serverDate() });
  } else {
    await add('signups', {
      activityId,
      openid,
      name: info.name || '',
      phone: info.phone || '',
      note: info.note || '',
      status: 'signed',
      activityTitle: activity ? activity.title || '' : '',
      activityTime: activity ? activity.startTime || '' : '',
      activityLocation: activity ? activity.location || '' : '',
      createdAt: serverDate(),
      updatedAt: serverDate(),
    });
  }
  await updateById('activities', activityId, { signupCount: _.inc(1) });
  return { signed: true };
}

async function cancelSignup(activityId) {
  if (isCloudReady()) {
    const result = await callActivity({ action: 'cancel', activityId });
    if (result && result.success) {
      return { signed: false, signupCount: result.counts.signupCount };
    }
    if (result && result.code) {
      return { signed: true, code: result.code };
    }
  }

  const openid = getCurrentOpenid();
  const existing = await getSignup(activityId, openid);
  if (!existing || existing.status === 'cancelled') return { signed: false };
  await updateById('signups', existing._id, { status: 'cancelled', updatedAt: serverDate() });
  await updateById('activities', activityId, { signupCount: _.inc(-1) });
  return { signed: false };
}

// 加精/取消加精（管理员）：云走 interact feature/unfeature，本地降级直接改 posts.featured
async function setFeatured(postId, featured) {
  if (isCloudReady()) {
    const result = await callInteract({ action: featured ? 'feature' : 'unfeature', postId });
    if (result && result.success) return { featured: result.state.featured };
    return { code: (result && result.code) || 'INTERNAL_ERROR' };
  }
  await updateById('posts', postId, { featured });
  return { featured };
}

// 发布活动（管理员）：云走 activity create，本地降级直接写 activities 集合
async function createActivity(data = {}) {
  const quota = Math.max(0, Number(data.quota) || 0);
  if (isCloudReady()) {
    const result = await callActivity({ action: 'create', ...data, quota });
    if (result && result.success) return { activityId: result.data.activityId };
    return { code: (result && result.code) || 'INTERNAL_ERROR' };
  }
  const res = await add('activities', {
    title: data.title || '',
    desc: data.desc || '',
    location: data.location || '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    quota,
    signupCount: 0,
    coverStyle: data.coverStyle || 'book',
    heroTitle: data.heroTitle || '',
    status: 'published',
    createdAt: serverDate(),
    updatedAt: serverDate(),
  });
  return { activityId: res._id };
}

// 删除活动（管理员）：云走 activity remove，本地降级清 signups + 删 activities
async function removeActivity(activityId) {
  if (isCloudReady()) {
    const result = await callActivity({ action: 'remove', activityId });
    if (result && result.success) return { removed: true };
    return { code: (result && result.code) || 'INTERNAL_ERROR' };
  }
  await removeWhere('signups', { activityId });
  await removeById('activities', activityId);
  return { removed: true };
}

module.exports = {
  _,
  $,
  add,
  aggregate,
  callInteract,
  callActivity,
  cancelSignup,
  createActivity,
  col,
  count,
  createPost,
  db: null,
  deleteHistory,
  deletePost,
  getActivities,
  getActivityById,
  getMySignups,
  getSignup,
  setFeatured,
  signupActivity,
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
  normalizeContent,
  query,
  removeActivity,
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
