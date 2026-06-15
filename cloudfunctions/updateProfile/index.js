const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || '';
  if (!openid) return { success: false, error: '未登录' };

  const { nickName, avatarUrl, brief } = event;
  if (!nickName) return { success: false, error: '昵称不能为空' };

  try {
    const db = cloud.database();
    const updateData = {
      nickName,
      avatarUrl: avatarUrl || '',
      brief: brief || '',
      updatedAt: db.serverDate(),
    };

    const userRef = db.collection('users').doc(openid);
    try {
      const existing = await userRef.get();
      if (existing.data.length > 0) {
        await userRef.update({ data: updateData });
      }
    } catch (e) {
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
      avatarUrl: avatarUrl || '',
      brief: brief || '',
    };
  } catch (err) {
    console.error('updateProfile failed:', err);
    return { success: false, error: err.message };
  }
};
