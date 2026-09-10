const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_NICKNAME_LENGTH = 20;
const MAX_AVATAR_URL_LENGTH = 512;
const MAX_BRIEF_LENGTH = 200;

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
function displayReason(err, fallback) {
  const code = err && (err.errCode || err.code);
  const msg = (err && (err.errMsg || err.message)) || '';
  if (code === 87014 || /87014/.test(String(msg))) return '内容含有违法违规信息';
  return fallback || '昵称未通过安全审核';
}

function guessImageType(fileID) {
  const m = String(fileID || '').split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = (m ? m[1] : 'png').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
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

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  if (!openid) return { success: false, error: '未登录' };

  const nickName = normalizeText(event.nickName, MAX_NICKNAME_LENGTH);
  const avatarUrl = normalizeText(event.avatarUrl, MAX_AVATAR_URL_LENGTH);
  const brief = normalizeText(event.brief, MAX_BRIEF_LENGTH);
  if (!nickName) return { success: false, error: '昵称不能为空' };

  try {
    const db = cloud.database();
    const updateData = {
      nickName,
      avatarUrl,
      brief,
      updatedAt: db.serverDate(),
    };

    const userRef = db.collection('users').doc(openid);
    let existingData = null;
    try {
      const existing = await userRef.get();
      existingData = existing && existing.data ? existing.data : null;
    } catch (e) {
      existingData = null;
    }
    const exists = Boolean(existingData);
    const prevNick = exists && typeof existingData.nickName === 'string' ? existingData.nickName : '';

    if (nickName && nickName !== prevNick) {
      try {
        const sec = await msgSecCheckCompat(nickName, 1, openid);
        if (!sec || sec.errCode || (sec.result && sec.result.suggest && sec.result.suggest !== 'pass')) {
          const reason = displayReason(sec, '昵称未通过安全审核');
          return { success: false, code: 'CONTENT_REJECTED', reason, error: reason };
        }
      } catch (err) {
        const reason = displayReason(err, '昵称未通过安全审核');
        return { success: false, code: 'CONTENT_REJECTED', reason, error: reason };
      }
    }

    const prevAvatar = exists && typeof existingData.avatarUrl === 'string' ? existingData.avatarUrl : '';
    if (avatarUrl && avatarUrl !== prevAvatar && avatarUrl.indexOf('cloud://') === 0) {
      try {
        const down = await cloud.downloadFile({ fileID: avatarUrl });
        const value = down && down.fileContent;
        const sec = await cloud.openapi.security.imgSecCheck({
          media: {
            contentType: guessImageType(avatarUrl),
            value,
          },
        });
        if (!sec || sec.errCode) {
          const reason = displayReason(sec, '头像未通过安全审核');
          return { success: false, code: 'CONTENT_REJECTED', reason, error: reason };
        }
      } catch (err) {
        const reason = displayReason(err, '头像未通过安全审核');
        return { success: false, code: 'CONTENT_REJECTED', reason, error: reason };
      }
    }

    if (exists) {
      await userRef.update({ data: updateData });
    } else {
      await db.collection('users').add({
        data: {
          _id: openid,
          openid,
          ...updateData,
          level: 0,
          createdAt: db.serverDate(),
        },
      });
    }

    return {
      success: true,
      openid,
      nickName,
      avatarUrl,
      brief,
    };
  } catch (err) {
    console.error('updateProfile failed:', err);
    return { success: false, error: '保存失败' };
  }
};
