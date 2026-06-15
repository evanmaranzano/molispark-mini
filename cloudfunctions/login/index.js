const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();
  const openid = OPENID || '';
  let profile = null;

  if (openid) {
    try {
      const db = cloud.database();
      const { data } = await db.collection('users').where({ openid }).limit(1).get();
      if (data.length > 0) {
        const user = data[0];
        profile = {
          nickName: user.nickName || '微信用户',
          avatarUrl: user.avatarFileID || '',
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
