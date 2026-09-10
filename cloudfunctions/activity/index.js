const cloud = require('wx-server-sdk');
const { isActivityClosed } = require('./activityStatus');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const VALID_ACTIONS = ['signup', 'cancel', 'create', 'remove'];

function makeResponse(action, activityId, { state, counts, success = true, code }) {
  const res = { success, action, activityId };
  if (code) {
    res.code = code;
    return res;
  }
  if (state) res.state = state;
  if (counts) res.counts = counts;
  return res;
}

function validateSignupInput(name, phone, note) {
  if (typeof name !== 'string' || !name.trim()) return 'MISSING_NAME';
  if (name.trim().length > 20) return 'NAME_TOO_LONG';
  if (typeof phone !== 'string' || !/^1\d{10}$/.test(phone.trim())) return 'INVALID_PHONE';
  if (note && typeof note === 'string' && note.length > 100) return 'NOTE_TOO_LONG';
  return null;
}

async function getActivity(activityId) {
  const res = await db.collection('activities').doc(activityId).get();
  return res.data || null;
}

async function incSignupCount(activityId, delta, counts) {
  try {
    await db.collection('activities').doc(activityId).update({
      data: { signupCount: _.inc(delta) },
    });
    counts.signupCount = Math.max(0, counts.signupCount + delta);
    return null;
  } catch (e) {
    console.error('signup count inc failed:', activityId, delta, e.message);
    return 'COUNT_UPDATE_FAILED';
  }
}

async function handleSignup(activityId, openid, activity, counts, event) {
  if (isActivityClosed(activity)) {
    return makeResponse('signup', activityId, { success: false, code: 'ACTIVITY_CLOSED' });
  }

  const name = String(event.name || '').trim();
  const phone = String(event.phone || '').trim();
  const note = String(event.note || '').trim();
  const invalid = validateSignupInput(name, phone, note);
  if (invalid) return makeResponse('signup', activityId, { success: false, code: invalid });

  const signupId = `${activityId}_${openid}`;
  const snapshot = {
    activityTitle: activity.title || '',
    activityTime: activity.startTime || '',
    activityLocation: activity.location || '',
  };

  let existing = null;
  try {
    const res = await db.collection('signups').doc(signupId).get();
    existing = res.data || null;
  } catch (e) {
    // 文档不存在
  }

  if (existing && existing.status === 'signed') {
    // 幂等：重复报名直接返回当前状态，不重复计数
    return makeResponse('signup', activityId, { state: { signed: true }, counts });
  }

  const quota = Number(activity.quota) || 0;
  if (quota > 0 && counts.signupCount >= quota) {
    return makeResponse('signup', activityId, { success: false, code: 'QUOTA_FULL' });
  }

  if (existing && existing.status === 'cancelled') {
    // 取消后再次报名：恢复原文档，不新建
    await db.collection('signups').doc(signupId).update({
      data: { name, phone, note, status: 'signed', updatedAt: db.serverDate() },
    });
    const code = await incSignupCount(activityId, 1, counts);
    if (code) return makeResponse('signup', activityId, { success: false, code });
    return makeResponse('signup', activityId, { state: { signed: true }, counts });
  }

  try {
    await db.collection('signups').add({
      data: {
        _id: signupId,
        activityId,
        openid,
        // 云函数写入不会自动注入 _openid；signups「仅创建者可读写」权限下
        // 客户端 query('signups', { openid }) 需要 _openid 匹配才能查回。
        _openid: openid,
        name,
        phone,
        note,
        status: 'signed',
        ...snapshot,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
  } catch (e) {
    // 并发主键冲突 = 已报名，按幂等返回
    return makeResponse('signup', activityId, { state: { signed: true }, counts });
  }

  const code = await incSignupCount(activityId, 1, counts);
  if (code) return makeResponse('signup', activityId, { success: false, code });
  return makeResponse('signup', activityId, { state: { signed: true }, counts });
}

async function handleCancel(activityId, openid, counts) {
  const signupId = `${activityId}_${openid}`;

  let existing = null;
  try {
    const res = await db.collection('signups').doc(signupId).get();
    existing = res.data || null;
  } catch (e) {
    // 文档不存在
  }

  if (!existing || existing.status === 'cancelled') {
    // 幂等：未报名或已取消，直接返回当前状态
    return makeResponse('cancel', activityId, { state: { signed: false }, counts });
  }

  await db.collection('signups').doc(signupId).update({
    data: { status: 'cancelled', updatedAt: db.serverDate() },
  });

  const code = await incSignupCount(activityId, -1, counts);
  if (code) return makeResponse('cancel', activityId, { success: false, code });
  return makeResponse('cancel', activityId, { state: { signed: false }, counts });
}

async function isAdmin(openid) {
  // users 文档主键约定 _id=openid，但历史上可能存在 auto _id + openid 字段的旧档，
  // 两种查法都试，任一命中 role='admin' 即视为管理员（与 login 的 where({openid}) 对齐）。
  try {
    const res = await db.collection('users').where({ openid }).get();
    if (res.data.some((u) => u.role === 'admin')) return true;
  } catch (e) {
    // 继续尝试按 _id 查
  }
  try {
    const res = await db.collection('users').doc(openid).get();
    return Boolean(res.data && res.data.role === 'admin');
  } catch (e) {
    return false;
  }
}

function displayReason(err, fallback) {
  const code = err && (err.errCode || err.code);
  const msg = (err && (err.errMsg || err.message)) || '';
  if (code === 87014 || /87014/.test(String(msg))) return '内容含有违法违规信息';
  return fallback || '内容未通过安全审核';
}

// v2 在 openid 无真实小程序访问的场景（如模拟器）会抛 -604101；此时降级 v1 纯文本检测。
async function msgSecCheckCompat(content, scene, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({ version: 2, openid, scene, content });
    if (res && (res.errCode === -604101 || /604101/.test(String(res.errMsg || '')))) {
      return cloud.openapi.security.msgSecCheck({ content });
    }
    return res;
  } catch (err) {
    const code = err && (err.errCode || err.code);
    const msg = String((err && (err.errMsg || err.message)) || '');
    if (code === -604101 || /604101/.test(msg)) {
      return cloud.openapi.security.msgSecCheck({ content });
    }
    throw err;
  }
}

function guessImageType(fileID) {
  const m = String(fileID || '').split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = (m ? m[1] : 'png').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

async function checkText(text, scene, openid) {
  const content = typeof text === 'string' ? text : String(text || '');
  if (!content.trim()) return { pass: true };
  if (!openid) return { pass: false, reason: '未登录，无法进行安全审核' };
  try {
    const res = await msgSecCheckCompat(content, scene, openid);
    if (!res || res.errCode || (res.result && res.result.suggest && res.result.suggest !== 'pass')) {
      return { pass: false, reason: displayReason(res, '内容未通过安全审核') };
    }
    return { pass: true };
  } catch (err) {
    return { pass: false, reason: displayReason(err, '内容未通过安全审核') };
  }
}

async function checkOneImage(fileID) {
  try {
    const down = await cloud.downloadFile({ fileID });
    const value = down && down.fileContent;
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: guessImageType(fileID),
        value,
      },
    });
    if (!res || res.errCode) {
      return { fileID, pass: false, reason: displayReason(res, '图片未通过安全审核') };
    }
    return { fileID, pass: true };
  } catch (err) {
    return { fileID, pass: false, reason: displayReason(err, '图片未通过安全审核') };
  }
}

