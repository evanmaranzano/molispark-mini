const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const VALID_ACTIONS = ['view', 'like', 'unlike', 'collect', 'uncollect', 'comment'];

function getDateStr() {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function makeResponse(action, postId, { state, counts, data, success = true, code }) {
  const res = { success, action, postId };
  if (code) {
    res.code = code;
    return res;
  }
  if (state) res.state = state;
  if (counts) res.counts = counts;
  if (data) res.data = data;
  return res;
}

async function getPostCounts(postId) {
  const postRes = await db.collection('posts').doc(postId).get();
  const p = postRes.data;
  if (!p) throw new Error('post not found');
  return {
    post: p,
    counts: {
      likes: p.likes || 0,
      collectCount: p.collectCount || 0,
      commentCount: p.commentCount || 0,
      views: p.views || 0,
    },
  };
}

async function handleView(postId, openid, post, counts) {
  const viewId = `${postId}_${openid}_${getDateStr()}`;
  let isFirstView = false;
  try {
    await db.collection('views').add({
      data: { _id: viewId, postId, openid, viewedAt: db.serverDate() },
    });
    isFirstView = true;
  } catch (e) {
    // 主键冲突 = 今天已浏览过
  }

  if (isFirstView) {
    try {
      await db.collection('posts').doc(postId).update({ data: { views: _.inc(1) } });
      counts.views += 1;
    } catch (e) {
      console.error('view count inc failed:', postId, openid, e.message);
      return makeResponse('view', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
    }
  }

  const historyId = `${postId}_${openid}`;
  try {
    await db.collection('history').doc(historyId).set({
      data: {
        postId,
        openid,
        _openid: openid,
        title: post.title || '',
        cover: post.cover || (post.images && post.images[0]) || '',
        category: post.category || '',
        authorName: post.author || '',
        viewedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
  } catch (e) {
    console.warn('history upsert failed:', postId, openid, e.message);
  }

  return makeResponse('view', postId, { counts });
}

async function handleLike(postId, openid, counts) {
  const likeId = `${postId}_${openid}`;
  let created = false;
  try {
      await db.collection('likes').add({
        // 云函数写入不会自动注入 _openid；likes 集合「仅创建者可读写」权限下
        // 客户端 query('likes', { postId, openid }) 会过滤掉本记录导致 isLiked 永远 false、
        // toggleLike 永远走 like 分支无法取消。显式写入 _openid 让权限匹配。
        data: { _id: likeId, postId, openid, _openid: openid, createdAt: db.serverDate() },
      });
    created = true;
  } catch (e) {
    // 主键冲突 = 已点赞
  }

  if (created) {
    try {
      await db.collection('posts').doc(postId).update({ data: { likes: _.inc(1) } });
      counts.likes += 1;
    } catch (e) {
      console.error('like count inc failed:', postId, openid, e.message);
      return makeResponse('like', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
    }
  }

  return makeResponse('like', postId, { state: { liked: true }, counts });
}

async function handleUnlike(postId, openid, counts) {
  const likeId = `${postId}_${openid}`;
  let removed = false;
  try {
    const removeRes = await db.collection('likes').doc(likeId).remove();
    removed = removeRes.stats.removed > 0;
  } catch (e) {
    // 文档不存在
  }

  if (removed) {
    try {
      await db.collection('posts').doc(postId).update({ data: { likes: _.inc(-1) } });
      counts.likes = Math.max(0, counts.likes - 1);
    } catch (e) {
      console.error('unlike count inc failed:', postId, openid, e.message);
      return makeResponse('unlike', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
    }
  }

  return makeResponse('unlike', postId, { state: { liked: false }, counts });
}

async function handleCollect(postId, openid, counts) {
  const collectId = `${postId}_${openid}`;
  let created = false;
  try {
      await db.collection('collects').add({
        // 同 likes：显式写 _openid 让「仅创建者可读写」权限下客户端能查回。
        data: { _id: collectId, postId, openid, _openid: openid, createdAt: db.serverDate() },
      });
    created = true;
  } catch (e) {
    // 主键冲突 = 已收藏
  }

  if (created) {
    try {
      await db.collection('posts').doc(postId).update({ data: { collectCount: _.inc(1) } });
      counts.collectCount += 1;
    } catch (e) {
      console.error('collect count inc failed:', postId, openid, e.message);
      return makeResponse('collect', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
    }
  }

  return makeResponse('collect', postId, { state: { collected: true }, counts });
}

async function handleUncollect(postId, openid, counts) {
  const collectId = `${postId}_${openid}`;
  let removed = false;
  try {
    const removeRes = await db.collection('collects').doc(collectId).remove();
    removed = removeRes.stats.removed > 0;
  } catch (e) {
    // 文档不存在
  }

  if (removed) {
    try {
      await db.collection('posts').doc(postId).update({ data: { collectCount: _.inc(-1) } });
      counts.collectCount = Math.max(0, counts.collectCount - 1);
    } catch (e) {
      console.error('uncollect count inc failed:', postId, openid, e.message);
      return makeResponse('uncollect', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
    }
  }

  return makeResponse('uncollect', postId, { state: { collected: false }, counts });
}

async function handleComment(postId, openid, content, counts) {
  if (typeof content !== 'string') return { success: false, code: 'INVALID_CONTENT' };
  const body = content.trim();
  if (!body) return { success: false, code: 'EMPTY_CONTENT' };
  if (body.length > 500) return { success: false, code: 'CONTENT_TOO_LONG' };

  let authorName = '微信用户';
  try {
    const user = await db.collection('users').doc(openid).get();
    if (user && user.data && typeof user.data.nickName === 'string') {
      authorName = user.data.nickName.trim().slice(0, 20) || authorName;
    }
  } catch (e) {
    // 资料不存在时保留默认昵称。
  }

  const commentRes = await db.collection('comments').add({
    data: {
      postId,
      openid,
      _openid: openid,
      name: authorName,
      body,
      createdAt: db.serverDate(),
    },
  });

  try {
    await db.collection('posts').doc(postId).update({ data: { commentCount: _.inc(1) } });
    counts.commentCount += 1;
  } catch (e) {
    console.error('comment count inc failed:', postId, openid, e.message);
    return makeResponse('comment', postId, { success: false, code: 'COUNT_UPDATE_FAILED' });
  }

  return makeResponse('comment', postId, {
    counts,
    data: { commentId: commentRes._id },
  });
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { success: false, code: 'UNAUTHORIZED' };

  const { action, content } = event;
  const postId = typeof event.postId === 'string' ? event.postId.trim() : '';
  if (!postId || postId.length > 128) return { success: false, code: 'MISSING_POST_ID' };
  if (!VALID_ACTIONS.includes(action)) {
    return { success: false, code: 'INVALID_ACTION' };
  }

  let postInfo;
  try {
    postInfo = await getPostCounts(postId);
  } catch (e) {
    return { success: false, code: 'POST_NOT_FOUND' };
  }

  const { post, counts } = postInfo;
  if (post.status && post.status !== 'published') {
    return { success: false, code: 'POST_UNAVAILABLE' };
  }

  try {
    if (action === 'view') return await handleView(postId, OPENID, post, counts);
    if (action === 'like') return await handleLike(postId, OPENID, counts);
    if (action === 'unlike') return await handleUnlike(postId, OPENID, counts);
    if (action === 'collect') return await handleCollect(postId, OPENID, counts);
    if (action === 'uncollect') return await handleUncollect(postId, OPENID, counts);
    return await handleComment(postId, OPENID, content, counts);
  } catch (err) {
    console.error('interact failed:', action, postId, OPENID, err.message);
    return { success: false, code: 'INTERNAL_ERROR' };
  }
};
