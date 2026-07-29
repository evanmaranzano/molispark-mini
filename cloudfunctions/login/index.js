const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

async function savePhoneNumber(openid, phoneNumber) {
  const db = cloud.database();
  try {
    await db.collection('users').doc(openid).update({
      data: { phoneNumber, updatedAt: db.serverDate() },
    });
  } catch (e) {
    // 用户文档不存在：与 updateProfile 的 _id=OPENID 约定对齐，建最小档案
    await db.collection('users').doc(openid).set({
      data: {
        openid,
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '',
        phoneNumber,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
  }
}

// action='phone'：手机号快速验证。客户端 button open-type="getPhoneNumber" 拿到 code 后换取手机号。
// 注意：该能力要求非个人主体小程序且已开通「手机号快速验证」，调用失败时返回 PHONE_FAILED 由前端降级。
async function handlePhone(event, openid) {
  const code = typeof event.code === 'string' ? event.code : '';
  if (!code) return { success: false, code: 'MISSING_CODE' };
  if (!openid) return { success: false, code: 'UNAUTHORIZED' };

  let phoneNumber = '';
  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    phoneNumber = res && res.phoneInfo && (res.phoneInfo.purePhoneNumber || res.phoneInfo.phoneNumber) || '';
  } catch (err) {
    console.error('getPhoneNumber failed:', err);
    return { success: false, code: 'PHONE_FAILED', error: err.message };
  }
  if (!phoneNumber) return { success: false, code: 'PHONE_FAILED' };

  try {
    await savePhoneNumber(openid, phoneNumber);
  } catch (err) {
    console.error('save phoneNumber failed:', err);
    return { success: false, code: 'PHONE_SAVE_FAILED' };
  }

  return { success: true, openid, phoneNumber };
}

exports.main = async (event = {}) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();
  const openid = OPENID || '';

  if (event.action === 'phone') {
    return handlePhone(event, openid);
  }

  let profile = null;

  if (openid) {
    try {
      const db = cloud.database();
      const { data } = await db.collection('users').where({ openid }).limit(1).get();
      if (data.length > 0) {
        const user = data[0];
        profile = {
          nickName: user.nickName || '微信用户',
          avatarUrl: user.avatarUrl || '',
          phoneNumber: user.phoneNumber || '',
          role: user.role || 'member',
        };
      }
    } catch (err) {
      console.error('fetch user profile failed:', err);
    }
  }

  return {
    openid,
    appid: APPID || '',
    unionid: UNIONID || '',
    profile,
  };
};
