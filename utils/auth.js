const AUTH_STORAGE_KEY = 'miniAuthSession';
const LOCAL_OPENID_KEY = 'miniLocalOpenid';

function getDefaultProfile() {
  return {
    nickName: '微信用户',
    avatarUrl: '',
  };
}

function normalizeSession(session = {}) {
  return {
    openid: session.openid || '',
    appid: session.appid || '',
    unionid: session.unionid || '',
    profile: session.profile || getDefaultProfile(),
    loginAt: session.loginAt || Date.now(),
  };
}

function getSession() {
  const session = wx.getStorageSync(AUTH_STORAGE_KEY);
  if (!session || !session.openid) return null;
  return normalizeSession(session);
}

function setSession(session) {
  const normalized = normalizeSession(session);
  wx.setStorageSync(AUTH_STORAGE_KEY, normalized);
  return normalized;
}

function clearSession() {
  wx.removeStorageSync(AUTH_STORAGE_KEY);
}

function isCloudReady() {
  try {
    const app = getApp();
    return Boolean(wx.cloud && app.globalData && app.globalData.cloudReady);
  } catch (err) {
    return false;
  }
}

function getLocalOpenid() {
  const saved = wx.getStorageSync(LOCAL_OPENID_KEY);
  if (saved) return saved;
  const openid = 'local-openid';
  wx.setStorageSync(LOCAL_OPENID_KEY, openid);
  return openid;
}

function loginWithCloud(profile = getDefaultProfile()) {
  if (!isCloudReady()) {
    return Promise.resolve(setSession({
      openid: getLocalOpenid(),
      appid: 'local-preview',
      profile,
      loginAt: Date.now(),
    }));
  }

  return wx.cloud
    .callFunction({
      name: 'login',
      data: {},
    })
    .then((res) => {
      const result = res.result || {};
      const session = setSession({
        openid: result.openid,
        appid: result.appid,
        unionid: result.unionid,
        profile,
        loginAt: Date.now(),
      });
      return session;
    });
}

module.exports = {
  AUTH_STORAGE_KEY,
  clearSession,
  getDefaultProfile,
  getSession,
  loginWithCloud,
  normalizeSession,
  setSession,
};
