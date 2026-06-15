const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  if (!openid) return { success: false, error: '未登录' };

  const { nickName, avatarFileID } = event;
  if (!nickName) return { success: false, error: '昵称不能为空' };

  try {
    const db = cloud.database();
    const updateData = {
      nickName,
      avatarFileID: avatarFileID || '',
      updatedAt: db.serverDate(),
    };

    const { data } = await db.collection('users').where({ openid }).limit(1).get();
    if (data.length === 0) {
      await db.collection('users').add({
        data: {
          openid,
          ...updateData,
          createdAt: db.serverDate(),
        },
      });
    } else {
      await db.collection('users').where({ openid }).update({ data: updateData });
    }

    return {
      success: true,
      openid,
      nickName,
      avatarFileID: avatarFileID || '',
    };
  } catch (err) {
    console.error('updateProfile failed:', err);
    return { success: false, error: err.message };
  }
};
