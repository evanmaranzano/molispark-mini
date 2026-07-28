const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_NICKNAME_LENGTH = 20;
const MAX_AVATAR_URL_LENGTH = 512;
const MAX_BRIEF_LENGTH = 200;

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
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
    let exists = false;
    try {
      const existing = await userRef.get();
      exists = Boolean(existing && existing.data);
    } catch (e) {
      exists = false;
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