async function handleCreate(openid, event) {
  const title = String(event.title || '').trim();
  if (!title) return { success: false, code: 'MISSING_TITLE' };
  if (title.length > 50) return { success: false, code: 'TITLE_TOO_LONG' };
  const desc = String(event.desc || '').trim();
  if (desc.length > 500) return { success: false, code: 'DESC_TOO_LONG' };

  const textCheck = await checkText(`${title}\n${desc}`, 3, openid);
  if (!textCheck.pass) {
    return { success: false, code: 'CONTENT_REJECTED', reason: textCheck.reason };
  }

  const images = Array.isArray(event.images) ? event.images.filter(Boolean) : [];
  if (images.length) {
    for (let i = 0; i < images.length; i += 1) {
      const img = await checkOneImage(images[i]);
      if (!img.pass) {
        return { success: false, code: 'CONTENT_REJECTED', reason: img.reason || '图片未通过安全审核' };
      }
    }
  }

  const res = await db.collection('activities').add({
    data: {
      title,
      desc,
      location: String(event.location || '').trim().slice(0, 50),
      startTime: String(event.startTime || '').trim(),
      endTime: String(event.endTime || '').trim(),
      quota: Math.max(0, Number(event.quota) || 0),
      signupCount: 0,
      videos: (Array.isArray(event.videos) ? event.videos : [])
        .filter((v) => typeof v === 'string' && v.length > 0 && v.length <= 512)
        .slice(0, 3),
      coverStyle: ['book', 'ai', 'note'].includes(event.coverStyle) ? event.coverStyle : 'book',
      heroTitle: String(event.heroTitle || '').trim().slice(0, 30) || title.slice(0, 20).toUpperCase(),
      status: 'published',
      _openid: openid,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  });
  return { success: true, action: 'create', data: { activityId: res._id } };
}

async function handleRemove(activityId) {
  // 先清报名记录再删活动，避免 signups 产生无主数据
  try {
    await db.collection('signups').where({ activityId }).remove();
  } catch (e) {
    console.warn('remove signups failed:', activityId, e.message);
  }
  await db.collection('activities').doc(activityId).remove();
  return { success: true, action: 'remove', activityId };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { success: false, code: 'UNAUTHORIZED' };

  const { action } = event;
  if (!VALID_ACTIONS.includes(action)) {
    return { success: false, code: 'INVALID_ACTION' };
  }

  if (action === 'create') {
    if (!(await isAdmin(OPENID))) return { success: false, code: 'FORBIDDEN' };
    try {
      return await handleCreate(OPENID, event);
    } catch (err) {
      console.error('activity create failed:', OPENID, err.message);
      return { success: false, code: 'INTERNAL_ERROR' };
    }
  }

  const activityId = typeof event.activityId === 'string' ? event.activityId.trim() : '';
  if (!activityId || activityId.length > 128) return { success: false, code: 'MISSING_ACTIVITY_ID' };

  if (action === 'remove') {
    if (!(await isAdmin(OPENID))) return { success: false, code: 'FORBIDDEN' };
    try {
      return await handleRemove(activityId);
    } catch (err) {
      console.error('activity remove failed:', activityId, err.message);
      return { success: false, code: 'INTERNAL_ERROR' };
    }
  }

  let activity;
  try {
    activity = await getActivity(activityId);
  } catch (e) {
    return { success: false, code: 'ACTIVITY_NOT_FOUND' };
  }
  if (!activity) return { success: false, code: 'ACTIVITY_NOT_FOUND' };

  const counts = { signupCount: activity.signupCount || 0 };

  try {
    if (action === 'signup') return await handleSignup(activityId, OPENID, activity, counts, event);
    return await handleCancel(activityId, OPENID, counts);
  } catch (err) {
    console.error('activity failed:', action, activityId, OPENID, err.message);
    return { success: false, code: 'INTERNAL_ERROR' };
  }
};
